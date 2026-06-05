# HashView Monitoring Guide
## How to Check Every Error, Every User Action, Everything

---

## 🧠 First: Understand the Big Picture

Think of it like CCTV cameras placed across your app:

| Platform | What it watches | Website |
|---|---|---|
| **Sentry** | App crashes + backend errors + what user did before crash | sentry.io |
| **PostHog** | Every button tap, screen visit, search, login, filter | app.posthog.com |
| **Firebase Crashlytics** | Native phone crashes (Android/iOS deep crashes) | console.firebase.google.com |
| **Firebase Analytics** | User behaviour trends over time (graphs) | console.firebase.google.com |
| **Grafana** | Backend server health (CPU, RAM, API speed) | After EC2 deploy |

---

## 🔴 SENTRY — Your Most Important Dashboard

> **URL:** https://sentry.io → Sign in → org: `hashview-qr`

Sentry tells you: **who crashed, what they were doing, and exactly why it happened.**

### Step 1: Check Frontend Errors (App Crashes)

1. Go to **sentry.io**
2. Click the **`react-native`** project (top left dropdown)
3. Click **Issues** in the left menu
4. You will see a list of all errors — newest first

**What each error shows you:**
- **Title** — what the error was (e.g. "Cannot read property 'id' of undefined")
- **How many users** were affected
- **Click the error** → you see:
  - 📍 **Which screen** the user was on
  - 👤 **Which user** (their name, email, user ID)
  - 📋 **Breadcrumbs** — a timeline of EXACTLY what they did before the crash:
    ```
    10:23:01  Navigated to BusinessDetailScreen
    10:23:05  Tapped Submit Review button
    10:23:06  API call to /reviews failed (500 error)
    10:23:06  ❌ CRASH: Cannot read property...
    ```

### Step 2: Check Backend Errors (API/Server Errors)

1. Go to **sentry.io**
2. Click the **`hashview-backend`** project (the Node.js one)
3. Click **Issues**
4. You see all backend errors — including:
   - Database connection failures
   - Unhandled exceptions in your routes
   - Which user's API call caused the error

### Step 3: Check Session Replays (Watch What User Did)

> ⚠️ Only works in production builds (not dev mode)

1. Sentry → **Replays** tab (left menu)
2. Click any replay → watch a video of exactly what the user did
3. You can see: taps, scrolls, what appeared on screen, when the error happened

### Step 4: Send a Test Error Right Now

Open your backend terminal and paste:
```js
// In the backend terminal, run: node
const Sentry = require('./instrument');
Sentry.captureException(new Error('TEST: HashView monitoring is working!'));
```
Then go to **sentry.io → hashview-backend project → Issues** — you'll see the test error within 10 seconds.

---

## 🟠 POSTHOG — Where Users Click & What They Do

> **URL:** https://app.posthog.com → Sign in with your account

PostHog tells you: **what every user is doing in real time.**

### Step 1: See Live Events Right Now

1. Go to **app.posthog.com**
2. Left menu → **Activity** → **Live Events**
3. Open your app on your phone
4. You will see events appearing in real time as you use the app:
   ```
   search_performed    { query: "pizza", filters_applied: false }
   business_viewed     { business_id: "63a1b..." }
   login_success       { method: "email", role: "customer" }
   ```

### Step 2: See All Events a Specific User Did

1. PostHog → **Persons** (left menu)
2. Search by email or user ID
3. Click the user → **Timeline** tab
4. You see every single action they took, in order, with timestamps

### Step 3: Build a Funnel (Where Users Drop Off)

Example: How many users start a review but never submit?

1. PostHog → **Funnels** → **New Funnel**
2. Add steps:
   - Step 1: `review_started`
   - Step 2: `review_submit_attempt`
   - Step 3: `review_submit_success`
3. It shows you the % of users that complete each step

### Step 4: See Which Searches Return No Results

1. PostHog → **Insights** → **New Insight**
2. Event filter: `search_result` where `result_count = 0`
3. You see all failed searches

### What Events Are Tracked Automatically

Every time a user does any of these, PostHog + Sentry captures it:

| User Action | Event Name |
|---|---|
| Opens app | `Application Opened` (automatic) |
| Logs in | `login_success` |
| Logs out | `logout` |
| Searches | `search_performed` |
| Gets search results | `search_result` |
| Taps a business | `business_viewed` |
| Starts writing a review | `review_started` |
| Taps Submit Review | `review_submit_attempt` |
| Review saved successfully | `review_submit_success` |
| Review fails | `review_submit_failed` |
| Denies location | `location_permission_denied` |
| Location fails | `location_fetch_failed` |
| API call fails | `api_error` |
| Network drops | `network_error` |
| Filter applied | `filter_applied` |

