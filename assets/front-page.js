/* Front page: pick out one model series on the cost chart.
   Hovering or focusing a series button or a point previews that series: its
   points stay bright and show their names, and every other point and label
   fades out. A click on a series button keeps it picked until clicked again. */
(function () {
  "use strict";
  document.querySelectorAll(".cost-chart").forEach(function (chart) {
    var keys = chart.querySelectorAll(".series-key");
    var sticky = "";
    function show(series) {
      chart.classList.toggle("picking", !!series);
      chart.querySelectorAll(".pt, .pt-label.pick").forEach(function (node) {
        node.classList.toggle("on", !!series && node.getAttribute("data-series") === series);
      });
      keys.forEach(function (key) {
        key.setAttribute("aria-pressed", String(!!sticky && key.getAttribute("data-series") === sticky));
      });
    }
    function preview(event) {
      var node = event.target.closest ? event.target.closest("[data-series]") : null;
      show(node && chart.contains(node) ? node.getAttribute("data-series") : sticky);
    }
    keys.forEach(function (key) {
      key.addEventListener("click", function () {
        var series = key.getAttribute("data-series");
        sticky = sticky === series ? "" : series;
        show(sticky);
      });
    });
    chart.addEventListener("mouseover", preview);
    chart.addEventListener("focusin", preview);
    chart.addEventListener("mouseleave", function () { show(sticky); });
    chart.addEventListener("focusout", function () { show(sticky); });
  });
})();
