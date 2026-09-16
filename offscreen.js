const audio = document.getElementById("player");

let currentStation = null;
let usedFallback = false;
let error = null;

function state() {
  return {
    playing: !audio.paused && Boolean(audio.src),
    stationId: currentStation?.id ?? null,
    error,
  };
}

function notify() {
  chrome.runtime.sendMessage({ type: "player/state", state: state() }).catch(
    () => {},
  );
}

function applyMediaSession(nowPlaying, station) {
  if (!navigator.mediaSession) return;
  const title = nowPlaying?.title || station?.label || "FIP";
  const artist = nowPlaying?.artist || station?.label || "FIP";
  const artwork = nowPlaying?.visual
    ? [{ src: nowPlaying.visual, sizes: "400x400", type: "image/jpeg" }]
    : [];
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    album: "FIP",
    artwork,
  });
  navigator.mediaSession.playbackState = state().playing ? "playing" : "paused";
}

async function play(station) {
  currentStation = station;
  usedFallback = false;
  error = null;
  audio.src = station.stream;
  try {
    await audio.play();
  } catch {
    usedFallback = true;
    audio.src = station.fallback;
    try {
      await audio.play();
    } catch (err) {
      error = "Can't reach the stream";
      throw err;
    }
  }
}

function pause() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  error = null;
  if (navigator.mediaSession) {
    navigator.mediaSession.playbackState = "paused";
  }
}

audio.addEventListener("error", async () => {
  if (!currentStation || usedFallback) {
    error = "Can't reach the stream";
    notify();
    return;
  }
  usedFallback = true;
  audio.src = currentStation.fallback;
  try {
    await audio.play();
    error = null;
  } catch {
    error = "Can't reach the stream";
  }
  notify();
});

audio.addEventListener("playing", notify);
audio.addEventListener("pause", notify);

if (navigator.mediaSession) {
  navigator.mediaSession.setActionHandler("play", () => {
    if (currentStation) {
      play(currentStation).finally(notify);
    }
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    pause();
    notify();
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg?.type?.startsWith("player/")) return;

  if (msg.type === "player/ping") {
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "player/get") {
    sendResponse(state());
    return;
  }

  if (msg.type === "player/play") {
    play(msg.station)
      .then(() => sendResponse(state()))
      .catch(() => sendResponse(state()));
    return true;
  }

  if (msg.type === "player/pause") {
    pause();
    sendResponse(state());
    return;
  }

  if (msg.type === "player/meta") {
    applyMediaSession(msg.nowPlaying, msg.station ?? currentStation);
    sendResponse({ ok: true });
  }
});

chrome.runtime.sendMessage({ type: "player/ready" }).catch(() => {});
