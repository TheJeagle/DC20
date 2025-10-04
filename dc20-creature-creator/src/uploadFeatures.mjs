import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgdyE834tp64B2flcR9VUzbIvXwPdwQ-k",
    authDomain: "dc20-creature-creator.firebaseapp.com",
    projectId: "dc20-creature-creator",
    storageBucket: "dc20-creature-creator.firebasestorage.app",
    messagingSenderId: "638039342508",
    appId: "1:638039342508:web:a80d7ddaecdab47b1b8e09",
    measurementId: "G-2BEL1FHFPP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const auth = getAuth(app);

const creatureFeatures = [
  // --- PASSIVE FEATURES ---
  {
    id: 'undead_deaths_door',
    name: "Death's Door",
    kind: 'feature',
    summary: 'You can survive with up to -5 HP. If you reach -6 HP or less, you are destroyed.',
    tags: ['undead'],
  },
  {
    id: 'undead_ethereal_blade',
    name: 'Ethereal Blade',
    kind: 'feature',
    summary: 'Parry and shield maneuvers cannot be used against your attacks.',
    tags: ['undead'],
  },
  {
    id: 'feature_thick_hide',
    name: 'Thick Hide',
    kind: 'feature',
    summary: 'Your hide is tough, granting you a +1 bonus to your Precision Defense (PD).',
    tags: ['beast', 'monstrosity'],
    effects: [{ stat: 'PD', change: 'add', value: 1 }],
  },
  {
    id: 'feature_nimble_escape_speed',
    name: 'Nimble Movement',
    kind: 'feature',
    summary: 'You are quick on your feet, increasing your Speed by 1.',
    tags: ['goblinoid', 'skirmisher', 'rogue-like'],
    effects: [{ stat: 'Speed', change: 'add', value: 1 }],
  },
  {
    id: 'feature_bulwark_guard',
    name: 'Bulwark Guard',
    kind: 'feature',
    summary: "While you haven't moved this turn, you gain +1 PD and +1 AD until the start of your next turn.",
    tags: ['defender', 'soldier'],
    effects: [
      { stat: 'PD', change: 'add', value: 1, conditional: 'no_movement_this_turn' },
      { stat: 'AD', change: 'add', value: 1, conditional: 'no_movement_this_turn' },
    ],
  },
  {
    id: 'feature_predators_pounce',
    name: "Predator's Pounce",
    kind: 'feature',
    summary: 'If you move at least 3 spaces in a straight line before a melee attack, that attack deals +1 damage.',
    tags: ['brute', 'skirmisher', 'beast'],
  },
  {
    id: 'feature_arcanist_overwatch',
    name: 'Arcanist Overwatch',
    kind: 'feature',
    summary: 'When a creature within 5 spaces uses an MP effect, you gain a Help Die usable on your next Spell Attack this round.',
    tags: ['artillerist', 'controller', 'spellcaster'],
  },
  {
    id: 'feature_glacial_footing',
    name: 'Glacial Footing',
    kind: 'feature',
    summary: "You ignore difficult terrain created by ice or snow, and effects cannot reduce your Speed below 2 while you're on such terrain.",
    tags: ['controller', 'elemental', 'construct'],
  },

  // --- SENSES, IMMUNITIES, RESISTANCES ---
  {
    id: 'common_darkvision_60',
    name: 'Darkvision',
    kind: 'sense',
    summary: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
    value: 'Darkvision 60ft',
    tags: ['humanoid', 'beast', 'undead'],
  },
  {
    id: 'construct_poison_immunity',
    name: 'Constructed Fortitude',
    kind: 'immunity',
    summary: 'You are immune to poison damage and the poisoned condition.',
    value: 'poison',
    displayValue: 'Poison',
    tags: ['construct'],
  },
  {
    id: 'fiend_fire_resistance',
    name: 'Fiendish Resilience (Fire)',
    kind: 'resistance',
    summary: 'You have resistance to fire damage.',
    value: 'fire',
    displayValue: 'Fire',
    tags: ['fiend'],
  },
  {
    id: 'sense_truescent_10',
    name: 'Truescent',
    kind: 'sense',
    summary: 'You can precisely sense creatures by smell within 10 spaces even if invisible or behind cover.',
    value: 'Truescent 10',
    tags: ['beast', 'monstrosity', 'tracker'],
  },
  {
    id: 'resistance_thunderhide',
    name: 'Thunderhide',
    kind: 'resistance',
    summary: 'Your hide disperses force: you have resistance to sonic damage.',
    value: 'sonic',
    displayValue: 'Sonic',
    tags: ['beast', 'monstrosity', 'construct'],
  },

  // --- ACTIVE COMBAT ACTIONS ---
  {
    id: 'undead_life_drain_touch',
    name: 'Life Drain Touch',
    kind: 'action',
    method: 'Melee Spell Attack',
    summary: 'You attempt to drain life force from a creature you touch.',
    cost: { ap: 1 },
    damage: { bonus: 0, type: 'umbral' },
    defense: 'PD',
    range: '1 Space',
    target: '1 creature',
    effects: [{ type: 'healing', amount: 'damage dealt', timing: 'on hit' }],
    tags: ['undead', 'healing', 'necromancy'],
  },
  {
    id: 'brute_bloodfury',
    name: 'Bloodfury',
    kind: 'action',
    method: 'Buff',
    summary: '[Bloodied only] You enter a furious rage, gaining advantage on attacks and +1 melee damage until end of your next turn.',
    cost: { ap: 2 },
    tags: ['brute', 'rage'],
  },
  {
    id: 'generic_power_strike',
    name: 'Power Strike',
    kind: 'action',
    method: 'Melee Martial Attack',
    summary: 'You make a powerful, focused melee attack.',
    cost: { ap: 2 },
    damage: { bonus: 1, type: 'physical' },
    defense: 'PD',
    range: '1 Space',
    target: '1 creature',
    tags: ['brute', 'defender', 'martial'],
  },
  {
    id: 'generic_sweeping_blow',
    name: 'Sweeping Blow',
    kind: 'action',
    method: 'Melee Martial Attack',
    summary: 'You swing your weapon in a wide arc, catching multiple foes.',
    cost: { ap: 2 },
    damage: { bonus: -1, type: 'physical' },
    defense: 'AD',
    range: '1 Space',
    target: 'all creatures in a 3-space cone',
    tags: ['brute', 'martial', 'aoe'],
  },
  {
    id: 'spell_ice_cone',
    name: 'Cone of Cold',
    kind: 'action',
    method: 'Ranged Spell Attack',
    summary: 'You unleash a freezing blast in a cone.',
    cost: { ap: 1, mp: 2 },
    damage: { bonus: 0, type: 'cold' },
    defense: 'AD',
    range: 'self',
    target: 'creatures in a 3-space cone',
    save: { attribute: 'Agi', effect: 'On failure, target is Slowed 1 until end of its next turn' },
    tags: ['spell', 'cold', 'aoe', 'control'],
  },
  {
    id: 'attack_area_shot',
    name: 'Area Shot',
    kind: 'action',
    method: 'Ranged Martial Attack',
    summary: 'You fire a projectile or throw a weapon that explodes on impact.',
    cost: { ap: 2 },
    damage: { bonus: -1, type: 'physical' },
    defense: 'AD',
    range: "10 Spaces",
    target: 'a 2-space cube',
    tags: ['martial', 'ranged', 'aoe'],
  },
  {
    id: 'martial_charging_strike',
    name: 'Charging Strike',
    kind: 'action',
    method: 'Melee Martial Attack',
    summary: 'Charge up to 5 spaces in a line, striking each enemy you pass without provoking opportunity attacks.',
    cost: { ap: 2 },
    damage: { bonus: -1, type: 'physical' },
    defense: 'PD',
    range: "5 Spaces",
    target: 'all creatures in a 5-space line',
    tags: ['martial', 'charge', 'movement', 'aoe'],
  },
  {
    id: 'spell_command_drop',
    name: 'Command: Drop',
    kind: 'action',
    method: 'Debuff',
    summary: 'You utter a commanding word to a creature, forcing it to drop what it holds.',
    cost: { ap: 1, mp: 1 },
    range: "10 Spaces",
    target: '1 creature you can see',
    save: { attribute: 'Cha', effect: 'On failure, the creature drops a held weapon' },
    tags: ['spell', 'control', 'mental'],
  },
  {
    id: 'action_shieldbash_lockstep',
    name: 'Shieldbash Lockstep',
    kind: 'action',
    method: 'Melee Martial Attack',
    summary: 'You slam into the foe, keeping step with them.',
    cost: { ap: 1 },
    damage: { bonus: 0, type: 'physical' },
    defense: 'PD',
    range: '1 Space',
    target: '1 creature',
    save: { attribute: 'Physical', effect: 'On failure, the target is Hindered until it resolves its next attack' },
    tags: ['defender', 'control'],
  },
  {
    id: 'action_ice_wall',
    name: 'Ice Wall',
    kind: 'action',
    method: 'Zone Control Spell',
    summary: 'Conjure a jagged wall of ice that blocks movement and chills foes.',
    cost: { ap: 2, mp: 2 },
    damage: { bonus: 0, type: 'cold' },
    defense: 'AD',
    range: "8 Spaces",
    target: 'a 5-space wall',
    save: { attribute: 'Physical', effect: 'Entering the wall deals 1 cold damage; failure Slows until end of next turn' },
    tags: ['controller', 'cold', 'zone'],
  },
  {
    id: 'action_chain_bolt',
    name: 'Chain Bolt',
    kind: 'action',
    method: 'Ranged Spell Attack',
    summary: 'A crackling bolt leaps between targets.',
    cost: { ap: 1, mp: 1 },
    damage: { bonus: 0, type: 'lightning' },
    defense: 'PD',
    range: "10 Spaces",
    target: '1 creature; on hit, arcs to up to 2 creatures within 2 spaces (each suffers -1 damage)',
    tags: ['artillerist', 'lightning', 'multi-target'],
  },
  {
    id: 'action_galestep_cut',
    name: 'Galestep Cut',
    kind: 'action',
    method: 'Melee Martial Attack',
    summary: 'You strike and slip away on the wind, disengaging after the attack.',
    cost: { ap: 1 },
    damage: { bonus: 0, type: 'physical' },
    defense: 'PD',
    range: '1 Space',
    target: '1 creature',
    tags: ['lurker', 'mobility', 'hit-and-run'],
  },
  {
    id: 'action_gravitic_pulse',
    name: 'Gravitic Pulse',
    kind: 'action',
    method: 'Area Spell Attack',
    summary: 'A crushing pulse collapses inward, dragging creatures toward the center.',
    cost: { ap: 2, mp: 2 },
    damage: { bonus: 0, type: 'force' },
    defense: 'AD',
    range: "8 Space",
    target: 'creatures in a 3-space sphere',
    save: { attribute: 'Physical', effect: 'On failure, pulled up to 2 spaces toward the center; heavy hits also knock prone' },
    tags: ['controller', 'zone', 'force'],
  },
  {
    id: 'action_command_rally',
    name: 'Command: Rally',
    kind: 'action',
    method: 'Buff',
    summary: 'You bark orders that steel your allies, granting them a Help Dice (d8) until the end of their next turn.',
    cost: { ap: 2 },
    range: "5 Spaces",
    target: 'up to 2 allies you can see',
    tags: ['leader', 'support', 'aura'],
  },

  // --- ATTACK ENHANCEMENTS ---
  {
    id: 'undead_soul_punch_enhancement',
    name: 'Soul Punch',
    kind: 'attack_enhancement',
    summary: 'You channel necrotic energy that may stun the target.',
    cost: { ap: 1 },
    save: { attribute: 'Cha', effect: 'On failure, target is Stunned(1) until end of its next turn' },
    tags: ['undead', 'control', "enhancement"],
  },
  {
    id: 'enhance_cleave_arc',
    name: 'Cleave Arc',
    kind: 'attack_enhancement',
    summary: 'Your melee martial attack sweeps in an 1 space arch',
    cost: {ap: 2},
    tags: ['martial', 'aoe', "enhancement"],
  },
  {
    id: 'enhance_hemorrhage',
    name: 'Hemorrhage',
    kind: 'attack_enhancement',
    summary: 'Your strike opens a vicious wound.',
    cost: {ap:1},
    save: { attribute: 'Physical', effect: 'On failure, the target begins Bleeding' },
    tags: ['brute', 'bleed', "enhancement"],
  },
  {
    id: 'enhance_freezing_mark',
    name: 'Freezing Mark',
    kind: 'attack_enhancement',
    summary: 'Frost clings to the target, slowing them if they fail an Agility save.',
    cost: { mp: 1 },
    save: { attribute: 'Agi', effect: 'On failure, the target is Slowed until end of its next turn' },
    tags: ['cold', 'control'],
  },
  {
    id: 'enhance_domineering_taunt',
    name: 'Domineering Taunt',
    kind: 'attack_enhancement',
    summary: 'You draw your foe’s focus with brutal bravado, forcing them to target you on a failed Charisma save.',
    cost: { ap: 1 },
    save: { attribute: 'Cha', effect: 'On failure, the target is Taunted until start of your next turn' },
    tags: ['defender', 'taunt'],
  },

  // --- APEX ACTIONS ---
  {
    id: 'apex_devastating_strike',
    name: 'Devastating Strike',
    kind: 'apex_action',
    method: 'Melee Martial Attack',
    summary: 'You unleash a crushing melee blow dealing +2 damage.',
    cost: { ap: 1 },
    damage: { bonus: 2, type: 'physical' },
    defense: 'PD',
    range: '1 Space',
    target: '1 creature',
    tags: ['apex'],
  },
  {
    id: 'apex_mythic_roar',
    name: 'Mythic Roar',
    kind: 'apex_action',
    method: 'Spell',
    summary: 'Each enemy within 3 spaces must succeed on a Cha save or become frightened for 1 round.',
    cost: { ap: 2 },
    range: "3 Spaces",
    target: 'all enemies within range',
    save: { attribute: 'Cha', effect: 'On failure, the enemy is Frightened for 1 round' },
    tags: ['apex'],
  },
];