---

## 🟡 FIREBASE — Two Separate Tools

> **URL:** https://console.firebase.google.com → Select your HashView project

### Tool 1: Firebase Crashlytics (Native Crashes)

**What it does:** Catches crashes that happen at the deep Android/iOS level — things like the app completely freezing or force-closing.

**How to check:**
1. Firebase Console → Left menu → **Crashlytics**
2. You see a list of all crashes sorted by impact
3. Click any crash → you see:
   - Which device (Samsung Galaxy, iPhone 15, etc.)
   - Which Android/iOS version
   - How many users were affected
   - The full crash log with line numbers

> **Difference from Sentry:** Sentry catches JavaScript errors. Crashlytics catches native crashes (C++/Java layer). You need both for full coverage.

### Tool 2: Firebase Analytics (Trends & Graphs)

**What it does:** Shows you usage trends over days/weeks — how many users logged in, which screens they visit most, etc.

**How to check:**
1. Firebase Console → Left menu → **Analytics** → **Events**
2. You see a list of all events with daily/weekly counts

> ⚠️ **Important:** Firebase Analytics has a **24-48 hour delay**. Events you log today will appear tomorrow. It is NOT for real-time monitoring.

**For real-time testing:**
1. Firebase Console → Analytics → **DebugView** (left menu)
2. On your PC with phone connected via USB, run:
   ```bash
   adb shell setprop debug.firebase.analytics.app com.hashview.apps
   ```
3. Events will now appear in DebugView within seconds

---

## 🟢 What to Check When a User Reports a Problem

When a user says "the app isn't working" or "I got an error", do this:

### Step 1: Go to Sentry first
- **sentry.io → react-native → Issues**
- Filter by time (when did they say it happened?)
- Look for errors around that time
- Click the error → check the **User** section to confirm it's that user

### Step 2: Go to PostHog second
- **app.posthog.com → Persons**
- Search for the user's email
- Look at their Timeline
- You'll see exactly what they did: which screens they visited, what they tapped, where they stopped

### Step 3: Check backend if it was an API error
- **sentry.io → hashview-backend → Issues**
- Look for errors tagged with that user's ID
- The error will show the exact API endpoint that failed and why

---

## 🔵 Grafana — Server Health (After EC2 Deploy)

> After running `deploy-alloy.sh` on EC2

**URL:** https://grafana.com → Sign in → Explore

Grafana shows you **server-level data** — is the EC2 machine healthy?

| What to check | Grafana Query |
|---|---|
| Total API requests | `http_requests_total{job="hashview-backend"}` |
| Error rate (5xx) | `http_errors_total{status="500"}` |
| Slow API routes | `http_request_duration_ms_bucket` |
| Active users (last 1 hour) | `active_users_total` |
| Server CPU usage | `rate(node_cpu_seconds_total[5m])` |
| Server RAM usage | `node_memory_MemAvailable_bytes` |

---

## ✅ Daily Monitoring Checklist (Takes 5 Minutes)

Do this every morning:

1. **Sentry** → Issues → Sort by "Last seen" → Any new errors overnight?
2. **Sentry** → Check if error count is going up or staying flat
3. **PostHog** → Insights → Daily active users — is it growing?
4. **PostHog** → Funnels → Is the review submission rate healthy?
5. **Firebase** → Crashlytics → Any new crash types?

---

## 🚨 Alert Setup (So You Don't Have to Check Manually)

### Sentry Alerts
1. Sentry → **Alerts** (left menu) → **Create Alert**
2. Set: "When error count > 10 in 1 hour → send email to your@email.com"
3. Now Sentry emails you automatically when something goes wrong

### PostHog Alerts
1. PostHog → **Insights** → Create insight for `review_submit_failed`
2. Click **Subscribe** → get email when spike detected

---

## Current Status of All Platforms

| Platform | Is it working? | Where |
|---|---|---|
| Sentry Frontend | ✅ YES | sentry.io → react-native project |
| Sentry Backend | ✅ YES | sentry.io → hashview-backend project |
| PostHog | ✅ YES — confirmed `initialized` in device logs | app.posthog.com |
| Firebase Analytics | ✅ YES — package installed, events being logged | Firebase Console → Analytics |
| Firebase Crashlytics | ✅ YES — package v24 installed, in app.config.js | Firebase Console → Crashlytics |
| Grafana | ⏳ After EC2 deploy | grafana.com |
