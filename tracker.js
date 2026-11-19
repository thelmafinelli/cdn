/* CoinCheck traffic beacon (hidden). abacus counters; few requests, serialized. */
(function () {
  var NS = "coincheckx", API = "https://abacus.jasoncameron.dev";
  var PAGE = (location.pathname.replace(/\/$/, "/index").replace(/\.html$/, "").replace(/\W+/g, "_").replace(/^_/, "")) || "root";
  var SLOT = Math.floor(Date.now() / 300000);
  var q = [], busy = false;

  function pump() {
    if (busy || !q.length) return;
    busy = true;
    var job = q.shift(), tries = 0;
    (function run() {
      fetch(API + "/" + job.m + "/" + NS + "/" + job.k)
        .then(function (r) { return r.ok ? r.json() : (r.status === 429 ? null : { value: 0 }); })
        .catch(function () { return { value: 0 }; })
        .then(function (j) {
          if (j === null && ++tries < 5) { setTimeout(run, 900 * tries); return; }
          if (job.cb) job.cb(j || { value: 0 });
          busy = false; setTimeout(pump, 550);
        });
    })();
  }
  function ask(m, k, cb) { q.push({ m: m, k: k, cb: cb }); pump(); }

  function bump() {
    ask("hit", "all");                       // total views, one counter
    ask("hit", "pv_" + PAGE);                // per page
    if (!localStorage.getItem("ccv")) {
      localStorage.setItem("ccv", Math.random().toString(36).slice(2) + Date.now().toString(36));
      ask("hit", "uniqs");
    }
    if (localStorage.getItem("ccs") !== String(SLOT)) {
      localStorage.setItem("ccs", String(SLOT));
      ask("hit", "lb" + (SLOT % 100000));
    }
  }

  function paint(d) {
    window.CC = d;
    try { document.dispatchEvent(new CustomEvent("cc-stats", { detail: d })); } catch (e) {}
    [].forEach.call(document.querySelectorAll("[data-cc]"), function (el) {
      var f = el.getAttribute("data-cc");
      el.textContent = d[f] != null ? d[f] : "";
    });
  }

  function emit() {
    var d = { view: 0, uniq: 0, live: 0, total: 0, bulk: 0 }, left = 4;
    function done() { if (--left) return; d.total = d.viewNow || d.total; paint(d); }
    ask("get", "all", function (j) { d.total = j.value || 0; done(); });
    ask("get", "pv_" + PAGE, function (j) { d.view = j.value || 0; done(); });
    ask("get", "uniqs", function (j) { d.uniq = j.value || 0; done(); });
    ask("get", "lb" + (SLOT % 100000), function (j) { d.live = j.value || 0; done(); });
  }

  function go() { bump(); setTimeout(emit, 1800); setInterval(emit, 60000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
