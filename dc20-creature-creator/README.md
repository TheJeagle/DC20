# DC20 Creature Creator

DC20 Creature Creator is a React + Vite single-page application for designing tabletop RPG creatures with Firebase-powered authentication and persistence. It routes between the home dashboard, the interactive builder, authentication/account views, and saved-creature listings while keeping the logged-in user in context.

## Features

- **Interactive creature builder:** The `/create` page combines the configuration sidebar, live stat-block preview, and quick-action toolbar, letting designers tweak attributes, select features, and export finished stat blocks in one place.
- **Authentication and account management:** Users can sign in with email/password or Google, switch between login and registration modes, and return to the dashboard on success.
- **Community home and voting:** The landing page highlights top-voted creations, allows authenticated players to upvote, and links straight into building or reviewing personal creations.
- **Personal library:** The “My Creatures” table supports filtering and sorting saved stat blocks pulled from Firestore for the signed-in user.

## Project Structure

- `src/pages/` – Page-level views such as `CreatureCreatorPage`, `HomePage`, `AuthPage`, and `MyCreaturesPage`. Routes are declared in `App.jsx`.
- `src/components/` – Reusable UI pieces (e.g., `InputPanel`, `StatBlockPanel`, `RightBar`, `Navbar`).
- `src/domain/` – Core builder orchestration (`creatureBuilder.js`) that normalizes state, invokes calculations, and persists session storage.
- `src/utils/` – Game-rules engines for calculating stats, applying features and overrides, and formatting presentation values.
- `src/data/gameRules.jsx` – Level, attribute, role, and power scaling tables that feed the calculators.
- `src/uploadFeatures.cjs` – Firebase Admin script for seeding canonical feature definitions.

## Getting Started

1. Install dependencies: `npm install`
2. Run the development server: `npm run dev`
3. Execute the test suite: `npm test`
4. Produce a production build: `npm run build`
5. Preview a built bundle locally: `npm run preview`

All commands are defined in `package.json` and expect Node’s ES module semantics.

## Firebase & Environment

The app currently reads Firebase configuration directly from `src/firebase.js`. Replace the hard-coded keys with environment variables (e.g., Vite’s `import.meta.env`) before publishing, then initialize Firestore and Auth the same way the module does today.

Firestore hosts three key collections:

- `features` – Base traits/actions loaded into the builder UI and filtered by creature type/role.
- `savedCreatures` – Persisted creations captured from the builder, surfaced on the home page and personal library.
- `userMadeFeatures` – Optional custom traits submitted through the builder’s creation form.

Use the Admin seeding script (`src/uploadFeatures.cjs`) to populate canonical features, updating the service-account path before execution.

## Data & Game Rules

Stat baselines, attribute progressions, role modifiers, and power tiers originate from `src/data/gameRules.jsx`. These tables flow through `calculateBaseStats`, which sets HP/defenses, role adjustments, power scaling, size tweaks, and computed save DC values.

## Managing the Creature Creator Code

1. **State & session orchestration:** The builder page uses a `useReducer` to manage inputs, selected features, and override maps, seeding from session storage on load and normalizing state through `creatureBuilder` helpers. Any reducer additions should stay serializable for session storage safety.
2. **Feature catalog & search:** Features are fetched once from Firestore, filtered by type/role tags, and searchable by name, category, or tag via the `InputPanel`. When extending tagging or filters, update both the query logic and panel renderers.
3. **Stat calculation pipeline:** `buildCreature` funnels normalized inputs to `calculateCreatureStats`, which builds base stats, applies feature effects, respects override deltas, and formats a presentation-ready display. When adjusting formulas, coordinate changes across `baseStats`, `featureEffects`, and `presentationFormatter` to keep raw/derived/display objects in sync.
4. **Override handling:** When users edit stats in the UI, `handleStatOverride` records either numeric deltas or absolute replacements; `applyUserOverrides` replays those mutations before display. Maintain the `_delta` and `_set` suffix convention to preserve backwards compatibility.
5. **Editable stat block UI:** `StatBlockPanel` renders raw/derived/display data, exposing inline editors and remove buttons tied back to reducer actions. Adding new sections requires both layout updates and appropriate override key mapping so edits persist.
6. **Saving & export:** Saved creatures capture the display actions, selected feature IDs, override maps, and metadata before writing to Firestore. Exports convert the stat block DOM to PNG/PDF via `html2canvas` and `jsPDF`, so ensure any layout changes keep the stat block within the capture container.
7. **Custom feature creation:** The toggleable `FeatureCreationForm` lets designers craft ad-hoc traits, optionally persisting them to `userMadeFeatures`. Extend the schema carefully, as the builder and calculators rely on fields like `category`, `actionType`, and `damageMod`.
8. **Display formatting:** Final attack/feature text is generated in `presentationFormatter`; when introducing new action metadata (e.g., conditions), add formatting hooks there so the stat block stays legible.
9. **Regression coverage:** `calculateStats.test.js` exercises base stat generation, action modifiers, override application, and apex action formatting. Expand this suite alongside any core rules changes to protect the pipeline.

## Testing

Run `npm test` to execute the Vitest suite covering the stat calculation pipeline.

## Deployment

Firebase Hosting is configured to serve the Vite build output from `dist` and rewrite SPA routes to `index.html`. After running `npm run build`, deploy with your Firebase project credentials, ensuring hosting rewrites remain intact.

---

## Testing
⚠️ Tests not run (not requested).
