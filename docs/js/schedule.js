const ALL = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DEFAULT_SCHEDULE = [
  { id:"b1", start:"07:00", end:"07:30", label:"Tank, bathroom, breakfast", cat:"base", days:ALL },
  { id:"b2", start:"07:30", end:"08:15", label:"Calisthenics", cat:"training", days:ALL },
  { id:"b3", start:"08:15", end:"08:30", label:"Stretching (knee-focused)", cat:"training", days:ALL },
  { id:"b4", start:"08:30", end:"09:15", label:"Deep focus: agency work", cat:"career", days:ALL },
  { id:"b5", start:"09:15", end:"09:35", label:"Reading", cat:"mind", days:ALL },
  { id:"b6", start:"09:35", end:"10:00", label:"Free / phone", cat:"base", days:ALL },
  { id:"b7a", start:"10:00", end:"11:00", label:"Cyber study", cat:"mind", days:[1,3,5] },
  { id:"b7b", start:"10:00", end:"11:00", label:"Martial arts basics", cat:"training", days:[2,4,6] },
  { id:"b7c", start:"10:00", end:"11:00", label:"Flex / recover", cat:"base", days:[0] },
  { id:"b8", start:"11:00", end:"14:00", label:"Free block / errands", cat:"base", days:ALL },
  { id:"b9", start:"14:00", end:"14:30", label:"Lunch", cat:"base", days:ALL },
  { id:"b10", start:"14:30", end:"16:00", label:"Nap (cap 90 min)", cat:"base", days:ALL },
  { id:"b11", start:"16:00", end:"17:00", label:"Agency work / cyber (2nd block)", cat:"career", days:ALL },
  { id:"b12", start:"17:00", end:"18:00", label:"Free time / phone / games", cat:"base", days:ALL },
  { id:"b13", start:"18:00", end:"19:00", label:"Bath, wind down", cat:"base", days:ALL },
  { id:"b14", start:"20:00", end:"21:30", label:"Make dinner", cat:"base", days:ALL },
  { id:"b15", start:"21:30", end:"22:00", label:"Dinner", cat:"base", days:ALL },
  { id:"b16", start:"22:00", end:"23:00", label:"Phone / games (capped)", cat:"base", days:ALL },
  { id:"b17", start:"23:00", end:"24:00", label:"Wind down, no screen", cat:"mind", days:ALL },
];

function toMin(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function dayOfWeekForKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function previousDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 1));
  return date.toISOString().slice(0, 10);
}

export function computeScheduleStats(schedule, completedByDate, todayKey = new Date().toISOString().slice(0, 10)) {
  let streak = 0;
  let dateKey = todayKey;

  while (true) {
    const expectedBlocks = schedule.filter(block => block.days.includes(dayOfWeekForKey(dateKey)));
    const completed = completedByDate[dateKey] || {};
    const isComplete = expectedBlocks.length > 0 && expectedBlocks.every(block => completed[block.id]);
    if (!isComplete) break;
    streak += 1;
    dateKey = previousDateKey(dateKey);
  }
  return { streak };
}

export function renderSchedule(schedule, completedByDate, stats, now = new Date()) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dayNum = now.getDay();
  const blocks = schedule.filter(block => block.days.includes(dayNum));
  const today = now.toISOString().slice(0, 10);
  const completedToday = completedByDate[today] || {};
  const doneCount = blocks.filter(block => completedToday[block.id]).length;
  const pct = blocks.length ? Math.round(doneCount / blocks.length * 100) : 0;
  const dateStr = now.toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" });

  let html = `
    <div class="header"><div><p class="eyebrow">Today’s practice</p><h1 class="page-title"><span class="icon" data-icon="calendar-days" aria-hidden="true"></span>Daily reset</h1></div><span class="date">${dateStr}</span></div>
    <div class="progress-row">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="pct">${pct}% done</span>
    </div>
    <div id="timeline" class="timeline" style="--streak-line-width:${(1 + Math.min(stats.streak, 14) * 5 / 14).toFixed(2)}px;--streak-line-opacity:${(0.18 + Math.min(stats.streak, 14) * 0.82 / 14).toFixed(2)};--streak-line-glow:${Math.min(stats.streak, 14)}px" aria-label="Schedule timeline with a ${stats.streak}-day completion streak">`;

  for (const block of blocks) {
    const isNow = nowMin >= toMin(block.start) && nowMin < toMin(block.end);
    const done = !!completedToday[block.id];
    html += `
      <div class="block ${done ? "is-complete" : ""} ${isNow ? "is-current" : ""}">
        <span class="timeline-node" aria-hidden="true"></span>
        <span class="btime">${escapeHtml(block.start)}</span>
        <div class="block-copy"><span class="blabel ${done ? "done" : ""} ${isNow ? "now" : ""}">${escapeHtml(block.label)}</span><span class="bcategory">[${escapeHtml(block.cat)}]</span></div>
        ${isNow ? `<span class="nowtag">now</span>` : ""}
        <button class="check ${done ? "on" : ""}" data-toggle-block="${escapeHtml(block.id)}" aria-label="Mark ${escapeHtml(block.label)} ${done ? "incomplete" : "complete"}"><span class="icon" data-icon="check" aria-hidden="true"></span></button>
      </div>`;
  }
  return `${html}</div>`;
}

