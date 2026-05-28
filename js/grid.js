/* exported Grid */
// Requires: Db, Utils
var Grid = (function () {
  "use strict";

  var canvas, ctx;
  var animFrame = null;
  var cellsData = []; // [{ date, key, minutes }] in column-major order

  var CELL_SIZE = 12;
  var CELL_GAP = 2;
  var CELL_STEP = CELL_SIZE + CELL_GAP;
  var WEEKS = 53;
  var DAYS = 7;
  var LABEL_HEIGHT = 20;
  var CANVAS_W = WEEKS * CELL_STEP - CELL_GAP;
  var CANVAS_H = DAYS * CELL_STEP - CELL_GAP + LABEL_HEIGHT;

  var COLOR_EMPTY = "#1e2230";
  var COLOR_SCALE = ["#2e3a5c", "#4a5a8a", "#7b5ea7", "#e8714a"];
  var COLOR_MUTED = "#8a8aa0";
  var COLOR_TODAY_RING = "#f0eef8";

  var MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function getColor(minutes) {
    if (!minutes || minutes === 0) {
      return COLOR_EMPTY;
    }
    if (minutes < 15) {
      return COLOR_SCALE[0];
    }
    if (minutes < 30) {
      return COLOR_SCALE[1];
    }
    if (minutes < 60) {
      return COLOR_SCALE[2];
    }
    return COLOR_SCALE[3];
  }

  function buildCells() {
    // Rolling 53-week window: start from Monday of the ISO week 52 weeks before today
    var today = new Date();
    var day = today.getDay(); // 0=Sun, 1=Mon...
    var diff = day === 0 ? -6 : 1 - day;
    var monday = new Date(today);
    monday.setDate(today.getDate() + diff - 52 * 7);

    var w, d, cell, cells;
    cells = [];
    for (w = 0; w < WEEKS; w++) {
      for (d = 0; d < DAYS; d++) {
        cell = new Date(monday);
        cell.setDate(monday.getDate() + w * 7 + d);
        cells.push({ date: cell, key: Utils.dateKey(cell), minutes: 0 });
      }
    }
    return cells;
  }

  async function loadData() {
    var entries = await Db.getAllEntries();
    var map = {};
    entries.forEach(function (entry) {
      var total = 0;
      entry[1].forEach(function (s) {
        total += s.duration;
      });
      map[entry[0]] = total;
    });
    return map;
  }

  function drawCells(count) {
    var i, w, d, x, y, cell;
    var today = Utils.dateKey(new Date());

    for (i = 0; i < count; i++) {
      w = Math.floor(i / DAYS);
      d = i % DAYS;
      x = w * CELL_STEP;
      y = LABEL_HEIGHT + d * CELL_STEP;
      cell = cellsData[i];

      ctx.fillStyle = getColor(cell.minutes);
      ctx.beginPath();
      ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 2);
      ctx.fill();

      // Today ring
      if (cell.key === today) {
        ctx.strokeStyle = COLOR_TODAY_RING;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x + 0.75, y + 0.75, CELL_SIZE - 1.5, CELL_SIZE - 1.5, 2);
        ctx.stroke();
      }
    }
  }

  function drawMonthLabels() {
    var w, cell, m, x;
    var lastMonth = -1;
    var lastLabelX = -Infinity;
    for (w = 0; w < WEEKS; w++) {
      cell = cellsData[w * DAYS]; // Mon of this column
      m = cell.date.getMonth();
      x = w * CELL_STEP;
      if (m !== lastMonth && x - lastLabelX >= 42) {
        ctx.fillStyle = COLOR_MUTED;
        ctx.font = "400 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(MONTH_NAMES[m], x, 4);
        lastMonth = m;
        lastLabelX = x;
      }
    }
  }

  var animCurrent = 0;
  var animTotal = 0;
  var CELLS_PER_FRAME = 14;

  function animateCells() {
    animCurrent = Math.min(animCurrent + CELLS_PER_FRAME, animTotal);
    ctx.clearRect(0, LABEL_HEIGHT, CANVAS_W, CANVAS_H - LABEL_HEIGHT);
    drawCells(animCurrent);
    if (animCurrent < animTotal) {
      animFrame = requestAnimationFrame(animateCells);
    }
  }

  function updateAriaLabel() {
    var totalMinutes = cellsData.reduce(function (sum, c) {
      return sum + (c.minutes || 0);
    }, 0);
    var activeDays = cellsData.filter(function (c) {
      return c.minutes > 0;
    }).length;
    var label =
      "Year-view contribution grid. " +
      activeDays +
      " active days this year, " +
      Utils.formatMinutes(totalMinutes) +
      " total.";
    canvas.setAttribute("aria-label", label);
    document.getElementById("grid-summary").textContent = label;
  }

  function updateOverlay() {
    var overlay = document.getElementById("grid-overlay");
    overlay.innerHTML = "";

    cellsData.forEach(function (cell, i) {
      if (!cell.minutes) {
        return;
      }
      var w = Math.floor(i / DAYS);
      var d = i % DAYS;
      var x = w * CELL_STEP;
      var y = LABEL_HEIGHT + d * CELL_STEP;
      var canvasRect = canvas.getBoundingClientRect();
      var scaleX = canvasRect.width / CANVAS_W;
      var scaleY = canvasRect.height / CANVAS_H;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "canvas-overlay__btn";
      btn.style.left = x * scaleX + "px";
      btn.style.top = y * scaleY + "px";
      btn.style.width = CELL_SIZE * scaleX + "px";
      btn.style.height = CELL_SIZE * scaleY + "px";
      btn.setAttribute(
        "aria-label",
        Utils.formatDate(cell.date) + ": " + Utils.formatMinutes(cell.minutes),
      );

      btn.addEventListener("focus", function () {
        showTooltip(cell, x, y);
      });
      btn.addEventListener("blur", hideTooltip);
      overlay.appendChild(btn);
    });
  }

  function showTooltip(cell, cellX, cellY) {
    var tooltip = document.getElementById("grid-tooltip");
    tooltip.innerHTML =
      '<div class="canvas-tooltip__date">' +
      Utils.formatDate(cell.date) +
      "</div>" +
      '<div class="canvas-tooltip__duration">' +
      Utils.formatMinutes(cell.minutes) +
      "</div>";

    tooltip.removeAttribute("aria-hidden");

    var wrapper = document.getElementById("grid-wrapper");
    var wrapperRect = wrapper.getBoundingClientRect();
    var canvasRect = canvas.getBoundingClientRect();
    var scaleX = canvasRect.width / CANVAS_W;
    var scaleY = canvasRect.height / CANVAS_H;

    var absX = canvasRect.left - wrapperRect.left + cellX * scaleX;
    var absY = canvasRect.top - wrapperRect.top + cellY * scaleY;
    var cellW = CELL_SIZE * scaleX;
    var cellH = CELL_SIZE * scaleY;
    var tipW = tooltip.offsetWidth;
    var tipH = tooltip.offsetHeight;
    var left = absX + cellW + 4;
    var top = absY - 4;

    // Flip horizontally when the tooltip would overflow the canvas right edge.
    if (left + tipW > canvasRect.width) {
      left = absX - tipW - 4;
    }

    // Flip vertically when the tooltip would overflow the canvas bottom edge.
    if (top + tipH > canvasRect.height) {
      top = absY + cellH - tipH + 4;
    }

    tooltip.style.left = Math.max(0, left) + "px";
    tooltip.style.top = Math.max(0, top) + "px";
  }

  function hideTooltip() {
    document.getElementById("grid-tooltip").setAttribute("aria-hidden", "true");
  }

  function handleMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = CANVAS_W / rect.width;
    var scaleY = CANVAS_H / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top) * scaleY;

    if (my < LABEL_HEIGHT) {
      hideTooltip();
      return;
    }

    var w = Math.floor(mx / CELL_STEP);
    var d = Math.floor((my - LABEL_HEIGHT) / CELL_STEP);

    if (w < 0 || w >= WEEKS || d < 0 || d >= DAYS) {
      hideTooltip();
      return;
    }

    var idx = w * DAYS + d;
    var cell = cellsData[idx];
    if (!cell) {
      hideTooltip();
      return;
    }

    var cellX = w * CELL_STEP;
    var cellY = LABEL_HEIGHT + d * CELL_STEP;
    showTooltip(cell, cellX, cellY);
  }

  async function render() {
    cancelAnimationFrame(animFrame);
    var dataMap = await loadData();

    cellsData = buildCells();
    cellsData.forEach(function (cell) {
      cell.minutes = dataMap[cell.key] || 0;
    });

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawMonthLabels();

    if (Utils.prefersReducedMotion()) {
      drawCells(cellsData.length);
    } else {
      animCurrent = 0;
      animTotal = cellsData.length;
      animFrame = requestAnimationFrame(animateCells);
    }

    updateAriaLabel();
    updateOverlay();
  }

  function init() {
    canvas = document.getElementById("grid-canvas");
    ctx = Utils.setupCanvas(canvas, CANVAS_W, CANVAS_H);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", hideTooltip);
  }

  return { init: init, render: render };
})();
