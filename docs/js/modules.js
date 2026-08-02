export const MODULES = {
  workout: {
    title: "Workout plan",
    fields: [
      { key: "name", placeholder: "Exercise, e.g. Pike push-ups" },
      { key: "detail", placeholder: "Sets x reps", inputStyle: "max-width:100px" },
    ],
    itemType: "checkbox",
    emptyText: "No exercises yet. Add your push/pull/legs/core moves below.",
  },
  reading: {
    title: "Reading list",
    fields: [{ key: "title", placeholder: "Book title, e.g. Atomic Habits" }],
    itemType: "cycle",
    states: ["to-read", "reading", "done"],
    initialState: "reading",
    stateLabels: { "to-read": "To read", reading: "Reading", done: "Done" },
    emptyText: "Add books as you go. Tap the pill to cycle status.",
  },
  log: {
    title: "Wins / log",
    fields: [{ key: "text", placeholder: "What happened today" }],
    itemType: "note",
    dateStamped: true,
    newestFirst: true,
    emptyText: "Log anything worth remembering.",
  },
};

function icon() {
  return `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="#020617" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function renderModule(moduleKey, items) {
  const config = MODULES[moduleKey];
  let html = `<div class="module"><div class="mtitle">${config.title}</div>`;

  if (!items.length) html += `<div class="empty">${config.emptyText}</div>`;

  for (const item of items) {
    const itemText = config.fields
      .map(field => item[field.key])
      .filter(Boolean)
      .join(moduleKey === "workout" ? " — " : "");

    html += `<div class="item-row">`;
    if (config.itemType === "checkbox") {
      html += `<button class="check ${item.done ? "on-orange" : ""}" data-module-action="toggle" data-module="${moduleKey}" data-id="${item.id}">${icon()}</button>`;
    }
    if (config.dateStamped) {
      html += `<span class="logdate">${item.date.slice(5)}</span>`;
    }
    html += `<span class="item-text ${item.done ? "done" : ""}">${itemText}</span>`;
    if (config.itemType === "cycle") {
      const status = item.status || config.states[0];
      const stateClass = status === "reading" ? "reading" : status === "done" ? "done" : "";
      html += `<button class="pill ${stateClass}" data-module-action="cycle" data-module="${moduleKey}" data-id="${item.id}">${config.stateLabels[status] || status}</button>`;
    }
    html += `<button class="del" data-module-action="delete" data-module="${moduleKey}" data-id="${item.id}">&times;</button></div>`;
  }

  html += `<div class="add-row">`;
  for (const field of config.fields) {
    html += `<input type="text" id="module-${moduleKey}-${field.key}" placeholder="${field.placeholder}" ${field.inputStyle ? `style="${field.inputStyle}"` : ""} />`;
  }
  html += `<button class="add-btn" data-module-add="${moduleKey}">+</button></div></div>`;
  return html;
}

export function createModuleItem(moduleKey, root, date) {
  const config = MODULES[moduleKey];
  const fields = Object.fromEntries(config.fields.map(field => [
    field.key,
    root.querySelector(`#module-${moduleKey}-${field.key}`).value.trim(),
  ]));
  if (!fields[config.fields[0].key]) return null;

  const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...fields };
  if (config.itemType === "checkbox") item.done = false;
  if (config.itemType === "cycle") item.status = config.initialState || config.states[0];
  if (config.dateStamped) item.date = date;
  return item;
}

export function applyModuleAction(moduleKey, items, action, id) {
  const config = MODULES[moduleKey];
  if (action === "delete") {
    return items.filter(item => item.id !== id);
  }
  if (action === "toggle") {
    return items.map(item => item.id === id ? { ...item, done: !item.done } : item);
  }
  if (action === "cycle") {
    return items.map(item => {
      if (item.id !== id) return item;
      const currentIndex = config.states.indexOf(item.status);
      return { ...item, status: config.states[(currentIndex + 1) % config.states.length] };
    });
  }
  return items;
}
