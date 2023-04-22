const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  description: String,
  duration: Number,
  date: Date,
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (request, response) => {
  const { username } = request.body;

  try {
    const document = await User.create({ username });

    return response.json(document);
  } catch (error) {
    return console.error(error);
  }
});

app.get("/api/users", async (_, response) => {
  try {
    const documents = await User.find({});

    return response.json(documents);
  } catch (error) {
    return console.error(error);
  }
});

app.post("/api/users/:id/exercises", async (request, response) => {
  const { id } = request.params;
  const { description, duration: durationString, date: dateOrNone } =
    request.body;

  const duration = Number(durationString);
  const date = dateOrNone ? new Date(dateOrNone) : new Date();

  try {
    const userDocument = await User.findById(id).exec().then((user) =>
      user.toJSON()
    );
    delete userDocument.__v;
    const exerciseDocument = await Exercise.create({
      username: userDocument.username,
      description,
      duration,
      date,
    }).then((exercise) => exercise.toJSON());
    delete exerciseDocument.__v;

    return response.json({
      ...userDocument,
      ...exerciseDocument,
      date: date.toDateString(),
    });
  } catch (error) {
    return console.error(error);
  }
});

app.get("/api/users/:id/logs", async (request, response) => {
  const { id } = request.params;
  const { from, to, limit } = request.query;

  try {
    const userDocument = await User.findById(id).exec().then((user) =>
      user.toJSON()
    );
    const exerciseDocuments = await Exercise
      .find({
        username: userDocument.username,
        ...from || to
          ? {
            date: { ...from ? { $gte: from } : {}, ...to ? { $lte: to } : {} },
          }
          : {},
      })
      .limit(limit ? Number(limit) : Number.NaN)
      .exec()
      .then((exercises) => exercises.map((exercise) => exercise.toJSON()));

    return response.json({
      username: userDocument.username,
      count: exerciseDocuments.length,
      log: exerciseDocuments.map((document) => ({
        ...document,
        date: new Date(document.date).toDateString(),
      })),
    });
  } catch (error) {
    return console.error(error);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
