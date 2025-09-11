// scripts/uploadFeatures.cjs (or .js if using ESM)
const admin = require('firebase-admin'); // Or: import admin from 'firebase-admin';
const serviceAccount = require('../dc20-creature-creator-firebase-adminsdk-fbsvc-b569029c31.json'); // <--- !!! UPDATE THIS PATH !!!

try {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
    } else {
        console.log("Firebase Admin already initialized.");
    }
} catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
    process.exit(1);
}

const db = admin.firestore();

const allCreatureFeatures = [
    // --- PASSIVE FEATURES (for ABILITIES section) ---
    {
        id: "undead_deaths_door",
        name: "Death's Door",
        descriptionCore: "You can survive with up to -5 HP. If you reach -6 HP or less, you are destroyed.", // Renamed to descriptionCore
        category: "feature",
        tags: ["undead"],
    },
    {
        id: "undead_ethereal_blade",
        name: "Ethereal Blade",
        descriptionCore: "Parry & shield maneuvers cannot be used against your attacks.",
        category: "feature",
        tags: ["undead"],
    },
    {
        id: "feature_thick_hide",
        name: "Thick Hide",
        descriptionCore: "Your hide is tough, granting you a +1 bonus to your Precision Defense (PD).",
        category: "feature",
        tags: ["beast", "monstrosity"],
        effects: [{ stat: "PD", change: "add", value: 1 }]
    },
    {
        id: "feature_nimble_escape_speed", // Renamed for clarity, as Nimble Escape often has other components
        name: "Nimble Movement", // More generic name for just speed
        descriptionCore: "You are quick on your feet, increasing your Speed by 1.",
        category: "feature",
        tags: ["goblinoid", "skirmisher", "rogue-like"],
        effects: [{ stat: "Speed", change: "add", value: 1 }]
    },

    {
        id: "feature_bulwark_guard",
        name: "Bulwark Guard",

        descriptionCore: "While you haven't moved this turn, you gain +1 PD and +1 AD until the start of your next turn.",
        category: "feature",
        tags: ["defender", "soldier"],
        effects: [
            { stat: "PD", change: "add", value: 1, conditional: "no_movement_this_turn" },
            { stat: "AD", change: "add", value: 1, conditional: "no_movement_this_turn" }
        ]
    },
    {
        id: "feature_predators_pounce",
        name: "Predator's Pounce",
        descriptionCore: "If you move at least 3 Spaces in a straight line before a Melee Attack, that Attack deals +1 damage.",
        category: "feature",
        tags: ["brute", "skirmisher", "beast"]
    },
    {
        id: "feature_arcanist_overwatch",
        name: "Arcanist Overwatch",
        descriptionCore: "When a creature within 5 Spaces uses a MP effect, you gain a Help Die usable on your next Spell Attack this round.",
        category: "feature",
        tags: ["artillerist", "controller", "spellcaster"]
    },
    {
        id: "feature_glacial_footing",
        name: "Glacial Footing",

        descriptionCore: "You ignore Difficult Terrain created by ice or snow, and effects cannot reduce your Speed below 2 while you're on such terrain.",
        category: "feature",
        tags: ["controller", "elemental", "construct"]
    },

    // --- SENSES, IMMUNITIES, RESISTANCES, VULNERABILITIES ---
    { /* ... Darkvision, Blindsight, Immunities, Resistances, Vulnerabilities from your previous list, ensure 'descriptionCore' is used for description ... */
        id: "common_darkvision_60", name: "Darkvision", descriptionCore: "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.", category: "sense", value: "Darkvision 60ft", tags: ["humanoid", "beast", "undead"]
    },
    {
        id: "construct_poison_immunity", name: "Constructed Fortitude", descriptionCore: "You are immune to poison damage and the poisoned condition.", category: "immunity", value: "poison", displayValue: "Poison", tags: ["construct"]
    },
    {
        id: "fiend_fire_resistance", name: "Fiendish Resilience (Fire)", descriptionCore: "You have resistance to fire damage.", category: "resistance", value: "fire", displayValue: "Fire", tags: ["fiend"]
    },
    {
        id: "sense_truescent_10",
        name: "Truescent",
        descriptionCore: "You can precisely sense creatures by smell within 10 Spaces even if Invisible or behind cover.",
        category: "sense",
        value: "Truescent 10",
        tags: ["beast", "monstrosity", "tracker"]
    },
    {
        id: "resistance_thunderhide",
        name: "Thunderhide",
        descriptionCore: "Your hide disperses force: you have resistance to Sonic damage.",
        category: "resistance",
        value: "sonic",
        displayValue: "Sonic",
        tags: ["beast", "monstrosity", "construct"]
    },
    // ... (add others similarly)

    // --- ACTIVE COMBAT ACTIONS ---
    {
        id: "undead_life_drain_touch", // versioned ID
        name: "Life Drain Touch",
        category: "action",
        actionType: "Melee Spell Attack",
        tags: ["undead", "healing", "necromancy"],
        descriptionCore: "You attempt to drain life force from a creature you touch.", // Base flavor text
        costAP: 1, costMP: 0, costSP: 0,
        damageMod: 0, // Standard damage based on creature's calculated.Damage
        damageType: "umbral",
        targetsDefense: "PD",
        rangeValue: 1, rangeUnit: "space", // Melee/Touch range
        targetDescription: "1 creature",
        healingAmount: "damage dealt", // Special keyword
    },
    {
        id: "brute_bloodfury",
        name: "Bloodfury",
        category: "action",
        actionType: "Buff",
        tags: ["brute", "rage"],
        descriptionCore: "[Can only be used while bloodied] You enter a furious rage.",
        costAP: 2, costMP: 0, costSP: 0,
        // Effects of the buff will be part of the constructed description
        // For structured effects: effects: [{ type: "advantage_on_attacks", duration: "..." }, { type: "damage_bonus", value: 1, scope: "melee", duration: "..."}]
        // For simplicity now, keeping it in description.
        duration: "end of your next turn",
        // Specific effects for description: "You gain advantage on all your attack rolls and +1 damage on your melee attacks."
    },
    {
        id: "generic_power_strike",
        name: "Power Strike",
        category: "action",
        actionType: "Melee Martial Attack",
        tags: ["brute", "defender", "martial"],
        descriptionCore: "You make a powerful, focused melee attack.",
        costAP: 2, costMP: 0, costSP: 0,
        damageMod: 1, // +1 damage on top of creature's (2AP equivalent or baseDamage*factor)
        damageType: "physical",
        targetsDefense: "PD",
        rangeValue: 1, rangeUnit: "space",
        targetDescription: "1 creature",
    },
    {
        id: "generic_sweeping_blow",
        name: "Sweeping Blow",
        category: "action",
        actionType: "Melee Martial Attack",
        tags: ["brute", "martial", "aoe"],
        descriptionCore: "You swing your weapon in a wide arc.",
        costAP: 2, costMP: 0, costSP: 0,
        damageMod: -1, // Reduced damage for AoE
        damageType: "physical",
        targetsDefense: "AD", // Area attacks often target Area Defense
        rangeValue: 3, rangeUnit: "space", // Assuming cone originates from caster
        areaShape: "cone",
        areaSize: 3, // 3-space cone
        targetDescription: "all creatures in a 3-space cone in front of you",
    },

    // --- NEW ACTIONS YOU REQUESTED ---
    {
        id: "spell_ice_cone",
        name: "Cone of Cold",
        category: "action",
        actionType: "Ranged Spell Attack", // It's a spell dealing damage
        tags: ["spell", "cold", "aoe", "control"],
        descriptionCore: "You unleash a freezing blast in a cone.",
        costAP: 1, costMP: 2, costSP: 0,
        damageMod: 0, // Standard damage for its cost, or could be -1 for AoE + control
        damageType: "cold",
        targetsDefense: "AD",
        rangeValue: 0, rangeUnit: "space", // Cone originates from caster
        areaShape: "cone",
        areaSize: 3, // e.g., "3-space cone" (adjust size as per your system)
        targetDescription: "all creatures in the cone",
        saveAttribute: "Agi", // Or Mig, depending on if it's dodging or enduring
        conditionApplied: "Slowed 1", // Assuming "Slowed 1" is a defined condition
        conditionDuration: "end of its next turn",
    },
    {
        id: "attack_area_shot",
        name: "Area Shot",
        category: "action",
        actionType: "Ranged Martial Attack",
        tags: ["martial", "ranged", "aoe"],
        descriptionCore: "You fire a projectile or throw a weapon that affects a small area upon impact.",
        costAP: 2, costMP: 0, costSP: 0,
        damageMod: -1, // Typically AoE has a damage reduction
        damageType: "physical", // Or could be variable
        targetsDefense: "AD",
        rangeValue: 10, rangeUnit: "space", // Range to the center of the area
        areaShape: "cube", // "Small area" often a 2x2 or 3x3 cube (e.g. 2-space cube)
        areaSize: 2, // e.g., 2-space cube
        targetDescription: "a 2-space cube area",
    },
    {
        id: "martial_charging_strike",
        name: "Charging Strike",
        category: "action",
        actionType: "Melee Martial Attack", // It includes an attack
        tags: ["martial", "charge", "movement", "aoe"],
        descriptionCore: "You charge forward in a straight line, attacking all enemies in your path. You do not provoke opportunity attacks for this movement.",
        costAP: 2, costMP: 0, costSP: 0, // Could be 2 or 3 AP depending on power
        damageMod: -1, // Usually less damage if hitting multiple
        damageType: "physical",
        targetsDefense: "PD", // Individual attacks against PD
        rangeValue: 5, rangeUnit: "space", // Max charge distance in a line
        areaShape: "line", // Hits creatures along the line
        areaSize: 5, // Length of the line
        targetDescription: "all creatures in a line up to 5 spaces long",
        // Special movement handled by description, not easily structured further without complex effect system
    },
    {
        id: "spell_command_drop",
        name: "Command: Drop",
        category: "action",
        actionType: "Debuff", // It's a spell imposing an effect
        tags: ["spell", "control", "mental"],
        descriptionCore: "You utter a commanding word to a creature.",
        costAP: 1, costMP: 1, costSP: 0,
        rangeValue: 10, rangeUnit: "space",
        targetDescription: "1 creature you can see",
        saveAttribute: "Cha", // Or Int, depending on mental resistance in your game
        // saveSuccessEffect: "negates", // Implicit if no condition applied
        conditionApplied: "Forced Drop (weapon)", // This needs a clear definition for the game master
        conditionDuration: "instantaneous (effect happens now)", // Or "1 round" if they can't pick it up
    },

    {
        id: "action_shieldbash_lockstep",
        name: "Shieldbash Lockstep",
        category: "action",
        actionType: "Melee Martial Attack",
        tags: ["defender", "control"],
        descriptionCore: "You slam and lock the foe in place while stepping with them.",
        costAP: 1, costMP: 0, costSP: 0,
        damageMod: 0, damageType: "physical",
        targetsDefense: "PD",
        rangeValue: 1, rangeUnit: "space",
        targetDescription: "1 creature",

        saveAttribute: "Physical",
        conditionApplied: "Hindered",
        conditionDuration: "until it resolves its next Attack",
        // rider: if failure by 5+, also Slowed until end of its next turn
    },
    {
        id: "action_ice_wall",
        name: "Ice Wall",
        category: "action",
        actionType: "Zone Control Spell",
        tags: ["controller", "cold", "zone"],
        descriptionCore: "Conjure a low wall of jagged ice that blocks movement and shapes the battlefield.",
        costAP: 2, costMP: 2, costSP: 0,
        damageMod: 0, damageType: "cold",
        targetsDefense: "AD",
        rangeValue: 8, rangeUnit: "space",
        areaShape: "wall",
        areaSize: 5, // 5-space wall, 1-space thick
        targetDescription: "a 5-space wall",
        saveAttribute: "Physical",

        // Entering a wall Space or being pushed through it: 1 Cold; Failure: Slowed until end of next turn
    },
    {
        id: "action_chain_bolt",
        name: "Chain Bolt",
        category: "action",
        actionType: "Ranged Spell Attack",
        tags: ["artillerist", "lightning", "multi-target"],
        descriptionCore: "A crackling bolt leaps between targets.",
        costAP: 1, costMP: 1, costSP: 0,
        damageMod: 0, damageType: "lightning",
        targetsDefense: "PD",
        rangeValue: 10, rangeUnit: "space",

        targetDescription: "1 creature; on hit, arcs to up to 2 additional creatures within 2 Spaces of the previous target (each separate Attack vs PD at −1 damageMod)."

    },
    {
        id: "action_galestep_cut",
        name: "Galestep Cut",
        category: "action",
        actionType: "Melee Martial Attack",
        tags: ["lurker", "mobility", "hit-and-run"],
        descriptionCore: "You strike and slip out on the wind.",
        costAP: 1, costMP: 0, costSP: 0,
        damageMod: 0, damageType: "physical",
        targetsDefense: "PD",
        rangeValue: 1, rangeUnit: "space",
        targetDescription: "1 creature",
        // After the Attack, you may Disengage and move up to 2 Spaces.
    },
    {
        id: "action_gravitic_pulse",
        name: "Gravitic Pulse",
        category: "action",
        actionType: "Area Spell Attack",
        tags: ["controller", "zone", "force"],
        descriptionCore: "A crushing pulse collapses inward, dragging creatures.",
        costAP: 2, costMP: 2, costSP: 0,
        damageMod: 0, damageType: "force",
        targetsDefense: "AD",
        rangeValue: 8, rangeUnit: "space",
        areaShape: "sphere",
        areaSize: 2,
        targetDescription: "creatures in a 2-space sphere",

        saveAttribute: "Physical",

        // Failure: pulled up to 2 Spaces toward center; on Heavy Hit, also Prone.
    },
    {
        id: "action_command_rally",
        name: "Command: Rally",
        category: "action",
        actionType: "Buff",
        tags: ["leader", "support", "aura"],
        descriptionCore: "You bark orders that steel your allies.",
        costAP: 1, costMP: 0, costSP: 0,
        rangeValue: 5, rangeUnit: "space",
        targetDescription: "up to 2 allies you can see",
        // Each target gains a Help Die and +1 Speed until end of its next turn. If a target spends the Help Die on an Attack, it also gains +1 damage on that Attack.
    },


    // --- ATTACK ENHANCEMENTS ---
    {
        id: "undead_soul_punch_enhancement",
        name: "Soul Punch",
        category: "attack_enhancement",
        tags: ["undead", "control"],
        descriptionCore: "When your melee attack hits, you can empower it with necrotic energy.",
        // Cost here means *additional* cost to use the enhancement
        costAP: 1, // Example: "+1 AP" effectively
        costMP: 0, costSP: 0,
        saveAttribute: "Cha",
        conditionApplied: "Stunned",
        conditionDuration: "end of its next turn",
    },
    {
        id: "enhance_cleave_arc",
        name: "Cleave Arc",
        category: "attack_enhancement",
        tags: ["martial", "aoe"],
        descriptionCore: "When your Melee Attack hits, the blow sweeps onward.",
        costAP: 0, costMP: 0, costSP: 0,
        damageMod: -1,

        targetsDefense: "AD",
        // Effect: One additional creature adjacent to the target takes your damage with damageMod: -1 (Area vs AD).
    },
    {
        id: "enhance_hemorrhage",
        name: "Hemorrhage",
        category: "attack_enhancement",
        tags: ["brute", "bleed"],
        descriptionCore: "Your strike opens a vicious wound.",
        costAP: 0, costMP: 0, costSP: 0,

        saveAttribute: "Physical",

        conditionApplied: "Bleeding",
        conditionDuration: "standard Bleeding duration"
    },
    {
        id: "enhance_freezing_mark",
        name: "Freezing Mark",
        category: "attack_enhancement",
        tags: ["cold", "control"],
        descriptionCore: "Frost clings to the target's limbs.",
        costAP: 0, costMP: 1, costSP: 0,
        saveAttribute: "Agi",
        conditionApplied: "Slowed",
        conditionDuration: "until end of its next turn"
    },
    {
        id: "enhance_domineering_taunt",
        name: "Domineering Taunt",
        category: "attack_enhancement",
        tags: ["defender", "taunt"],
        descriptionCore: "You draw your foe's focus with brutal bravado.",
        costAP: 1, costMP: 0, costSP: 0,
        saveAttribute: "Cha",

        conditionApplied: "Taunted",
        conditionDuration: "until start of your next turn"
    },

    // --- APEX ACTIONS ---
    {
        id: "apex_devastating_strike",
        name: "Devastating Strike",
        category: "apex_action",
        actionType: "Melee Martial Attack",
        tags: ["apex"],
        descriptionCore: "You unleash a crushing melee blow dealing +2 damage.",
        costAP: 1, costMP: 0, costSP: 0,
        damageMod: 2,
        targetsDefense: "PD",
        rangeValue: 1, rangeUnit: "space",
        targetDescription: "1 creature",
    },
    {
        id: "apex_mythic_roar",
        name: "Mythic Roar",
        category: "apex_action",
        actionType: "Spell",
        tags: ["apex"],
        descriptionCore: "Each enemy within 3 spaces must succeed on a CHA save or become frightened for 1 round.",
        costAP: 2, costMP: 0, costSP: 0,
        rangeValue: 3, rangeUnit: "space",
        targetDescription: "all enemies",
        saveAttribute: "Cha",
        conditionApplied: "Frightened",
        conditionDuration: "1 round",
    },
];

async function uploadFeatures() {
    const featuresCollection = db.collection('features');
    let successCount = 0;
    let errorCount = 0;

    console.log(`Starting upload of ${allCreatureFeatures.length} features...`);

    for (const feature of allCreatureFeatures) {
        try {
            if (!feature.id) {
                console.warn(`Feature "${feature.name}" is missing an 'id'. Skipping.`);
                errorCount++;
                continue;
            }
            await featuresCollection.doc(feature.id).set(feature, { merge: true });
            console.log(`Successfully uploaded/updated: ${feature.name} (ID: ${feature.id})`);
            successCount++;
        } catch (error) {
            console.error(`Error uploading feature ${feature.name || feature.id}:`, error);
            errorCount++;
        }
    }
    console.log("------------------------------------");
    console.log(`Upload complete. ${successCount} successful, ${errorCount} failed.`);
    console.log("------------------------------------");
}

uploadFeatures().then(() => {
    console.log("Script finished.");
    // process.exit(0); // Uncomment to auto-exit after script runs
}).catch(error => {
    console.error("Unhandled error in script:", error);
    // process.exit(1);
});