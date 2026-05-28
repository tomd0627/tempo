/* exported Utils */
// Shared helpers used by all other modules
var Utils = (function () {
  "use strict";

  function setupCanvas(canvas, w, h) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return ctx;
  }

  // Returns array of 7 Date objects [Mon, Tue, ..., Sun] for the ISO week
  // containing `date`, offset by `weekOffset` weeks.
  function getISOWeekDates(date, weekOffset) {
    var i, d, offset, day, diff, week;
    d = new Date(date);
    offset = weekOffset || 0;
    day = d.getDay(); // 0=Sun, 1=Mon...
    diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff + offset * 7);
    week = [];
    for (i = 0; i < 7; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return week;
  }

  // Parse a date value as a local-time Date to avoid UTC-midnight timezone drift on
  // YYYY-MM-DD strings (which new Date() treats as UTC).
  function parseDateStr(date) {
    var p;
    if (typeof date === "string") {
      p = date.split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    return date instanceof Date ? date : new Date(date);
  }

  function dateKey(date) {
    if (typeof date === "string") {
      return date;
    }
    var d = date instanceof Date ? date : new Date(date);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function formatMinutes(mins) {
    if (!mins || mins === 0) {
      return "0m";
    }
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h === 0) {
      return m + "m";
    }
    if (m === 0) {
      return h + "h";
    }
    return h + "h " + m + "m";
  }

  function formatDate(date) {
    var d = parseDateStr(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateShort(date) {
    var d = parseDateStr(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function isToday(date) {
    var d = parseDateStr(date);
    var now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Simple ease-out lerp step for canvas animations
  function lerpStep(current, target, factor) {
    return current + (target - current) * factor;
  }

  return {
    setupCanvas: setupCanvas,
    getISOWeekDates: getISOWeekDates,
    dateKey: dateKey,
    formatMinutes: formatMinutes,
    formatDate: formatDate,
    formatDateShort: formatDateShort,
    isToday: isToday,
    prefersReducedMotion: prefersReducedMotion,
    lerpStep: lerpStep,
  };
})();
