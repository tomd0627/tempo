/* exported Db */
// Requires: idbKeyval (CDN global)
var Db = (function () {
  "use strict";

  var idbGet = idbKeyval.get;
  var idbSet = idbKeyval.set;
  var idbDel = idbKeyval.del;
  var idbEntries = idbKeyval.entries;

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

  async function getSessions(date) {
    var key = dateKey(date);
    var result = await idbGet(key);
    return result || [];
  }

  async function addSession(session) {
    var existing = await getSessions(session.date);
    existing.push(session);
    await idbSet(session.date, existing);
  }

  async function updateSession(id, dateStr, updates) {
    var sessions = await getSessions(dateStr);
    var idx = sessions.findIndex(function (s) {
      return s.id === id;
    });
    if (idx === -1) {
      return;
    }
    sessions[idx] = Object.assign({}, sessions[idx], updates);
    await idbSet(dateStr, sessions);
  }

  async function deleteSession(id, dateStr) {
    var sessions = await getSessions(dateStr);
    var filtered = sessions.filter(function (s) {
      return s.id !== id;
    });
    if (filtered.length === 0) {
      await idbDel(dateStr);
    } else {
      await idbSet(dateStr, filtered);
    }
  }

  async function getAllEntries() {
    var all = await idbEntries();
    return all || [];
  }

  return {
    dateKey: dateKey,
    getSessions: getSessions,
    addSession: addSession,
    updateSession: updateSession,
    deleteSession: deleteSession,
    getAllEntries: getAllEntries,
  };
})();
