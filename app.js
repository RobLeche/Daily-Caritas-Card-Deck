(function () {
  "use strict";

  /* ── Settings you can change ──────────────────────────────────────────
     ownerCodes: the code(s) printed in the physical deck. Not case-sensitive;
                 spaces and dashes are ignored. Anyone reading this file can
                 see them, so treat this as a courtesy lock, not security.
     shopUrl:    where to buy the deck. Leave "" to hide the "Get the deck" button.
     appUrl:     the app's public address once it's online. Used in shared card
                 links and calendar reminders; when empty, the current address is used. */
  var CONFIG = {
    ownerCodes: ["CARITAS54"],
    shopUrl: "",
    appUrl: ""
  };

  var DAY = 24 * 60 * 60 * 1000;
  var KEY = "caritas-daily-card-v1";
  var CARDS = window.CARDS || [];
  var $ = function (id) { return document.getElementById(id); };
  var tick = null, viewerCard = null, sendCard = null, afterUnlock = null;

  /* ── Saved state (this browser only) ──────────────────────────────── */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: works for this visit */ } }
  var state = load();
  if (!Array.isArray(state.seen)) state.seen = [];                       // no-repeat pool for the current pass through the deck
  if (!Array.isArray(state.pulls)) state.pulls = state.current ? [{ id: state.current.id, at: state.current.at, src: "app" }] : [];
  if (!state.journal || typeof state.journal !== "object") state.journal = {};   // keyed by the pull's timestamp
  if (!state.rituals || typeof state.rituals !== "object") state.rituals = {};   // card id -> when marked done
  state.unlocked = !!state.unlocked;

  function byId(id) { for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return CARDS[i]; return null; }
  function active() { return !!(state.current && Date.now() - state.current.at < DAY); }
  function received() { var s = {}; state.pulls.forEach(function (p) { s[p.id] = true; }); return s; }
  function receivedCount() { return Object.keys(received()).length; }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDate(t) { return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  function fmtTime(hhmm) { var p = hhmm.split(":"); return new Date(2000, 0, 1, +p[0], +p[1]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function norm(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function shareBase() {
    if (CONFIG.appUrl) return CONFIG.appUrl;
    return /^https?:$/.test(location.protocol) ? location.origin + location.pathname : "";
  }

  // Practice: each pull within 48 hours of the one before keeps the run going,
  // so someone who pulls a little later each day never loses it.
  function practiceRun() {
    var t = state.pulls.map(function (p) { return p.at; }).sort(function (a, b) { return b - a; });
    if (!t.length || Date.now() - t[0] > 2 * DAY) return 0;
    var n = 1;
    for (var i = 1; i < t.length && t[i - 1] - t[i] <= 2 * DAY; i++) n++;
    return n;
  }

  /* ── Drawing ──────────────────────────────────────────────────────── */
  // Random from the cards not yet received in this pass; after all 54, start over.
  function draw() {
    var pool = CARDS.filter(function (c) { return state.seen.indexOf(c.id) === -1; });
    if (!pool.length) { state.seen = []; pool = CARDS.slice(); }
    var r = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random();
    return pool[Math.floor(r * pool.length)];
  }
  function recordPull(card, src) {
    if (state.seen.length >= CARDS.length) state.seen = [];
    var at = Date.now();
    state.current = { id: card.id, at: at };
    if (state.seen.indexOf(card.id) === -1) state.seen.push(card.id);
    state.pulls.push({ id: card.id, at: at, src: src });
    save();
  }

  /* ── Breathing moment (about 10 seconds) ──────────────────────────── */
  var breathTimers = [];
  function breathe(done) {
    var dlg = $("breath"), word = $("breathWord"), ring = $("breathRing"), finished = false;
    var steps = [["Breathe in", "in", 4000], ["Hold", "hold", 2000], ["Breathe out", "out", 4000]];
    function finish() {
      if (finished) return;
      finished = true;
      breathTimers.forEach(clearTimeout); breathTimers = [];
      if (dlg.open) dlg.close();
      done();
    }
    ring.className = "breath-ring";
    word.textContent = "";
    var t = 80;
    steps.forEach(function (s) {
      breathTimers.push(setTimeout(function () { word.textContent = s[0]; ring.className = "breath-ring " + s[1]; }, t));
      t += s[2];
    });
    breathTimers.push(setTimeout(finish, t + 200));
    $("breathSkip").onclick = finish;
    dlg.oncancel = function (e) { e.preventDefault(); finish(); };
    dlg.showModal();
  }

  /* ── A reading ────────────────────────────────────────────────────────
     ctx: "today" (journal box), "view" (past reflections), "gift" (brief only) */
  function paras(el, list) {
    el.textContent = "";
    list.forEach(function (t) { var p = document.createElement("p"); p.textContent = t; el.appendChild(p); });
  }
  function buildReading(card, ctx) {
    var frag = $("tplReading").content.cloneNode(true);
    var q = function (c) { return frag.querySelector("." + c); };

    q("r-num").textContent = (ctx === "today" ? "Today's card · " : "") + "No. " + card.num;
    q("r-name").textContent = card.name;
    var alias = q("r-alias");
    alias.hidden = norm(card.guide) === norm(card.name);
    alias.textContent = "Guidebook: " + card.guide;
    var theme = q("r-theme");
    theme.hidden = !card.theme.length;
    card.theme.forEach(function (t) { var s = document.createElement("span"); s.textContent = t; theme.appendChild(s); });
    q("r-brief").textContent = card.brief;

    var full = state.unlocked;
    q("r-full").hidden = !full;
    q("r-locked").hidden = full;
    if (full) {
      paras(q("r-teach"), card.teaching);
      paras(q("r-ritual"), card.ritual);
      var rb = q("r-ritual-btn");
      var paint = function () {
        var t = state.rituals[card.id];
        rb.textContent = t ? "✓ Ritual done · " + fmtDate(t) : "I did the ritual";
        rb.setAttribute("aria-pressed", t ? "true" : "false");
        rb.classList.toggle("done", !!t);
      };
      rb.addEventListener("click", function () {
        if (state.rituals[card.id]) delete state.rituals[card.id]; else state.rituals[card.id] = Date.now();
        save(); paint(); renderCollection();
      });
      paint();
    } else {
      q("r-unlock").addEventListener("click", function () { openUnlock(); });
      var shop = q("r-shop");
      if (CONFIG.shopUrl) { shop.href = CONFIG.shopUrl; shop.hidden = false; }
    }

    if (ctx === "today" && state.current) {
      var key = String(state.current.at), box = q("r-journal"), ta = q("r-jtext"), st = q("r-jstatus");
      box.hidden = false;
      if (state.journal[key]) { ta.value = state.journal[key].text; st.textContent = "Saved · " + fmtDate(state.journal[key].at); }
      q("r-jsave").addEventListener("click", function () {
        var text = ta.value.trim();
        if (text) { state.journal[key] = { id: card.id, text: text, at: Date.now() }; st.textContent = "Saved to your journal"; }
        else { delete state.journal[key]; st.textContent = "Removed from your journal"; }
        save(); renderJournal();
      });
    }

    if (ctx === "view") {
      var mine = Object.keys(state.journal).filter(function (k) { return state.journal[k].id === card.id; })
        .sort(function (a, b) { return b - a; });
      if (mine.length) {
        q("r-past").hidden = false;
        var list = q("r-entries");
        mine.forEach(function (k) {
          var d = document.createElement("div"); d.className = "entry";
          var tm = document.createElement("time"); tm.textContent = fmtDate(+k);
          var p = document.createElement("p"); p.textContent = state.journal[k].text;
          d.appendChild(tm); d.appendChild(p); list.appendChild(d);
        });
      }
    }

    if (ctx === "gift") q("r-actions").hidden = true;
    else q("r-send").addEventListener("click", function () { openSend(card); });
    return frag;
  }

  /* ── Today ────────────────────────────────────────────────────────── */
  function paintStats() {
    var el = $("stats"), n = state.pulls.length;
    if (!n) { el.hidden = true; return; }
    var run = practiceRun(), parts = [];
    parts.push(run >= 2 ? "Day " + run + " of your practice" : n + (n === 1 ? " day" : " days") + " of practice");
    parts.push(receivedCount() + " of " + CARDS.length + " cards received");
    el.textContent = parts.join(" · ");
    el.hidden = false;
  }
  function paintTools() {
    $("remindBtn").textContent = state.reminder ? "Reminder · " + fmtTime(state.reminder) : "Daily reminder";
  }

  function showInvite() {
    clearInterval(tick);
    var cardEl = $("card");
    $("stage").classList.remove("revealed");
    cardEl.disabled = false;
    cardEl.classList.remove("landscape");
    cardEl.style.aspectRatio = "";
    cardEl.setAttribute("aria-label", "Pull today's card");
    document.documentElement.style.removeProperty("--tint");
    $("invite").hidden = false;
    $("reading").hidden = true;
    $("timer").hidden = true;
    $("newBtn").hidden = true;
  }

  function renderToday() {
    paintStats(); paintTools();
    var card = state.current && byId(state.current.id);
    if (!card) { showInvite(); return; }
    var cardEl = $("card"), img = $("cardImg");
    clearInterval(tick);
    $("newBtn").hidden = true;
    if (img.getAttribute("src") !== card.img) $("stage").classList.remove("revealed");   // flip back, then reveal the new card
    document.documentElement.style.setProperty("--tint", card.rgb);
    cardEl.classList.toggle("landscape", card.w > card.h);
    cardEl.style.aspectRatio = card.w + " / " + card.h;
    cardEl.disabled = true;
    cardEl.setAttribute("aria-label", card.name + ", today's card");
    img.alt = card.name + " mandala card";
    var r = $("reading");
    r.textContent = "";
    r.appendChild(buildReading(card, "today"));
    var show = function () {
      $("stage").classList.add("revealed");
      $("invite").hidden = true;
      r.hidden = false;
      $("timer").hidden = false;
      startCountdown();
    };
    img.onload = img.onerror = show;
    if (img.getAttribute("src") !== card.img) img.src = card.img;
    if (img.complete && img.naturalWidth) { img.onload = null; show(); }
  }

  function startCountdown() {
    clearInterval(tick);
    var update = function () {
      var left = state.current.at + DAY - Date.now();
      if (left <= 0) {
        clearInterval(tick);
        $("timerText").textContent = "A new card is waiting for you";
        $("newBtn").hidden = false;
        return;
      }
      var s = Math.floor(left / 1000);
      $("timerText").innerHTML = 'Your next card arrives in <b id="countdown"></b>';
      $("countdown").textContent = two(Math.floor(s / 3600)) + ":" + two(Math.floor(s % 3600 / 60)) + ":" + two(s % 60);
    };
    update();
    tick = setInterval(update, 1000);
  }

  function startPull() {
    if (active()) return;
    showInvite();
    breathe(function () {
      var card = draw();
      if (!card) return;
      recordPull(card, "app");
      renderToday(); renderCollection();
    });
  }

  /* ── Collection ───────────────────────────────────────────────────── */
  function renderCollection() {
    var got = received(), n = Object.keys(got).length, grid = $("grid");
    $("colCount").textContent = n + " of " + CARDS.length + " cards received";
    $("colBar").style.width = (n / CARDS.length * 100) + "%";
    grid.textContent = "";
    CARDS.forEach(function (card) {
      var has = !!got[card.id], done = !!state.rituals[card.id];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tile" + (has ? " got" : "") + (card.w > card.h ? " wide" : "");
      b.style.background = "rgb(" + card.rgb + ")";
      b.setAttribute("aria-label", card.name + (has ? (done ? ", ritual done" : "") : ", not yet received"));
      if (!has) b.setAttribute("aria-disabled", "true");
      var img = document.createElement("img");
      img.src = card.thumb; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      var name = document.createElement("span"); name.className = "name"; name.textContent = card.name;
      b.appendChild(img); b.appendChild(name);
      if (has && done) { var m = document.createElement("span"); m.className = "mark"; m.textContent = "✓"; m.setAttribute("aria-hidden", "true"); b.appendChild(m); }
      if (has) b.addEventListener("click", function () { openViewer(card); });
      grid.appendChild(b);
    });
  }

  /* ── Journal ──────────────────────────────────────────────────────── */
  function renderJournal() {
    var list = $("journalList"), keys = Object.keys(state.journal).sort(function (a, b) { return b - a; });
    list.textContent = "";
    $("journalEmpty").hidden = keys.length > 0;
    keys.forEach(function (k) {
      var e = state.journal[k], card = byId(e.id);
      if (!card) return;
      var a = document.createElement("article"); a.className = "jentry glass";
      var img = document.createElement("img"); img.src = card.thumb; img.alt = ""; img.loading = "lazy";
      var body = document.createElement("div");
      var tm = document.createElement("time"); tm.textContent = fmtDate(+k);
      var name = document.createElement("button"); name.type = "button"; name.className = "link"; name.textContent = card.name;
      name.addEventListener("click", function () { openViewer(card); });
      var p = document.createElement("p"); p.textContent = e.text;
      body.appendChild(tm); body.appendChild(name); body.appendChild(p);
      a.appendChild(img); a.appendChild(body);
      list.appendChild(a);
    });
  }

  /* ── Tabs ─────────────────────────────────────────────────────────── */
  var views = { today: "viewToday", collection: "viewCollection", journal: "viewJournal" };
  function switchView(v) {
    Object.keys(views).forEach(function (k) { $(views[k]).hidden = k !== v; });
    document.querySelectorAll(".tabs button").forEach(function (b) {
      if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (v === "collection") renderCollection();
    if (v === "journal") renderJournal();
  }

  /* ── Dialogs ──────────────────────────────────────────────────────── */
  function openViewer(card) {
    viewerCard = card;
    var d = $("viewer");
    d.style.setProperty("--tint", card.rgb);
    $("viewerImg").src = card.img;
    $("viewerImg").alt = card.name + " mandala card";
    var box = $("viewerBody");
    box.textContent = "";
    box.appendChild(buildReading(card, "view"));
    if (!d.open) d.showModal();
    d.querySelector(".sheet").scrollTop = 0;
  }

  function readGift() {
    var h = location.hash.replace(/^#/, "");
    if (!h) return null;
    var p = new URLSearchParams(h), card = byId(parseInt(p.get("gift"), 10));
    return card ? { card: card, from: (p.get("from") || "").slice(0, 60), note: (p.get("note") || "").slice(0, 280) } : null;
  }
  function clearHash() { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; } }
  function openGift(g) {
    var d = $("gift");
    d.style.setProperty("--tint", g.card.rgb);
    $("giftImg").src = g.card.img;
    $("giftImg").alt = g.card.name + " mandala card";
    $("giftFrom").hidden = !g.from;
    $("giftFrom").textContent = "From " + g.from;
    $("giftNote").hidden = !g.note;
    $("giftNote").textContent = g.note;
    var box = $("giftBody");
    box.textContent = "";
    box.appendChild(buildReading(g.card, "gift"));
    if (!d.open) d.showModal();
  }

  function giftLink() {
    var p = new URLSearchParams();
    p.set("gift", sendCard.id);
    var from = $("sendFrom").value.trim(), note = $("sendNote").value.trim();
    if (from) p.set("from", from);
    if (note) p.set("note", note);
    return (shareBase() || location.href.split("#")[0]) + "#" + p.toString();
  }
  function openSend(card) {
    sendCard = card;
    $("sendName").textContent = card.name;
    $("sendStatus").textContent = "";
    $("sendOffline").hidden = !!shareBase();
    $("shareBtn").hidden = !navigator.share;
    if (state.sendFrom && !$("sendFrom").value) $("sendFrom").value = state.sendFrom;
    $("send").showModal();
  }
  function rememberName() { var f = $("sendFrom").value.trim(); if (f !== (state.sendFrom || "")) { state.sendFrom = f; save(); } }
  function copyText(text, done) {
    var fallback = function () {
      var t = document.createElement("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      $("send").appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      t.remove(); done(ok);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }

  function defaultReminder() {
    if (!state.current) return "08:00";
    var d = new Date(state.current.at), m = Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 15) * 15 % 1440;
    return two(Math.floor(m / 60)) + ":" + two(m % 60);
  }
  function openReminder() {
    $("remTime").value = state.reminder || defaultReminder();
    $("remStatus").textContent = state.reminder ? "Your reminder is set for " + fmtTime(state.reminder) + ". Adding it again creates a second calendar event." : "";
    $("reminder").showModal();
  }
  function icsFor(hhmm) {
    var p = hhmm.split(":"), now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +p[0], +p[1]);
    if (start <= now) start.setDate(start.getDate() + 1);
    var local = function (d) { return d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + "T" + two(d.getHours()) + two(d.getMinutes()) + "00"; };
    var utc = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    var url = shareBase();
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Daily Caritas Card//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:daily-caritas-" + now.getTime() + "@caritas-card", "DTSTAMP:" + utc, "DTSTART:" + local(start), "DURATION:PT5M",
      "RRULE:FREQ=DAILY", "SUMMARY:Your Caritas card is ready",
      "DESCRIPTION:Take a breath and pull today's card." + (url ? "\\n" + url : "")];
    if (url) lines.push("URL:" + url);
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Your Caritas card is ready", "TRIGGER:PT0M", "END:VALARM", "END:VEVENT", "END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }
  function downloadFile(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function openUnlock(then) {
    afterUnlock = then || null;
    $("codeInput").value = "";
    $("codeError").hidden = true;
    $("unlock").showModal();
  }
  function rerender() {
    renderToday(); renderCollection(); renderJournal();
    if ($("viewer").open && viewerCard) openViewer(viewerCard);
  }

  var deckBuilt = false;
  function openDeck() {
    if (!state.unlocked) { openUnlock(openDeck); return; }
    $("deckNote").textContent = active()
      ? "Choose the card you drew to read its teaching. You've already received today's card here, so this opens it as a reading."
      : "Choose the card you drew to read its teaching. It becomes today's card here, added to your collection and journal.";
    if (!deckBuilt) {
      deckBuilt = true;
      var list = $("deckList");
      CARDS.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (card) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "deck-item"; b.dataset.name = card.name.toLowerCase();
        var img = document.createElement("img"); img.src = card.thumb; img.alt = ""; img.loading = "lazy";
        var s = document.createElement("span"); s.textContent = card.name;
        b.appendChild(img); b.appendChild(s);
        b.addEventListener("click", function () { chooseFromDeck(card); });
        list.appendChild(b);
      });
    }
    $("deckSearch").value = "";
    filterDeck();
    $("deck").showModal();
  }
  function filterDeck() {
    var q = $("deckSearch").value.trim().toLowerCase();
    $("deckList").querySelectorAll(".deck-item").forEach(function (b) { b.hidden = !!q && b.dataset.name.indexOf(q) === -1; });
  }
  function chooseFromDeck(card) {
    $("deck").close();
    if (active()) { openViewer(card); return; }
    recordPull(card, "deck");
    switchView("today");
    renderToday(); renderCollection();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Card-back mandala ────────────────────────────────────────────── */
  (function () {
    var html = "";
    [[16, 8, 2.2], [32, 14, 2], [48, 22, 1.8], [64, 30, 1.6], [80, 40, 1.4]].forEach(function (ring) {
      for (var i = 0; i < ring[1]; i++) {
        var a = i / ring[1] * Math.PI * 2;
        html += '<circle cx="' + (Math.cos(a) * ring[0]).toFixed(2) + '" cy="' + (Math.sin(a) * ring[0]).toFixed(2) +
                '" r="' + ring[2] + '" fill="#fff" stroke="none" opacity="' + (1 - ring[0] / 130).toFixed(2) + '"/>';
      }
    });
    html += '<circle r="6" fill="#fff" stroke="none"/><circle r="92" stroke-opacity=".45" stroke-width=".8"/><circle r="24" stroke-opacity=".3" stroke-width=".6"/>';
    $("mandala").innerHTML = html;
  })();

  /* ── Wiring ───────────────────────────────────────────────────────── */
  $("pullBtn").addEventListener("click", startPull);
  $("card").addEventListener("click", startPull);
  $("newBtn").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); startPull(); });
  $("deckBtn").addEventListener("click", openDeck);
  $("remindBtn").addEventListener("click", openReminder);
  $("deckSearch").addEventListener("input", filterDeck);
  document.querySelectorAll(".tabs button").forEach(function (b) { b.addEventListener("click", function () { switchView(b.dataset.view); }); });

  document.querySelectorAll("dialog.closable").forEach(function (d) {
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });   // click outside the panel
  });
  document.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { b.closest("dialog").close(); }); });
  $("gift").addEventListener("close", clearHash);
  $("giftPull").addEventListener("click", function () { $("gift").close(); switchView("today"); });
  $("send").addEventListener("close", rememberName);

  $("shareBtn").addEventListener("click", function () {
    navigator.share({ title: "A Caritas card for you", text: "This card made me think of you: " + sendCard.name, url: giftLink() })
      .then(function () { $("sendStatus").textContent = "Shared"; }, function () {});
  });
  $("copyBtn").addEventListener("click", function () {
    copyText(giftLink(), function (ok) { $("sendStatus").textContent = ok ? "Link copied. Paste it in a message." : "Couldn't copy. Try Share instead."; });
  });

  $("remAdd").addEventListener("click", function () {
    var v = $("remTime").value || "08:00";
    downloadFile("caritas-card-reminder.ics", icsFor(v), "text/calendar");
    state.reminder = v; save(); paintTools();
    $("remStatus").textContent = "Open the downloaded file to add the reminder to your calendar.";
  });

  $("unlockForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = norm($("codeInput").value);
    var ok = v && CONFIG.ownerCodes.some(function (c) { return norm(c) === v; });
    if (!ok) { $("codeError").hidden = false; $("codeInput").focus(); return; }
    state.unlocked = true; save();
    $("unlock").close();
    rerender();
    if (afterUnlock) { var next = afterUnlock; afterUnlock = null; next(); }
  });

  $("resetBtn").addEventListener("click", function () {     // remove this button (and its footer line) before launch
    delete state.current; save(); renderToday();
  });

  window.addEventListener("hashchange", function () { var g = readGift(); if (g) openGift(g); });

  /* ── Start ────────────────────────────────────────────────────────── */
  renderToday();
  renderCollection();
  renderJournal();
  var gift = readGift();
  if (gift) openGift(gift);
})();
