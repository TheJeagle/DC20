// src/data/gameRules.js

// Corresponds to your creatureLevelStats
export const baseLevelStatsData = [
    // lvl 0
    { level: 0, HP: 8, PD: 11, AD: 8, Check: 3, Damage: 1, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 1
    { level: 1, HP: 10, PD: 12, AD: 9, Check: 4, Damage: 2, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 2
    { level: 2, HP: 12, PD: 12, AD: 9, Check: 4, Damage: 2, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 3
    { level: 3, HP: 14, PD: 13, AD: 10, Check: 5, Damage: 3, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 4
    { level: 4, HP: 16, PD: 13, AD: 10, Check: 5, Damage: 3, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 5
    { level: 5, HP: 18, PD: 15, AD: 12, Check: 7, Damage: 4, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 6
    { level: 6, HP: 20, PD: 15, AD: 12, Check: 7, Damage: 4, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 7
    { level: 7, HP: 22, PD: 16, AD: 13, Check: 8, Damage: 5, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 8
    { level: 8, HP: 24, PD: 16, AD: 13, Check: 8, Damage: 5, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 9
    { level: 9, HP: 26, PD: 17, AD: 14, Check: 9, Damage: 6, AP: 4, Speed: 5, MaxMP: 0 },
    // lvl 10
    { level: 10, HP: 28, PD: 17, AD: 14, Check: 9, Damage: 6, AP: 4, Speed: 5, MaxMP: 0 }
];

// Corresponds to your statsPerLevel (for MIG, AGI, CHA, INT in order)
export const attributeScoresByLevel = [
    { level: 0, scores: [3, 1, 1, -2] }, // [Prime, Secondary, Tertiary, Quaternary]
    { level: 1, scores: [3, 2, 1, -2] },
    { level: 2, scores: [3, 2, 2, -2] },
    { level: 3, scores: [3, 2, 2, -2] },
    { level: 4, scores: [3, 2, 2, -1] },
    { level: 5, scores: [4, 2, 2, -1] },
    { level: 6, scores: [4, 2, 2, -1] },
    { level: 7, scores: [4, 3, 2, -1] },
    { level: 8, scores: [4, 3, 2, -1] },
    { level: 9, scores: [4, 3, 2, 0] },
    { level: 10, scores: [5, 3, 2, 0] }
];

// Corresponds to your roleStats
export const roleModifiersData = {
    artillerist: {
        HPFactor: 0.5, PDMod: -2, ADMod: 2, CheckMod: 1, SpeedMod: -1, DamageMod: 0, MPMod: 0,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], // Attributes for proficient saves
        AttributePriority: ["Agi", "Int", "Cha", "Mig"], // Order for assigning from attributeScoresByLevel
        Skills: ["stealth", "awareness", "acrobatics", "trickery"], Range: "10/30",
        isCaster: false, // Could be true for some artillerists
    },
    brute: {
        HPFactor: 2, PDMod: -4, ADMod: -4, CheckMod: 0, SpeedMod: 1, DamageMod: 1, MPMod: 0,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Mig", "Agi", "Cha", "Int"],
        Skills: ["athletics", "awareness", "survival"],
    },
    controller: {
        HPFactor: 1, PDMod: 0, ADMod: 2, CheckMod: 0, SpeedMod: 0, DamageMod: 0, MPMod: 6,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Cha", "Int", "Mig", "Agi"],
        Skills: ["awareness", "insight", "trickery", "influence"], Range: "5/10", isCaster: true,
    },
    defender: {
        HPFactor: 1.5, PDMod: 2, ADMod: 0, CheckMod: -1, SpeedMod: 0, DamageMod: 0, MPMod: 0,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Mig", "Agi", "Cha", "Int"],
        Skills: ["athletics"],
    },
    leader: {
        HPFactor: 1, PDMod: 0, ADMod: 2, CheckMod: 0, SpeedMod: 0, DamageMod: 0, MPMod: 0,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Cha", "Agi", "Int", "Mig"],
        Skills: ["insight", "awareness", "influence", "intimidation"], Range: "5/10", isCaster: true,
    },
    lurker: {
        HPFactor: 0.75, PDMod: -2, ADMod: 0, CheckMod: 1, SpeedMod: 0, DamageMod: 1, MPMod: 0,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Agi", "Cha", "Int", "Mig"],
        Skills: ["stealth", "awareness", "acrobatics", "trickery"], Range: "10/20 spaces",
    },
    skirmisher: {
        HPFactor: 1, PDMod: 0, ADMod: 0, CheckMod: 0, SpeedMod: 1, DamageMod: 0, MPMod: 0,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Agi", "Mig", "Cha", "Int"],
        Skills: ["acrobatics", "survival", "stealth"],
    },
    support: {
        HPFactor: 0.5, PDMod: 0, ADMod: 2, CheckMod: 0, SpeedMod: 0, DamageMod: 0, MPMod: 6,
        SavesProficient: ["Cha", "Agi"], AttributePriority: ["Cha", "Agi", "Int", "Mig"],
        Skills: ["awareness", "influence", "insight"], isCaster: true, Range: "5/10 spaces"
    },
    caster: {
        HPFactor: 0.75, PDMod: -1, ADMod: 0, CheckMod: 0, SpeedMod: 0, DamageMod: 0, MPMod: 6,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Int", "Cha", "Agi", "Mig"],
        Skills: ["awareness"], isCaster: true, Range: "10/20 spaces"
    },
    none: { // Default if no role is selected or for generic creatures
        HPFactor: 1, PDMod: 0, ADMod: 0, CheckMod: 0, SpeedMod: 0, DamageMod: 0, MPMod: 0,
        SavesProficient: ["Int", "Cha", "Mig", "Agi"], AttributePriority: ["Mig", "Agi", "Cha", "Int"],
        Skills: [],
    }
};

// Scaling factors based on monster power level
export const powerScalingFactors = {
    minion: { HP: 0.5, Defense: -4, Check: -1, Damage: -1, AP: -1, MP: 1 },
    weak: { HP: 0.75, Defense: -2, Check: -1, Damage: 0, AP: -1, MP: 1 },
    normal: { HP: 1.0, Defense: 0, Check: 0, Damage: 0, AP: 0, MP: 1 },
    elite: { HP: 1.5, Defense: 2, Check: 1, Damage: 1, AP: 0, MP: 1.5 },
    solo: { HP: 2.0, Defense: 2, Check: 1, Damage: 2, AP: 0, MP: 2 },
};