const normalizedCreatureFeatures = creatureFeatures.map((feature) => {
  const numericCost =
    typeof feature.balanceCost === 'number' && Number.isFinite(feature.balanceCost)
      ? Math.max(0, feature.balanceCost)
      : 1;

  const cleanCost = {};
  const inputCost = feature.cost || {};
  Object.entries(inputCost).forEach(([resource, amount]) => {
    const numericAmount = typeof amount === 'number' ? amount : parseInt(amount, 10);
    if (!Number.isNaN(numericAmount) && numericAmount > 0) {
      cleanCost[resource] = numericAmount;
    }
  });

  const damage = feature.damage || {};
  const normalizedDamage = {
    bonus:
      typeof damage === 'number'
        ? damage
        : typeof damage.bonus === 'number'
        ? damage.bonus
        : 0,
    type: typeof damage === 'object' ? damage.type || '' : '',
    base: typeof damage === 'object' && Object.prototype.hasOwnProperty.call(damage, 'base')
      ? damage.base
      : null,
  };

  const save = feature.save || {};
  const normalizedSave = {
    attribute: save.attribute || '',
    dcMod: typeof save.dcMod === 'number' ? save.dcMod : 0,
    effect: save.effect || '',
  };

  return {
    ...feature,
    cost: cleanCost,
    damage: normalizedDamage,
    save: normalizedSave,
    balanceCost: numericCost,
  };
});

async function uploadFeatures() {
  const featuresCollection = collection(db, 'features');
  let successCount = 0;
  let errorCount = 0;

  console.log(`Starting upload of ${normalizedCreatureFeatures.length} features...`);

  for (const feature of normalizedCreatureFeatures) {
    try {
      if (!feature.id) {
        console.warn(`Feature "${feature.name}" is missing an 'id'. Skipping.`);
        errorCount += 1;
        continue;
      }
      await setDoc(doc(featuresCollection, feature.id), feature, {merge: true});
      console.log(`Successfully uploaded/updated: ${feature.name} (ID: ${feature.id})`);
      successCount += 1;
    } catch (error) {
      console.error(`Error uploading feature ${feature.name || feature.id}:`, error);
      errorCount += 1;
    }
  }

  console.log('------------------------------------');
  console.log(`Upload complete. ${successCount} successful, ${errorCount} failed.`);
  console.log('------------------------------------');
}

uploadFeatures()
  .then(() => {
    console.log('Script finished.');
  })
  .catch((error) => {
    console.error('Unhandled error in script:', error);
  });
