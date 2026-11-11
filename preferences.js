import { STATIONS } from "./stations.js";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(value) {
  if (typeof value !== "string" || !HEX.test(value.trim())) return "";
  let hex = value.trim().slice(1).toUpperCase();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${hex}`;
}

export function normalizePreferences(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const enabled = {};
  const accents = {};
  const enabledIn = source.enabled;
  const accentsIn = source.accents;

  for (const station of STATIONS) {
    if (enabledIn && enabledIn[station.id] === false) {
      enabled[station.id] = false;
    }
    const color = accentsIn ? normalizeHex(accentsIn[station.id]) : "";
    if (color && color !== station.accent.toUpperCase()) {
      accents[station.id] = color;
    }
  }

  const prefs = {};
  if (Object.keys(enabled).length) prefs.enabled = enabled;
  if (Object.keys(accents).length) prefs.accents = accents;
  return prefs;
}

export function resolveStations(raw) {
  const prefs = normalizePreferences(raw);
  const enabled = prefs.enabled ?? {};
  const accents = prefs.accents ?? {};
  return STATIONS.filter((station) => enabled[station.id] !== false).map(
    (station) => ({
      ...station,
      accent: accents[station.id] || station.accent,
    }),
  );
}

export function resolveStation(id, raw) {
  const prefs = normalizePreferences(raw);
  const base = STATIONS.find((station) => station.id === id) ?? STATIONS[0];
  return {
    ...base,
    accent: prefs.accents?.[base.id] || base.accent,
  };
}

export function isPlayable(id, raw) {
  const prefs = normalizePreferences(raw);
  return prefs.enabled?.[id] !== false && STATIONS.some((station) => station.id === id);
}

export async function loadPreferences() {
  const stored = await chrome.storage.local.get("preferences");
  return normalizePreferences(stored.preferences);
}
