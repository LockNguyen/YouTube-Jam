# Project Specification & Architecture

This document serves as a complete technical specification of the YouTube Karaoke Queue application architecture, data schema, components, and security models. It is designed to act as a reference for developers and AI tools.

---

## 1. System Overview

The application is a Real-time YouTube Karaoke Queue MVP. It separates users into two views:
1. **Guests:** Submit songs to a specific room, manage their own queued items, reorder/delete their own songs, and view histories.
2. **Host:** Plays the active songs in a customized YouTube player (with automated intro performance transitions) and manages the queue state (skip, previous, pause, clear, reorder, delete, toggle performance mode).

### Tech Stack
* **Frontend:** Vue 3, Vite, TypeScript, Pinia, Tailwind CSS, shadcn-vue.
* **Database:** Firebase Realtime Database.
* **Backend API:** Netlify Functions + Firebase Admin SDK (Node.js/TypeScript).

---

## 2. Realtime Database Schema

Data is stored in Firebase Realtime Database under room-isolated keys (`rooms/{roomId}`):

### `/rooms/{roomId}/songs/{songId}`
A dynamic collection of songs currently or previously in the queue.
```typescript
interface Song {
  id: string                   // Unique Firebase push key
  videoId: string              // YouTube 11-character video ID
  title: string | null         // Song title (resolved via client oEmbed before submit)
  thumbnailUrl: string | null  // URL to song thumbnail image
  status: 'queued' | 'playing' | 'played' | 'skipped' | 'deleted'
  order: number                // Float order index for sorting the active queue
  submittedAt: number          // Epoch timestamp (ms) of submission
  submittedByGuestId: string   // Unique Guest identifier
  submittedByName: string      // Guest display name
  submittedByColor: string     // Color hex string associated with guest profile
  startedAt: number | null     // Epoch timestamp when the song started playing
  endedAt: number | null       // Epoch timestamp when the song ended/skipped
  deletedAt: number | null     // Epoch timestamp when deleted
}
```

### `/rooms/{roomId}/state`
State object representing host player options and active song ID.
```typescript
interface QueueState {
  currentSongId: string | null // Active song ID playing in the host player
  updatedAt: number            // Last update timestamp
  performanceMode: boolean    // Controls whether host player executes dramatic intro animations
}
```

---

## 3. Frontend Architecture

### State Management (`src/stores/queue.store.ts`)
* Implements the Pinia store `useQueueStore`.
* Exposes properties: `roomId`, `songs`, `currentSongId`, `performanceMode`, `isLoading`, and `error`.
* Dynamically subscribes to database endpoints `rooms/{roomId}/songs` and `rooms/{roomId}/state` via client SDK (`onValue`).
* Cleans up subscriptions dynamically via `unsubscribe` on view changes.
* Computes lists:
  * `currentSong`: Active song record matching `currentSongId`.
  * `queuedSongs`: Sorts songs with `status === 'queued'` by `order` ascending.
  * `playedSongs`: Filter for status `'played'`.
  * `skippedSongs`: Filter for status `'skipped'`.
  * `historySongs`: Concat of played/skipped, sorted by `endedAt` ascending (oldest top, newest bottom).
  * `visibleSongs`: Filter out `status === 'deleted'`.
  * `nextSong`: First item in `queuedSongs`.

