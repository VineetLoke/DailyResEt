const GIST_ID_KEY = "dr_gist_id";
const TOKEN_KEY = "dr_token";

export function getStoredCredentials() {
  return {
    gistId: localStorage.getItem(GIST_ID_KEY),
    token: localStorage.getItem(TOKEN_KEY),
  };
}

export function saveCredentials(gistId, token) {
  localStorage.setItem(GIST_ID_KEY, gistId);
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearCredentials() {
  localStorage.removeItem(GIST_ID_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function gistUrl(credentials) {
  return `https://api.github.com/gists/${credentials.gistId}`;
}

function gistHeaders(credentials) {
  return {
    "Authorization": `token ${credentials.token}`,
    "Accept": "application/vnd.github+json",
  };
}

export function loadGist(credentials) {
  return fetch(gistUrl(credentials), { headers: gistHeaders(credentials) });
}

function saveGistFile(credentials, filename, content) {
  return fetch(gistUrl(credentials), {
    method: "PATCH",
    headers: { ...gistHeaders(credentials), "Content-Type": "application/json" },
    body: JSON.stringify({ files: { [filename]: { content: JSON.stringify(content) } } }),
  });
}

export function saveData(credentials, state) {
  return saveGistFile(credentials, "data.json", state);
}

export function saveSchedule(credentials, schedule) {
  return saveGistFile(credentials, "schedule.json", schedule);
}
