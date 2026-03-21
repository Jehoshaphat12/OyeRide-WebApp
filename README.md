# OyeRide Web App

A mobile-first React TypeScript web application for the OyeRide ride-hailing platform. Built as a passenger-facing PWA with the same Firebase backend as the React Native app.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Then edit `.env` and add your Google Maps API Key:
```
VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
```

### 3. Run development server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
```

---

## 🗺️ Google Maps Setup

You need a Google Maps API key with these APIs **enabled** in Google Cloud Console:

1. **Maps JavaScript API** — renders the map
2. **Places API** — powers location search autocomplete
3. **Directions API** — calculates routes and distance

Get your key at: https://console.cloud.google.com/apis/credentials

**Important:** Add your domain to the API key's HTTP referrer restrictions for security.

---

## 🔥 Firebase

The app uses the **same Firebase project** as the React Native app:
- **Auth** — email/password authentication
- **Firestore** — rides, users, drivers data
- **Realtime Database** — live driver location tracking

No changes needed to Firebase config — it's already wired up.

---

## 📱 Features

### Passenger Flow
- ✅ Sign In / Sign Up / Forgot Password
- ✅ Live Google Maps with route drawing
- ✅ Location search with Google Places Autocomplete
- ✅ Choose ride type: OyeRide (Motor), OyeDeliver (Package), OyeBicycle
- ✅ Fare calculation with breakdown
- ✅ Real-time ride tracking (searching → driver assigned → en route)
- ✅ Driver info card (name, rating, vehicle, plate, ETA)
- ✅ Contact driver (call, SMS, WhatsApp)
- ✅ Cancel ride with confirmation
- ✅ Ride completed with rating & feedback
- ✅ Ride history with filters
- ✅ Profile management (edit name, phone)
- ✅ Sidebar navigation
- ✅ Help Center with FAQs
- ✅ Contact Us page
- ✅ Safety & Privacy page
- ✅ Settings (notifications, password reset)

---

## 🏗️ Project Structure

```
src/
├── App.tsx              # Router + auth guards
├── main.tsx             # Entry point
├── contexts/
│   └── AuthContext.tsx  # Auth state & methods
├── services/
│   ├── authService.ts   # Firebase Auth
│   ├── firestoreService.ts # Firestore CRUD
│   └── rideService.ts   # Ride booking logic
├── lib/
│   ├── firebase.ts      # Firebase init
│   └── fareCalculator.ts # Fare computation
├── types/
│   └── index.ts         # TypeScript interfaces
├── pages/
│   ├── LoginPage.tsx
│   ├── HomePage.tsx     # Main booking screen
│   ├── HistoryPage.tsx
│   ├── ProfilePage.tsx
│   ├── HelpCenterPage.tsx
│   ├── ContactUsPage.tsx
│   ├── SafetyPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── MapView.tsx           # Google Maps
│   ├── LocationSearch.tsx    # Places autocomplete
│   ├── RideTypeSheet.tsx     # Choose motor/delivery/bicycle
│   ├── ConfirmRideSheet.tsx  # Confirm & fare summary
│   ├── RideTrackingSheet.tsx # Live tracking UI
│   ├── RideCompletedSheet.tsx # Rating & feedback
│   ├── BottomNav.tsx
│   └── Sidebar.tsx
└── styles/
    └── globals.css
```

---

## 🎨 Design

- **Primary color**: `#061ffa` (blue)
- **Secondary color**: `#ff7300` (orange)
- **Font**: Poppins (Google Fonts)
- Mobile-first, max-width 430px
- Matches the React Native app's theme exactly

---

## 🔔 Notifications Setup

The web app has a **complete 4-layer notification system** matching the React Native app:

### Layer 1 — In-App Toasts (works immediately, no setup needed)
Animated banners slide in from the top whenever a ride event fires while the app is open. Tapping a toast deep-links to the relevant screen. Auto-dismiss after 5 seconds.

### Layer 2 — Notification Inbox
A bell icon (🔔) in the top-right corner with a live unread count badge. Tapping it opens a drawer showing all past notifications from Firestore (`users/{userId}/notifications`). Mark individual or all as read.

### Layer 3 — Foreground FCM Messages
When a Firebase Cloud Messaging push arrives while the app tab is open, it's intercepted and shown as an in-app toast instead of a browser notification (matching the original RN behaviour).

### Layer 4 — Background / Closed-App Push Notifications
When the app is closed or in the background, the **Service Worker** (`public/firebase-messaging-sw.js`) receives the FCM message and shows a native browser notification. Tapping it opens/focuses the app and navigates to the right screen.

### What you need to activate push (Layers 3 & 4)

**Step 1 — Get your VAPID key:**
1. Firebase Console → Project Settings → Cloud Messaging
2. Scroll to "Web Push certificates"
3. Click "Generate key pair"
4. Copy the key string

**Step 2 — Add to `.env`:**
```
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

**Step 3 — Authorize your domain in Firebase:**
Firebase Console → Authentication → Settings → Authorized domains → Add your production domain.

> **Note:** Layers 1 & 2 (toasts + inbox) work without a VAPID key because they run off Firestore real-time subscriptions. You only need the VAPID key for true push when the app is closed.

### Notification types (passenger-side)
| Type | Trigger | Action on tap |
|---|---|---|
| `ride_accepted` | Driver accepts your ride | Navigate to ride tracking |
| `ride_cancelled` | Driver cancels the ride | Reset to home, show alert |
| `ride_completed` | Ride ends | Show rating screen |
| `chat_message` | Driver sends a message | Open chat |

---

## 🚢 Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Vercel / Netlify
Connect your repo and set the environment variable:
```
VITE_GOOGLE_MAPS_API_KEY=your_key
```
Build command: `npm run build`
Output directory: `dist`

---

## ⚠️ Important Notes

1. **Google Maps Key** — Without this, the map won't load and location search won't work.
2. **Firebase Security Rules** — Make sure your Firestore rules allow passenger reads/writes on `rides` and `users`.
3. **CORS** — If testing locally, ensure Firebase Auth allows `localhost` as an authorized domain.
4. **Passenger only** — The driver-side screens have been intentionally omitted from this web app.
