const API = "/api";

let userToken = localStorage.getItem("taskearn_user_token");
let adminToken = localStorage.getItem("taskearn_admin_token");

let authMode = "login";

// =========================
// HELPERS
// =========================

function $(id) {
  return document.getElementById(id);
}

function hideAllViews() {
  $("homeView").classList.add("hidden");
  $("authView").classList.add("hidden");
  $("dashboardView").classList.add("hidden");
  $("adminLoginView").classList.add("hidden");
  $("adminView").classList.add("hidden");
}

function showHome() {
  hideAllViews();
  $("homeView").classList.remove("hidden");
}

function showAuth(mode) {
  hideAllViews();

  $("authView").classList.remove("hidden");

  authMode = mode;

  $("authMessage").textContent = "";

  if (mode === "register") {
    $("authTitle").textContent = "Create Account";
    $("authSubtitle").textContent =
      "Create your TaskEarn account and start earning.";
    $("authButton").textContent = "Create Account";
    $("nameField").classList.remove("hidden");
    $("name").required = true;
    $("authSwitch").textContent =
      "Already have an account? Login";
  } else {
    $("authTitle").textContent = "Welcome Back";
    $("authSubtitle").textContent =
      "Login to continue earning with TaskEarn.";
    $("authButton").textContent = "Login";
    $("nameField").classList.add("hidden");
    $("name").required = false;
    $("authSwitch").textContent =
      "Don't have an account? Create one";
  }
}

function showAdminLogin() {
  hideAllViews();

  $("adminLoginView").classList.remove("hidden");

  $("adminLoginMessage").textContent = "";
}

function showDashboard() {
  hideAllViews();

  $("dashboardView").classList.remove("hidden");

  loadDashboard();
}

function showAdminDashboard() {
  hideAllViews();

  $("adminView").classList.remove("hidden");

  loadAdminDashboard();
}

function setMessage(element, text, success = false) {
  element.textContent = text;

  element.style.color = success
    ? "#16a34a"
    : "#dc2626";
}

// =========================
// AUTH SWITCH
// =========================

$("authSwitch").addEventListener("click", () => {
  if (authMode === "login") {
    showAuth("register");
  } else {
    showAuth("login");
  }
});

// =========================
// USER LOGIN / REGISTER
// =========================

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value;

  const button = $("authButton");

  button.disabled = true;

  setMessage(
    $("authMessage"),
    authMode === "login"
      ? "Logging in..."
      : "Creating your account...",
    true
  );

  try {
    const endpoint =
      authMode === "login"
        ? "/login"
        : "/register";

    const body =
      authMode === "login"
        ? {
            email,
            password
          }
        : {
            name,
            email,
            password
          };

    const response = await fetch(
      API + endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Something went wrong."
      );
    }

    userToken = data.token;

    localStorage.setItem(
      "taskearn_user_token",
      userToken
    );

    $("authForm").reset();

    setMessage(
      $("authMessage"),
      "Success! Loading your dashboard...",
      true
    );

    setTimeout(() => {
      showDashboard();
    }, 500);

  } catch (error) {

    setMessage(
      $("authMessage"),
      error.message
    );

  } finally {

    button.disabled = false;

  }
});

// =========================
// LOAD USER DASHBOARD
// =========================

async function loadDashboard() {

  if (!userToken) {
    showAuth("login");
    return;
  }

  try {

    const meResponse = await fetch(
      API + "/me",
      {
        headers: {
          Authorization:
            "Bearer " + userToken
        }
      }
    );

    if (!meResponse.ok) {
      throw new Error("Session expired.");
    }

    const meData =
      await meResponse.json();

    const user = meData.user;

    $("userName").textContent =
      user.name;

    $("balance").textContent =
      "₦" + Number(user.balance).toLocaleString();

    $("completedCount").textContent =
      user.completedTasks.length;

    const taskResponse =
      await fetch(API + "/tasks");

    const taskData =
      await taskResponse.json();

    const availableTasks =
      taskData.tasks.filter(
        task =>
          !user.completedTasks.includes(
            task.id
          )
      );

    $("availableCount").textContent =
      availableTasks.length;

    renderTasks(
      taskData.tasks,
      user.completedTasks
    );

  } catch (error) {

    localStorage.removeItem(
      "taskearn_user_token"
    );

    userToken = null;

    showAuth("login");

    setMessage(
      $("authMessage"),
      "Please login again."
    );
  }
}

// =========================
// RENDER USER TASKS
// =========================

function renderTasks(
  tasks,
  completedTasks
) {

  const list = $("taskList");

  list.innerHTML = "";

  if (!tasks.length) {

    list.innerHTML = `
      <div class="panel">
        <h3>No tasks available</h3>
        <p>Check back later for new tasks.</p>
      </div>
    `;

    return;
  }

  tasks.forEach(task => {

    const completed =
      completedTasks.includes(task.id);

    const card =
      document.createElement("div");

    card.className = "taskCard";

    card.innerHTML = `
      <h3>${escapeHTML(task.title)}</h3>

      <p>
        ${escapeHTML(task.description)}
      </p>

      <div class="reward">
        ₦${Number(task.reward).toLocaleString()}
      </div>

      <button
        class="btn ${
          completed
            ? "btn-outline"
            : "btn-primary"
        }"
        ${
          completed
            ? "disabled"
            : ""
        }
        onclick="completeTask(${task.id})"
      >
        ${
          completed
            ? "✓ Completed"
            : "Complete Task"
        }
      </button>
    `;

    list.appendChild(card);
  });
}

// =========================
// COMPLETE TASK
// =========================

