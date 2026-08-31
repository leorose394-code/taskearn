
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const tasks = [
  {
    id: 1,
    title: "Read today's learning tip",
    description: "Read the daily learning tip and complete the task.",
    reward: 100,
    status: "Available"
  },
  {
    id: 2,
    title: "Answer a practice question",
    description: "Answer a simple practice question to earn a reward.",
    reward: 150,
    status: "Available"
  },
  {
    id: 3,
    title: "Check your progress",
    description: "Review your learning progress for today.",
    reward: 200,
    status: "Available"
  }
];

app.get("/api/tasks", (req, res) => {
  res.json({ tasks });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TaskEarn server is running"
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TaskEarn running on port ${PORT}`);
});
