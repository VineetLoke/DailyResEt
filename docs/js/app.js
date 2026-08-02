import {
  clearCredentials,
  getStoredCredentials,
  loadGist,
  saveCredentials,
  saveData,
  saveSchedule as saveScheduleFile,
} from "./storage.js";
import {
  MODULES,
  applyModuleAction,
  createModuleItem,
  renderModule,
} from "./modules.js";
import {
  DEFAULT_SCHEDULE,
  applyScheduleAction,
  renderSchedule,
  renderScheduleEditor,
} from "./schedule.js";
import { createRouter } from "./router.js";

/* This app never contains real credentials. Each device stores its own Gist
   ID + token in localStorage after a one-time setup screen, so nothing
   sensitive is committed to git. */

const app = document.getElementById("app");
const nav = document.getElementById("main-nav");
const router = createRouter(nav, renderRoute);

let credentials = getStoredCredentials();
let state = { completedByDate: {}, workout: [], reading: [], log: [] };
let schedule = [];
let saving = false;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function showSetupScreen(errorMsg) {
  router.hideNavigation();
  app.innerHTML = `<div class="setup">
    Paste your gist ID and token to connect this device.<br>
    ${errorMsg ? `<div style="color:#f87171;margin-top:8px">${errorMsg}</div>` : ""}
    <div style="margin-top:16px;text-align:left">
      <input type="text" id="s-gist" placeholder="Gist ID" style="width:100%;margin-bottom:8px" />
      <input type="text" id="s-token" placeholder="Token (github_pat_...)" style="width:100%" />
      <button class="add-btn" id="s-save" style="width:100%;margin-top:10px;padding:8px">Connect this device</button>
    </div>
  </div>`;
  document.getElementById("s-save").onclick = () => {
    const gistId = document.getElementById("s-gist").value.trim();
    const token = document.getElementById("s-token").value.trim();
    if (!gistId || !token) return;
    saveCredentials(gistId, token);
    credentials = { gistId, token };
    init();
  };
}

function init() {
  loadState();
  setInterval(loadState, 25000);
}

async function loadState() {
  try {
    const res = await loadGist(credentials);
    if (res.status === 401 || res.status === 404) {
      clearCredentials();
      credentials = { gistId: null, token: null };
      showSetupScreen(`That gist ID or token didn't work (${res.status}). Double-check and try again.`);
      return;
    }
    if (!res.ok) throw new Error("fetch failed " + res.status);

    const data = await res.json();
    const parsed = JSON.parse(data.files["data.json"].content || "{}");
    state = {
      completedByDate: parsed.completedByDate || {},
      workout: parsed.workout || [],
      reading: parsed.reading || [],
      log: parsed.log || [],
    };

    const scheduleFile = data.files["schedule.json"];
    if (scheduleFile) {
      const parsedSchedule = JSON.parse(scheduleFile.content || "[]");
      if (!Array.isArray(parsedSchedule)) throw new Error("schedule.json must contain an array");
      schedule = parsedSchedule;
    } else {
      schedule = DEFAULT_SCHEDULE.map(block => ({ ...block, days: [...block.days] }));
      await persistSchedule(false);
    }
    render();
  } catch (error) {
    router.hideNavigation();
    app.innerHTML = `<div class="setup">Couldn't load data. Check your GIST_ID and GITHUB_TOKEN are correct.<br><br>${error.message}</div>`;
  }
}

async function persistState() {
  saving = true;
  render();
  try {
    await saveData(credentials, state);
  } catch (error) {
    // The next edit retries; local state remains visible in the meantime.
  }
  saving = false;
  render();
}

async function persistSchedule(shouldRender = true) {
  saving = true;
  if (shouldRender) render();
  try {
    await saveScheduleFile(credentials, schedule);
  } catch (error) {
    // The next schedule edit retries; the visible schedule remains intact.
  }
  saving = false;
  if (shouldRender) render();
}

function renderSettings() {
  return `<div class="module">
    <div class="mtitle">Settings</div>
    <p class="settings-copy">This device is connected with credentials stored only in this browser's localStorage.</p>
    <div class="settings-actions">
      <button class="settings-btn" id="refresh">${saving ? "Saving…" : "Refresh data"}</button>
      <button class="settings-btn" id="reconnect">Reconnect this device</button>
    </div>
  </div>${renderScheduleEditor(schedule)}`;
}

function renderRoute(route) {
  if (route === "schedule") {
    app.innerHTML = renderSchedule(schedule, state.completedByDate);
  } else if (MODULES[route]) {
    app.innerHTML = renderModule(route, state[route] || []);
  } else {
    app.innerHTML = renderSettings();
  }
  wireEvents();
}

function render() {
  router.showNavigation();
  router.renderCurrentRoute();
}

function wireEvents() {
  const refresh = document.getElementById("refresh");
  if (refresh) refresh.onclick = loadState;

  const reconnect = document.getElementById("reconnect");
  if (reconnect) reconnect.onclick = () => {
    clearCredentials();
    credentials = { gistId: null, token: null };
    showSetupScreen();
  };

  app.querySelectorAll("[data-schedule-action]").forEach(element => element.onclick = () => {
    const result = applyScheduleAction(
      schedule,
      element.dataset.scheduleAction,
      element.dataset.scheduleId,
      element.closest(".schedule-editor-row"),
    );
    if (result.error) {
      window.alert(result.error);
      return;
    }
    schedule = result.schedule;
    persistSchedule();
  });

  app.querySelectorAll("[data-toggle-block]").forEach(element => element.onclick = () => {
    const id = element.dataset.toggleBlock;
    const today = todayKey();
    const day = { ...(state.completedByDate[today] || {}) };
    day[id] = !day[id];
    state.completedByDate[today] = day;
    persistState();
  });

  app.querySelectorAll("[data-module-action]").forEach(element => element.onclick = () => {
    const moduleKey = element.dataset.module;
    state[moduleKey] = applyModuleAction(moduleKey, state[moduleKey], element.dataset.moduleAction, element.dataset.id);
    persistState();
  });

  app.querySelectorAll("[data-module-add]").forEach(element => element.onclick = () => {
    const moduleKey = element.dataset.moduleAdd;
    const item = createModuleItem(moduleKey, app, todayKey());
    if (!item) return;
    state[moduleKey] = MODULES[moduleKey].newestFirst ? [item, ...state[moduleKey]] : [...state[moduleKey], item];
    persistState();
  });
}

router.start();

if (credentials.gistId && credentials.token) {
  init();
} else {
  showSetupScreen();
}
