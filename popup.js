import { resolveStation, resolveStations, loadPreferences } from "./preferences.js";

const stationsEl = document.getElementById("stations");
const emptyEl = document.getElementById("empty");
const wordmarkEl = document.getElementById("wordmark");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const settingsEl = document.getElementById("settings");

let prefs = {};
let stations = [];
let lastState = null;

function applyState(state) {
  lastState = state ?? lastState;
  const playingId = lastState?.stationId;
  const active = stations.find((station) => station.id === playingId);
  const accent = (active ?? resolveStation(playingId, prefs)).accent;
  wordmarkEl.style.setProperty("--accent", accent);
  wordmarkEl.classList.toggle("playing", Boolean(lastState?.playing));

  emptyEl.hidden = stations.length > 0;
  stationsEl.replaceChildren();
  for (const station of stations) {
    const playingHere =
      lastState?.stationId === station.id && Boolean(lastState?.playing);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "station";
    if (playingHere) button.classList.add("active");
    button.style.setProperty("--accent", station.accent);
    button.setAttribute("aria-pressed", String(playingHere));

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = station.label;
    button.append(label);

    if (playingHere) {
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "▶";
      button.append(mark);
    }

    button.addEventListener("click", () => toggle(station.id));
    stationsEl.append(button);
  }

  if (!lastState) return;

  if (lastState.error) {
    titleEl.textContent = lastState.error;
    artistEl.textContent = "";
    return;
  }

  if (!stations.length) {
    titleEl.textContent = "";
    artistEl.textContent = "";
    return;
  }

  const title = lastState.nowPlaying?.title ?? "";
  const artist = lastState.nowPlaying?.artist ?? "";
  titleEl.textContent = title || artist;
  artistEl.textContent = title ? artist : "";
}

async function toggle(stationId) {
  try {
    const state = await chrome.runtime.sendMessage({
      type: "ui/toggle",
      stationId,
    });
    applyState(state);
  } catch {
    titleEl.textContent = "Reload the extension and try again";
    artistEl.textContent = "";
  }
}

settingsEl.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "ui/state") applyState(msg.state);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.preferences) return;
  prefs = changes.preferences.newValue ?? {};
  stations = resolveStations(prefs);
  applyState(lastState);
});

try {
  prefs = await loadPreferences();
  stations = resolveStations(prefs);
  const state = await chrome.runtime.sendMessage({ type: "ui/get-state" });
  applyState(state);
} catch {
  if (!stations.length) stations = resolveStations(prefs);
  applyState({
    stationId: "live",
    playing: false,
    nowPlaying: null,
    error: "Reload the extension and try again",
  });
}
