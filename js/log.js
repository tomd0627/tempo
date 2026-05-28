/* exported Log */
// Requires: Db, Utils
var Log = (function () {
  "use strict";

  var editingSession = null; // { id, dateStr } when editing

  async function renderSessions() {
    var container = document.getElementById("session-list");
    var filterVal = document.getElementById("filter-instrument").value;

    var allEntries = await Db.getAllEntries();

    // Flatten all sessions and sort by date desc, then by createdAt desc
    var allSessions = [];
    allEntries.forEach(function (entry) {
      entry[1].forEach(function (s) {
        allSessions.push(s);
      });
    });

    allSessions.sort(function (a, b) {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt - a.createdAt;
    });

    if (filterVal) {
      allSessions = allSessions.filter(function (s) {
        return s.instrument === filterVal;
      });
    }

    if (allSessions.length === 0) {
      container.innerHTML = buildEmptyState(filterVal);
      lucide.createIcons({ attrs: { class: ["lucide"] } });
      return;
    }

    var html = allSessions
      .map(function (s) {
        return buildSessionItem(s);
      })
      .join("");

    container.innerHTML = html;
    lucide.createIcons({ attrs: { class: ["lucide"] } });
  }

  function buildEmptyState(filtered) {
    if (filtered) {
      return (
        '<div class="session-empty">' +
        '<div class="session-empty__icon"><span data-lucide="music" aria-hidden="true"></span></div>' +
        '<p class="session-empty__heading">No sessions found</p>' +
        '<p class="session-empty__body">No ' +
        escapeHtml(filtered) +
        " sessions logged yet.</p>" +
        "</div>"
      );
    }
    return (
      '<div class="session-empty">' +
      '<div class="session-empty__icon"><span data-lucide="music-4" aria-hidden="true"></span></div>' +
      '<p class="session-empty__heading">No sessions yet</p>' +
      '<p class="session-empty__body">Log your first practice session using the form. Every minute counts.</p>' +
      "</div>"
    );
  }

  function buildSessionItem(s) {
    var focusHtml = s.focusArea
      ? '<p class="session-item__focus">' + escapeHtml(s.focusArea) + "</p>"
      : "";
    return (
      '<article class="session-item">' +
      '<div class="session-item__body">' +
      '<div class="session-item__meta">' +
      '<span class="session-item__instrument">' +
      escapeHtml(capitalise(s.instrument)) +
      "</span>" +
      '<span class="session-item__duration">' +
      Utils.formatMinutes(s.duration) +
      "</span>" +
      '<time class="session-item__date" datetime="' +
      escapeHtml(s.date) +
      '">' +
      Utils.formatDate(s.date) +
      "</time>" +
      "</div>" +
      focusHtml +
      "</div>" +
      '<div class="session-item__actions">' +
      '<button class="session-item__action-btn" type="button"' +
      ' data-edit-id="' +
      escapeHtml(s.id) +
      '" data-edit-date="' +
      escapeHtml(s.date) +
      '"' +
      ' aria-label="Edit session: ' +
      escapeHtml(capitalise(s.instrument)) +
      ", " +
      Utils.formatMinutes(s.duration) +
      ", " +
      Utils.formatDate(s.date) +
      '">' +
      '<span data-lucide="pencil" aria-hidden="true"></span>' +
      "</button>" +
      '<button class="session-item__action-btn session-item__action-btn--delete" type="button"' +
      ' data-delete-id="' +
      escapeHtml(s.id) +
      '" data-delete-date="' +
      escapeHtml(s.date) +
      '"' +
      ' aria-label="Delete session: ' +
      escapeHtml(capitalise(s.instrument)) +
      ", " +
      Utils.formatMinutes(s.duration) +
      ", " +
      Utils.formatDate(s.date) +
      '">' +
      '<span data-lucide="trash-2" aria-hidden="true"></span>' +
      "</button>" +
      "</div>" +
      "</article>"
    );
  }

  function validateForm(form) {
    var valid = true;
    var fields = ["date", "instrument", "duration"];

    fields.forEach(function (name) {
      var input = form.elements[name];
      var errorEl = document.getElementById("field-" + name + "-error");
      var msg = "";
      var val;

      if (!input.value.trim()) {
        msg = "This field is required.";
      } else if (name === "duration") {
        val = parseInt(input.value, 10);
        if (Number.isNaN(val) || val < 1 || val > 480) {
          msg = "Enter a number between 1 and 480.";
        }
      }

      if (msg) {
        input.classList.add("is-invalid");
        errorEl.textContent = msg;
        valid = false;
      } else {
        input.classList.remove("is-invalid");
        errorEl.textContent = "";
      }
    });

    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;

    if (!validateForm(form)) {
      return;
    }

    var dateVal = form.elements["date"].value;
    var instrument = form.elements["instrument"].value;
    var duration = parseInt(form.elements["duration"].value, 10);
    var focusArea = form.elements["focusArea"].value.trim();

    if (editingSession) {
      await Db.deleteSession(editingSession.id, editingSession.dateStr);
    }

    var session = {
      id: crypto.randomUUID(),
      date: dateVal,
      instrument: instrument,
      duration: duration,
      focusArea: focusArea,
      createdAt: Date.now(),
    };

    await Db.addSession(session);

    form.reset();
    setFieldDate(form);
    exitEditMode();

    await renderSessions();
    document.dispatchEvent(new CustomEvent("sessions-updated"));
  }

  function handleListClick(e) {
    var editBtn = e.target.closest("[data-edit-id]");
    var deleteBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      startEdit(editBtn.dataset.editId, editBtn.dataset.editDate);
    } else if (deleteBtn) {
      handleDelete(deleteBtn.dataset.deleteId, deleteBtn.dataset.deleteDate);
    }
  }

  async function startEdit(id, dateStr) {
    var sessions = await Db.getSessions(dateStr);
    var session = sessions.find(function (s) {
      return s.id === id;
    });
    if (!session) {
      return;
    }

    var form = document.getElementById("log-form");
    form.elements["date"].value = session.date;
    form.elements["instrument"].value = session.instrument;
    form.elements["duration"].value = session.duration;
    form.elements["focusArea"].value = session.focusArea || "";

    editingSession = { id: id, dateStr: dateStr };

    var submitBtn = document.getElementById("log-submit");
    var cancelBtn = document.getElementById("log-cancel");
    submitBtn.innerHTML = '<span data-lucide="check" aria-hidden="true"></span> Save changes';
    cancelBtn.hidden = false;
    lucide.createIcons({ attrs: { class: ["lucide"] } });

    // Scroll to form on mobile
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exitEditMode() {
    editingSession = null;
    var submitBtn = document.getElementById("log-submit");
    var cancelBtn = document.getElementById("log-cancel");
    submitBtn.innerHTML = '<span data-lucide="plus" aria-hidden="true"></span> Log session';
    cancelBtn.hidden = true;
    lucide.createIcons({ attrs: { class: ["lucide"] } });
  }

  async function handleDelete(id, dateStr) {
    await Db.deleteSession(id, dateStr);
    await renderSessions();
    document.dispatchEvent(new CustomEvent("sessions-updated"));
  }

  function setFieldDate(form) {
    var today = Utils.dateKey(new Date());
    form.elements["date"].value = today;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function capitalise(str) {
    if (!str) {
      return "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async function init() {
    var form = document.getElementById("log-form");
    setFieldDate(form);

    form.addEventListener("submit", handleSubmit);

    document.getElementById("log-cancel").addEventListener("click", function () {
      form.reset();
      setFieldDate(form);
      exitEditMode();
    });

    document.getElementById("session-list").addEventListener("click", handleListClick);

    document.getElementById("filter-instrument").addEventListener("change", renderSessions);

    await renderSessions();
  }

  return { init: init, renderSessions: renderSessions };
})();
