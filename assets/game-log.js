/* Game Log filters and stable sorting. */
(function () {
  "use strict";
  var form = document.getElementById("game-log-filters");
  var table = document.getElementById("game-log-table");
  if (!form || !table) { return; }
  var rows = Array.from(table.tBodies[0].rows);
  var keys = ["strategist", "condition", "seed", "player", "victory"];
  var query = new URLSearchParams(window.location.search);
  var sort = query.get("sort") || "timestamp";
  var descending = query.get("direction") !== "asc";
  keys.forEach(function (key) {
    var value = query.get(key) || "";
    var select = form.elements[key];
    if (value && !Array.from(select.options).some(function (option) { return option.value === value; })) {
      select.add(new Option(value, value));
    }
    select.value = value;
  });
  form.elements.controlled.checked = query.get("controlled") !== "false";
  function apply() {
    var values = {};
    keys.forEach(function (key) { values[key] = form.elements[key].value; });
    var shown = 0;
    rows.forEach(function (row) {
      var data = row.dataset;
      var identities = JSON.parse(data.identities);
      var match = (!form.elements.controlled.checked || data.controlled === "true") &&
        (!values.seed || values.seed === data.seed) && (!values.victory || values.victory === data.victory) &&
        identities.some(function (identity) {
          return (!values.strategist || values.strategist === identity.strategist) &&
            (!values.condition || values.condition === identity.condition) &&
            (!values.player || values.player === identity.player);
        });
      row.hidden = !match;
      if (match) { shown += 1; }
    });
    document.getElementById("game-log-count").textContent = "Showing " + shown + " of " + rows.length;
    var numeric = ["timestamp", "seed", "rotation", "turns"].indexOf(sort) >= 0;
    rows.map(function (row, index) { return {row: row, index: index}; }).sort(function (a, b) {
      var x = a.row.dataset[sort] || "", y = b.row.dataset[sort] || "";
      var diff = numeric ? (Number(x === "-" ? -1 : x) - Number(y === "-" ? -1 : y)) : x.localeCompare(y);
      return (descending ? -diff : diff) || a.index - b.index;
    }).forEach(function (entry) { table.tBodies[0].appendChild(entry.row); });
    table.querySelectorAll("[data-sort]").forEach(function (button) {
      button.parentElement.setAttribute("aria-sort", button.dataset.sort === sort ? (descending ? "descending" : "ascending") : "none");
    });
    var url = new URL(window.location.href);
    keys.forEach(function (key) {
      if (values[key]) { url.searchParams.set(key, values[key]); } else { url.searchParams.delete(key); }
    });
    if (form.elements.controlled.checked) { url.searchParams.delete("controlled"); }
    else { url.searchParams.set("controlled", "false"); }
    if (sort === "timestamp" && descending) {
      url.searchParams.delete("sort"); url.searchParams.delete("direction");
    } else { url.searchParams.set("sort", sort); url.searchParams.set("direction", descending ? "desc" : "asc"); }
    try { window.history.replaceState(null, "", url); } catch (error) { /* Local file pages may disallow history updates. */ }
  }
  form.addEventListener("submit", function (event) { event.preventDefault(); });
  form.addEventListener("change", apply);
  form.addEventListener("reset", function (event) {
    event.preventDefault();
    keys.forEach(function (key) { form.elements[key].value = ""; });
    form.elements.controlled.checked = true;
    sort = "timestamp"; descending = true; apply();
  });
  table.querySelectorAll("[data-sort]").forEach(function (button) {
    button.addEventListener("click", function () {
      descending = sort === button.dataset.sort ? !descending : false;
      sort = button.dataset.sort; apply();
    });
  });
  apply();
}());
