/* civ-bench victory-probability curve charts.
   Strategist checkboxes (VPAI's covers every VPAI curve), the All and Best
   and worst presets, hover previews from the checkboxes and the legend,
   same-family color spreading (the shared civBench.distinguishColors util in
   assets/report-common.js), condition emphasis, and the adaptive Y axis for
   every .curve-chart on the page. Charts sharing a data-sync name (the
   Relative and Absolute tabs of one chart) keep their checkboxes in step,
   and a chart redraws at full width when its hidden tab opens. */
(function () {
  "use strict";

  var DIMMED_OPACITY = 0.2;
  var FOCUS_EXTRA_WIDTH = 1.5;
  // Sync group name to the charts in it, each with an apply(checked) hook.
  var syncGroups = {};

  function readQuery() {
    var params = {};
    var search = new URLSearchParams(window.location.search);
    search.forEach(function (value, key) { params[key] = value; });
    return params;
  }

  // The trace index of a Plotly legend entry: its bound legend item first,
  // then its label text as a fallback.
  function legendIndex(chart, item) {
    var bound = item.__data__;
    if (bound && bound[0] && bound[0].trace && typeof bound[0].trace.index === "number") {
      return bound[0].trace.index;
    }
    var text = item.querySelector(".legendtext");
    if (!text) { return null; }
    for (var i = 0; i < chart.data.length; i++) {
      if (chart.data[i].name === text.textContent) { return i; }
    }
    return null;
  }

  function initChart(container) {
    var chart = container.querySelector(".plotly-graph-div");
    if (!chart || !window.Plotly || !chart.data) {
      return;
    }
    var query = container.dataset.querySelect === "true" ? readQuery() : {};
    var highlightedCondition = query.condition || null;
    // The hover preview: {strategist: name} from a checkbox, {index: i} from
    // the legend, or null.
    var focus = null;
    var lastVisible = null;

    var boxes = Array.prototype.slice.call(
      container.querySelectorAll('.chart-controls input[type="checkbox"]')
    );
    var vpaiBox = boxes.length ? boxes[0] : null;
    // A query link focuses its strategist next to VPAI (an unknown strategist
    // keeps the default selection).
    if (query.strategist) {
      var known = boxes.some(function (box) {
        return box.value === query.strategist;
      });
      if (known) {
        boxes.forEach(function (box) {
          box.checked = box.value === query.strategist || box === vpaiBox;
        });
      }
    }

    // Same-family strategists can share a catalog color; the shared util
    // spreads their hues so their curves stay distinguishable.
    var colorMap = null;
    if (window.civBench && window.civBench.distinguishColors) {
      colorMap = window.civBench.distinguishColors(
        chart.data.map(function (trace) {
          return { key: trace.meta.strategist, color: trace.meta.base_color };
        })
      );
    }

    function checkedMap() {
      var checked = {};
      boxes.forEach(function (box) { checked[box.value] = box.checked; });
      return checked;
    }

    function inFocus(meta, index) {
      if (!focus) { return false; }
      if (focus.index !== undefined) { return focus.index === index; }
      return focus.strategist === meta.strategist;
    }

    function updateChart() {
      var checked = checkedMap();
      var visible = [];
      var inLegend = [];
      var colors = [];
      var widths = [];
      var opacities = [];
      chart.data.forEach(function (trace, index) {
        var meta = trace.meta;
        var focused = inFocus(meta, index);
        // A hovered checkbox previews its unchecked curves. Previews stay out
        // of the legend so its entries do not reflow on every hover.
        var shown = !boxes.length || checked[meta.strategist] === true;
        visible.push(shown || (focused && focus.strategist !== undefined));
        inLegend.push(shown);
        colors.push((colorMap && colorMap[meta.strategist]) || meta.base_color);
        var width = !meta.vanilla && highlightedCondition === meta.condition ?
          3 : meta.base_width;
        widths.push(focused ? width + FOCUS_EXTRA_WIDTH : width);
        opacities.push(focus && !focused ? DIMMED_OPACITY : 1);
      });
      var key = visible.join(",");
      window.Plotly.restyle(chart, {visible: visible, showlegend: inLegend,
        "line.color": colors,
        "line.width": widths, opacity: opacities}).then(function () {
          // Refit the Y axis only when the visible curves change.
          if (key === lastVisible) { return null; }
          lastVisible = key;
          return window.Plotly.relayout(chart, {"yaxis.autorange": true});
        });
    }

    function setFocus(next) {
      var same = (focus === null && next === null) || (focus && next &&
        focus.index === next.index && focus.strategist === next.strategist);
      if (same) { return; }
      focus = next;
      updateChart();
    }

    function update() {
      updateChart();
      var checked = checkedMap();
      container.dispatchEvent(new CustomEvent("curvechart:change", {
        bubbles: true,
        detail: { checked: checked, filtered: boxes.length > 0 }
      }));
      return checked;
    }

    // A user change here updates the other charts of the sync group.
    var sync = container.dataset.sync || "";
    var self = {
      apply: function (checked) {
        boxes.forEach(function (box) {
          if (Object.prototype.hasOwnProperty.call(checked, box.value)) {
            box.checked = checked[box.value];
          }
        });
        updateChart();
      }
    };
    if (sync) {
      (syncGroups[sync] = syncGroups[sync] || []).push(self);
    }
    function userUpdate() {
      var checked = update();
      (syncGroups[sync] || []).forEach(function (other) {
        if (other !== self) { other.apply(checked); }
      });
    }

    // A chart drawn or resized inside a hidden tab keeps a stale width;
    // redraw it once its tab shows it at a new width.
    if (window.ResizeObserver) {
      var lastWidth = container.clientWidth;
      new window.ResizeObserver(function () {
        var width = container.clientWidth;
        if (width && width !== lastWidth) {
          lastWidth = width;
          window.Plotly.Plots.resize(chart);
        }
      }).observe(container);
    }

    boxes.forEach(function (box) {
      box.addEventListener("change", userUpdate);
      var label = box.closest("label") || box;
      label.addEventListener("mouseenter", function () {
        setFocus({strategist: box.value});
      });
      label.addEventListener("mouseleave", function () { setFocus(null); });
    });
    Array.prototype.forEach.call(
      container.querySelectorAll(".chart-preset"),
      function (button) {
        button.addEventListener("click", function () {
          var all = button.dataset.preset === "all";
          boxes.forEach(function (box) {
            box.checked = all || box.dataset.default === "true";
          });
          userUpdate();
        });
      }
    );

    // Legend hover highlights one curve. Plotly redraws the legend on every
    // restyle, so the listeners sit on the chart and find the entry.
    chart.addEventListener("mouseover", function (event) {
      var item = event.target.closest ? event.target.closest(".legend .traces") : null;
      var index = item ? legendIndex(chart, item) : null;
      if (index !== null) {
        setFocus({index: index});
      } else if (focus && focus.index !== undefined) {
        setFocus(null);
      }
    });
    chart.addEventListener("mouseleave", function () {
      if (focus && focus.index !== undefined) { setFocus(null); }
    });
    update();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(
      document.querySelectorAll(".curve-chart"), initChart
    );
  });
})();
