export const STATIONS = [
  {
    id: "live",
    label: "Live",
    stream: "https://icecast.radiofrance.fr/fip-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fip-midfi.mp3?id=radiofrance",
    livemetaId: 7,
    accent: "#E24A8A",
  },
  {
    id: "groove",
    label: "Groove",
    stream: "https://icecast.radiofrance.fr/fipgroove-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipgroove-midfi.mp3?id=radiofrance",
    livemetaId: 66,
    accent: "#3D7AD6",
  },
  {
    id: "jazz",
    label: "Jazz",
    stream: "https://icecast.radiofrance.fr/fipjazz-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipjazz-midfi.mp3?id=radiofrance",
    livemetaId: 65,
    accent: "#E6C84F",
  },
  {
    id: "electro",
    label: "Electro",
    stream: "https://icecast.radiofrance.fr/fipelectro-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipelectro-midfi.mp3?id=radiofrance",
    livemetaId: 74,
    accent: "#2BBF9A",
  },
];

export function getStation(id) {
  return STATIONS.find((station) => station.id === id) ?? STATIONS[0];
}

export function currentStep(data) {
  const now = Date.now() / 1000;
  const steps = Object.values(data?.steps ?? {});
  const level = data?.levels?.[0];
  const uid = level?.items?.[level.position];
  const hinted = uid ? data?.steps?.[uid] : null;

  if (hinted && hinted.start <= now && now < hinted.end) {
    return hinted;
  }

  const live = steps.find((step) => step.start <= now && now < step.end);
  return live ?? hinted ?? null;
}

function clean(value) {
  const text = (value || "").trim();
  if (!text || /^titre non défini$/i.test(text)) return "";
  return text;
}

export function nowPlayingFromStep(step) {
  if (!step) return null;
  const title = clean(step.title);
  const artist = clean(
    step.authors ||
      (Array.isArray(step.highlightedArtists)
        ? step.highlightedArtists.join(", ")
        : ""),
  );
  if (!title && !artist) return null;
  return {
    title,
    artist,
    visual: step.visual || "",
    end: step.end || 0,
  };
}
