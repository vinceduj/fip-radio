import {
  getStation,
  currentStep,
  nowPlayingFromStep,
} from "./stations.js";

const LIVEMETA_ALARM = "livemeta";

let creatingOffscreen = null;

async function hasOffscreenDocument() {
  if (chrome.offscreen.hasDocument) {
    return chrome.offscreen.hasDocument();
  }
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  return contexts.length > 0;
}

async function ensureOffscreen() {
  if (await hasOffscreenDocument()) return;
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = (async () => {
    if (await hasOffscreenDocument()) return;
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play FIP webradio streams in the background",
    });

    for (let i = 0; i < 25; i += 1) {
      try {
        const res = await chrome.runtime.sendMessage({ type: "player/ping" });
        if (res?.ok) return;
      } catch {
        // Document is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  })();

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function playerState() {
  if (!(await hasOffscreenDocument())) {
    return { playing: false, stationId: null, error: null };
  }
  try {
    return await chrome.runtime.sendMessage({ type: "player/get" });
  } catch {
    return { playing: false, stationId: null, error: null };
  }
}

async function getFullState() {
  const stored = await chrome.storage.local.get(["stationId", "nowPlaying"]);
  const player = await playerState();
  return {
    stationId: player.stationId || stored.stationId || "live",
    playing: Boolean(player.playing),
    nowPlaying: stored.nowPlaying ?? null,
    error: player.error ?? null,
  };
}

function broadcast(state) {
  chrome.runtime.sendMessage({ type: "ui/state", state }).catch(() => {});
}

function tooltipTitle(state) {
  const title = state.nowPlaying?.title?.trim() || "";
  const artist = state.nowPlaying?.artist?.trim() || "";
  const text =
    title && artist ? `${title} — ${artist}` : title || artist || "FIP";
  return text.length > 128 ? `${text.slice(0, 127)}…` : text;
}

async function syncAction(state) {
  const station = getStation(state.stationId);
  await chrome.action.setIcon({
    path: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
  });
  await chrome.action.setBadgeText({ text: state.playing ? "▶" : "" });
  if (state.playing) {
    await chrome.action.setBadgeBackgroundColor({ color: station.accent });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: "#121212" });
    }
  }
  await chrome.action.setTitle({ title: tooltipTitle(state) });
}

function scheduleLivemeta(step) {
  const now = Date.now();
  let when = now + 30_000;
  if (step?.end) {
    when = Math.min(
      Math.max(step.end * 1000 + 1500, now + 4000),
      now + 120_000,
    );
  }
  chrome.alarms.create(LIVEMETA_ALARM, { when });
}

async function refreshNowPlaying(station) {
  try {
    const res = await fetch(
      `https://api.radiofrance.fr/livemeta/pull/${station.livemetaId}`,
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const step = currentStep(data);
    const nowPlaying = nowPlayingFromStep(step);
    await chrome.storage.local.set({ nowPlaying, stationId: station.id });
    chrome.runtime
      .sendMessage({
        type: "player/meta",
        nowPlaying,
        station,
      })
      .catch(() => {});
    const state = await getFullState();
    await syncAction(state);
    broadcast(state);
    if (state.playing) scheduleLivemeta(step);
    else await chrome.alarms.clear(LIVEMETA_ALARM);
  } catch {
    if ((await getFullState()).playing) scheduleLivemeta(null);
  }
}

async function play(stationId) {
  const station = getStation(stationId);
  await ensureOffscreen();
  const player = await chrome.runtime.sendMessage({
    type: "player/play",
    station,
  });
  await chrome.storage.local.set({ stationId: station.id });
  const state = await getFullState();
  await syncAction(state);
  if (state.playing) refreshNowPlaying(station);
  broadcast(state);
  return state;
}

async function pause() {
  if (await hasOffscreenDocument()) {
    await chrome.runtime.sendMessage({ type: "player/pause" });
  }
  await chrome.alarms.clear(LIVEMETA_ALARM);
  const state = await getFullState();
  await syncAction(state);
  broadcast(state);
  return state;
}

async function toggle(stationId) {
  const state = await getFullState();
  if (state.playing && state.stationId === stationId) {
    return pause();
  }
  return play(stationId);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "ui/get-state") {
    getFullState().then((state) => {
      sendResponse(state);
      const station = getStation(state.stationId);
      refreshNowPlaying(station);
    });
    return true;
  }

  if (msg?.type === "ui/toggle") {
    toggle(msg.stationId).then(sendResponse);
    return true;
  }

  if (msg?.type === "player/state") {
    getFullState().then(async (state) => {
      await syncAction(state);
      broadcast(state);
      if (state.playing) refreshNowPlaying(getStation(state.stationId));
      else chrome.alarms.clear(LIVEMETA_ALARM);
    });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== LIVEMETA_ALARM) return;
  const state = await getFullState();
  if (!state.playing) return;
  await refreshNowPlaying(getStation(state.stationId));
});

chrome.runtime.onInstalled.addListener(async () => {
  await syncAction(await getFullState());
});

getFullState().then(syncAction).catch(() => {});
