// Build-time settings. Each one reads a VITE_* variable from `.env` (override
// locally in `.env.local`) and falls back to a default when unset or invalid.
function positiveNumber(value, fallback) {
  const number = Number(value);
  return number > 0 ? number : fallback;
}

// How often every panel re-fetches its data
export const REFRESH_INTERVAL_MS =
  positiveNumber(import.meta.env.VITE_REFRESH_SECONDS, 60) * 1000;
