/* CoinCheck traffic beacon (hidden). abacus counters, serialized to respect its rate limit. */
(function () {
  var NS = "coincheckx", API = "https://abacus.jasoncameron.dev";
  var PAGE = (location.pathname.replace(/\/$/, "/index").replace(/\.html$/, "").replace(/\W+/g, "_").replace(/^_/, "")) || "root";
  var SLOT = Math.floor(Date.now() / 300000), WINDOW = 6;
  var q = [], busy = false;
  function pump() {
    if (busy || !q.length) return;
    busy = true;
    var job = q.shift();
    fetch(API + "/" + job.m + "/" + NS + "/" + job.k)
      .then(function (r) { return r.ok ? r.json() : (r.status === 429 ? (job.retry = (job.retry || 0) + 1, null) : null); })
      .catch(function () {})
      .then(function (j) {
        if (j === null && job.retry && job.retry < 4) { job.retry++; q.unshift(job); }
        else if (job.cb) job.cb(j || { value: 0 });
        busy = false; setTimeout(pump, 420);
      });
  }
  function ask(m, k, cb) { q.push({ m: m, k: k, cb: cb }); pump(); }
  function hit(k) { ask("hit", k); }
  function get(k, cb) { ask("get", k, cb); }

  function bump() {
    hit("pv_" + PAGE);
    var id = localStorage.getItem("ccv");
    if (!id) { localStorage.setItem("ccv", Math.random().toString(36).slice(2) + Date.now().toString(36)); hit("uv"); }
    if (localStorage.getItem("ccs") !== String(SLOT)) { localStorage.setItem("ccs", String(SLOT)); hit("lb" + (SLOT % 100000)); }
  }

  function emit() {
    var d = { view: 0, home: 0, bulk: 0, uniq: 0, live: 0, total: 0 }, left = 4 + WINDOW;
    function done() {
      if (--left) return;
      d.total = d.home + d.bulk; window.CC = d;
      try { document.dispatchEvent(new CustomEvent("cc-stats", { detail: d })); } catch (e) {}
      [].forEach.call(document.querySelectorAll("[data-cc]"), function (el) {
        var f = el.getAttribute("data-cc"); el.textContent = d[f] != null ? d[f] : "";
      });
    }
    get("pv_" + PAGE, function (j) { d.view = j.value || 0; done(); });
    get("pv_index", function (j) { d.home = j.value || 0; done(); });
    get("pv_bulk", function (j) { d.bulk = j.value || 0; done(); });
    get("uv", function (j) { d.uniq = j.value || 0; done(); });
    for (var i = 1; i <= WINDOW; i++) (function (i) {
      get("lb" + ((SLOT - i + 100000) % 100000), function (j) { d.live += j.value || 0; done(); });
    })(i);
  }

  function go() { bump(); setTimeout(emit, 1200); setInterval(emit, 60000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
