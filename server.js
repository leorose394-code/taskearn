const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =========================
// TASKS
// =========================

let tasks = [
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

// =========================
// USERS
// =========================

let users = [
  {
    id: 1,
    name: "Demo User",
    email: "user@taskearn.test",
    password: "user123",
    balance: 0,
    completedTasks: []
  }
];

// =========================
// ADMIN
// =========================

const admins = [
  {
    id: 1,
    email: "admin@taskearn.test",
    password: "admin123"
  }
];

// =========================
// SESSIONS
// =========================

const sessions = new Map();

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

// =========================
// USER AUTH MIDDLEWARE
// =========================

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  const session = sessions.get(token);

  if (!session || session.type !== "user") {
    return res.status(401).json({
      error: "Please log in first."
    });
  }

  const user = users.find(user => user.id === session.id);

  if (!user) {
    return res.status(401).json({
      error: "User account not found."
    });
  }

  req.user = user;
  req.token = token;

  next();
}

// =========================
// ADMIN AUTH MIDDLEWARE
// =========================

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  const session = sessions.get(token);

  if (!session || session.type !== "admin") {
    return res.status(401).json({
      error: "Admin login required."
    });
  }

  const admin = admins.find(admin => admin.id === session.id);

  if (!admin) {
    return res.status(401).json({
      error: "Admin account not found."
    });
  }

  req.admin = admin;
  req.token = token;

  next();
}

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TaskEarn server is running"
  });
});

// =========================
// PUBLIC TASKS
// =========================

app.get("/api/tasks", (req, res) => {
  res.json({
    tasks
  });
});

// =========================
// USER REGISTER
// =========================

app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Name, email and password are required."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = users.find(
    user => user.email === normalizedEmail
  );

  if (existingUser) {
    return res.status(409).json({
      error: "An account with this email already exists."
    });
  }

  const newUser = {
    id: users.length
      ? Math.max(...users.map(user => user.id)) + 1
      : 1,

    name: name.trim(),
    email: normalizedEmail,
    password,
    balance: 0,
    completedTasks: []
  };

  users.push(newUser);

  const token = createToken();

  sessions.set(token, {
    type: "user",
    id: newUser.id
  });

  res.json({
    message: "Account created successfully.",

    token,

    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      balance: newUser.balance,
      completedTasks: newUser.completedTasks
    }
  });
});

// =========================
// USER LOGIN
// =========================

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const user = users.find(
    user =>
      user.email === normalizedEmail &&
      user.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password."
    });
  }

  const token = createToken();

  sessions.set(token, {
    type: "user",
    id: user.id
  });

  res.json({
    message: "Login successful.",

    token,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      completedTasks: user.completedTasks
    }
  });
});

// =========================
// CURRENT USER
// =========================

app.get("/api/me", authenticateUser, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      balance: req.user.balance,
      completedTasks: req.user.completedTasks
    }
  });
});

// =========================
// USER LOGOUT
// =========================

app.post("/api/logout", authenticateUser, (req, res) => {
  sessions.delete(req.token);

  res.json({
    message: "Logged out successfully."
  });
});

// =========================
// COMPLETE TASK
// =========================

app.post(
  "/api/tasks/:id/complete",
  authenticateUser,
  (req, res) => {
    const taskId = Number(req.params.id);

    const task = tasks.find(
      task => task.id === taskId
    );

    if (!task) {
      return res.status(404).json({
        error: "Task not found."
      });
    }

    if (req.user.completedTasks.includes(taskId)) {
      return res.status(400).json({
        error: "You already completed this task."
      });
    }

    req.user.completedTasks.push(taskId);

    req.user.balance += Number(task.reward);

    res.json({
      message: "Task completed successfully.",

      reward: task.reward,

      balance: req.user.balance,

      completedTasks: req.user.completedTasks
    });
  }
);

// =========================
// ADMIN LOGIN
// =========================

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const admin = admins.find(
    admin =>
      admin.email === normalizedEmail &&
      admin.password === password
  );

  if (!admin) {
    return res.status(401).json({
      error: "Invalid admin email or password."
    });
  }

  const token = createToken();

  sessions.set(token, {
    type: "admin",
    id: admin.id
  });

  res.json({
    message: "Admin login successful.",

    token,

    admin: {
      id: admin.id,
      email: admin.email
    }
  });
});

// =========================
// ADMIN STATS
// =========================

app.get(
  "/api/admin/stats",
  authenticateAdmin,
  (req, res) => {
    const completedTasks = users.reduce(
      (total, user) =>
        total + user.completedTasks.length,
      0
    );

    const totalRewards = users.reduce(
      (total, user) =>
        total + Number(user.balance),
      0
    );

    res.json({
      users: users.length,
      tasks: tasks.length,
      completedTasks,
      totalRewards
    });
  }
);

// =========================
// ADMIN USERS
// =========================

app.get(
  "/api/admin/users",
  authenticateAdmin,
  (req, res) => {
    res.json({
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        completedTasks: user.completedTasks.length
      }))
    });
  }
);

// =========================
// ADMIN VIEW TASKS
// =========================

app.get(
  "/api/admin/tasks",
  authenticateAdmin,
  (req, res) => {
    res.json({
      tasks
    });
  }
);

// =========================
// ADMIN ADD TASK
// =========================

app.post(
  "/api/admin/tasks",
  authenticateAdmin,
  (req, res) => {
    const {
      title,
      description,
      reward
    } = req.body;

    if (!title || !description || reward === undefined) {
      return res.status(400).json({
        error:
          "Title, description and reward are required."
      });
    }

    const numericReward = Number(reward);

    if (
      !Number.isFinite(numericReward) ||
      numericReward < 0
    ) {
      return res.status(400).json({
        error: "Reward must be a valid number."
      });
    }

    const newTask = {
      id: tasks.length
        ? Math.max(...tasks.map(task => task.id)) + 1
        : 1,

      title: title.trim(),

      description: description.trim(),

      reward: numericReward,

      status: "Available"
    };

    tasks.push(newTask);

    res.json({
      message: "Task added successfully.",
      task: newTask
    });
  }
);

// =========================
// ADMIN DELETE TASK
// =========================

app.delete(
  "/api/admin/tasks/:id",
  authenticateAdmin,
  (req, res) => {
    const taskId = Number(req.params.id);

    const exists = tasks.some(
      task => task.id === taskId
    );

    if (!exists) {
      return res.status(404).json({
        error: "Task not found."
      });
    }

    tasks = tasks.filter(
      task => task.id !== taskId
    );

    res.json({
      message: "Task deleted successfully."
    });
  }
);

// =========================
// FRONTEND FALLBACK
// =========================

app.get("*", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

// =========================
// START SERVER
// =========================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `TaskEarn running on port ${PORT}`
  );
});