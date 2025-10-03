// src/data/actionSchema.jsx
// Schema definition for creature actions stored with a creature document
export const creatureActionSchema = {
  name: '',       // Display name of the action
  cost: {         // Resource costs to use the action
    ap: 0,
    mp: 0,
    sp: 0,
    summary: '',
    special: '',
  },
  damage: {       // Damage adjustments provided by the action
    modifier: 0,
    type: '',
    base: null,
  },
  save: null,     // Save text or configuration
  range: '',      // Range information (e.g., "Melee", "5 spaces")
  target: '',     // Target description
  defense: '',    // Defense targeted by the attack
  actionType: '', // Classification like "Melee Martial Attack"
  summary: '',    // Short rules summary of the action
  description: '',// Text describing the action's effect
  source: '',     // 'feature' for user selected traits or 'default'
};
