/* Shared report help: hover, keyboard focus, click, and Escape.
   Also switches section views: the first view of each group is shown, and a
   choice applies to every group on the page that offers the same view. And it
   shows the text of any [data-tip] element (heatmap cells and labels) in one
   floating tooltip on hover or keyboard focus. A tip's first line is its bold
   title when there are more; "label<TAB>value<TAB>note" lines form a grid with
   the value and the note's numbers in an accent color, "- " lines form a
   bullet list, "**text**" is bold, and other lines are muted subtitles. Tips
   inside a chart follow the pointer. A ?view=<name> query picks the initial view. Finally it
   makes every table sortable by its numeric columns: a header click sorts
   descending, then ascending, then back to the original order; pinned
   reference rows (tbody.vanilla-body) never move, and tables marked
   no-auto-sort keep their own sorting. */
(function () {
  "use strict";
  var tooltip = null;
  function span(cls, text) {
    var node = document.createElement("span");
    node.className = cls;
    node.textContent = text;
    return node;
  }
  function numberSpan(text) {
    var sign = text.charAt(0);
    var color = sign === "+" ? "positive"
      : (sign === "-" || sign === "\u2212" ? "negative" : "unsigned");
    return span("tip-number tip-number-" + color, text);
  }
  /* A note's numbers (a CI range, a game count) use the same sign colors. */
  function noteSpan(text) {
    var node = span("tip-note", "");
    text.split(/([+\-\u2212]?\d[\d,.]*%?)/).forEach(function (part, index) {
      if (!part) { return; }
      node.appendChild(index % 2 ? numberSpan(part) : document.createTextNode(part));
    });
    return node;
  }
  /* "**text**" inside a tip line shows in bold. */
  function richText(node, text) {
    text.split("**").forEach(function (part, index) {
      if (!part) { return; }
      node.appendChild(index % 2 ? span("tip-strong", part) : document.createTextNode(part));
    });
    return node;
  }
  function renderTip(text) {
    tooltip.textContent = "";
    var lines = text.split("\n");
    var grid = null;
    var list = null;
    lines.forEach(function (line, index) {
      if (index > 0 && line.indexOf("- ") === 0) {
        if (!list) {
          list = document.createElement("ul");
          list.className = "tip-list";
          tooltip.appendChild(list);
        }
        list.appendChild(richText(document.createElement("li"), line.slice(2)));
        grid = null;
        return;
      }
      list = null;
      var cells = line.split("\t");
      if (cells.length > 1) {
        if (!grid) {
          grid = document.createElement("div");
          grid.className = "tip-grid";
          tooltip.appendChild(grid);
        }
        grid.appendChild(span("tip-label", cells[0]));
        var value = document.createElement("span");
        value.className = "tip-value";
        if (cells[1]) { value.appendChild(numberSpan(cells[1])); }
        if (cells[2]) { value.appendChild(noteSpan(cells[2])); }
        grid.appendChild(value);
        return;
      }
      grid = null;
      var cls = index === 0 && lines.length > 1 ? "tip-title" : (index === 0 ? "tip-text" : "tip-sub");
      tooltip.appendChild(richText(span(cls, ""), line));
    });
  }
  /* Tips inside a chart follow the pointer; others sit above their target. */
  function placeTip(target, event) {
    var width = document.documentElement.clientWidth;
    var top, left;
    if (event && event.clientX !== undefined && target.closest("svg")) {
      left = Math.min(event.clientX + 14, width - tooltip.offsetWidth - 8);
      top = event.clientY + 16;
      if (top + tooltip.offsetHeight > window.innerHeight - 4) {
        top = event.clientY - tooltip.offsetHeight - 10;
      }
    } else {
      var rect = target.getBoundingClientRect();
      top = rect.top - tooltip.offsetHeight - 6;
      if (top < 4) { top = rect.bottom + 6; }
      left = Math.min(rect.left, width - tooltip.offsetWidth - 8);
    }
    tooltip.style.top = (window.scrollY + top) + "px";
    tooltip.style.left = (window.scrollX + Math.max(4, left)) + "px";
  }
  function showTip(target, event) {
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "heat-tooltip";
      tooltip.className = "heat-tooltip";
      tooltip.setAttribute("role", "tooltip");
      document.body.appendChild(tooltip);
    }
    renderTip(target.getAttribute("data-tip") || "");
    tooltip.style.display = "block";
    placeTip(target, event);
  }
  function hideTip() {
    if (tooltip) { tooltip.style.display = "none"; }
  }
  function tipTarget(event) {
    return event.target.closest ? event.target.closest("[data-tip]") : null;
  }
  document.addEventListener("mouseover", function (event) {
    var target = tipTarget(event);
    if (target) { showTip(target, event); }
  });
  document.addEventListener("mousemove", function (event) {
    var target = tipTarget(event);
    if (target && tooltip && tooltip.style.display === "block" && target.closest("svg")) {
      placeTip(target, event);
    }
  });
  document.addEventListener("mouseout", function (event) {
    if (tipTarget(event)) { hideTip(); }
  });
  document.addEventListener("focusin", function (event) {
    var target = tipTarget(event);
    if (target) { showTip(target); }
  });
  document.addEventListener("focusout", hideTip);
  var groups = document.querySelectorAll(".view-group");
  function showView(group, name) {
    var panels = group.querySelectorAll(".view-panel");
    var known = Array.prototype.some.call(panels, function (panel) {
      return panel.getAttribute("data-view") === name;
    });
    if (!known) { return; }
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-view") !== name;
    });
    group.querySelectorAll(".view-button").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-view") === name));
    });
  }
  var requestedView = new URLSearchParams(window.location.search).get("view");
  if (groups.length) {
    document.documentElement.classList.add("views-ready");
    groups.forEach(function (group) {
      var first = group.querySelector(".view-panel");
      if (first) { showView(group, first.getAttribute("data-view")); }
      if (requestedView) { showView(group, requestedView); }
      group.querySelectorAll(".view-button").forEach(function (button) {
        button.addEventListener("click", function () {
          var name = button.getAttribute("data-view");
          groups.forEach(function (other) { showView(other, name); });
        });
      });
    });
  }
  document.querySelectorAll(".report-help").forEach(function (help) {
    var button = help.querySelector(".help-toggle");
    function dismiss() {
      help.classList.remove("help-open");
      help.classList.add("help-dismissed");
      button.setAttribute("aria-expanded", "false");
    }
    function reveal() {
      help.classList.remove("help-dismissed");
      button.setAttribute("aria-expanded", "true");
      var tip = help.querySelector(".help-text");
      tip.style.left = "0px";
      var rect = tip.getBoundingClientRect();
      tip.style.left = Math.min(0, window.innerWidth - rect.right - 12) + "px";
    }
    button.addEventListener("click", function () {
      if (help.classList.contains("help-open")) {
        dismiss();
      } else {
        help.classList.add("help-open");
        reveal();
      }
    });
    button.addEventListener("focus", reveal);
    help.addEventListener("mouseenter", reveal);
    help.addEventListener("mouseleave", function () {
      if (!help.contains(document.activeElement) && !help.classList.contains("help-open")) {
        dismiss();
      }
    });
    help.addEventListener("focusout", function (event) {
      if (!help.contains(event.relatedTarget)) { dismiss(); }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { dismiss(); }
    });
    document.addEventListener("click", function (event) {
      if (!help.contains(event.target)) { dismiss(); }
    });
  });

  /* Click-to-sort. A cell's value is its data-value, else its text with
     %, commas, a leading + and the unicode minus handled. A column is
     numeric when at least two cells hold numbers and no non-empty cell is
     text. Headers map to columns by data-col, else their position in the
     last header row. */
  function cellNumber(cell) {
    if (!cell) { return null; }
    var raw = cell.hasAttribute("data-value") ? cell.getAttribute("data-value")
      : cell.textContent.trim();
    if (raw === "") { return null; }
    var text = raw.replace(/\u2212/g, "-").replace(/[,%]/g, "").replace(/^\+/, "");
    if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) { return NaN; }
    return parseFloat(text);
  }
  function sortableTable(table) {
    var head = table.tHead;
    if (!head || !head.rows.length || table.classList.contains("no-auto-sort")) { return; }
    var bodies = Array.prototype.filter.call(table.tBodies, function (body) {
      return !body.classList.contains("vanilla-body");
    });
    if (!bodies.length) { return; }
    bodies.forEach(function (body) {
      Array.prototype.forEach.call(body.rows, function (row, index) {
        row.setAttribute("data-order", String(index));
      });
    });
    var headerRow = head.rows[head.rows.length - 1];
    var single = head.rows.length === 1;
    Array.prototype.forEach.call(headerRow.cells, function (th, position) {
      var column = th.hasAttribute("data-col") ? parseInt(th.getAttribute("data-col"), 10)
        : (single ? position : -1);
      if (column < 0) { return; }
      var numbers = 0, text = false;
      bodies.forEach(function (body) {
        Array.prototype.forEach.call(body.rows, function (row) {
          var value = cellNumber(row.cells[column]);
          if (value === null) { return; }
          if (isNaN(value)) { text = true; } else { numbers += 1; }
        });
      });
      if (text || numbers < 2) { return; }
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sort-button";
      while (th.firstChild) { button.appendChild(th.firstChild); }
      th.appendChild(button);
      th.setAttribute("aria-sort", "none");
      button.addEventListener("click", function () {
        var state = th.getAttribute("aria-sort");
        var next = state === "descending" ? "ascending" : (state === "ascending" ? "none" : "descending");
        headerRow.parentNode.parentNode.querySelectorAll("th[aria-sort]").forEach(function (other) {
          other.setAttribute("aria-sort", "none");
        });
        th.setAttribute("aria-sort", next);
        bodies.forEach(function (body) {
          var rows = Array.prototype.slice.call(body.rows);
          rows.sort(function (a, b) {
            var order = parseInt(a.getAttribute("data-order"), 10) - parseInt(b.getAttribute("data-order"), 10);
            if (next === "none") { return order; }
            var x = cellNumber(a.cells[column]), y = cellNumber(b.cells[column]);
            if (x === null || isNaN(x)) { return (y === null || isNaN(y)) ? order : 1; }
            if (y === null || isNaN(y)) { return -1; }
            return (next === "descending" ? y - x : x - y) || order;
          });
          rows.forEach(function (row) { body.appendChild(row); });
        });
      });
    });
  }
  document.querySelectorAll(".table-scroll table").forEach(sortableTable);
}());
