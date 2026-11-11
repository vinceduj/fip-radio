// Live, Groove, Jazz, and Electro keep their original streams and colors.
// livemetaApi "live" is the newer endpoint. The others still answer on /pull.
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
  {
    id: "cultes",
    label: "Cultes",
    stream: "https://icecast.radiofrance.fr/fipcultes-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipcultes-midfi.mp3?id=radiofrance",
    livemetaId: 709,
    livemetaApi: "live",
    accent: "#E08A3A",
  },
  {
    id: "sacre",
    label: "Sacré français !",
    stream: "https://icecast.radiofrance.fr/fipsacrefrancais-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipsacrefrancais-midfi.mp3?id=radiofrance",
    livemetaId: 96,
    livemetaApi: "live",
    accent: "#E25B6A",
  },
  {
    id: "rock",
    label: "Rock",
    stream: "https://icecast.radiofrance.fr/fiprock-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fiprock-midfi.mp3?id=radiofrance",
    livemetaId: 64,
    accent: "#E04B3A",
  },
  {
    id: "reggae",
    label: "Reggae",
    stream: "https://icecast.radiofrance.fr/fipreggae-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipreggae-midfi.mp3?id=radiofrance",
    livemetaId: 71,
    accent: "#3FBF55",
  },
  {
    id: "pop",
    label: "Pop",
    stream: "https://icecast.radiofrance.fr/fippop-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fippop-midfi.mp3?id=radiofrance",
    livemetaId: 78,
    livemetaApi: "live",
    accent: "#C46BE8",
  },
  {
    id: "monde",
    label: "Monde",
    stream: "https://icecast.radiofrance.fr/fipworld-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipworld-midfi.mp3?id=radiofrance",
    livemetaId: 69,
    accent: "#3DB8C9",
  },
  {
    id: "nouveautes",
    label: "Nouveautés",
    stream: "https://icecast.radiofrance.fr/fipnouveautes-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipnouveautes-midfi.mp3?id=radiofrance",
    livemetaId: 70,
    accent: "#C6D64A",
  },
  {
    id: "hiphop",
    label: "Hip-Hop",
    stream: "https://icecast.radiofrance.fr/fiphiphop-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fiphiphop-midfi.mp3?id=radiofrance",
    livemetaId: 95,
    livemetaApi: "live",
    accent: "#8B7AE6",
  },
  {
    id: "metal",
    label: "Metal",
    stream: "https://icecast.radiofrance.fr/fipmetal-hifi.aac?id=radiofrance",
    fallback: "https://icecast.radiofrance.fr/fipmetal-midfi.mp3?id=radiofrance",
    livemetaId: 77,
    accent: "#C5C8D0",
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

const COVER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function nowPlayingFromLive(now) {
  if (!now?.songUuid) return null;
  const title = clean(now.firstLine);
  const artist = clean(now.secondLine);
  if (!title && !artist) return null;
  const cover = typeof now.cover === "string" ? now.cover.trim() : "";
  return {
    title,
    artist,
    visual: COVER_ID.test(cover)
      ? `https://www.radiofrance.fr/pikapi/images/${cover}/400x400?webp=false`
      : "",
    end: Number(now.endTime) || 0,
  };
}
