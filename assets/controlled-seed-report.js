/* civ-bench controlled-seed report interactions.
   The seat page's curve chart (assets/curve-chart.js) announces strategist
   checkbox changes; this script hides the seat's game rows of unchecked
   strategists. Heatmap cell tooltips come from the shared
   assets/report-help.js. */
(function () {
  "use strict";

  document.addEventListener("curvechart:change", function (event) {
    var gameRows = document.querySelectorAll(".seat-games .game-row");
    if (!gameRows.length) { return; }
    var checked = event.detail.checked;
    gameRows.forEach(function (row) {
      row.hidden = event.detail.filtered && checked[row.dataset.strategist] !== true;
    });
  });
})();
