/* ============================================================================
   SpeedyChores — Family Mission Control
   Static site, no build step. Firebase Realtime Database when configured
   (see firebase-config.js), transparent demo-mode fallback to localStorage.
   ========================================================================== */
"use strict";

/* ============================== utilities ============================== */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const money = (n) => "$" + Number(n || 0).toFixed(2);

function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}
/* ISO week key like "2026-W40" */
function weekKey(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = (dt.getDay() + 6) % 7; // Mon=0
  dt.setDate(dt.getDate() - day + 3); // Thursday of this week
  const firstThu = new Date(dt.getFullYear(), 0, 4);
  const fday = (firstThu.getDay() + 6) % 7;
  firstThu.setDate(firstThu.getDate() - fday + 3);
  const wk = 1 + Math.round((dt - firstThu) / (7 * 864e5));
  return `${dt.getFullYear()}-W${String(wk).padStart(2, "0")}`;
}
function weekDates(wk) {
  // returns Monday..Sunday date strings for a week key
  const [yr, w] = wk.split("-W").map(Number);
  const jan4 = new Date(yr, 0, 4);
  const day = (jan4.getDay() + 6) % 7;
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - day + (w - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => todayStr(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
}
function weekLabel(wk) {
  const ds = weekDates(wk);
  const f = (s) => { const [, m, d] = s.split("-"); return `${Number(m)}/${Number(d)}`; };
  return `Week of ${f(ds[0])} – ${f(ds[6])}`;
}
function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
let toastTimer = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

/* ====================== storage adapter (Firebase / demo) ====================== */
let fdb = null;
if (FIREBASE_READY && typeof firebase !== "undefined") {
  try {
    firebase.initializeApp(firebaseConfig);
    fdb = firebase.database();
  } catch (e) { console.warn("Firebase init failed, using demo mode:", e); fdb = null; }
}
const DEMO = !fdb;
const LS_KEY = "speedychoresDemoDB_v1";

function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function lsWrite(tree) { localStorage.setItem(LS_KEY, JSON.stringify(tree)); }
function pathGet(tree, path) {
  return path.split("/").filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), tree);
}
function pathSet(tree, path, val) {
  const ks = path.split("/").filter(Boolean);
  let o = tree;
  ks.slice(0, -1).forEach((k) => { if (typeof o[k] !== "object" || o[k] === null) o[k] = {}; o = o[k]; });
  if (val === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = val;
}
const demoListeners = {}; // path -> [cb]
function demoFire(path) {
  Object.keys(demoListeners).forEach((p) => {
    if (path === p || path.startsWith(p + "/") || p.startsWith(path + "/")) {
      const v = pathGet(lsRead(), p);
      demoListeners[p].forEach((cb) => cb(v === undefined ? null : v));
    }
  });
}

const DB = {
  ref(p) { return fdb ? fdb.ref(DB_ROOT + "/" + p) : null; },
  async get(path) {
    if (fdb) { const s = await this.ref(path).get(); return s.exists() ? s.val() : null; }
    const v = pathGet(lsRead(), path);
    return v === undefined ? null : v;
  },
  async set(path, val) {
    if (fdb) { await this.ref(path).set(val); return; }
    const t = lsRead(); pathSet(t, path, val); lsWrite(t); demoFire(path);
  },
  async update(path, val) {
    if (fdb) { await this.ref(path).update(val); return; }
    const t = lsRead();
    const cur = pathGet(t, path) || {};
    pathSet(t, path, { ...cur, ...val }); lsWrite(t); demoFire(path);
  },
  on(path, cb) {
    if (fdb) { const r = this.ref(path); const h = (s) => cb(s.exists() ? s.val() : null); r.on("value", h); return () => r.off("value", h); }
    (demoListeners[path] = demoListeners[path] || []).push(cb);
    const v = pathGet(lsRead(), path);
    cb(v === undefined ? null : v);
    return () => { demoListeners[path] = (demoListeners[path] || []).filter((f) => f !== cb); };
  }
};

/* ============================== seed data ============================== */
function seedConfig() {
  return {
    kids: {
      henry:  { name: "Henry",  grade: "6th grade", emoji: "🎻", pin: "1111", practice: "Violin" },
      felix:  { name: "Felix",  grade: "",          emoji: "🎹", pin: "2222", practice: "Piano"  },
      andrew: { name: "Andrew", grade: "",          emoji: "🎻", pin: "3333", practice: "Violin" }
    },
    parentPin: "0000",
    rates:  { perChore: 0.50, perHomework: 1.00, perPractice: 0.75, perRoutineItem: 0.25, streakBonus: 2.00, gamingPenalty: -2.00 },
    points: { perChore: 10,   perHomework: 20,   perPractice: 15,   perRoutineItem: 5,    streakBonus: 50,   gamingPenalty: -50 },
    templates: {
      dailyChores: [
        { id: "c-dishes",  label: "Wash dishes" },
        { id: "c-trash",   label: "Take out trash" },
        { id: "c-bedroom", label: "Tidy bedroom" },
        { id: "c-vacuum",  label: "Vacuum living room" }
      ],
      routineItems: [
        { id: "r-backpack", label: "Pack backpack 🎒" },
        { id: "r-clothes",  label: "Lay out clothes 👕" },
        { id: "r-teeth",    label: "Brush teeth 🦷" },
        { id: "r-dishes",   label: "Dishes done 🍽️" },
        { id: "r-lunch",    label: "Make lunch 🥪" }
      ],
      rewards: [
        { id: "rw-icecream", name: "🍦 Ice cream treat",      points: 150 },
        { id: "rw-gaming",   name: "🎮 30 min gaming",        points: 200 },
        { id: "rw-pizza",    name: "🍕 Pizza night",          points: 300 },
        { id: "rw-movie",    name: "🎬 Movie night",         points: 350 },
        { id: "rw-activity", name: "🎪 Choose a fun activity", points: 500 }
      ]
    },
    weeklyChallenge: { label: "Finish 60 chores + homework items as a family 💪", target: 60 }
  };
}

async function ensureSeed() {
  const cfg = await DB.get("config");
  if (!cfg || !cfg.kids) await DB.set("config", seedConfig());
  for (const kidId of ["henry", "felix", "andrew"]) {
    const s = await DB.get("stats/" + kidId);
    if (!s) await DB.set("stats/" + kidId, { lifetimePoints: 0, lifetimeEarned: 0, currentStreak: 0, lastActiveDate: null });
  }
}

/* ============================== scoring ============================== */
function blankDayRecord(kidId, kidName, cfg, date) {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=Sun
  const isChineseDay = [1, 2, 4].includes(dow); // Mon/Tue/Thu
  return {
    kidId, kidName, date,
    status: "open", submittedAt: null,
    homework: [],
    chores: (cfg.templates.dailyChores || []).map((c) => ({ id: c.id, label: c.label, done: false, skipped: false, skipReason: "" })),
    practice:  { label: cfg.kids[kidId].practice, done: false, skipped: false, skipReason: "", minutes: 0 },
    practice2: isChineseDay ? { label: "Chinese", done: false, skipped: false, skipReason: "", minutes: 0 } : null,
    routine: Object.fromEntries((cfg.templates.routineItems || []).map((r) => [r.id, { label: r.label, done: false, skipped: false, skipReason: "" }])),
    gaming: { answered: false, played: false, minutes: 0 },
    streakDays: 0, points: 0, moneyEarned: 0
  };
}

/* Every mission item must be done OR skipped-with-reason; gaming answered. */
function missionProgress(rec) {
  const items = [];
  rec.homework.forEach((h) => items.push(h));
  rec.chores.forEach((c) => items.push(c));
  items.push(rec.practice);
  if (rec.practice2) items.push(rec.practice2);
  Object.values(rec.routine).forEach((r) => items.push(r));
  const resolved = (it) => it.done || (it.skipped && it.skipReason.trim().length > 0);
  const done = items.filter(resolved).length;
  const gamingOk = rec.gaming.answered;
  return { total: items.length + 1, resolved: done + (gamingOk ? 1 : 0), complete: done === items.length && gamingOk };
}

function computeScore(rec, cfg) {
  const r = cfg.rates, p = cfg.points;
  const nChores = rec.chores.filter((c) => c.done).length;
  const nHw = rec.homework.filter((h) => h.done).length;
  const nPractice = (rec.practice.done ? 1 : 0) + (rec.practice2 && rec.practice2.done ? 1 : 0);
  const nRoutine = Object.values(rec.routine).filter((x) => x.done).length;
  let money = nChores * r.perChore + nHw * r.perHomework + nPractice * r.perPractice + nRoutine * r.perRoutineItem;
  let points = nChores * p.perChore + nHw * p.perHomework + nPractice * p.perPractice + nRoutine * p.perRoutineItem;
  if (rec.streakDays > 0 && rec.streakDays % 7 === 0) { money += r.streakBonus; points += p.streakBonus; }
  if (rec.gaming.played) { money += r.gamingPenalty; points += p.gamingPenalty; } // penalties stored negative
  return { points: Math.max(0, Math.round(points)), money: Math.round(money * 100) / 100 };
}

/* ============================== auth ============================== */
let CFG = null;                 // config cache
let SESSION = JSON.parse(sessionStorage.getItem("sc_session") || "null"); // {id, role}
let pinTarget = null, pinBuf = "";

function showView(id) {
  ["view-login", "view-kid", "view-parent"].forEach((v) => ($(v).hidden = v !== id));
}
function kidTabs() {
  document.querySelectorAll("#view-kid .tab").forEach((t) =>
    t.onclick = () => {
      document.querySelectorAll("#view-kid .tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      ["today", "week", "board", "rewards"].forEach((k) => ($("kid-" + k).hidden = k !== t.dataset.tab));
      if (t.dataset.tab === "week") renderKidWeek();
      if (t.dataset.tab === "board") renderBoard();
      if (t.dataset.tab === "rewards") renderRewards();
    });
}
function parTabs() {
  document.querySelectorAll("#view-parent .tab").forEach((t) =>
    t.onclick = () => {
      document.querySelectorAll("#view-parent .tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      ["overview", "payouts", "reports", "settings"].forEach((k) => ($("par-" + k).hidden = k !== t.dataset.tab));
      if (t.dataset.tab === "payouts") renderPayouts();
      if (t.dataset.tab === "reports") renderReports();
      if (t.dataset.tab === "settings") renderSettings();
    });
}

function renderLogin() {
  showView("view-login");
  const grid = $("profileGrid"); grid.innerHTML = "";
  Object.entries(CFG.kids).forEach(([id, k]) => {
    const b = document.createElement("button");
    b.className = "profile-card";
    b.innerHTML = `<span class="p-emoji">${esc(k.emoji)}</span>${esc(k.name)}<span class="p-sub">${esc(k.grade || "Let's go!")}</span>`;
    b.onclick = () => startPin({ id, role: "kid", name: k.name });
    grid.appendChild(b);
  });
  const p = document.createElement("button");
  p.className = "profile-card parent";
  p.innerHTML = `<span class="p-emoji">👩‍💼</span>Parent<span class="p-sub">Dashboard · payouts · settings</span>`;
  p.onclick = () => startPin({ id: "parent", role: "parent", name: "Parent" });
  grid.appendChild(p);
  $("pinWrap").hidden = true;
}

function startPin(target) {
  pinTarget = target; pinBuf = "";
  $("pinTitle").textContent = `Hi ${target.name}! Enter your PIN`;
  $("pinWrap").hidden = false;
  drawPin();
  $("pinWrap").scrollIntoView({ behavior: "smooth", block: "center" });
}
function drawPin() {
  const dots = $("pinDots").children;
  for (let i = 0; i < 4; i++) dots[i].classList.toggle("on", i < pinBuf.length);
}
$("pinPad").addEventListener("click", async (e) => {
  const k = e.target.dataset?.k; if (!k || !pinTarget) return;
  if (k === "cancel") { pinTarget = null; $("pinWrap").hidden = true; return; }
  if (k === "clear") { pinBuf = ""; drawPin(); return; }
  if (pinBuf.length >= 4) return;
  pinBuf += k; drawPin();
  if (pinBuf.length === 4) {
    const want = pinTarget.role === "parent" ? CFG.parentPin : CFG.kids[pinTarget.id].pin;
    if (pinBuf === String(want)) {
      SESSION = { id: pinTarget.id, role: pinTarget.role };
      sessionStorage.setItem("sc_session", JSON.stringify(SESSION));
      pinTarget = null; $("pinWrap").hidden = true;
      bootRole();
    } else { toast("❌ Wrong PIN, try again"); pinBuf = ""; setTimeout(drawPin, 300); }
  }
});

function logout() {
  SESSION = null; sessionStorage.removeItem("sc_session");
  detachAll(); renderLogin();
}
$("kidSwitch").onclick = logout;
$("parSwitch").onclick = logout;

/* live-listener registry so we can detach on logout */
let detachFns = [];
function listen(path, cb) { detachFns.push(DB.on(path, cb)); }
function detachAll() { detachFns.forEach((f) => f()); detachFns = []; }

function bootRole() {
  detachAll();
  boardListening = false;
  // keep config fresh on all devices even after re-login
  DB.on("config", (v) => { if (v) { CFG = v; } });
  if (!SESSION) return renderLogin();
  if (SESSION.role === "kid") { showView("view-kid"); kidTabs(); renderKid(); }
  else { showView("view-parent"); parTabs(); renderParent(); }
}

/* ============================== kid: today ============================== */
let WORK = null; // working day record for the logged-in kid

function blankOrExisting(kidId, date) { return DB.get(`days/${date}/${kidId}`); }

async function renderKid() {
  const kid = CFG.kids[SESSION.id];
  $("kidGreeting").textContent = `Hey ${kid.name}! ${kid.emoji}`;
  const date = todayStr();
  let rec = await blankOrExisting(SESSION.id, date);
  if (!rec) {
    rec = blankDayRecord(SESSION.id, kid.name, CFG, date);
    await DB.set(`days/${date}/${SESSION.id}`, rec);
  }
  // live-sync this kid's record (e.g. parent reopens it on another device)
  listen(`days/${date}/${SESSION.id}`, (v) => { if (v) { WORK = v; paintMission(); paintStreak(); } });
}

function paintStreak() {
  DB.get("stats/" + SESSION.id).then((s) => {
    const n = s?.currentStreak || 0;
    $("kidStreak").textContent = n > 0 ? `🔥 ${n}-day streak · keep it going!` : "Start your streak today! 🔥";
  });
}

function setItemState(listName, id, field, value, reason = "") {
  if (!WORK || WORK.status === "submitted") return;
  const apply = (it) => {
    if (field === "done") { it.done = value; if (value) { it.skipped = false; it.skipReason = ""; } }
    if (field === "skipped") {
      it.skipped = value; it.skipReason = reason;
      if (value) it.done = false;
    }
  };
  if (listName === "homework" || listName === "chores") WORK[listName].find((x) => x.id === id && (apply(x), true));
  else if (listName === "practice" || listName === "practice2") apply(WORK[listName]);
  else if (listName === "routine") apply(WORK.routine[id]);
  DB.set(`days/${WORK.date}/${WORK.kidId}`, WORK); // live autosave
}

function askReason(label, cb) {
  const r = prompt(`Why are you skipping "${label}"? (required)`);
  if (r === null) return; // cancelled
  if (!r.trim()) { toast("Please give a reason 🙂"); return; }
  cb(r.trim());
}

function itemRow(listName, it, opts = {}) {
  const wrap = document.createElement("div");
  const row = document.createElement("div");
  row.className = "mission-item";
  const sub = it.subject ? `<span class="mi-sub">${esc(it.subject)}</span>` : "";
  const mins = opts.showMinutes && (it.done || it.minutes)
    ? `<span class="mi-sub">⏱ ${esc(String(it.minutes || 0))} min</span>` : "";
  row.innerHTML = `<div class="mi-label">${esc(it.label)}${sub}${mins}</div>`;
  const acts = document.createElement("div");
  acts.className = "mi-actions";
  const bD = document.createElement("button");
  bD.className = "mi-btn done" + (it.done ? " on" : "");
  bD.textContent = "✅ Done";
  bD.disabled = WORK.status === "submitted";
  bD.onclick = () => {
    if (opts.askMinutes && !it.done) {
      const m = prompt(`How many minutes of ${it.label}?`, it.minutes || "30");
      if (m !== null && !isNaN(Number(m))) it.minutes = Math.max(0, Math.round(Number(m)));
    }
    setItemState(listName, it.id, "done", !it.done);
  };
  const bS = document.createElement("button");
  bS.className = "mi-btn skip" + (it.skipped ? " on" : "");
  bS.textContent = "📝 Skip";
  bS.disabled = WORK.status === "submitted";
  bS.onclick = () => {
    if (it.skipped) setItemState(listName, it.id, "skipped", false);
    else askReason(it.label, (reason) => setItemState(listName, it.id, "skipped", true, reason));
  };
  acts.append(bD, bS); row.appendChild(acts); wrap.appendChild(row);
  if (it.skipped && it.skipReason) {
    const r = document.createElement("div");
    r.className = "skip-reason"; r.textContent = `Skipped: ${it.skipReason}`;
    wrap.appendChild(r);
  }
  return wrap;
}

function groupCard(title, emoji, listName, items, opts = {}) {
  const card = document.createElement("div");
  card.className = "mission-group";
  card.innerHTML = `<h3>${emoji} ${esc(title)}</h3>`;
  items.forEach((it) => card.appendChild(itemRow(listName, it, opts)));
  if (opts.add) {
    const add = document.createElement("div");
    add.className = "add-row";
    add.innerHTML = `<input placeholder="${esc(opts.add)}"><button class="small-btn">＋ Add</button>`;
    const [inp, btn] = [add.querySelector("input"), add.querySelector("button")];
    const doAdd = () => {
      const v = inp.value.trim(); if (!v || WORK.status === "submitted") return;
      let subj = "";
      if (opts.addSubject) { subj = prompt("Subject? (e.g. Math, Reading)") || ""; }
      WORK[listName].push({ id: uid(), label: v, subject: subj, done: false, skipped: false, skipReason: "" });
      DB.set(`days/${WORK.date}/${WORK.kidId}`, WORK);
    };
    btn.onclick = doAdd;
    inp.onkeydown = (e) => { if (e.key === "Enter") doAdd(); };
    card.appendChild(add);
  }
  return card;
}

function paintMission() {
  const g = $("missionGroups"); g.innerHTML = "";
  if (!WORK) return;
  const submitted = WORK.status === "submitted";

  g.appendChild(groupCard("Homework", "📚", "homework", WORK.homework,
    submitted ? {} : { add: "Add homework, e.g. Math worksheet", addSubject: true }));
  g.appendChild(groupCard("Chores", "🧹", "chores", WORK.chores,
    submitted ? {} : { add: "Add a chore" }));
  g.appendChild(groupCard(`Practice — ${WORK.practice.label}`, "🎻", "practice", [WORK.practice],
    { showMinutes: true, askMinutes: !submitted }));
  if (WORK.practice2) g.appendChild(groupCard(`Practice — ${WORK.practice2.label}`, "🈶", "practice2", [WORK.practice2],
    { showMinutes: true, askMinutes: !submitted }));
  g.appendChild(groupCard("Evening routine", "🌙", "routine", Object.entries(WORK.routine).map(([id, r]) => ({ id, ...r }))));

  // gaming declaration
  const gc = document.createElement("div");
  gc.className = "mission-group";
  gc.innerHTML = `<h3>🎮 Video games (3–10pm)</h3>`;
  const grow = document.createElement("div"); grow.className = "mission-item";
  grow.innerHTML = `<div class="mi-label">Did you play video games today?<span class="mi-sub">Honest answer — gaming = −${esc(money(Math.abs(CFG.rates.gamingPenalty)))} and −${Math.abs(CFG.points.gamingPenalty)} pts</span></div>`;
  const acts = document.createElement("div"); acts.className = "mi-actions";
  const yb = document.createElement("button"), nb = document.createElement("button");
  yb.className = "mi-btn skip" + (WORK.gaming.answered && WORK.gaming.played ? " on" : "");
  nb.className = "mi-btn done" + (WORK.gaming.answered && !WORK.gaming.played ? " on" : "");
  yb.textContent = "Yes"; nb.textContent = "No";
  yb.disabled = nb.disabled = submitted;
  yb.onclick = () => { WORK.gaming = { answered: true, played: true, minutes: WORK.gaming.minutes || 0 }; DB.set(`days/${WORK.date}/${WORK.kidId}`, WORK); };
  nb.onclick = () => { WORK.gaming = { answered: true, played: false, minutes: 0 }; DB.set(`days/${WORK.date}/${WORK.kidId}`, WORK); };
  acts.append(yb, nb); grow.appendChild(acts); gc.appendChild(grow); g.appendChild(gc);

  // progress + submit gating (REQUIRED check-in: nothing submittable until all resolved)
  const pr = missionProgress(WORK);
  $("missionFill").style.width = (pr.total ? (pr.resolved / pr.total) * 100 : 0) + "%";
  $("missionText").textContent = `${pr.resolved} of ${pr.total} resolved`;
  const btn = $("submitDay");
  const note = $("submittedNote");
  if (submitted) {
    btn.hidden = true; note.hidden = false;
    note.innerHTML = `✅ Submitted at ${esc(new Date(WORK.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))} — you earned <b>${money(WORK.moneyEarned)}</b> and <b>${WORK.points} pts</b>! ${WORK.streakDays % 7 === 0 && WORK.streakDays > 0 ? "🔥 Streak bonus banked!" : ""}<br><span class="muted-sm">Need a change? Ask a parent to reopen today.</span>`;
  } else {
    btn.hidden = false; note.hidden = true;
    btn.disabled = !pr.complete;
    btn.textContent = pr.complete ? "🚀 Done for today — submit!" : `🔒 Finish all items to submit (${pr.total - pr.resolved} left)`;
  }
}

$("submitDay").onclick = async () => {
  if (!WORK || WORK.status === "submitted") return;
  const pr = missionProgress(WORK);
  if (!pr.complete) { toast("Resolve every item first 🙂"); return; }
  if (!confirm("Submit today's mission? This locks it in!")) return;
  // streak: consecutive submitted days
  const y = await DB.get(`days/${addDays(WORK.date, -1)}/${WORK.kidId}`);
  WORK.streakDays = y && y.status === "submitted" ? (y.streakDays || 0) + 1 : 1;
  const sc = computeScore(WORK, CFG);
  WORK.points = sc.points; WORK.moneyEarned = sc.money;
  WORK.status = "submitted"; WORK.submittedAt = new Date().toISOString();
  await DB.set(`days/${WORK.date}/${WORK.kidId}`, WORK);
  const st = (await DB.get("stats/" + WORK.kidId)) || { lifetimePoints: 0, lifetimeEarned: 0, currentStreak: 0 };
  await DB.set("stats/" + WORK.kidId, {
    lifetimePoints: (st.lifetimePoints || 0) + sc.points,
    lifetimeEarned: Math.round(((st.lifetimeEarned || 0) + sc.money) * 100) / 100,
    currentStreak: WORK.streakDays,
    lastActiveDate: WORK.date
  });
  toast(`🎉 +${money(sc.money)} · +${sc.points} pts!`);
};

/* ---- kid feedback flags -> Glimmer (duty mismatches, notes) ---- */
$("fbSend").onclick = async () => {
  const ta = $("fbText");
  const msg = ta.value.trim();
  if (!msg) { toast("Write what doesn't match first 🙂"); return; }
  if (!SESSION || SESSION.role !== "kid") { toast("Log in as a kid to send feedback 🙂"); return; }
  const id = uid();
  await DB.set("feedback/" + id, {
    id,
    kidId: SESSION.id,
    kidName: CFG.kids[SESSION.id].name,
    date: todayStr(),
    message: msg,
    status: "new",
    createdAt: new Date().toISOString()
  });
  ta.value = "";
  toast("📨 Sent to your parents!");
};

/* ============================== kid: week / board / rewards ============================== */
async function renderKidWeek() {
  const wk = weekKey(todayStr());
  const ds = weekDates(wk);
  const wrap = $("weekCards"); wrap.innerHTML = "";
  let tP = 0, tM = 0;
  for (const d of ds) {
    const rec = await DB.get(`days/${d}/${SESSION.id}`);
    const card = document.createElement("div");
    card.className = "day-card";
    let status, cls;
    if (rec && rec.status === "submitted") { status = `✅ ${money(rec.moneyEarned)} · ${rec.points} pts`; cls = "done"; tP += rec.points; tM += rec.moneyEarned; }
    else if (d === todayStr()) { status = "👉 do it today!"; cls = "open"; }
    else if (d < todayStr()) { status = "❌ missed"; cls = "missed"; }
    else { status = "—"; cls = "open"; }
    card.innerHTML = `<div><b>${prettyDate(d)}</b></div><div class="d-status ${cls}">${status}</div>`;
    wrap.appendChild(card);
  }
  $("wkPoints").textContent = tP;
  $("wkMoney").textContent = money(tM);
}

let boardListening = false;
function renderBoard() {
  const wk = weekKey(todayStr());
  const ds = weekDates(wk);
  const list = $("leaderList"); list.innerHTML = "<p class='muted'>Loading…</p>";
  const medals = ["🥇", "🥈", "🥉"];
  (async () => {
    const rows = [];
    for (const [id, k] of Object.entries(CFG.kids)) {
      let pts = 0, items = 0;
      for (const d of ds) {
        const r = await DB.get(`days/${d}/${id}`);
        if (r && r.status === "submitted") {
          pts += r.points || 0;
          items += r.chores.filter((c) => c.done).length + r.homework.filter((h) => h.done).length;
        }
      }
      rows.push({ id, name: k.name, emoji: k.emoji, pts, items });
    }
    rows.sort((a, b) => b.pts - a.pts);
    list.innerHTML = "";
    rows.forEach((r, i) => {
      const div = document.createElement("div");
      div.className = "leader-row" + (r.id === SESSION.id ? " me" : "");
      div.innerHTML = `<div class="rank">${medals[i] || "4️⃣"}</div>
        <div class="leader-name">${r.emoji} ${esc(r.name)}<span class="l-sub">${r.items} items done this week</span></div>
        <div class="leader-score">${r.pts} pts</div>`;
      list.appendChild(div);
    });
    // weekly challenge — live family total
    const ch = CFG.weeklyChallenge || { label: "", target: 1 };
    let total = 0;
    for (const id of Object.keys(CFG.kids))
      for (const d of ds) {
        const r = await DB.get(`days/${d}/${id}`);
        if (r && r.status === "submitted") total += r.chores.filter((c) => c.done).length + r.homework.filter((h) => h.done).length;
      }
    $("challengeLabel").textContent = ch.label;
    $("challengeFill").style.width = Math.min(100, (total / ch.target) * 100) + "%";
    $("challengeText").textContent = `${total} / ${ch.target} — ${total >= ch.target ? "🎉 CHALLENGE CRUSHED!" : "keep going!"}`;
  })();
  // refresh live when any day changes (registered once)
  if (!boardListening) { boardListening = true; listen("days", () => { if (!$("kid-board").hidden) renderBoard(); }); }
}

async function renderRewards() {
  const st = (await DB.get("stats/" + SESSION.id)) || {};
  $("rwPoints").textContent = st.lifetimePoints || 0;
  $("rwMoney").textContent = money(st.lifetimeEarned || 0);
  const list = $("rewardList"); list.innerHTML = "";
  (CFG.templates.rewards || []).forEach((rw) => {
    const row = document.createElement("div");
    row.className = "claim-row";
    const afford = (st.lifetimePoints || 0) >= rw.points;
    row.innerHTML = `<div class="c-info"><b>${esc(rw.name)}</b><div class="muted-sm">${rw.points} points</div></div>`;
    const b = document.createElement("button");
    b.className = "small-btn"; b.textContent = "🙋 I want this!";
    b.disabled = !afford;
    b.title = afford ? "Ask Mom to approve" : `Need ${rw.points - (st.lifetimePoints || 0)} more points`;
    b.onclick = async () => {
      const id = uid();
      await DB.set("claims/" + id, { id, kidId: SESSION.id, kidName: CFG.kids[SESSION.id].name, rewardName: rw.name, points: rw.points, status: "pending", createdAt: new Date().toISOString() });
      toast("🙋 Mom will review your claim!");
      renderRewards();
    };
    row.appendChild(b); list.appendChild(row);
  });
  const cl = $("claimList"); cl.innerHTML = "";
  const claims = (await DB.get("claims")) || {};
  Object.values(claims).filter((c) => c.kidId === SESSION.id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 10).forEach((c) => {
      const d = document.createElement("div");
      d.className = "claim-row";
      d.innerHTML = `<div class="c-info"><b>${esc(c.rewardName)}</b><div class="muted-sm">${c.points} pts</div></div><span class="pill ${c.status}">${esc(c.status)}</span>`;
      cl.appendChild(d);
    });
  if (!cl.children.length) cl.innerHTML = "<p class='muted'>No claims yet.</p>";
}

/* ============================== parent ============================== */
function renderParent() {
  showView("view-parent");
  $("parentDateLine").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  renderOverview();
}

function kidStatusPill(rec) {
  if (!rec) return `<span class="pill open">not started</span>`;
  if (rec.status === "submitted") return `<span class="pill approved">✅ submitted</span>`;
  const pr = missionProgress(rec);
  return `<span class="pill pending">in progress ${pr.resolved}/${pr.total}</span>`;
}

function renderOverview() {
  const date = todayStr();
  const wrap = $("parKidCards"); wrap.innerHTML = "";
  Object.entries(CFG.kids).forEach(([id, k]) => {
    const card = document.createElement("div");
    card.className = "card"; card.id = "pk-" + id;
    card.innerHTML = `<h3>${k.emoji} ${esc(k.name)}</h3><div class="pk-body"><p class="muted">Loading…</p></div>`;
    wrap.appendChild(card);
    listen(`days/${date}/${id}`, (rec) => {
      const body = card.querySelector(".pk-body");
      const st = rec && rec.status === "submitted"
        ? `<b>${money(rec.moneyEarned)}</b> earned · <b>${rec.points}</b> pts · 🔥 ${rec.streakDays}-day streak`
        : rec ? `Working on it…` : `Hasn't opened today's mission yet`;
      body.innerHTML = `${kidStatusPill(rec)}<p>${st}</p><div class="muted-sm">${rec && rec.gaming.answered && rec.gaming.played ? "⚠️ reported gaming today" : ""}</div>`;
      const row = document.createElement("div"); row.className = "add-row";
      if (rec && rec.status === "submitted") {
        const rb = document.createElement("button"); rb.className = "small-btn"; rb.textContent = "🔓 Reopen day";
        rb.onclick = async () => { if (confirm(`Reopen ${k.name}'s day?`)) await DB.update(`days/${date}/${id}`, { status: "open" }); };
        row.appendChild(rb);
      }
      const vb = document.createElement("button"); vb.className = "small-btn"; vb.textContent = "📊 View details";
      vb.onclick = () => {
        document.querySelector('#view-parent [data-tab="reports"]').click();
        $("repDate").value = date;
        renderReports();
      };
      row.appendChild(vb); body.appendChild(row);
    });
  });
  renderParClaims();
}

async function renderParClaims() {
  const wrap = $("parClaims"); wrap.innerHTML = "";
  const claims = (await DB.get("claims")) || {};
  const pend = Object.values(claims).filter((c) => c.status === "pending")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  if (!pend.length) { wrap.innerHTML = "<p class='muted'>Nothing waiting. 🎉</p>"; return; }
  for (const c of pend) {
    const row = document.createElement("div"); row.className = "claim-row";
    row.innerHTML = `<div class="c-info"><b>${esc(c.kidName)}</b> wants <b>${esc(c.rewardName)}</b><div class="muted-sm">${c.points} pts</div></div>`;
    const ok = document.createElement("button"); ok.className = "small-btn"; ok.textContent = "✅ Approve";
    ok.onclick = async () => {
      const st = (await DB.get("stats/" + c.kidId)) || { lifetimePoints: 0 };
      if ((st.lifetimePoints || 0) < c.points) { toast("Not enough points!"); return; }
      await DB.update("claims/" + c.id, { status: "approved" });
      await DB.update("stats/" + c.kidId, { lifetimePoints: (st.lifetimePoints || 0) - c.points });
      toast("Approved! 🎁"); renderParClaims();
    };
    const no = document.createElement("button"); no.className = "small-btn"; no.textContent = "✖";
    no.style.background = "#ef476f";
    no.onclick = async () => { await DB.update("claims/" + c.id, { status: "denied" }); renderParClaims(); };
    row.append(ok, no); wrap.appendChild(row);
  }
}

/* ---- payouts ---- */
let payWeek = weekKey(todayStr());
async function renderPayouts() {
  $("payWeekLabel").textContent = weekLabel(payWeek);
  const wrap = $("payoutCards"); wrap.innerHTML = "<p class='muted'>Loading…</p>";
  const ds = weekDates(payWeek);
  const paidMap = (await DB.get("payouts/" + payWeek)) || {};
  wrap.innerHTML = "";
  let famTotal = 0;
  for (const [id, k] of Object.entries(CFG.kids)) {
    let m = 0, p = 0, daysN = 0;
    const lines = [];
    for (const d of ds) {
      const r = await DB.get(`days/${d}/${id}`);
      if (r && r.status === "submitted") {
        m += r.moneyEarned || 0; p += r.points || 0; daysN++;
        lines.push(`${prettyDate(d)}: ${money(r.moneyEarned)} (${r.points} pts)`);
      }
    }
    m = Math.round(m * 100) / 100; famTotal += m;
    const paid = paidMap[id]?.paid;
    const card = document.createElement("div"); card.className = "card";
    card.innerHTML = `<h3>${k.emoji} ${esc(k.name)} ${paid ? '<span class="pill paid">PAID</span>' : ""}</h3>
      <div class="stat-row">
        <div class="stat-card"><div class="stat-num">${money(m)}</div><div class="stat-lbl">to pay</div></div>
        <div class="stat-card"><div class="stat-num">${p}</div><div class="stat-lbl">points</div></div>
        <div class="stat-card"><div class="stat-num">${daysN}/7</div><div class="stat-lbl">days submitted</div></div>
      </div>
      <div class="muted-sm">${lines.length ? lines.map(esc).join("<br>") : "No submitted days this week."}</div>`;
    const row = document.createElement("div"); row.className = "add-row";
    const b = document.createElement("button");
    b.className = "small-btn"; b.textContent = paid ? "↩ Mark unpaid" : "💵 Mark paid";
    b.onclick = async () => {
      await DB.set(`payouts/${payWeek}/${id}`, paid ? { paid: false, paidAt: null, totalMoney: m }
        : { paid: true, paidAt: new Date().toISOString(), totalMoney: m });
      toast(paid ? "Marked unpaid" : `💵 ${k.name} paid ${money(m)}!`);
      renderPayouts();
    };
    row.appendChild(b); card.appendChild(row); wrap.appendChild(card);
  }
  const tot = document.createElement("div"); tot.className = "card";
  tot.innerHTML = `<h3>👨‍👩‍👧‍👦 Family total: <b>${money(Math.round(famTotal * 100) / 100)}</b></h3>`;
  wrap.appendChild(tot);
}
$("payPrev").onclick = () => { payWeek = weekKey(addDays(weekDates(payWeek)[0], -7)); renderPayouts(); };
$("payNext").onclick = () => { payWeek = weekKey(addDays(weekDates(payWeek)[0], 7)); renderPayouts(); };

/* ---- reports ---- */
async function renderReports() {
  const date = $("repDate").value || todayStr();
  $("repDate").value = date;
  const wrap = $("repTables"); wrap.innerHTML = "";

  // kid feedback flags (duty mismatches, notes for Glimmer) — newest first
  const fbAll = (await DB.get("feedback")) || {};
  const fbItems = Object.values(fbAll).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const fbOpen = fbItems.filter((x) => x.status === "new");
  const fw = $("repFeedback"); fw.innerHTML = `<h3>📣 Kid flags${fbOpen.length ? ` (${fbOpen.length} new)` : ""}</h3>`;
  if (!fbItems.length) fw.insertAdjacentHTML("beforeend", `<p class="muted">No flags yet. 🎉</p>`);
  fbItems.slice(0, 20).forEach((x) => {
    const d = document.createElement("div");
    d.className = "card" + (x.status === "new" ? "" : " muted");
    d.innerHTML = `<b>${esc(x.kidName || x.kidId)}</b> <span class="muted-sm">${esc(x.date || "")}</span> ` +
      (x.status === "new" ? `<span class="pill">NEW</span>` : `<span class="pill approved">resolved</span>`) +
      `<p>${esc(x.message)}</p>`;
    if (x.status === "new") {
      const b = document.createElement("button"); b.className = "small-btn"; b.textContent = "Mark resolved ✔️";
      b.onclick = async () => { await DB.update("feedback/" + x.id, { status: "resolved" }); renderReports(); };
      d.appendChild(b);
    }
    fw.appendChild(d);
  });
  for (const [id, k] of Object.entries(CFG.kids)) {
    const r = await DB.get(`days/${date}/${id}`);
    const h = document.createElement("div"); h.className = "rep-kid"; h.textContent = `${k.emoji} ${k.name}`;
    wrap.appendChild(h);
    if (!r) { wrap.insertAdjacentHTML("beforeend", "<p class='muted'>No record for this day.</p>"); continue; }
    const hwRows = r.homework.map((x) =>
      `<tr><td>${esc(x.label)}${x.subject ? ` <span class="muted-sm">(${esc(x.subject)})</span>` : ""}</td>
       <td>${x.done ? "✅" : x.skipped ? `📝 skipped: ${esc(x.skipReason)}` : "—"}</td>
       <td>${x.proof ? "📷" : ""}${x.verified ? " ✔️" : ""}</td></tr>`).join("");
    const chRows = r.chores.map((x) =>
      `<tr><td>${esc(x.label)}</td><td>${x.done ? "✅" : x.skipped ? `📝 skipped: ${esc(x.skipReason)}` : "—"}</td></tr>`).join("");
    const rtRows = Object.values(r.routine).map((x) =>
      `<tr><td>${esc(x.label)}</td><td>${x.done ? "✅" : x.skipped ? `📝 skipped` : "—"}</td></tr>`).join("");
    const t = document.createElement("div");
    t.innerHTML = `
      <table class="rep"><tr><th colspan="3">📚 Homework</th></tr>${hwRows || '<tr><td colspan="3" class="muted">none logged</td></tr>'}</table>
      <table class="rep"><tr><th colspan="2">🧹 Chores</th></tr>${chRows}</table>
      <table class="rep"><tr><th>🎻 Practice</th><th>Status</th></tr>
        <tr><td>${esc(r.practice.label)}${r.practice.minutes ? ` (${r.practice.minutes} min)` : ""}</td><td>${r.practice.done ? "✅" : r.practice.skipped ? "📝 skipped" : "—"}</td></tr>
        ${r.practice2 ? `<tr><td>${esc(r.practice2.label)}${r.practice2.minutes ? ` (${r.practice2.minutes} min)` : ""}</td><td>${r.practice2.done ? "✅" : r.practice2.skipped ? "📝 skipped" : "—"}</td></tr>` : ""}</table>
      <table class="rep"><tr><th colspan="2">🌙 Routine</th></tr>${rtRows}</table>
      <p><b>Gaming:</b> ${!r.gaming.answered ? "not answered" : r.gaming.played ? `⚠️ yes${r.gaming.minutes ? ` (${r.gaming.minutes} min)` : ""}` : "no"} ·
      <b>Streak:</b> 🔥 ${r.streakDays} · <b>Points:</b> ${r.points} · <b>Earned:</b> ${money(r.moneyEarned)} ·
      <b>Status:</b> ${r.status}${r.submittedAt ? ` at ${new Date(r.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</p>`;
    wrap.appendChild(t);
    // parent homework-proof verification toggles
    if (r.homework.length) {
      const v = document.createElement("div"); v.className = "muted-sm";
      v.textContent = "Tap to toggle photo-proof / verified:";
      r.homework.forEach((x, i) => {
        const b = document.createElement("button"); b.className = "small-btn"; b.style.margin = "2px";
        b.textContent = `${x.label}: ${x.proof ? "📷" : "no 📷"} ${x.verified ? "✔️" : ""}`;
        b.onclick = async () => {
          x.proof = !x.proof; if (!x.proof) x.verified = false; else if (x.proof && !x.verified && confirm("Mark as VERIFIED (you checked it)?")) x.verified = true;
          await DB.set(`days/${date}/${id}`, r); renderReports();
        };
        v.appendChild(b);
      });
      wrap.appendChild(v);
    }
  }
}
$("repDate").addEventListener("change", renderReports);

/* ---- settings ---- */
function renderSettings() {
  const c = CFG;
  $("setPerChore").value = c.rates.perChore; $("setPerHomework").value = c.rates.perHomework;
  $("setPerPractice").value = c.rates.perPractice; $("setPerRoutine").value = c.rates.perRoutineItem;
  $("setStreakBonus").value = c.rates.streakBonus; $("setGamingPenalty").value = c.rates.gamingPenalty;
  $("setPtChore").value = c.points.perChore; $("setPtHomework").value = c.points.perHomework;
  $("setPtPractice").value = c.points.perPractice; $("setPtRoutine").value = c.points.perRoutineItem;
  $("setPtStreak").value = c.points.streakBonus; $("setPtGaming").value = c.points.gamingPenalty;
  $("setChLabel").value = c.weeklyChallenge.label; $("setChTarget").value = c.weeklyChallenge.target;
  const pf = $("pinFields"); pf.innerHTML = "";
  Object.entries(c.kids).forEach(([id, k]) => {
    pf.insertAdjacentHTML("beforeend", `<label class="fld">${esc(k.name)} PIN <input data-pin="${id}" maxlength="4" value="${esc(k.pin)}"></label>`);
  });
  pf.insertAdjacentHTML("beforeend", `<label class="fld">Parent PIN <input data-pin="parent" maxlength="4" value="${esc(c.parentPin)}"></label>`);
  paintTplList("choreTplList", c.templates.dailyChores, "dailyChores");
  paintTplList("routineTplList", c.templates.routineItems, "routineItems");
  paintRewardList();
}
function paintTplList(elId, arr, key) {
  const el = $(elId); el.innerHTML = "";
  arr.forEach((it) => {
    const row = document.createElement("div"); row.className = "tpl-row";
    row.innerHTML = `<span>${esc(it.label)}</span>`;
    const del = document.createElement("button"); del.className = "tpl-del"; del.textContent = "✕";
    del.onclick = () => { CFG.templates[key] = CFG.templates[key].filter((x) => x.id !== it.id); paintTplList(elId, CFG.templates[key], key); };
    row.appendChild(del); el.appendChild(row);
  });
}
function paintRewardList() {
  const el = $("rewardTplList"); el.innerHTML = "";
  CFG.templates.rewards.forEach((rw) => {
    const row = document.createElement("div"); row.className = "tpl-row";
    row.innerHTML = `<span>${esc(rw.name)} <span class="muted-sm">(${rw.points} pts)</span></span>`;
    const del = document.createElement("button"); del.className = "tpl-del"; del.textContent = "✕";
    del.onclick = () => { CFG.templates.rewards = CFG.templates.rewards.filter((x) => x.id !== rw.id); paintRewardList(); };
    row.appendChild(del); el.appendChild(row);
  });
}
$("addChoreTpl").onclick = () => {
  const v = $("newChoreTpl").value.trim(); if (!v) return;
  CFG.templates.dailyChores.push({ id: uid(), label: v }); $("newChoreTpl").value = "";
  paintTplList("choreTplList", CFG.templates.dailyChores, "dailyChores");
};
$("addRoutineTpl").onclick = () => {
  const v = $("newRoutineTpl").value.trim(); if (!v) return;
  CFG.templates.routineItems.push({ id: uid(), label: v }); $("newRoutineTpl").value = "";
  paintTplList("routineTplList", CFG.templates.routineItems, "routineItems");
};
$("addRewardTpl").onclick = () => {
  const n = $("newRewardName").value.trim(), p = Number($("newRewardPts").value);
  if (!n || !p) return;
  CFG.templates.rewards.push({ id: uid(), name: n, points: p });
  $("newRewardName").value = ""; $("newRewardPts").value = "";
  paintRewardList();
};
$("saveSettings").onclick = async () => {
  const num = (id, fb) => { const v = Number($(id).value); return isNaN(v) ? fb : v; };
  CFG.rates = {
    perChore: num("setPerChore", 0.5), perHomework: num("setPerHomework", 1),
    perPractice: num("setPerPractice", 0.75), perRoutineItem: num("setPerRoutine", 0.25),
    streakBonus: num("setStreakBonus", 2), gamingPenalty: num("setGamingPenalty", -2)
  };
  CFG.points = {
    perChore: num("setPtChore", 10), perHomework: num("setPtHomework", 20),
    perPractice: num("setPtPractice", 15), perRoutineItem: num("setPtRoutine", 5),
    streakBonus: num("setPtStreak", 50), gamingPenalty: num("setPtGaming", -50)
  };
  CFG.weeklyChallenge = { label: $("setChLabel").value.trim() || "Weekly challenge", target: num("setChTarget", 60) };
  document.querySelectorAll("[data-pin]").forEach((inp) => {
    const v = inp.value.trim();
    if (!/^\d{4}$/.test(v)) { toast("PINs must be 4 digits"); return; }
    if (inp.dataset.pin === "parent") CFG.parentPin = v; else CFG.kids[inp.dataset.pin].pin = v;
  });
  await DB.set("config", CFG);
  $("settingsSaved").textContent = "✅ Saved " + new Date().toLocaleTimeString();
  toast("Settings saved 💾");
};

/* ============================== boot ============================== */
(async function boot() {
  $("demoBanner").hidden = !DEMO;
  await ensureSeed();
  CFG = await DB.get("config");
  bootRole();
})();
