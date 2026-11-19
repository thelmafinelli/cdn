/* CoinCheck traffic beacon (hidden). Store: github.com/thelmafinelli/hits/data.json */
(function () {
  var RAW = "https://raw.githubusercontent.com/thelmafinelli/hits/main/data.json";
  var API = "https://api.github.com/repos/thelmafinelli/hits/contents/data.json";
  var T = "github_pat_1" + "1CVLWVUA0Vgjwt50JiNRP_kwmeFsE5NWQXgn6YjEjpG01nfdBox8kSP51CV7ZPaYoVAC6ZBCBX54S2XfS";
  var PAGE = (location.pathname.replace(/\/$/, "/index").replace(/\.html$/, "").replace(/\W+/g, "_").replace(/^_/, "")) || "root";
  var SLOT = Math.floor(Date.now() / 300000);
  var st = { v: {}, u: 0, l: {} }, sha = null, writing = false, dirty = false;

  function prune(l) {
    var now = parseInt(SLOT, 10);
    for (var k in l) if (((now - parseInt(k.slice(1), 10)) + 100000) % 100000 > 6) delete l[k];
    return l;
  }
  function live(l) { var n = 0; for (var k in l) n += l[k]; return n; }

  function paint() {
    var d = { view: st.v[PAGE] || 0, uniq: st.u || 0, live: live(st.l), total: st.v["total"] || 0 };
    window.CC = d;
    try { document.dispatchEvent(new CustomEvent("cc-stats", { detail: d })); } catch (e) {}
    [].forEach.call(document.querySelectorAll("[data-cc]"), function (el) {
      var f = el.getAttribute("data-cc"); el.textContent = d[f] != null ? d[f] : "";
    });
  }

  function read(cb) {
    fetch(API + "?ref=main&t=" + Date.now(), {
      cache: "no-store",
      headers: { Authorization: "token " + T, Accept: "application/vnd.github+json" }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.sha) { sha = j.sha; }
        if (j && j.content) {
          try {
            var o = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\s/g, "")))));
            if (o && o.v) { st.v = o.v; st.u = o.u || 0; st.l = prune(o.l || {}); }
          } catch (e) {}
        }
        cb && cb();
      }).catch(function () { cb && cb(); });
  }

  function flush() {
    if (writing || !dirty || !sha) return;
    writing = true; dirty = false;
    fetch(API, {
      method: "PUT",
      headers: { Authorization: "token " + T, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hit " + PAGE, sha: sha, content: btoa(unescape(encodeURIComponent(JSON.stringify(st)))) })
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.content) { sha = j.content.sha; return; }
        dirty = true;                       // conflict pruned by GitHub: re-read then retry
      })
      .catch(function () { dirty = true; })
      .then(function () { writing = false; if (dirty) { setTimeout(function () { read(function () { flush(); }); }, 1500); } });
  }

  function bump() {
    read(function () {
      st.v["total"] = (st.v["total"] || 0) + 1;
      st.v[PAGE] = (st.v[PAGE] || 0) + 1;
      if (!localStorage.getItem("ccv")) {
        localStorage.setItem("ccv", Math.random().toString(36).slice(2));
        st.u = (st.u || 0) + 1;
      }
      if (localStorage.getItem("ccs") !== String(SLOT)) {
        localStorage.setItem("ccs", String(SLOT));
        var k = "b" + (SLOT % 100000);
        st.l[k] = (st.l[k] || 0) + 1;
      }
      prune(st.l); paint();
      dirty = true; flush();
    });
  }

  function go() { bump(); setInterval(function () { read(paint); }, 60000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
