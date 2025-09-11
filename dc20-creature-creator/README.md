# DC20 Creature Creator

This project contains a web application for building creatures for the **DC20** tabletop RPG. It is built with React and Vite and stores data in Firebase Firestore.

## Firestore structure

Two main collections are used:

- `features` – reusable traits and actions that a creature can possess.
- `savedCreatures` – user-created creatures. Each document stores the chosen feature ids, any stat overrides and a generated `Display` block used to render the stat block.

### `actions` array

Within `generatedDisplay.Combat` each saved creature document contains an `actions` array (under `Attacks` and `OtherActions`). Each entry has the following shape:

```json
{
  "name": "Power Strike",
  "details": "2 physical damage vs PD. Target 1 creature within 1 space.",
  "originalFeatureId": "generic_power_strike"
}
```

The entry originates from an object in the `features` collection with category `action`. Fields on a feature that influence the generated action include:

- `costAP`, `costMP`, `costSP` – resource costs.
- `actionType` – e.g. `Melee Martial Attack` or `Ranged Spell Attack`.
- `damageMod` and `damageType` – applied on top of base damage.
- `targetsDefense`, `rangeValue`/`rangeUnit`, `targetDescription` – used to build the action text.
- `saveAttribute`, `conditionApplied`, `conditionDuration`, `healingAmount` – optional effect information.

### Damage and save DC scaling

Base stats per level are defined in `src/data/gameRules.jsx`. Damage starts at **1** at level 0 and increases roughly every other level. Role modifiers and power scaling further adjust the final damage.

The save DC is calculated as:

```
10 + prime attribute score + ceil(level / 2)
```

For example a level 5 creature with a prime attribute of 4 has a save DC of `10 + 4 + 3 = 17`.

## Development

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev`.
3. Run tests with `npm test`.
4. Build the production bundle using `npm run build`.

Pull requests and feature contributions are welcome. Please ensure all tests pass before submitting changes.

