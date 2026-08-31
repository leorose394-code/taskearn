let token = localStorage.getItem("taskearn_token");
let adminToken = localStorage.getItem("taskearn_admin_token");

let authMode = "login";

function $(id) {
  return document.getElementById(id);
}


// =========================
// VIEW CONTROL
// =========================

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

  updateNav();
}


function showAuth(mode) {

  authMode = mode;

  hideAllViews();

  $("authView").classList.remove("hidden");

  const register = mode === "register";

  $("authTitle").textContent =
    register
      ? "Create Your Account"
      : "Login";

  $("authSubtitle").textContent =
    register
      ? "Start earning with TaskEarn."
      : "Welcome back to TaskEarn.";

  $("authButton").textContent =
    register
      ? "Create Account"
      : "Login";

  $("nameField").classList.toggle(
    "hidden",
    !register
  );

  $("authMessage").textContent = "";

  $("authSwitch").textContent =
    register
      ? "Already have an account? Login"
      : "New here? Create an account";

  $("authSwitch").onclick = () => {
    showAuth(
      register
        ? "login"
        : "register"
    );
  };
}


// =========================
// API HELPER
// =========================

async function api(url, options = {}) {

  const headers = {
    "Content-Type": "application/json"
  };

  if (options.admin) {

    if (adminToken) {
      headers.Authorization =
        `Bearer ${adminToken}`;
    }

  } else {

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Something went wrong."
    );
  }

  return data;
}


// =========================
// USER REGISTER / LOGIN
// =========================

$("authForm").addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    $("authMessage").textContent =
      "Please wait...";

    try {

      const body = {
        email: $("email").value,
        password: $("password").value
      };

      if (authMode === "register") {
        body.name = $("name").value;
      }

      const data = await api(
        authMode === "register"
          ? "/api/register"
          : "/api/login",
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );

      token = data.token;

      localStorage.setItem(
        "taskearn_token",
        token
      );

      await loadDashboard();

    } catch (error) {

      $("authMessage").textContent =
        error.message;
    }
  }
);


// =========================
// USER DASHBOARD
// =========================

async function loadDashboard() {

  if (!token) {
    showHome();
    return;
  }

  try {

    const me =
      await api("/api/me");

    const taskData =
      await api("/api/tasks");

    hideAllViews();

    $("dashboardView")
      .classList.remove("hidden");

    $("userName").textContent =
      me.user.name;

    $("balance").textContent =
      `₦${Number(
        me.user.balance
      ).toLocaleString()}`;

    $("completedCount").textContent =
      me.user.completedTasks.length;

    const completed =
      new Set(me.user.completedTasks);

    const available =
      taskData.tasks.filter(
        task => !completed.has(task.id)
      );

    $("availableCount").textContent =
      available.length;

    $("taskList").innerHTML =
      taskData.tasks.map(task => {

        const done =
          completed.has(task.id);

        return `
          <div class="card">

            <span class="pill">
              Task #${task.id}
            </span>

            <h3>
              ${escapeHtml(task.title)}
            </h3>

            <p>
              ${escapeHtml(task.description)}
            </p>

            <div class="reward">
              ₦${Number(
                task.reward
              ).toLocaleString()}
            </div>

            ${
              done
                ? `
                  <button
                    class="ghost full"
                    disabled
                  >
                    ✓ Completed
                  </button>
                `
                : `
                  <button
                    class="primary full"
                    onclick="completeTask(${task.id})"
                  >
                    Complete Task
                  </button>
                `
            }

          </div>
        `;

      }).join("");

    updateNav();

  } catch (error) {

    token = null;

    localStorage.removeItem(
      "taskearn_token"
    );

    showHome();
  }
}


// =========================
// COMPLETE TASK
// =========================

async function completeTask(id) {

  $("dashMessage").textContent =
    "Completing task...";

  try {

    const data =
      await api(
        `/api/tasks/${id}/complete`,
        {
          method: "POST"
        }
      );

    $("dashMessage").textContent =
      `Success! You earned ₦${Number(
        data.reward
      ).toLocaleString()}.`;

    await loadDashboard();

  } catch (error) {

    $("dashMessage").textContent =
      error.message;
  }
}


// =========================
// USER LOGOUT
// =========================

async function logout() {

  try {

    await api(
      "/api/logout",
      {
        method: "POST"
      }
    );

  } catch (error) {}

  token = null;

  localStorage.removeItem(
    "taskearn_token"
  );

  showHome();
}


// =========================
// ADMIN LOGIN
// =========================

function showAdminLogin() {

  hideAllViews();

  $("adminLoginView")
    .classList.remove("hidden");
}


