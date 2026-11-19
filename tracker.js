/* CoinCheck traffic beacon (hidden). Counters live on abacus.jasoncameron.dev — no keys, no backend. */
(function () {
  var NS = "coincheckx";
  var API = "https://abacus.jasoncameron.dev";
  var PAGE = (location.pathname.replace(/\/$/, "/index").replace(/\.html$/, "").replace(/\W+/g, "_").replace(/^_/, "")) || "root";
  var SLOT = Math.floor(Date.now() / 300000);           // 5-min buckets
  var WINDOW = 12;                                       // 1h live window
  function hit(k) { return fetch(API + "/hit/" + NS + "/" + k).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function get(k) { return fetch(API + "/get/" + NS + "/" + k).then(function (r) { return r.ok ? r.json() : { value: 0 }; }).catch(function () { return { value: 0 }; }); }

  function bump() {
    hit("pv_" + PAGE);
    var id = localStorage.getItem("ccv");
    if (!id) { localStorage.setItem("ccv", Math.random().toString(36).slice(2) + Date.now().toString(36)); hit("uv"); }
    if (localStorage.getItem("ccs") !== String(SLOT)) { localStorage.setItem("ccs", String(SLOT)); hit("lb" + (SLOT % 100000)); }
  }

  function emit() {
    var jobs = [get("pv_" + PAGE), get("pv_index"), get("pv_bulk"), get("uv")];
    for (var i = 1; i <= WINDOW; i++) jobs.push(get("lb" + ((SLOT - i + 100000) % 100000)).then(function (j) { return j.value || 0; }));
    Promise.all(jobs).then(function (r) {
      var live = 0; for (var i = 4; i < r.length; i++) live += (r[i].value || 0);
      var d = { view: r[0].value || 0, home: r[1].value || 0, bulk: r[2].value || 0, uniq: r[3].value || 0, live: live };
      d.total = d.home + d.bulk;
      window.CC = d;
      try { document.dispatchEvent(new CustomEvent("cc-stats", { detail: d })); } catch (e) {}
      var els = document.querySelectorAll("[data-cc]");
      for (var k = 0; k < els.length; k++) {
        var f = els[k].getAttribute("data-cc"); els[k].textContent = d[f] != null ? d[f] : "";
      }
    });
  }

  function go() { bump(); emit(); setInterval(emit, 60000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
