import { STATIONS } from "./stations.js";
import {
  loadPreferences,
  normalizeHex,
  normalizePreferences,
} from "./preferences.js";

const listEl = document.getElementById("list");
const showAllEl = document.getElementById("show-all");
const resetColorsEl = document.getElementById("reset-colors");

let prefs = {};

function accentOf(station) {
  return prefs.accents?.[station.id] || station.accent;
}

function isOn(station) {
  return prefs.enabled?.[station.id] !== false;
}

function render() {
  listEl.replaceChildren();
  for (const station of STATIONS) {
    const row = document.createElement("div");
    row.className = "row";
    row.style.setProperty("--accent", accentOf(station));

    const label = document.createElement("label");
    label.className = "pick";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isOn(station);
    checkbox.addEventListener("change", () => {
      const enabled = { ...(prefs.enabled ?? {}) };
      if (checkbox.checked) delete enabled[station.id];
      else enabled[station.id] = false;
      save({ ...prefs, enabled });
    });

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = station.label;
    label.append(checkbox, name);

    const color = document.createElement("input");
    color.type = "color";
    color.className = "swatch";
    color.value = accentOf(station).toLowerCase();
    color.setAttribute("aria-label", `${station.label} color`);
    color.addEventListener("change", () => {
      const next = normalizeHex(color.value);
      if (!next) return;
      const accents = { ...(prefs.accents ?? {}) };
      if (next === station.accent.toUpperCase()) delete accents[station.id];
      else accents[station.id] = next;
      save({ ...prefs, accents });
    });

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "reset";
    reset.textContent = "Reset";
    const custom = Boolean(prefs.accents?.[station.id]);
    reset.classList.toggle("is-on", custom);
    reset.disabled = !custom;
    reset.tabIndex = custom ? 0 : -1;
    reset.setAttribute("aria-label", `Reset ${station.label} color`);
    reset.addEventListener("click", () => {
      const accents = { ...(prefs.accents ?? {}) };
      delete accents[station.id];
      save({ ...prefs, accents });
    });

    row.append(label, color, reset);
    listEl.append(row);
  }

  const anyHidden = STATIONS.some((station) => !isOn(station));
  const anyColor = Boolean(prefs.accents && Object.keys(prefs.accents).length);
  showAllEl.disabled = !anyHidden;
  resetColorsEl.disabled = !anyColor;
}

async function save(next) {
  const previous = prefs;
  const normalized = normalizePreferences(next);
  try {
    await chrome.storage.local.set({ preferences: normalized });
    prefs = normalized;
  } catch {
    prefs = previous;
  }
  render();
}

showAllEl.addEventListener("click", () => {
  save({ ...prefs, enabled: {} });
});

resetColorsEl.addEventListener("click", () => {
  save({ ...prefs, accents: {} });
});

try {
  prefs = await loadPreferences();
} catch {
  prefs = {};
}
render();
