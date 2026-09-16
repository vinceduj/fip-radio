import { STATIONS } from "./stations.js";

const stationsEl = document.getElementById("stations");
const wordmarkEl = document.getElementById("wordmark");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");

function applyState(state) {
  if (!state) return;

  wordmarkEl.classList.toggle("playing", Boolean(state.playing));

  stationsEl.replaceChildren();
  for (const station of STATIONS) {
    const playingHere = state.stationId === station.id && state.playing;
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

  if (state.error) {
    titleEl.textContent = state.error;
    artistEl.textContent = "";
    return;
  }

  const title = state.nowPlaying?.title ?? "";
  const artist = state.nowPlaying?.artist ?? "";
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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "ui/state") applyState(msg.state);
});

try {
  const state = await chrome.runtime.sendMessage({ type: "ui/get-state" });
  applyState(state);
} catch {
  applyState({
    stationId: "live",
    playing: false,
    nowPlaying: null,
    error: null,
  });
}
