# Yeah Buddy Tracker

Yeah Buddy Tracker is a minimalist, offline-first personal gym workout tracker built with Next.js 15 App Router.

Design direction:
- Mobile-first flow with large touch targets for logging fast between sets.
- Dark Ronnie-inspired palette (deep black, metallic gold, subtle deep red).
- Minimal moving pieces with strong separation between data/storage, state, and UI.

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion (progress ring pump animation)
- Zustand (client state + app actions)
- Dexie.js (IndexedDB offline storage)
- Sonner (toast notifications)
- Native Audio API (Yeah Buddy trigger)

## Product Overview

Core workflow:
1. Dashboard (`/`) shows 5 weekly muscle-group progress rings, weekly streak, rotating motivation quote, and a primary CTA.
2. Tap `Log Today's Workout`.
3. Step 1: select muscle group.
4. Step 2: search and pick an exercise.
5. Step 3: log sets (`reps`, `weightKg`) with running tonnage + optional notes.
6. Save workout, refresh weekly stats, and trigger first-hit celebration if a weekly target is crossed.

Implemented v1 decisions:
- Fixed default weekly targets.
- Weekly streak model (consecutive active weeks).
- Seed exercise catalog only (no custom exercise creation yet).
- Full local DB JSON export/import.
- Audio on by default, user can mute.
- Single fixed dark palette.

## Folder Structure

```text
src/
	app/
		layout.tsx                    # Root layout, fonts, provider wiring
		page.tsx                      # Dashboard page
		workout-log/page.tsx          # 3-step logging route
	components/
		dashboard/
			header.tsx                  # App header
			progress-ring.tsx           # Animated SVG ring (Framer Motion)
			streak-and-quote.tsx        # Weekly streak + rotating quote
			weekly-progress.tsx         # Grid of 5 muscle-group rings
		providers/
			app-provider.tsx            # Bootstrap + toast side effects
		settings/
			data-controls.tsx           # Mute + export + import controls
		workout/
			workout-logger.tsx          # Multi-step flow container
			muscle-group-step.tsx       # Step 1 UI
			exercise-step.tsx           # Step 2 UI
			sets-step.tsx               # Step 3 UI
		ui/
			...                         # shadcn/ui components
	data/
		exercises.ts                  # Pre-populated exercise catalog (~70)
		muscle-groups.ts              # Default groups + weekly targets
		quotes.ts                     # Rotating motivation quotes
	hooks/
		use-workout-bootstrap.ts      # First-load hydration hook
	lib/
		db/
			database.ts                 # Dexie schema/tables
			seed.ts                     # First-run seed logic
		repositories/
			workout-repository.ts       # Dexie data access layer
		utils/
			audio.ts                    # Native audio playback helper
			date.ts                     # Week boundaries/key helpers
			export-import.ts            # Full DB JSON backup/restore
			tonnage.ts                  # Tonnage + weekly stats + streak math
			utils.ts                    # shadcn cn helper
	store/
		workout-store.ts              # Zustand state, actions, milestones
	types/
		domain.ts                     # Shared domain types

public/
	sounds/yeah-buddy.mp3           # Celebration audio file
	images/
		ronnie-header.jpg
		ronnie-texture.jpg
		dumbbell-icon.svg
```

## Storage and Data Model

Dexie database name: `yeahBuddyTrackerDb`

Tables:
- `muscleGroups` (`id`, `name`, `weeklyTargetKg`, `accentColor`)
- `exercises` (`id`, `name`, `muscleGroupId`)
- `workouts` (`id`, `dateIso`, `muscleGroupId`, `exerciseId`, `sets`, `notes`, `createdAtIso`)
- `appSettings` (`id = settings`, `isMuted`, `unit`)
- `milestoneEvents` (`id`, `weekKey`, `muscleGroupId`, `achievedAtIso`)

First run behavior:
1. App bootstraps from IndexedDB.
2. If empty, seed inserts default muscle groups, exercises, and app settings.
3. Store computes weekly stats and streak from local workouts.

## Weekly Tonnage and Milestone Logic

Tonnage formula:
- For each set: `reps * weightKg`
- For each workout: sum of all sets
- Weekly muscle total: sum of workout tonnage for workouts in the current week and matching muscle group

Progress:
- `percent = min(100, round((tonnageKg / targetKg) * 100))`

Milestone trigger:
1. Save workout.
2. Recompute weekly stats.
3. If a muscle group changed from `not completed` to `completed`, check `milestoneEvents` for current week + muscle.
4. If no record exists, create milestone event and show toast + optional sound.

This guarantees one celebration per muscle group per week.

## Weekly Streak Model

Streak is the count of consecutive active weeks ending in the current week.

Definitions:
- Active week: at least one workout logged in that calendar week.
- If current week has no workouts, streak is `0`.

## Extending the App

### Add or modify muscle groups
1. Edit `src/data/muscle-groups.ts`.
2. Ensure `id` is included in `MUSCLE_GROUP_IDS` in `src/types/domain.ts`.
3. Add matching exercises in `src/data/exercises.ts`.

### Add exercises
1. Edit `src/data/exercises.ts`.
2. Keep `id` unique and set correct `muscleGroupId`.

### Add new stats or analytics
1. Add utilities in `src/lib/utils/tonnage.ts` or a new analytics utility file.
2. Expose computed values through `src/store/workout-store.ts` selectors/state.
3. Render in dashboard components.

### Add new storage fields
1. Update domain types in `src/types/domain.ts`.
2. Add Dexie migration/version in `src/lib/db/database.ts`.
3. Update export/import shape in `src/lib/utils/export-import.ts`.

## Assets

No copyrighted media is bundled in this repository.

Required sound path:
- `public/sounds/yeah-buddy.mp3`

Suggested image paths:
- `public/images/ronnie-header.jpg`
- `public/images/ronnie-texture.jpg`
- `public/images/dumbbell-icon.svg`

Project expects these asset files:
- `public/sounds/yeah-buddy.mp3`
- `public/images/ronnie-header.jpg`
- `public/images/ronnie-texture.jpg`
- `public/images/dumbbell-icon.svg`

You can replace these files with your own versions:
- Sound sources: MyInstants, Voicy, or your own recording (check rights before use).
- Image sources: public domain, licensed assets, or your personal collection.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

4. Optional checks:

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push repository to GitHub.
2. In Vercel, create a new project from the repo.
3. Use default Next.js build settings.
4. Deploy.

Notes:
- IndexedDB is client-local, so production users keep data per browser/device.
- Export/import JSON is the backup/migration strategy in v1.

## Future Expansion Ideas

- Custom exercise creation and editing
- Optional onboarding with target customization
- Trend charts per muscle group
- Multi-week history timeline
- Import merge mode (instead of replace-local)
- PWA install prompt + enhanced offline cache strategy
- Cloud sync and account-based backup

## Legal and Content Reminder

The app uses a bodybuilding-inspired visual direction. Make sure any media you include is properly licensed or owned by you.
