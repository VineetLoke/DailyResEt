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
  computeScheduleStats,
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

// Lucide Static v0.468.0 (ISC), copied from unpkg.com/lucide-static for inline use.
const ICONS = {
  "calendar-days": `<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>`,
  dumbbell: `<path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>`,
  "book-open": `<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>`,
  "notebook-pen": `<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>`,
  "settings-2": `<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>`,
  "list-todo": `<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
};

let credentials = getStoredCredentials();
let state = { completedByDate: {}, workout: [], reading: [], log: [] };
let schedule = [];
let saving = false;

function renderIcons(root) {
  root.querySelectorAll("[data-icon]").forEach(element => {
    const paths = ICONS[element.dataset.icon];
    if (!paths) return;
    element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${paths}</svg>`;
  });
}

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
  return `<section class="settings-page"><div class="module settings-panel">
    <div class="mtitle"><span class="icon" data-icon="settings-2" aria-hidden="true"></span>Settings</div>
    <p class="settings-copy">This device is connected with credentials stored only in this browser's localStorage.</p>
    <div class="settings-actions">
      <button class="settings-btn" id="refresh">${saving ? "Saving…" : "Refresh data"}</button>
      <button class="settings-btn" id="reconnect">Reconnect this device</button>
    </div>
  </div>${renderScheduleEditor(schedule)}</section>`;
}

function renderRoute(route) {
  if (route === "schedule") {
    app.innerHTML = renderSchedule(schedule, state.completedByDate, computeScheduleStats(schedule, state.completedByDate));
  } else if (MODULES[route]) {
    app.innerHTML = renderModule(route, state[route] || []);
  } else {
    app.innerHTML = renderSettings();
  }
  renderIcons(app);
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
renderIcons(nav);

if (credentials.gistId && credentials.token) {
  init();
} else {
  showSetupScreen();
}