$("adminLoginForm").addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    $("adminLoginMessage")
      .textContent =
      "Please wait...";

    try {

      const data =
        await api(
          "/api/admin/login",
          {
            method: "POST",

            body: JSON.stringify({
              email:
                $("adminEmail").value,

              password:
                $("adminPassword").value
            })
          }
        );

      adminToken = data.token;

      localStorage.setItem(
        "taskearn_admin_token",
        adminToken
      );

      await loadAdmin();

    } catch (error) {

      $("adminLoginMessage")
        .textContent =
        error.message;
    }
  }
);


// =========================
// ADMIN DASHBOARD
// =========================

async function loadAdmin() {

  if (!adminToken) {
    showAdminLogin();
    return;
  }

  try {

    const stats =
      await api(
        "/api/admin/stats",
        {
          admin: true
        }
      );

    const taskData =
      await api("/api/tasks");

    const userData =
      await api(
        "/api/admin/users",
        {
          admin: true
        }
      );

    hideAllViews();

    $("adminView")
      .classList.remove("hidden");

    $("adminUsers").textContent =
      stats.users;

    $("adminTasks").textContent =
      stats.tasks;

    $("adminRewards").textContent =
      `₦${Number(
        stats.totalRewards
      ).toLocaleString()}`;

    renderAdminTasks(
      taskData.tasks
    );

    renderUsers(
      userData.users
    );

  } catch (error) {

    adminToken = null;

    localStorage.removeItem(
      "taskearn_admin_token"
    );

    showAdminLogin();
  }
}


// =========================
// ADMIN TASKS
// =========================

function renderAdminTasks(tasks) {

  if (!tasks.length) {

    $("adminTaskList").innerHTML =
      "<p>No tasks available.</p>";

    return;
  }

  $("adminTaskList").innerHTML =
    tasks.map(task => `

      <div class="adminTask">

        <div>

          <strong>
            ${escapeHtml(task.title)}
          </strong>

          <br>

          <span class="muted">
            ₦${Number(
              task.reward
            ).toLocaleString()}
          </span>

        </div>

        <button
          class="danger"
          onclick="deleteTask(${task.id})"
        >
          Delete
        </button>

      </div>

    `).join("");
}


// =========================
// ADD TASK
// =========================

$("taskForm").addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    $("adminMessage").textContent =
      "Adding task...";

    try {

      await api(
        "/api/admin/tasks",
        {
          method: "POST",

          admin: true,

          body: JSON.stringify({

            title:
              $("taskTitle").value,

            description:
              $("taskDescription").value,

            reward:
              Number(
                $("taskReward").value
              )
          })
        }
      );

      $("taskForm").reset();

      $("adminMessage").textContent =
        "Task added successfully.";

      await loadAdmin();

    } catch (error) {

      $("adminMessage").textContent =
        error.message;
    }
  }
);


// =========================
// DELETE TASK
// =========================

async function deleteTask(id) {

  if (
    !confirm(
      "Are you sure you want to delete this task?"
    )
  ) {
    return;
  }

  try {

    await api(
      `/api/admin/tasks/${id}`,
      {
        method: "DELETE",
        admin: true
      }
    );

    await loadAdmin();

  } catch (error) {

    alert(error.message);
  }
}


// =========================
// USERS
// =========================

function renderUsers(users) {

  if (!users.length) {

    $("userList").innerHTML =
      "<p>No users registered yet.</p>";

    return;
  }

  $("userList").innerHTML =
    users.map(user => `

      <div class="userRow">

        <div>

          <strong>
            ${escapeHtml(user.name)}
          </strong>

          <br>

          <span class="muted">
            ${escapeHtml(user.email)}
          </span>

        </div>

        <div>

          ₦${Number(
            user.balance
          ).toLocaleString()}

          ·

          ${user.completedTasks}
          completed

        </div>

      </div>

    `).join("");
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
// NAVIGATION
// =========================

function updateNav() {

  const nav =
    $("navArea");

  if (adminToken) {

    nav.innerHTML = `

      <button
        class="primary"
        onclick="loadAdmin()"
      >
        Admin Dashboard
      </button>

    `;

    return;
  }

  if (token) {

    nav.innerHTML = `

      <button
        class="primary"
        onclick="loadDashboard()"
      >
        My Dashboard
      </button>

    `;

    return;
  }

  nav.innerHTML = `

    <button
      class="ghost"
      onclick="showAuth('login')"
    >
      Login
    </button>

    <button
      class="primary"
      onclick="showAuth('register')"
    >
      Create Account
    </button>

  `;
}


// =========================
// HTML ESCAPE
// =========================

function escapeHtml(value) {

  const div =
    document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}


// =========================
// START
// =========================

if (
  new URLSearchParams(
    window.location.search
  ).get("admin") === "1"
) {

  showAdminLogin();

} else if (adminToken) {

  loadAdmin();

} else if (token) {

  loadDashboard();

} else {

  showHome();
}