### Views
* **Guest View** ([GuestView.vue](file:///c:/Projects/YouTube%20Karaoke%20Queue/youtube-karaoke-queue/src/views/GuestView.vue)):
  * Captures `roomId` from URL parameters `/rooms/:roomId`.
  * Enforces profile creation via `GuestProfileGate.vue` before rendering forms.
  * Renders `SongSubmitForm.vue`, `NowPlayingCard.vue`, and `UpcomingQueue.vue`.
* **Host View** ([HostView.vue](file:///c:/Projects/YouTube%20Karaoke%20Queue/youtube-karaoke-queue/src/views/HostView.vue)):
  * Mounts the host console under `/rooms/:roomId/host`.
  * Renders `HostPlayer.vue`, `HostControls.vue`, and a side drawer overlaying the playlist queue (`HostQueueOverlay.vue`).

### Composables & Core logic
* **YouTube Player Wrapper** ([useYoutubePlayer.ts](file:///c:/Projects/YouTube%20Karaoke%20Queue/youtube-karaoke-queue/src/composables/useYoutubePlayer.ts)):
  * Dynamically injects YouTube IFrame API script tag.
  * Mounts player iframe, binds events (`onReady`, `onStateChange`, `onError`, `onEnded`).
  * Exposes control functions: `play`, `pause`, `restart`, `seekTo`, `setVolume`, `getVolume`, `getDuration`.
* **Performance Mode Intro** ([usePerformanceIntro.ts](file:///c:/Projects/YouTube%20Karaoke%20Queue/youtube-karaoke-queue/src/composables/usePerformanceIntro.ts)):
  * Implements visual animation timers (fade-ins, title cards, zooming) matching a swoosh-sound timeline.
  * Manipulates player volume, dimming variables, and starts/stops intro intervals safely.
* **Song URL Validation** ([useSongValidation.ts](file:///c:/Projects/YouTube%20Karaoke%20Queue/youtube-karaoke-queue/src/composables/useSongValidation.ts)):
  * Parses links or codes to extract 11-char YouTube Video ID.

---

## 4. Backend Architecture & Netlify API

Netlify functions act as endpoints interacting with Firebase using the node-based Firebase Admin SDK. Under the hood, Netlify builds code from `netlify/functions/*` mapped via `netlify.toml`.

### Mutations Service Helper (`netlify/shared/queueService.ts`)
Executes transactional writes via the Admin SDK `ref.transaction()` to prevent race conditions during concurrent skips, deletes, additions, or reorders:
* `addSong`: Creates a new ID, appends song with `order` set to `maxOrder + 1000`.
* `performSkip`: Marks current playing song `'skipped'`, finds next in queue, flags it `'playing'`.
* `performPrevious`: Pulls last song from history, puts current song back at the front of queue (`order = minOrder - 1000`), sets the previous song as `'playing'`.
* `performDelete`: Marks song status `'deleted'`, advances queue if it was the currently playing song.
* `performSetNowPlaying`: Updates active current song, transitions previous song to status `'played'`.
* `performReorder`: Shifts the target song up/down (swapping orders) or to top/bottom (offsetting index by +/- 1000).

---

## 5. Security & Verification model

### Cryptographic Identity verification
To prevent spoofing or unauthorized deletions:
1. **Guest Identity Gate:** A backend validation module ([guestAuth.ts](file:///c:/Projects/YouTube%20Karaoke%20Queue/youtube-karaoke-queue/netlify/shared/guestAuth.ts)) implements HMAC-SHA256 signing using the Firebase configuration key as salt.
2. **Registration:** On app start, a guest registers via `/registerGuest` to generate their ID, name, color, and a cryptographically signed HMAC token containing the data.
3. **Storage:** The guest token is saved locally on the client browser via `localStorage` inside `karaoke_guest_profile_v1`.
4. **Validation:** Endpoints `/deleteSong` and `/reorderQueue` require this cryptographic token from guests. The backend parses and verifies the signature:
   * If hostKey is present in headers (`x-host-key`), the request is authorized unconditionally.
   * If it is a guest request, the backend verifies the signature. It checks if the verified token's `guestId` matches the database record's `submittedByGuestId` for that song. Guests are strictly blocked from editing or deleting other guests' songs.

---

## 6. Directory Map

```
youtube-karaoke-queue/
├── netlify/                        # Backend Functions (Netlify)
│   ├── functions/                  # HTTP Endpoints
│   │   ├── clearQueue.ts
│   │   ├── deleteSong.ts
│   │   ├── previousSong.ts
│   │   ├── registerGuest.ts
│   │   ├── reorderQueue.ts
│   │   ├── setNowPlaying.ts
│   │   ├── setPerformanceMode.ts
│   │   ├── skipSong.ts
│   │   └── submitSong.ts
│   └── shared/                     # Server-Side Business Logic & Helpers
│       ├── firebaseAdmin.ts        # Admin SDK initialization
│       ├── guestAuth.ts            # Token signer & verifier
│       ├── queueService.ts         # Firebase transaction database updates
│       └── validation.ts
├── src/                            # Frontend Code (Vue 3 + Vite)
│   ├── assets/
│   ├── components/                 # Component Directory
│   │   ├── common/                 # AppShell, LoadingState, EmptyState, ProfileMenu
│   │   ├── guest/                  # Guest Submit Form, Queue, Now Playing
│   │   └── host/                   # Host Controls, Player, Overlay, Performance Intro
│   ├── composables/                # Vue Composables
│   │   ├── useHostActions.ts       # Skippings, skips, swaps triggers
│   │   ├── usePerformanceIntro.ts  # Performance zoom, dim & volume sweeps
│   │   ├── useSongValidation.ts    # YouTube Video ID extractor
│   │   └── useYoutubePlayer.ts     # YouTube player wrapper
│   ├── constants/                  # Colors list etc.
│   ├── router/                     # View Router routes mapping
│   ├── services/                   # Clients & storage adapters
│   │   ├── firebase.client.ts      # Client Firebase SDK setup
│   │   ├── guestProfile.local.ts   # Local Storage client operations
│   │   └── queue.api.ts            # Netlify HTTP Fetch wrappers
│   ├── stores/                     # Pinia Stores
│   │   └── queue.store.ts          # State synchronizer (Firebase SDK onValue)
│   ├── types/                      # TypeScript declarations
│   └── views/                      # Main views
│       ├── GuestView.vue           # Guest route container
│       └── HostView.vue            # Host controller board view
```

---

## 7. AI Coding Agent Guidelines (CLAUDE.md Principles)

When modifying or expanding this codebase, AI coding agents and developers must strictly follow these four core principles inspired by Andrej Karpathy's coding diagnostic insights:

### 1. Think Before Coding
*   **Surface Assumptions:** Before writing any code, list what you assume to be true about the current environment, variables, components, or API formats.
*   **Surface Confusion:** Explicitly declare any parts of the requirement or code structure that are ambiguous or not fully understood.
*   **Evaluate Alternatives:** Compare at least two technical pathways for solving the problem.
*   **Analyze Trade-offs:** List the pros and cons of each pathway (e.g. complexity, bundle size, maintainability) and explain why the chosen path is superior.

### 2. Simplicity First
*   **Solve the Current Request:** Implement only what is asked. Do not write speculative code, "future-proof" extensions, or add features that are not explicitly documented in the user request or plan.
*   **Keep Code Flat & Modular:** Prefer simple, flat function designs and standard JavaScript/TypeScript structures. Avoid over-engineering, generic wrappers, or unnecessary design patterns.

### 3. Surgical Changes
*   **Zero Collateral Damage:** Only touch the lines of code and files that are strictly necessary to accomplish the task.
*   **No Unrequested Refactoring:** Do not clean up, rename, re-style, or rewrite adjacent code or files unless explicitly requested by the user.
*   **Preserve Comments:** Keep existing code comments, docstrings, and formatting intact in surrounding areas.

### 4. Goal-Driven Execution
*   **Define Success Criteria:** Establish clear, checkable parameters that determine when the task is officially completed.
*   **Validate Early & Often:** Test your changes using both manual checks and automated validation suites (`npm run type-check`, `npm run test`, etc.) to verify correctness before closing.

