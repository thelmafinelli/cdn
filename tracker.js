/* CoinCheck traffic beacon — server counters (c.php). */
(function () {
  var PAGE = (location.pathname.replace(/\/$/, "/index").replace(/\.html$/, "").replace(/\W+/g, "_").replace(/^_/, "")) || "index";
  var qs = new URLSearchParams(location.search);
  var cid = qs.get("click_id") || qs.get("cid") || "";
  var src = qs.get("src") || qs.get("s") || "";
  var ref = qs.get("ref") || "";
  if (!src) {
    var r = document.referrer || "";
    if (/faucetpay\.io/i.test(r)) src = "faucetpay";
    else if (/bitcotasks\.com/i.test(r)) src = "bitcotasks";
    else if (/google\.|bing\.|duckduckgo\./i.test(r)) src = "search";
    else if (/t\.me|telegram/i.test(r)) src = "telegram";
    else if (r) src = "referral";
    else src = "direct";
  }
  var id = localStorage.getItem("ccv");
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("ccv", id); }

  function paint(d) {
    window.CC = d;
    try { document.dispatchEvent(new CustomEvent("cc-stats", { detail: d })); } catch (e) {}
    [].forEach.call(document.querySelectorAll("[data-cc]"), function (el) {
      var f = el.getAttribute("data-cc"); el.textContent = d[f] != null ? d[f] : "";
    });
  }
  function url(withPage) {
    return "/c.php?p=" + (withPage ? encodeURIComponent(PAGE) : "") +
           "&v=" + id + "&s=" + encodeURIComponent(src) + "&c=" + encodeURIComponent(cid) + "&ref=" + encodeURIComponent(ref);
  }
  function hit() {
    fetch(url(true), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { paint({ view: j.page || 0, uniq: j.uniq || 0, live: j.live || 0, total: j.total || 0 }); })
      .catch(function () {});
  }
  function poll() {
    fetch(url(false), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { paint({ view: window.CC ? window.CC.view : 0, uniq: j.uniq || 0, live: j.live || 0, total: j.total || 0 }); })
      .catch(function () {});
  }
  function go() { hit(); setInterval(poll, 45000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