async function completeTask(taskId) {

  if (!userToken) {
    showAuth("login");
    return;
  }

  $("dashMessage").textContent =
    "Completing task...";

  try {

    const response =
      await fetch(
        `${API}/tasks/${taskId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer " + userToken
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to complete task."
      );
    }

    setMessage(
      $("dashMessage"),
      `🎉 Task completed! You earned ₦${Number(
        data.reward
      ).toLocaleString()}.`,
      true
    );

    await loadDashboard();

  } catch (error) {

    setMessage(
      $("dashMessage"),
      error.message
    );
  }
}

// =========================
// USER LOGOUT
// =========================

async function logout() {

  try {

    if (userToken) {

      await fetch(
        API + "/logout",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer " + userToken
          }
        }
      );
    }

  } catch (error) {
    // Continue logout even if request fails
  }

  userToken = null;

  localStorage.removeItem(
    "taskearn_user_token"
  );

  showHome();
}

// =========================
// ADMIN LOGIN
// =========================

$("adminLoginForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      $("adminEmail").value.trim();

    const password =
      $("adminPassword").value;

    setMessage(
      $("adminLoginMessage"),
      "Signing in...",
      true
    );

    try {

      const response =
        await fetch(
          API + "/admin/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              email,
              password
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Admin login failed."
        );
      }

      adminToken = data.token;

      localStorage.setItem(
        "taskearn_admin_token",
        adminToken
      );

      $("adminLoginForm").reset();

      showAdminDashboard();

    } catch (error) {

      setMessage(
        $("adminLoginMessage"),
        error.message
      );
    }
  }
);

// =========================
// ADMIN DASHBOARD
// =========================

async function loadAdminDashboard() {

  if (!adminToken) {
    showAdminLogin();
    return;
  }

  try {

    await loadAdminStats();

    await loadAdminTasks();

    await loadUsers();

  } catch (error) {

    adminToken = null;

    localStorage.removeItem(
      "taskearn_admin_token"
    );

    showAdminLogin();

    setMessage(
      $("adminLoginMessage"),
      "Admin session expired. Please login again."
    );
  }
}

// =========================
// ADMIN STATS
// =========================

async function loadAdminStats() {

  const response =
    await fetch(
      API + "/admin/stats",
      {
        headers: {
          Authorization:
            "Bearer " + adminToken
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Unable to load statistics."
    );
  }

  $("adminUsers").textContent =
    data.users;

  $("adminTasks").textContent =
    data.tasks;

  $("adminRewards").textContent =
    "₦" +
    Number(
      data.totalRewards
    ).toLocaleString();
}

// =========================
// ADMIN TASKS
// =========================

async function loadAdminTasks() {

  const response =
    await fetch(
      API + "/admin/tasks",
      {
        headers: {
          Authorization:
            "Bearer " + adminToken
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Unable to load tasks."
    );
  }

  const list =
    $("adminTaskList");

  list.innerHTML = "";

  if (!data.tasks.length) {

    list.innerHTML =
      "<p>No tasks available.</p>";

    return;
  }

  data.tasks.forEach(task => {

    const item =
      document.createElement("div");

    item.className = "adminItem";

    item.innerHTML = `
      <div>
        <h4>
          ${escapeHTML(task.title)}
        </h4>

        <p>
          ₦${Number(
            task.reward
          ).toLocaleString()}
        </p>
      </div>

      <button
        class="deleteButton"
        onclick="deleteTask(${task.id})"
      >
        Delete
      </button>
    `;

    list.appendChild(item);
  });
}

// =========================
// ADD TASK
// =========================

$("taskForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const title =
      $("taskTitle").value.trim();

    const description =
      $("taskDescription").value.trim();

    const reward =
      Number($("taskReward").value);

    setMessage(
      $("adminMessage"),
      "Adding task...",
      true
    );

    try {

      const response =
        await fetch(
          API + "/admin/tasks",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                "Bearer " + adminToken
            },
            body: JSON.stringify({
              title,
              description,
              reward
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to add task."
        );
      }

      $("taskForm").reset();

      setMessage(
        $("adminMessage"),
        "Task added successfully! 🎉",
        true
      );

      await loadAdminDashboard();

    } catch (error) {

      setMessage(
        $("adminMessage"),
        error.message
      );
    }
  }
);

// =========================
// DELETE TASK
// =========================

async function deleteTask(taskId) {

  const confirmed =
    confirm(
      "Are you sure you want to delete this task?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const response =
      await fetch(
        `${API}/admin/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              "Bearer " + adminToken
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to delete task."
      );
    }

    await loadAdminDashboard();

  } catch (error) {

    setMessage(
      $("adminMessage"),
      error.message
    );
  }
}

// =========================
// ADMIN USERS
// =========================

async function loadUsers() {

  const response =
    await fetch(
      API + "/admin/users",
      {
        headers: {
          Authorization:
            "Bearer " + adminToken
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Unable to load users."
    );
  }

  const list =
    $("userList");

  list.innerHTML = "";

  if (!data.users.length) {

    list.innerHTML =
      "<p>No registered users.</p>";

    return;
  }

  data.users.forEach(user => {

    const item =
      document.createElement("div");

    item.className = "adminItem";

    item.innerHTML = `
      <div>
        <h4>
          ${escapeHTML(user.name)}
        </h4>

        <p>
          ${escapeHTML(user.email)}
        </p>
      </div>

      <div>
        <strong>
          ₦${Number(
            user.balance
          ).toLocaleString()}
        </strong>

        <p>
          ${user.completedTasks}
          completed
        </p>
      </div>
    `;

    list.appendChild(item);
  });
}

// =========================
// ADMIN LOGOUT
// =========================

function adminLogout() {

  adminToken = null;

  localStorage.removeItem(
    "taskearn_admin_token"
  );

  showHome();
}

// =========================
// SECURITY HELPER
// =========================

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================
// INITIAL PAGE
// =========================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    showHome();

  }
);