function renderScheduleEditorRow(schedule, block, index, isNew = false) {
  const id = escapeHtml(block.id || "");
  const days = new Set(block.days || []);
  return `<div class="schedule-editor-row" ${isNew ? "data-schedule-new" : `data-schedule-block="${id}"`}>
    <div class="schedule-fields">
      <label class="schedule-field">Start
        <input type="text" inputmode="numeric" data-schedule-field="start" value="${escapeHtml(block.start || "")}" placeholder="07:00" />
      </label>
      <label class="schedule-field">End
        <input type="text" inputmode="numeric" data-schedule-field="end" value="${escapeHtml(block.end || "")}" placeholder="07:30" />
      </label>
      <label class="schedule-field wide">Label
        <input type="text" data-schedule-field="label" value="${escapeHtml(block.label || "")}" placeholder="Schedule block" />
      </label>
      <label class="schedule-field wide">Category tag
        <input type="text" data-schedule-field="cat" value="${escapeHtml(block.cat || "base")}" placeholder="base" />
      </label>
    </div>
    <div class="day-picks">${DAY_NAMES.map((name, day) => `<label class="day-pick"><input type="checkbox" data-schedule-day="${day}" ${days.has(day) ? "checked" : ""} />${name}</label>`).join("")}</div>
    <div class="schedule-row-actions">
      ${isNew
        ? `<button type="button" class="settings-btn" data-schedule-action="add">Add block</button>`
        : `<button type="button" class="settings-btn" data-schedule-action="save" data-schedule-id="${id}">Save</button>
           <button type="button" class="settings-btn" data-schedule-action="move-up" data-schedule-id="${id}" ${index === 0 ? "disabled" : ""}>Up</button>
           <button type="button" class="settings-btn" data-schedule-action="move-down" data-schedule-id="${id}" ${index === schedule.length - 1 ? "disabled" : ""}>Down</button>
           <button type="button" class="settings-btn" data-schedule-action="delete" data-schedule-id="${id}">Delete</button>`}
    </div>
  </div>`;
}

export function renderScheduleEditor(schedule) {
  const newBlock = { start: "", end: "", label: "", cat: "base", days: [...ALL] };
  return `<div class="module schedule-editor">
    <div class="mtitle"><span class="icon" data-icon="list-todo" aria-hidden="true"></span>Schedule editor</div>
    <p class="settings-copy">Changes save to <code>schedule.json</code> in your Gist. Use Up and Down to reorder blocks.</p>
    <div class="schedule-editor-title">Existing blocks</div>
    ${schedule.map((block, index) => renderScheduleEditorRow(schedule, block, index)).join("")}
    <div class="schedule-editor-title">Add a block</div>
    ${renderScheduleEditorRow(schedule, newBlock, -1, true)}
  </div>`;
}

function readScheduleEditorRow(row, id) {
  const getField = key => row.querySelector(`[data-schedule-field="${key}"]`).value.trim();
  return {
    id,
    start: getField("start"),
    end: getField("end"),
    label: getField("label"),
    cat: getField("cat") || "base",
    days: [...row.querySelectorAll("[data-schedule-day]:checked")].map(input => Number(input.dataset.scheduleDay)),
  };
}

function validScheduleBlock(block) {
  const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value);
  return validTime(block.start) && validTime(block.end) && block.label && block.days.length;
}

export function applyScheduleAction(schedule, action, id, row) {
  if (action === "delete") {
    return { schedule: schedule.filter(block => block.id !== id) };
  }
  if (action === "move-up" || action === "move-down") {
    const index = schedule.findIndex(block => block.id === id);
    const targetIndex = action === "move-up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= schedule.length) return { schedule };
    const reordered = [...schedule];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    return { schedule: reordered };
  }

  const blockId = action === "add" ? `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : id;
  const block = readScheduleEditorRow(row, blockId);
  if (!validScheduleBlock(block)) {
    return { schedule, error: "Each schedule block needs a start time, end time, label, and at least one day." };
  }
  return {
    schedule: action === "add"
      ? [...schedule, block]
      : schedule.map(existing => existing.id === id ? block : existing),
  };
}
