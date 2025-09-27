/**
 * Datetime utilities for consistent client-side behavior.
 *
 * Rules:
 * - MSK (UTC+3) is the business timezone on the server.
 * - On the client we preserve any explicit time set by the user.
 * - If a boundary comes as a date-only (time equals 00:00:00.000),
 *   we keep start at 00:00 and shift end to 23:59 of the same day.
 * - We serialize to the API as 'YYYY-MM-DDTHH:mm:ss' (no timezone part),
 *   because the backend normalizes to MSK and stores tz-aware values.
 */

// Moment.js is globally available in project pages

/**
 * Parse ISO-like string into moment instance.
 * @param {string|Date|moment.Moment} iso
 * @returns {moment.Moment}
 */
export function parseIso(iso) {
  return moment(iso);
}

/**
 * If time is exactly 00:00:00.000, keep it (start of day). Otherwise preserve.
 * @param {moment.Moment|Date|string} dt
 * @returns {moment.Moment}
 */
export function clampStartIfDateOnly(dt) {
  const m = moment(dt);
  // If it's date-only (midnight) we just return start of day explicitly
  if (m.hour() === 0 && m.minute() === 0 && m.second() === 0 && m.millisecond() === 0) {
    return m.startOf('day');
  }
  return m;
}

/**
 * If time is exactly 00:00:00.000, set to 23:59:00.000 (end of day).
 * Otherwise preserve explicit time.
 * @param {moment.Moment|Date|string} dt
 * @returns {moment.Moment}
 */
export function clampEndIfDateOnly(dt) {
  const m = moment(dt);
  if (m.hour() === 0 && m.minute() === 0 && m.second() === 0 && m.millisecond() === 0) {
    return m.hour(23).minute(59).second(0).millisecond(0);
  }
  return m;
}

/**
 * Serialize date/time for API as 'YYYY-MM-DDTHH:mm:ss' (no timezone suffix).
 * @param {moment.Moment|Date|string} dt
 * @returns {string}
 */
export function toApiIso(dt) {
  return moment(dt).format('YYYY-MM-DDTHH:mm:ss');
}
