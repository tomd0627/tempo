/* exported Radial */
// Requires: Db, Utils
var Radial = (function () {
  "use strict";

  var canvas, ctx;
  var weekData = [];
  var weekOffset = 0;
  var animFrame = null;
  var animProgress = 0;

  var CANVAS_SIZE = 320;
  var BASE_R = 42;
  var MAX_R = 120;
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  var COLOR_RAIL = "#1e2230";
  var COLOR_SPOKE = "#7b5ea7";
  var COLOR_TODAY = "#e8714a";
  var COLOR_SURFACE = "#141720";
  var COLOR_TEXT = "#f0eef8";
  var COLOR_MUTED = "#8a8aa0";
  var COLOR_CENTER_LINE = "#2e3a5c";

  async function loadWeekData() {
    var i, j, sessions, total, instruments, s;
    var dates = Utils.getISOWeekDates(new Date(), weekOffset);
    weekData = [];
    for (i = 0; i < dates.length; i++) {
      sessions = await Db.getSessions(dates[i]);
      total = 0;
      instruments = [];
      for (j = 0; j < sessions.length; j++) {
        s = sessions[j];
        total += s.duration;
        if (instruments.indexOf(s.instrument) === -1) {
          instruments.push(s.instrument);
        }
      }
      weekData.push({
        date: dates[i],
        total: total,
        instruments: instruments,
        sessions: sessions,
      });
    }
  }

  function draw(progress) {
    var i, angle, cos, sin, frac, r, isToday, dAlpha, dLabelR, totalMins;
    var w = CANVAS_SIZE;
    var h = CANVAS_SIZE;
    var cx = w / 2;
    var cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    var maxMinutes = 0;
    for (i = 0; i < weekData.length; i++) {
      if (weekData[i].total > maxMinutes) {
        maxMinutes = weekData[i].total;
      }
    }
    if (maxMinutes === 0) {
      maxMinutes = 60;
    }
    var scale = Math.min(maxMinutes, 120);

    for (i = 0; i < 7; i++) {
      angle = (i / 7) * 2 * Math.PI - Math.PI / 2;
      cos = Math.cos(angle);
      sin = Math.sin(angle);
      frac = Math.min(weekData[i].total / scale, 1);
      r = BASE_R + (MAX_R - BASE_R) * frac * progress;

      // Rail
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = COLOR_RAIL;
      ctx.moveTo(cx + cos * BASE_R, cy + sin * BASE_R);
      ctx.lineTo(cx + cos * MAX_R, cy + sin * MAX_R);
      ctx.stroke();
      ctx.setLineDash([]);

      // Filled spoke
      if (weekData[i].total > 0) {
        isToday = Utils.isToday(weekData[i].date);
        ctx.beginPath();
        ctx.lineCap = "round";
        ctx.lineWidth = 8;
        ctx.strokeStyle = isToday ? COLOR_TODAY : COLOR_SPOKE;
        ctx.moveTo(cx + cos * BASE_R, cy + sin * BASE_R);
        ctx.lineTo(cx + cos * r, cy + sin * r);
        ctx.stroke();

        // Glow dot at tip
        ctx.beginPath();
        ctx.arc(cx + cos * r, cy + sin * r, 4, 0, 2 * Math.PI);
        ctx.fillStyle = isToday ? COLOR_TODAY : COLOR_SPOKE;
        ctx.fill();
      }

      // Day label
      ctx.fillStyle = COLOR_MUTED;
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(DAYS[i], cx + cos * (MAX_R + 22), cy + sin * (MAX_R + 22));

      // Duration label (fades in after spoke is mostly drawn)
      if (weekData[i].total > 0 && progress > 0.6) {
        dAlpha = Math.max(0, (progress - 0.6) / 0.4);
        ctx.globalAlpha = dAlpha;
        ctx.fillStyle = COLOR_MUTED;
        ctx.font = "400 9px 'JetBrains Mono', monospace";
        dLabelR = r + 14;
        ctx.fillText(
          Utils.formatMinutes(weekData[i].total),
          cx + cos * dLabelR,
          cy + sin * dLabelR,
        );
        ctx.globalAlpha = 1;
      }
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, BASE_R - 2, 0, 2 * Math.PI);
    ctx.fillStyle = COLOR_SURFACE;
    ctx.fill();
    ctx.strokeStyle = COLOR_CENTER_LINE;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center total
    totalMins = 0;
    for (i = 0; i < weekData.length; i++) {
      totalMins += weekData[i].total;
    }
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = "600 15px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Utils.formatMinutes(totalMins), cx, cy - 7);
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = "400 9px 'DM Sans', sans-serif";
    ctx.fillText("this week", cx, cy + 8);
  }

  function animate() {
    animProgress = Utils.lerpStep(animProgress, 1, 0.08);
    draw(animProgress);
    if (1 - animProgress > 0.001) {
      animFrame = requestAnimationFrame(animate);
    } else {
      draw(1);
    }
  }

  function updateAriaLabel() {
    var i, parts;
    var totalMins = 0;
    for (i = 0; i < weekData.length; i++) {
      totalMins += weekData[i].total;
    }
    var dates = Utils.getISOWeekDates(new Date(), weekOffset);
    var startLabel = Utils.formatDateShort(dates[0]);
    var endLabel = Utils.formatDateShort(dates[6]);
    parts = DAYS.map(function (name, idx) {
      return (
        name +
        ": " +
        (weekData[idx].total ? Utils.formatMinutes(weekData[idx].total) : "no practice")
      );
    });
    var label =
      "Radial chart, week of " +
      startLabel +
      " to " +
      endLabel +
      ". Total: " +
      Utils.formatMinutes(totalMins) +
      ". " +
      parts.join(", ") +
      ".";
    canvas.setAttribute("aria-label", label);
    document.getElementById("radial-summary").textContent = label;
  }

  function updateWeekLabel() {
    var dates = Utils.getISOWeekDates(new Date(), weekOffset);
    document.getElementById("week-label").textContent =
      Utils.formatDateShort(dates[0]) + " – " + Utils.formatDateShort(dates[6]);
  }

  function buildTooltipHTML(dayData) {
    var html =
      '<div class="canvas-tooltip__date">' +
      Utils.formatDate(dayData.date) +
      "</div>" +
      '<div class="canvas-tooltip__duration">' +
      (dayData.total ? Utils.formatMinutes(dayData.total) : "No practice") +
      "</div>";
    if (dayData.instruments.length > 0) {
      html +=
        '<div class="canvas-tooltip__instruments">' + dayData.instruments.join(", ") + "</div>";
    }
    return html;
  }

  function positionTooltip(tooltip, canvasX, canvasY) {
    var wrapper = document.getElementById("radial-wrapper");
    var wrapperRect = wrapper.getBoundingClientRect();
    var canvasRect = canvas.getBoundingClientRect();
    var scaleX = canvasRect.width / CANVAS_SIZE;
    var scaleY = canvasRect.height / CANVAS_SIZE;
    tooltip.style.left = canvasRect.left - wrapperRect.left + canvasX * scaleX + 12 + "px";
    tooltip.style.top = canvasRect.top - wrapperRect.top + canvasY * scaleY - 10 + "px";
  }

  function showTooltip(dayData, tipX, tipY) {
    var tooltip = document.getElementById("radial-tooltip");
    tooltip.innerHTML = buildTooltipHTML(dayData);
    tooltip.removeAttribute("aria-hidden");
    positionTooltip(tooltip, tipX, tipY);
  }

  function hideTooltip() {
    document.getElementById("radial-tooltip").setAttribute("aria-hidden", "true");
  }

  function updateOverlay() {
    var i, angle, tipR, tipX, tipY, pctX, pctY, btn, label;
    var overlay = document.getElementById("radial-overlay");
    overlay.innerHTML = "";
    var cx = CANVAS_SIZE / 2;
    var cy = CANVAS_SIZE / 2;

    for (i = 0; i < weekData.length; i++) {
      angle = (i / 7) * 2 * Math.PI - Math.PI / 2;
      tipR =
        weekData[i].total > 0
          ? BASE_R + (MAX_R - BASE_R) * Math.min(weekData[i].total / 120, 1)
          : MAX_R;
      tipX = cx + Math.cos(angle) * tipR;
      tipY = cy + Math.sin(angle) * tipR;
      pctX = (tipX / CANVAS_SIZE) * 100;
      pctY = (tipY / CANVAS_SIZE) * 100;

      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "canvas-overlay__btn";
      btn.style.left = pctX + "%";
      btn.style.top = pctY + "%";
      btn.style.width = "24px";
      btn.style.height = "24px";
      btn.style.transform = "translate(-50%, -50%)";
      btn.style.borderRadius = "50%";

      label = DAYS[i] + " " + Utils.formatDate(weekData[i].date) + ": ";
      label += weekData[i].total ? Utils.formatMinutes(weekData[i].total) : "no practice";
      if (weekData[i].instruments.length > 0) {
        label += " (" + weekData[i].instruments.join(", ") + ")";
      }
      btn.setAttribute("aria-label", label);

      // Closure to capture current i values
      (function (idx, tx, ty) {
        btn.addEventListener("focus", function () {
          showTooltip(weekData[idx], tx, ty);
        });
        btn.addEventListener("blur", hideTooltip);
      })(i, tipX, tipY);

      overlay.appendChild(btn);
    }
  }

  function handleMouseMove(e) {
    var idx, tipR, tipAngle, tipX, tipY;
    var rect = canvas.getBoundingClientRect();
    var scaleX = CANVAS_SIZE / rect.width;
    var scaleY = CANVAS_SIZE / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top) * scaleY;
    var cx = CANVAS_SIZE / 2;
    var cy = CANVAS_SIZE / 2;

    var dist = Math.sqrt((mx - cx) * (mx - cx) + (my - cy) * (my - cy));
    if (dist < BASE_R || dist > MAX_R + 30) {
      hideTooltip();
      return;
    }

    var angle = Math.atan2(my - cy, mx - cx);
    var normalised = angle + Math.PI / 2;
    if (normalised < 0) {
      normalised += 2 * Math.PI;
    }
    idx = Math.round((normalised / (2 * Math.PI)) * 7) % 7;

    tipR =
      weekData[idx].total > 0
        ? BASE_R + (MAX_R - BASE_R) * Math.min(weekData[idx].total / 120, 1)
        : MAX_R;
    tipAngle = (idx / 7) * 2 * Math.PI - Math.PI / 2;
    tipX = cx + Math.cos(tipAngle) * tipR;
    tipY = cy + Math.sin(tipAngle) * tipR;

    showTooltip(weekData[idx], tipX, tipY);
  }

  async function render() {
    cancelAnimationFrame(animFrame);
    animProgress = 0;
    await loadWeekData();
    updateWeekLabel();
    updateAriaLabel();

    if (Utils.prefersReducedMotion()) {
      draw(1);
    } else {
      animFrame = requestAnimationFrame(animate);
    }

    updateOverlay();
  }

  function init() {
    canvas = document.getElementById("radial-canvas");
    ctx = Utils.setupCanvas(canvas, CANVAS_SIZE, CANVAS_SIZE);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", hideTooltip);

    document.getElementById("week-prev").addEventListener("click", function () {
      weekOffset -= 1;
      render();
    });

    document.getElementById("week-next").addEventListener("click", function () {
      if (weekOffset < 0) {
        weekOffset += 1;
        render();
      }
    });
  }

  return { init: init, render: render };
})();
