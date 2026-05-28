/* exported Stats */
// Requires: Db, Utils
var Stats = (function () {
  "use strict";

  async function compute() {
    var i, j, entry, sessions, s, dayTotal;
    var allEntries = await Db.getAllEntries();

    var totalSessions = 0;
    var totalMinutes = 0;
    var byInstrument = {};
    var byDay = {}; // dateKey -> minutes
    var bestDay = { key: null, minutes: 0 };

    for (i = 0; i < allEntries.length; i++) {
      entry = allEntries[i];
      sessions = entry[1];
      dayTotal = 0;
      for (j = 0; j < sessions.length; j++) {
        s = sessions[j];
        totalSessions++;
        totalMinutes += s.duration;
        dayTotal += s.duration;
        byInstrument[s.instrument] = (byInstrument[s.instrument] || 0) + s.duration;
      }
      byDay[entry[0]] = (byDay[entry[0]] || 0) + dayTotal;
      if (dayTotal > bestDay.minutes) {
        bestDay = { key: entry[0], minutes: dayTotal };
      }
    }

    var streak = computeCurrentStreak(byDay);
    var longestStreak = computeLongestStreak(byDay);
    var weekTotals = computeWeekTotals(byDay);

    // Most practiced by total minutes
    var topInstrument = null;
    var topMinutes = 0;
    var instruments = Object.keys(byInstrument);
    for (i = 0; i < instruments.length; i++) {
      if (byInstrument[instruments[i]] > topMinutes) {
        topMinutes = byInstrument[instruments[i]];
        topInstrument = instruments[i];
      }
    }

    return {
      totalSessions: totalSessions,
      totalMinutes: totalMinutes,
      byInstrument: byInstrument,
      streak: streak,
      longestStreak: longestStreak,
      thisWeek: weekTotals.thisWeek,
      lastWeek: weekTotals.lastWeek,
      topInstrument: topInstrument,
      topMinutes: topMinutes,
      bestDay: bestDay,
    };
  }

  function computeCurrentStreak(byDay) {
    var key;
    var streak = 0;
    var d = new Date();
    while (true) {
      key = Utils.dateKey(d);
      if (!byDay[key]) {
        break;
      }
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function computeLongestStreak(byDay) {
    var keys = Object.keys(byDay).sort();
    if (keys.length === 0) {
      return 0;
    }
    var i, prev, cur, diff;
    var longest = 1;
    var current = 1;
    for (i = 1; i < keys.length; i++) {
      prev = new Date(keys[i - 1]);
      cur = new Date(keys[i]);
      diff = (cur - prev) / 86400000;
      if (diff === 1) {
        current++;
        if (current > longest) {
          longest = current;
        }
      } else {
        current = 1;
      }
    }
    return longest;
  }

  function computeWeekTotals(byDay) {
    var dates = Utils.getISOWeekDates(new Date(), 0);
    var lastDates = Utils.getISOWeekDates(new Date(), -1);
    var thisWeek = 0;
    var lastWeek = 0;
    var i;
    for (i = 0; i < dates.length; i++) {
      thisWeek += byDay[Utils.dateKey(dates[i])] || 0;
    }
    for (i = 0; i < lastDates.length; i++) {
      lastWeek += byDay[Utils.dateKey(lastDates[i])] || 0;
    }
    return { thisWeek: thisWeek, lastWeek: lastWeek };
  }

  function capitalise(str) {
    if (!str) {
      return "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function buildDeltaHTML(thisWeek, lastWeek) {
    if (lastWeek === 0 && thisWeek === 0) {
      return "";
    }
    var delta = thisWeek - lastWeek;
    var sign = delta >= 0 ? "+" : "";
    var cls = delta >= 0 ? "stat-card__delta--up" : "stat-card__delta--down";
    var icon = delta >= 0 ? "trend-up" : "trend-down";
    return (
      '<span class="stat-card__delta ' +
      cls +
      '">' +
      '<span data-lucide="' +
      icon +
      '" aria-hidden="true"></span>' +
      sign +
      Utils.formatMinutes(Math.abs(delta)) +
      " vs last week" +
      "</span>"
    );
  }

  function buildInstrumentList(byInstrument, topMinutes) {
    var sorted = Object.keys(byInstrument).sort(function (a, b) {
      return byInstrument[b] - byInstrument[a];
    });
    if (sorted.length === 0) {
      return "";
    }
    var items = sorted
      .slice(0, 6)
      .map(function (name) {
        var pct = topMinutes > 0 ? Math.round((byInstrument[name] / topMinutes) * 100) : 0;
        return (
          '<li class="instrument-list__item">' +
          '<span class="instrument-list__name">' +
          capitalise(name) +
          "</span>" +
          '<div class="instrument-list__bar-track">' +
          '<div class="instrument-list__bar-fill" style="width:' +
          pct +
          '%"></div>' +
          "</div>" +
          '<span class="instrument-list__minutes">' +
          Utils.formatMinutes(byInstrument[name]) +
          "</span>" +
          "</li>"
        );
      })
      .join("");
    return '<ul class="instrument-list" aria-label="Time by instrument">' + items + "</ul>";
  }

  function buildHTML(stats) {
    if (stats.totalSessions === 0) {
      return '<div class="stats-empty"><p class="stats-empty__text">Log your first session to see your stats here.</p></div>';
    }

    var deltaHTML = buildDeltaHTML(stats.thisWeek, stats.lastWeek);
    var instrList = buildInstrumentList(stats.byInstrument, stats.topMinutes);

    return (
      '<div class="stat-card stat-card--accent">' +
      '<span class="stat-card__label">Current streak</span>' +
      '<span class="stat-card__value stat-card__value--coral">' +
      stats.streak +
      "</span>" +
      '<span class="stat-card__sub">day' +
      (stats.streak === 1 ? "" : "s") +
      " in a row</span>" +
      "</div>" +
      '<div class="stat-card">' +
      '<span class="stat-card__label">Longest streak</span>' +
      '<span class="stat-card__value">' +
      stats.longestStreak +
      "</span>" +
      '<span class="stat-card__sub">day' +
      (stats.longestStreak === 1 ? "" : "s") +
      "</span>" +
      "</div>" +
      '<div class="stat-card">' +
      '<span class="stat-card__label">This week</span>' +
      '<span class="stat-card__value stat-card__value--violet">' +
      Utils.formatMinutes(stats.thisWeek) +
      "</span>" +
      deltaHTML +
      "</div>" +
      '<div class="stat-card">' +
      '<span class="stat-card__label">All-time total</span>' +
      '<span class="stat-card__value">' +
      Utils.formatMinutes(stats.totalMinutes) +
      "</span>" +
      '<span class="stat-card__sub">' +
      stats.totalSessions +
      " session" +
      (stats.totalSessions === 1 ? "" : "s") +
      "</span>" +
      "</div>" +
      '<div class="stat-card">' +
      '<span class="stat-card__label">Top instrument</span>' +
      '<span class="stat-card__value" style="font-size:1.4rem">' +
      (stats.topInstrument ? capitalise(stats.topInstrument) : "—") +
      "</span>" +
      '<span class="stat-card__sub">' +
      (stats.topInstrument ? Utils.formatMinutes(stats.topMinutes) : "") +
      "</span>" +
      "</div>" +
      '<div class="stat-card">' +
      '<span class="stat-card__label">Personal best day</span>' +
      '<span class="stat-card__value stat-card__value--coral">' +
      Utils.formatMinutes(stats.bestDay.minutes) +
      "</span>" +
      '<span class="stat-card__sub">' +
      (stats.bestDay.key ? Utils.formatDate(stats.bestDay.key) : "—") +
      "</span>" +
      "</div>" +
      '<div class="stat-card stat-card--wide">' +
      '<span class="stat-card__label">Time by instrument</span>' +
      instrList +
      "</div>"
    );
  }

  async function render() {
    var stats = await compute();
    var container = document.getElementById("stats-content");
    container.innerHTML = buildHTML(stats);
    lucide.createIcons({ attrs: { class: ["lucide"] } });

    // Announce update to screen readers
    var live = document.getElementById("stats-live");
    live.textContent =
      "Stats updated. Streak: " +
      stats.streak +
      " days. Total: " +
      Utils.formatMinutes(stats.totalMinutes) +
      ".";
  }

  function init() {
    document.getElementById("export-btn").addEventListener("click", async function () {
      var allEntries = await Db.getAllEntries();
      var blob = new Blob([JSON.stringify(allEntries, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "tempo-sessions.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return { init: init, render: render };
})();
