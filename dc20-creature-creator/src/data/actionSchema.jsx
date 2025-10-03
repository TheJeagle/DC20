// src/data/actionSchema.jsx
// Schema definition for creature actions stored with a creature document
export const creatureActionSchema = {
  name: '',        // Display name of the action
  kind: 'action',  // Classification such as action, reaction, apex_action, etc.
  method: '',      // Delivery method, e.g., "Melee Martial Attack"
  summary: '',     // Short rules text describing the action
  cost: {
    ap: 0,
    mp: 0,
    sp: 0,
  },
  damage: {
    bonus: 0,     // Damage adjustment relative to the creature's base damage
    type: '',
    base: null,   // Optional absolute damage override
  },
  defense: '',     // Defense targeted, such as PD or AD
  range: null,     // Range in spaces or descriptive string like "Self" or "Melee"
  target: '',      // Target description or area definition
  save: {
    attribute: '',
    dcMod: 0,
    effect: '',
  },
  trigger: '',     // Trigger text for reactions or enhancements
  effects: [],     // Structured additional effects (conditions, movement, etc.)
  source: '',      // 'feature' for user-selected traits or 'default'
};
