(function () {
  "use strict";

  var VIEWS = ["week", "year", "log", "stats"];

  function showView(viewId) {
    var i, section, btn;
    for (i = 0; i < VIEWS.length; i++) {
      section = document.getElementById("view-" + VIEWS[i]);
      btn = document.querySelector('[data-view="' + VIEWS[i] + '"]');
      if (VIEWS[i] === viewId) {
        section.hidden = false;
        if (btn) {
          btn.classList.add("app-nav__btn--active");
          btn.setAttribute("aria-current", "page");
        }
      } else {
        section.hidden = true;
        if (btn) {
          btn.classList.remove("app-nav__btn--active");
          btn.removeAttribute("aria-current");
        }
      }
    }
  }

  async function init() {
    document.documentElement.classList.add("js-enabled");

    // Wire nav
    var navBtns = document.querySelectorAll("[data-view]");
    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        showView(btn.dataset.view);
      });
    });

    // Initialize Lucide icons
    lucide.createIcons();

    // Initialize modules
    Log.init();
    Radial.init();
    Grid.init();
    Stats.init();

    // Initial renders
    await Radial.render();
    await Grid.render();
    await Stats.render();

    // Re-render visualizations and stats when sessions change
    document.addEventListener("sessions-updated", async function () {
      await Radial.render();
      await Grid.render();
      await Stats.render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("unhandledrejection", function (e) {
    // eslint-disable-next-line no-console
    console.error("Unhandled promise rejection:", e.reason);
  });
})();
