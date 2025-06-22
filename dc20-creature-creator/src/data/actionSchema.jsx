// src/data/actionSchema.jsx
// Schema definition for creature actions stored with a creature document
export const creatureActionSchema = {
  name: '',       // Display name of the action
  costAP: 0,      // Action point cost
  costMP: 0,      // Magic point cost
  damageMod: 0,   // Damage modifier relative to base damage
  saveDCMod: 0,   // Adjustment applied to Save DC
  range: '',      // Range information (e.g., "Melee", "5 spaces")
  targets: '',    // Target description
  actionType: '', // Classification like "Melee Martial Attack"
  description: '',// Text describing the action's effect
  source: '',     // 'feature' for user selected traits or 'default'
};
