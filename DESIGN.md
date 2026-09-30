# SpeedyChores Redesign — Family Mission Control

A rebuild of `dawnsyeung/SpeedyChores` from a single-device localStorage toy into the
family's real performance-tracking tool. **Static site, no build step** — the four files
below deploy exactly like the current site (drop-in replacement for `index.html`,
`style.css`, `script.js`).

## Files

| File | Purpose |
|---|---|
| `index.html` | All views: login (profile + PIN) · kid (Today / My Week / Family / Rewards) · parent (Overview / Payouts / Reports / Settings) |
| `style.css` | Mobile-first, kid-friendly theme (big touch targets, emoji, progress bars) |
| `app.js` | All logic. Firebase Realtime Database when configured; automatic **demo mode** (localStorage, per-device) until then, with a banner saying so |
| `firebase-config.js` | ★ The ONE file Dawn touches for setup — paste Firebase project values into the placeholders |

Nothing has been pushed to GitHub. These files live in `~/workspace/speedychores-redesign/`
awaiting Dawn's approval.

## How the mandatory daily check-in works

Each kid taps their profile → enters their 4-digit PIN → lands on **📋 Today's Mission**,
auto-built from the parent's templates plus anything already logged:

- **📚 Homework** — kids add each assignment (label + subject); each must be ✅ Done or 📝 Skipped (reason required)
- **🧹 Chores** — from the daily template + kid-added extras
- **🎻 Practice** — Henry/Andrew: violin · Felix: piano · **Chinese appears automatically on Mon/Tue/Thu**
- **🌙 Evening routine** — backpack, clothes, teeth, dishes, lunch (editable template)
- **🎮 Gaming declaration** — "Did you play video games today?" Honest self-report; "yes" applies the penalty (feeds the Homework Showdown gaming rule)

A progress bar tracks "X of Y resolved" and the **🚀 Done for today** button stays locked
until *every* item is done or skipped-with-a-reason. Submitting locks the day, computes
points + money, and updates the streak. A parent can reopen a submitted day from Overview.

## Data model (Firebase Realtime Database, root `speedychores/`)

Human-readable JSON, queryable per day / per kid — this is what Glimmer pulls for reports:

```
speedychores/
  config/
    kids/{henry,felix,andrew}   { name, grade, emoji, pin, practice }
    parentPin                    "0000"  (change in Settings)
    rates/                       money rates (editable)
    points/                      points rates (editable)
    templates/
      dailyChores/               [{ id, label }]
      routineItems/              [{ id, label }]
      rewards/                   [{ id, name, points }]
    weeklyChallenge/             { label, target }
  days/
    2026-09-29/
      henry/
        kidId, kidName, date, status: "open"|"submitted", submittedAt,
        homework: [{ id, label, subject, done, skipped, skipReason,
                     proof: bool, verified: bool }],
        chores:   [{ id, label, done, skipped, skipReason }],
        practice:  { label, done, skipped, skipReason, minutes },
        practice2: { label:"Chinese", ... } | null   (Mon/Tue/Thu only)
        routine:   { <tplId>: { label, done, skipped, skipReason } },
        gaming:    { answered, played, minutes },
        streakDays, points, moneyEarned
      felix/…  andrew/…
  stats/
    {kidId}/  { lifetimePoints, lifetimeEarned, currentStreak, lastActiveDate }
  claims/
    {claimId}/ { kidId, kidName, rewardName, points, status: pending|approved|denied, createdAt }
  payouts/
    2026-W40/
      {kidId}/ { paid: bool, paidAt, totalMoney }
```

### Money defaults (all editable in ⚙️ Settings → Money rates)

| Event | Default |
|---|---|
| Per chore completed | **$0.50** |
| Per homework item | **$1.00** |
| Per practice session | **$0.75** |
| Per routine item | **$0.25** |
| 7-day streak bonus | **+$2.00** |
| Gaming self-report (3–10pm) | **−$2.00** |

Points mirror the same structure (10 / 20 / 15 / 5 / +50 / −50) and drive the live
family leaderboard, weekly challenge, and the points-based rewards catalog
(🍦 150 · 🎮 200 · 🍕 300 · 🎬 350 · 🎪 500 — kids tap "I want this!", parent approves,
points deduct from their lifetime balance). The 💵 **Payouts** tab shows each kid's
week with a per-day breakdown and a Mark-paid toggle; family total at the bottom.

### How Glimmer queries it (no login needed, REST)

Once Firebase is live, any day/kid/week is one URL:

- One kid, one day: `https://<PROJECT>-default-rtdb.firebaseio.com/speedychores/days/2026-09-29/henry.json`
- Whole family, one day: `…/speedychores/days/2026-09-29.json`
- Lifetime totals: `…/speedychores/stats.json`
- Whole config (rates, PINs, templates): `…/speedychores/config.json`

## What Dawn needs to do for Firebase (~5 minutes)

1. Go to **https://console.firebase.google.com** → sign in → **Add project** → name it
   `SpeedyChores` (Google Analytics optional).
2. Left menu → **Build → Realtime Database** → **Create Database** → choose
   **Start in test mode**.
3. Gear ⚙️ → **Project settings** → **Your apps** → web icon `</>` → nickname
   `speedychores-web` → **Register app** → copy the `firebaseConfig` values.
4. Paste them into **`firebase-config.js`** (each field is clearly marked `PASTE_…_HERE`).
5. Re-upload the four files wherever the site is hosted. The "DEMO MODE" banner
   disappears and all devices sync in real time.
6. (Recommended) tighten database rules once it's working — **Realtime Database →
   Rules** tab — family-prototype rules:
   ```json
   { "rules": { "speedychores": { ".read": true, ".write": true } } }
   ```
   The PINs are a *family gate* (keeps little brothers out of each other's
   checklists), not bank-grade security — noted in the Settings screen too.

## Key decisions & deliberate simplifications

- **Realtime Database, not Firestore** — simpler REST shape for Glimmer's reporting,
  generous free tier, live listeners with zero backend code.
- **Profile picker + 4-digit PIN** instead of email login — Felix and Andrew have no
  email; defaults are `1111` / `2222` / `3333` / parent `0000`, all changeable in Settings.
- **Write-through autosave** — every tap writes to the DB immediately, so Dawn's
  Overview tab updates *live* as the kids check things off on their own devices.
- **Homework replaces the Gmail reporting loop** — Dawn's instruction was that the
  kids enter things on the website and it's required; the old "email Henry and hope"
  flow is gone. (The Homework Showdown scorekeeper can read the same Firebase data.)
- **Proof/verified flags** exist on homework items (kid marks 📷, parent ✔️-verifies in
  Reports) but verification is *optional* — it doesn't gate money, to keep the first
  version frictionless. Easy to make required later.
- **Demo mode** means Dawn can preview the whole flow today with zero setup; data
  just won't sync until Firebase keys are added.
- Not built (future options): push reminders, photo upload for proof (needs Storage),
  per-chore custom dollar amounts, negative-points floor below zero (currently floored
  at 0 pts but money can go slightly negative on an all-gaming day — by design).

## Verification

- `node --check` clean on `app.js` and `firebase-config.js`.
- 15/15 logic tests pass in a stubbed-DOM harness (`/tmp/sc-test.js`): week math,
  Tue/Sun Chinese scheduling, submit gating (skip-with-reason ok / skip-without-reason
  blocks), money math ($7.75 full day + streak; $5.75 with gaming penalty; $7.25 with
  one skipped chore), points math (165 / 115 / 155).
