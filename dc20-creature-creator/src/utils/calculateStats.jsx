// src/utils/calculateStats.js
import {
    baseLevelStatsData,
    attributeScoresByLevel,
    roleModifiersData,
    powerScalingFactors
} from '../data/gameRules';

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export const calculateCreatureStats = (
    inputs,
    selectedRawFeatures,
    userOverrideDeltas = {},
    defaultActionOverrides = {},
    actions = []
) => {
    const { level, power, role, type, size, creatureName } = inputs;

    let calculated = {
        Name: creatureName || "Unnamed Creature",
        Level: level, Power: power, Type: type, Role: role, Size: size,
        HP: 0, PD: 0, AD: 0, Check: 0, Damage: 0, AP: 0, Speed: 0, MaxMP: 0,
        Attributes: { Mig: 0, Agi: 0, Cha: 0, Int: 0, Prime: 0 },
        Saves: { Mig: null, Agi: null, Cha: null, Int: null },
        Skills: {}, Resistances: [], Vulnerabilities: [], Immunities: [],
        Senses: [], Languages: [], Features: [], CombatActions: [],
        Reactions: [], AttackEnhancements: [], PDR: '', Range: "Melee",
        isCaster: false, isMartial: true, SaveDC: 10, DefaultAttacks: [],
    };

    // --- 1. Get Base Stats from Level ---
    const levelBase = baseLevelStatsData.find(l => l.level === level);
    if (!levelBase) {
        console.error(`No base stats for level ${level}`);
        return { Name: calculated.Name, Level: level, CalculatedBeforeDeltas: calculated, FinalWithDeltas: calculated, Display: {} };
    }
    calculated.HP = levelBase.HP || 0;
    calculated.PD = levelBase.PD || 0;
    calculated.AD = levelBase.AD || 0;
    calculated.Check = levelBase.Check || 0;
    calculated.Damage = levelBase.Damage || 0;
    calculated.AP = levelBase.AP || 0;
    calculated.Speed = levelBase.Speed || 0;
    // MaxMP from levelBase is likely 0, role will provide the true base

    // --- 3. Apply Role Modifiers (Part 1: Get base values including MaxMP from role) ---
    const roleMods = roleModifiersData[role] || roleModifiersData.none;
    calculated.HP = Math.round(calculated.HP * (roleMods.HPFactor || 1.0));
    calculated.PD += roleMods.PDMod || 0;
    calculated.AD += roleMods.ADMod || 0;
    calculated.Check += roleMods.CheckMod || 0;
    calculated.Damage += roleMods.DamageMod || 0;
    calculated.Speed += roleMods.SpeedMod || 0;
    calculated.MaxMP = (levelBase.MaxMP || 0) + (roleMods.MPMod || 0); // Role grants base MP
    if (roleMods.Range) calculated.Range = roleMods.Range;
    calculated.isCaster = !!roleMods.isCaster;
    calculated.isMartial = !calculated.isCaster;

    // --- 2. Apply Power Scaling (AFTER role gives base MP) ---
    const powerScale = powerScalingFactors[power] || powerScalingFactors.normal;
    if (powerScale) {
        calculated.HP = Math.round(calculated.HP * (powerScale.HP || 1)); // HP scaling can happen here or after role, be consistent
        calculated.PD += powerScale.Defense || 0;
        calculated.AD += powerScale.Defense || 0;
        calculated.Check += powerScale.Check || 0;
        calculated.Damage += powerScale.Damage || 0;
        calculated.AP += powerScale.AP || 0;
        // Apply power scaling to MaxMP (Role MP * Power Factor)
        calculated.MaxMP = Math.ceil(calculated.MaxMP * (powerScale.MP || 1)); // Use MP for key, ceil the result
    } else {
        console.warn(`Power scale not found for: ${power}.`);
    }

    // --- 4. Determine Attributes (Initial Calculation) ---
    const attributeLevelScores = attributeScoresByLevel.find(a => a.level === level)?.scores || [0, 0, 0, 0];
    if (roleMods.AttributePriority) {
        roleMods.AttributePriority.forEach((attrName, index) => {
            if (calculated.Attributes.hasOwnProperty(attrName)) {
                calculated.Attributes[attrName] = attributeLevelScores[index];
            }
        });
    }

    // --- 5. Calculate Skills (Initial Calculation) ---
    const getAttributeForSkill = (skillName, attrs) => {
        if (skillName === "awareness") {
            const primeAttr = roleMods.AttributePriority?.[0];
            return primeAttr ? (attrs[primeAttr] || 0) : (attrs.Prime || 0);
        }
        if (["athletics", "intimidation"].includes(skillName)) return attrs.Mig || 0;
        if (["acrobatics", "trickery", "stealth"].includes(skillName)) return attrs.Agi || 0;
        if (["animal handling", "influence", "insight"].includes(skillName)) return attrs.Cha || 0;
        return attrs.Int || 0;
    };
    if (roleMods.Skills) {
        roleMods.Skills.forEach(skillName => {
            if (typeof skillName === 'string' && skillName.length > 0) {
                const skillBonusFromLevel = Math.ceil(level / 5) * 2;
                const attributeValue = getAttributeForSkill(skillName, calculated.Attributes);
                calculated.Skills[skillName] = skillBonusFromLevel + attributeValue;
            }
        });
    }

    // --- Step 5.5: Apply Direct Stat Effects from *Selected Features* ---
    selectedRawFeatures.forEach(feature => {
        if (feature.category === 'feature' && Array.isArray(feature.effects)) {
            feature.effects.forEach(effect => {
                const { stat, change, value } = effect;
                if (calculated.hasOwnProperty(stat)) {
                    if (change === 'add' && typeof value === 'number') calculated[stat] = (calculated[stat] || 0) + value;
                    else if (change === 'set') calculated[stat] = value;
                } else if (calculated.Attributes.hasOwnProperty(stat)) {
                    if (change === 'add' && typeof value === 'number') calculated.Attributes[stat] = (calculated.Attributes[stat] || 0) + value;
                } else if (stat === 'PDR' && change === 'set') calculated.PDR = value;
                else if (stat === 'MaxMP' && change === 'add' && typeof value === 'number') calculated.MaxMP = (calculated.MaxMP || 0) + value;
            });
        }
    });


    // --- Create a snapshot of stats AFTER features, BEFORE user deltas ---
    const statsAfterFeatures = deepClone(calculated);


    // --- Step 5.75: Apply User Override DELTAS (and SETS) ---
    const attackOverrides = [];
    for (const fullOverrideKey in userOverrideDeltas) {
        if (userOverrideDeltas.hasOwnProperty(fullOverrideKey)) {
            const overrideStoredValue = userOverrideDeltas[fullOverrideKey];
            const attackMatch = fullOverrideKey.match(/^Combat_Attacks_(\d+)_(.+)_(delta|set)$/);
            if (attackMatch) {
                const [, idxStr, field, type] = attackMatch;
                attackOverrides.push({ index: parseInt(idxStr, 10), field, type, value: overrideStoredValue });
                continue;
            }

            const parts = fullOverrideKey.split('_'); const suffix = parts.pop(); const fieldKey = parts.join('_');
            const [mainKey, subKey] = fieldKey.split('_'); // Re-split fieldKey for nested access
            if (suffix === 'delta' && typeof overrideStoredValue === 'number') {
                if (subKey && calculated[mainKey] && typeof calculated[mainKey][subKey] === 'number') {
                    calculated[mainKey][subKey] = (calculated[mainKey][subKey] || 0) + overrideStoredValue;
                } else if (calculated.hasOwnProperty(mainKey) && typeof calculated[mainKey] === 'number') {
                    calculated[mainKey] = (calculated[mainKey] || 0) + overrideStoredValue;
                }
            } else if (suffix === 'set') {
                // For nested _set like Attributes_Mig_set, fieldKey is Attributes_Mig, mainKey=Attributes, subKey=Mig
                // For simple _set like Name_set, fieldKey is Name, mainKey=Name, subKey=undefined
                if (subKey && calculated.hasOwnProperty(mainKey) && typeof calculated[mainKey] === 'object' && calculated[mainKey] !== null) {
                    calculated[mainKey][subKey] = overrideStoredValue;
                } else if (calculated.hasOwnProperty(fieldKey)) { // Use fieldKey for top-level like Name_set
                    calculated[fieldKey] = overrideStoredValue;
                } else {
                    console.warn(`Cannot apply _set override for unhandled field structure: ${fullOverrideKey}`);
                }
            }
        }
    }
    if (roleMods.AttributePriority) calculated.Attributes.Prime = calculated.Attributes[roleMods.AttributePriority[0]] || 0;


    // --- Recalculate Dependent Values (Saves, SaveDC) AFTER all modifications ---
    const CM_final = Math.ceil(calculated.Level / 2);
    calculated.Saves = { Mig: null, Agi: null, Cha: null, Int: null };
    if (roleMods.SavesProficient) {
        roleMods.SavesProficient.forEach(proficientAttrName => {
            if (calculated.Attributes.hasOwnProperty(proficientAttrName)) {
                calculated.Saves[proficientAttrName] = (calculated.Attributes[proficientAttrName] || 0) + CM_final;
            }
        });
    }
    calculated.SaveDC = 10 + (calculated.Attributes.Prime || 0) + CM_final;


    // --- 6. Process Selected Features into Display Categories & CONSTRUCT Action/Attack Descriptions ---
    calculated.Resistances = []; calculated.Vulnerabilities = []; calculated.Immunities = [];
    calculated.Senses = []; calculated.Languages = []; calculated.Features = [];
    calculated.CombatActions = []; calculated.AttackEnhancements = []; calculated.Reactions = [];

    selectedRawFeatures.forEach(feature => {
        const { id, name, category, tags, originalFeatureId,
            descriptionCore, costAP = 0, costMP = 0, // costSP = 0,
            actionType, damageMod = 0, damageType, targetsDefense,
            rangeValue = 0, rangeUnit, areaShape, areaSize, targetDescription,
            saveAttribute, saveDCMod = 0, conditionApplied, conditionDuration, healingAmount,
            description, value, displayValue } = feature; // Removed 'effects' as it's processed earlier

        switch (category) {
            case 'feature':
                calculated.Features.push({ name, description: descriptionCore || description, originalFeatureId: id || originalFeatureId });
                break;
            case 'action':
                let finalActionDamage = 0;
                if (actionType && (actionType.includes("Attack") || actionType.includes("Spell"))) {
                    if (typeof feature.baseDamageOverride === 'number') {
                        finalActionDamage = feature.baseDamageOverride + damageMod;
                    } else {
                        finalActionDamage = (calculated.Damage || 0) + damageMod;
                    }
                }

                let costParts = [];
                if (costAP > 0) costParts.push(`${costAP} AP`);
                if (costMP > 0) costParts.push(`${costMP} MP`);
                let displayCostStr = costParts.join(' + ') || 'Free';
                if (category === 'reaction' && !costParts.length) displayCostStr = 'Reaction';

                let descDisplayParts = [];

                if (descriptionCore || description || name) {
                    descDisplayParts.push(descriptionCore || description || name);
                }
                if (finalActionDamage > 0) {
                    descDisplayParts.push(`${finalActionDamage} ${damageType || 'damage'} damage${targetsDefense ? ` vs ${targetsDefense}` : ''}.`);
                }
                let targetInfo = targetDescription || (areaShape ? (areaSize ? `${areaSize}-space ${areaShape}` : areaShape) : 'target');
            
                let rangeInfo = '';
                if (rangeValue > 0 && rangeUnit === 'space') {
                    rangeInfo = `${rangeValue} space(s)`;
                } else if (rangeUnit) {
                    rangeInfo = rangeUnit.charAt(0).toUpperCase() + rangeUnit.slice(1);
                }
                if (targetInfo || rangeInfo) {
                    descDisplayParts.push(`Target ${targetInfo}${rangeInfo ? ` within ${rangeInfo}` : ''}.`);
                }

                if (saveAttribute) {
                    const finalActionSaveDC = (calculated.SaveDC || 0) + (saveDCMod || 0);
                    let saveStr = `Target makes a ${saveAttribute} save (DC ${finalActionSaveDC})`;
                    saveStr += conditionApplied ? ` or becomes ${conditionApplied}` : ` for effect`;
                    if (conditionApplied && conditionDuration) saveStr += ` (${conditionDuration.replace("your", "its")})`;
                    descDisplayParts.push(saveStr + ".");
                } else if (conditionApplied) {
                    let condStr = `Applies ${conditionApplied}`;
                    if (conditionDuration) condStr += ` (${conditionDuration.replace("your", "its")})`;
                    descDisplayParts.push(condStr + ".");
                }
                if (healingAmount) descDisplayParts.push(healingAmount === "damage dealt" ? "You regain HP equal to damage dealt." : `Heals for ${healingAmount} HP.`);

                calculated.CombatActions.push({
                    ...feature, name, calculatedDamage: finalActionDamage,
                    calculatedSaveDC: (calculated.SaveDC || 0) + (saveDCMod || 0),
                    displayCost: displayCostStr,
                    displayDescription: descDisplayParts.filter(p => p && p.trim() !== '').join(' '),
                    originalFeatureId: id || originalFeatureId
                });
                break;
            case 'attack_enhancement':
                let enhDescParts = [descriptionCore || description || name || ''];
                if (saveAttribute) {
                    const enhSaveDC = (calculated.SaveDC || 0) + (saveDCMod || 0);
                    enhDescParts.push(`Target makes a ${saveAttribute} save (DC ${enhSaveDC})`);
                }
                if (conditionApplied) enhDescParts.push(conditionApplied ? `or becomes ${conditionApplied}${conditionDuration ? ` (${conditionDuration.replace("your", "its")})` : ''}` : '');
                calculated.AttackEnhancements.push({ ...feature, name, cost: costAP > 0 ? `+${costAP} AP` : (costMP > 0 ? `+${costMP} MP` : 'Special'), description: enhDescParts.filter(Boolean).join('. '), originalFeatureId: id || originalFeatureId });
                break;
            case 'reaction':
                calculated.Reactions.push({ ...feature, name, cost: costAP > 0 ? `${costAP} AP` : 'Reaction', description: descriptionCore || description, originalFeatureId: id || originalFeatureId });
                break;
            case 'resistance': calculated.Resistances.push(displayValue || value || name); break;
            case 'vulnerability': calculated.Vulnerabilities.push(displayValue || value || name); break;
            case 'immunity': calculated.Immunities.push(displayValue || value || name); break;
            case 'sense': calculated.Senses.push(displayValue || value || name); break;
            case 'language': calculated.Languages.push(displayValue || value || name); break;
            default: break;
        }
    });



    // --- 7. Generate Default Attacks ---
    // Uses the final `calculated.Damage` which includes base, power, role, feature effects, AND user deltas.
    calculated.DefaultAttacks = [];
    const currentFinalBaseDamage = calculated.Damage; // Base damage AFTER all modifications
    const defaultAPCostMelee = 1;
    const defaultAPCostRanged = 2;

    // --- Default Melee Attack ---
    let meleeAttackName = "Melee Attack";
    let meleeAttackType = "Melee"; // Will be refined
    let meleeDamageType = "physical"; // Default assumption
    let meleeTargetsDefense = "PD";
    let meleeAttackDetails = [];

    // Base description part - "You make a [type] attack."
    if (calculated.isMartial && calculated.isCaster) {
        meleeAttackName = "Melee Attack (Martial or Spell)";
        meleeAttackType = "Melee Hybrid";
        meleeAttackDetails.push(`${currentFinalBaseDamage} damage (choose physical or magical type) vs ${meleeTargetsDefense}.`);
    } else if (calculated.isMartial) {
        meleeAttackName = "Melee Martial Attack";
        meleeAttackType = "Melee Martial";
        meleeDamageType = "physical";
        meleeAttackDetails.push(`${currentFinalBaseDamage} ${meleeDamageType} damage vs ${meleeTargetsDefense}.`);
    } else if (calculated.isCaster) {
        meleeAttackName = "Melee Spell Attack";
        meleeAttackType = "Melee Spell";
        meleeDamageType = "magical"; // Or a default caster damage type
        meleeAttackDetails.push(`${currentFinalBaseDamage} ${meleeDamageType} damage vs ${meleeTargetsDefense}.`);
    } else { // Fallback
        meleeAttackDetails.push(`${currentFinalBaseDamage} damage vs ${meleeTargetsDefense}.`);
    }
    meleeAttackDetails.push("Target 1 creature within 1 space."); // Standard melee reach

    calculated.DefaultAttacks.push({
        name: meleeAttackName,
        costAP: defaultAPCostMelee,
        details: meleeAttackDetails.join(' '), // Join parts into a readable sentence
        type: meleeAttackType,
        damage: currentFinalBaseDamage,
        damageType: meleeDamageType,
        range: "1 space", // Consistent with "within 1 space"
        targetsDefense: meleeTargetsDefense,
        targetDescription: "1 creature"
    });

    // --- Default Ranged Attack (if applicable) ---
    if (calculated.Range && calculated.Range.toLowerCase() !== 'melee' && calculated.Range.toLowerCase() !== 'touch' && calculated.Range.toLowerCase() !== 'reach') {
        const rangedDamageModFromRole = roleMods?.DamageModRanged !== undefined ? roleMods.DamageModRanged : 0;
        const rangedCreatureDamage = currentFinalBaseDamage + rangedDamageModFromRole + 1; // Ranged often +1 base

        let rangedAttackName = "Ranged Attack";
        let rangedAttackType = "Ranged";
        let rangedDamageType = "physical";
        let rangedTargetsDefense = "PD";
        let rangedAttackDetails = [];

        if (calculated.isMartial && calculated.isCaster) {
            rangedAttackName = "Ranged Attack (Martial or Spell)";
            rangedAttackType = "Ranged Hybrid";
            rangedAttackDetails.push(`${rangedCreatureDamage} damage (choose physical or magical type) vs ${rangedTargetsDefense}.`);
        } else if (calculated.isMartial) {
            rangedAttackName = "Ranged Martial Attack";
            rangedAttackType = "Ranged Martial";
            rangedDamageType = "physical";
            rangedAttackDetails.push(`${rangedCreatureDamage} ${rangedDamageType} damage vs ${rangedTargetsDefense}.`);
        } else if (calculated.isCaster) {
            rangedAttackName = "Ranged Spell Attack";
            rangedAttackType = "Ranged Spell";
            rangedDamageType = "magical";
            rangedAttackDetails.push(`${rangedCreatureDamage} ${rangedDamageType} damage vs ${rangedTargetsDefense}.`);
        } else {
            rangedAttackDetails.push(`${rangedCreatureDamage} damage vs ${rangedTargetsDefense}.`);
        }
        rangedAttackDetails.push(`Target 1 creature within ${calculated.Range}.`); // Use the creature's defined range

        calculated.DefaultAttacks.push({
            name: rangedAttackName,
            costAP: defaultAPCostRanged,
            details: rangedAttackDetails.join(' '),
            type: rangedAttackType,
            damage: rangedCreatureDamage,
            damageType: rangedDamageType,
            range: calculated.Range,
            targetsDefense: rangedTargetsDefense,
            targetDescription: "1 creature"
        });
    }


    // --- Apply overrides to default attacks ---
    Object.entries(defaultActionOverrides || {}).forEach(([idx, ovr]) => {
        const i = parseInt(idx, 10);
        if (!isNaN(i) && calculated.DefaultAttacks[i]) {
            calculated.DefaultAttacks[i] = { ...calculated.DefaultAttacks[i], ...ovr };

  /* OLD WAY
    // Apply any pending overrides to generated default attacks
    attackOverrides.forEach(ov => {
        const att = calculated.DefaultAttacks[ov.index];
        if (!att) return;
        if (ov.type === 'delta' && typeof ov.value === 'number' && typeof att[ov.field] === 'number') {
            att[ov.field] = (att[ov.field] || 0) + ov.value;
        } else if (ov.type === 'set') {
            att[ov.field] = ov.value;
    */
        }
    });

    // --- 8. Format for Display ---
    const finalCalcs = calculated;
    const formattedPD = `${finalCalcs.PD} (${finalCalcs.PD + 5}/${finalCalcs.PD + 10})`;
    const formattedAD = `${finalCalcs.AD} (${finalCalcs.AD + 5}/${finalCalcs.AD + 10})`;
    const skillsString = Object.entries(finalCalcs.Skills).map(([skill, bonus]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} ${bonus >= 0 ? '+' : ''}${bonus}`).join(', ') || 'None';

    let displayAttacks = finalCalcs.DefaultAttacks.map(att => ({
        name: att.name,
        costAP: att.costAP,
        costMP: att.costMP || 0,
        details: att.details,
        originalFeatureId: null,
    })); // Default attacks don't have originalFeatureId from selectedFeatures
    const specificAttackActions = finalCalcs.CombatActions.filter(ca => ca.actionType && (ca.actionType.includes("Attack") || ca.actionType.includes("Spell")));
    specificAttackActions.forEach(ca => {
        if (!displayAttacks.find(da => da.name === ca.name)) {
            displayAttacks.push({
                name: ca.name,
                costAP: ca.costAP || 0,
                costMP: ca.costMP || 0,
                details: ca.displayDescription,
                originalFeatureId: ca.originalFeatureId,
            });
        }
    });
    const otherDisplayCombatActions = finalCalcs.CombatActions.filter(ca => !ca.actionType || !(ca.actionType.includes("Attack") || ca.actionType.includes("Spell")))
        .map(ca => ({ name: `${ca.name} (${ca.displayCost})`, details: ca.displayDescription, originalFeatureId: ca.originalFeatureId }));

    const formattedActions = (actions || []).map(act => {
        const { name, descriptionCore, description, costAP = 0, costMP = 0, actionType,
            damageMod = 0, baseDamageOverride, damageType, targetsDefense, rangeValue = 0,
            rangeUnit, areaShape, areaSize, targetDescription, saveAttribute, saveDCMod = 0,
            conditionApplied, conditionDuration, healingAmount } = act;

        let finalActionDamage = 0;
        if (actionType && (actionType.includes('Attack') || actionType.includes('Spell'))) {
            if (typeof baseDamageOverride === 'number') {
                finalActionDamage = baseDamageOverride + (damageMod || 0);
            } else {
                finalActionDamage = (finalCalcs.Damage || 0) + (damageMod || 0);
            }
        }

        let costParts = [];
        if (costAP > 0) costParts.push(`${costAP} AP`);
        if (costMP > 0) costParts.push(`${costMP} MP`);
        const displayCostStr = costParts.join(' + ') || 'Free';

        let descDisplayParts = [];
        if (descriptionCore || description || name) descDisplayParts.push(descriptionCore || description || name);
        if (finalActionDamage > 0) {
            descDisplayParts.push(`${finalActionDamage} ${damageType || 'damage'} damage${targetsDefense ? ` vs ${targetsDefense}` : ''}.`);
        }
        const targetInfo = targetDescription || (areaShape ? (areaSize ? `${areaSize}-space ${areaShape}` : areaShape) : 'target');
        let rangeInfo = '';
        if (rangeValue > 0 && rangeUnit === 'space') {
            rangeInfo = `${rangeValue} space(s)`;
        } else if (rangeUnit) {
            rangeInfo = rangeUnit.charAt(0).toUpperCase() + rangeUnit.slice(1);
        }
        if (targetInfo || rangeInfo) {
            descDisplayParts.push(`Target ${targetInfo}${rangeInfo ? ` within ${rangeInfo}` : ''}.`);
        }

        if (saveAttribute) {
            const actionSaveDC = finalCalcs.SaveDC + (saveDCMod || 0);
            let saveStr = `Target makes a ${saveAttribute} save (DC ${actionSaveDC})`;
            saveStr += conditionApplied ? ` or becomes ${conditionApplied}` : ` for effect`;
            if (conditionApplied && conditionDuration) saveStr += ` (${conditionDuration.replace("your", "its")})`;
            descDisplayParts.push(saveStr + '.');
        } else if (conditionApplied) {
            let condStr = `Applies ${conditionApplied}`;
            if (conditionDuration) condStr += ` (${conditionDuration.replace("your", "its")})`;
            descDisplayParts.push(condStr + '.');
        }
        if (healingAmount) {
            descDisplayParts.push(healingAmount === 'damage dealt' ? 'You regain HP equal to damage dealt.' : `Heals for ${healingAmount} HP.`);
        }

        return {
            name: `${name} (${displayCostStr})`,
            details: descDisplayParts.filter(p => p && p.trim() !== '').join(' ')
        };
    });

    return {
        Name: finalCalcs.Name, Level: finalCalcs.Level, Power: finalCalcs.Power, Type: finalCalcs.Type, Role: finalCalcs.Role, Size: finalCalcs.Size,
        CalculatedBeforeDeltas: statsAfterFeatures,
        FinalWithDeltas: finalCalcs,
        FormattedActions: formattedActions,
        Display: {
            HP: finalCalcs.HP, PD: formattedPD, AD: formattedAD,
            MIG: `${finalCalcs.Attributes.Mig}${finalCalcs.Saves.Mig !== null ? ` (${finalCalcs.Saves.Mig})` : ''}`,
            AGI: `${finalCalcs.Attributes.Agi}${finalCalcs.Saves.Agi !== null ? ` (${finalCalcs.Saves.Agi})` : ''}`,
            CHA: `${finalCalcs.Attributes.Cha}${finalCalcs.Saves.Cha !== null ? ` (${finalCalcs.Saves.Cha})` : ''}`,
            INT: `${finalCalcs.Attributes.Int}${finalCalcs.Saves.Int !== null ? ` (${finalCalcs.Saves.Int})` : ''}`,
            MaxMP: finalCalcs.MaxMP > 0 ? finalCalcs.MaxMP.toString() : '', // Empty string if 0, or 'None'
            PDR: finalCalcs.PDR || '', Skills: skillsString,
            Resistant: finalCalcs.Resistances.join(', ') || 'None', Vulnerable: finalCalcs.Vulnerabilities.join(', ') || 'None',
            CondImmune: finalCalcs.Immunities.join(', ') || 'None', Senses: finalCalcs.Senses.join(', ') || 'None', Languages: finalCalcs.Languages.join(', ') || 'None',
            Features: finalCalcs.Features.map(f => ({ name: f.name, description: f.description, originalFeatureId: f.originalFeatureId })),
            Combat: {
                Check: `${finalCalcs.Check >= 0 ? '+' : ''}${finalCalcs.Check}`, SaveDC: finalCalcs.SaveDC.toString(),
                AP: finalCalcs.AP.toString(), Speed: finalCalcs.Speed.toString(),
                Attacks: displayAttacks, OtherActions: otherDisplayCombatActions,
                AttackEnhancements: finalCalcs.AttackEnhancements.map(enh => ({ name: `${enh.name} (${enh.cost || 'Special'})`, details: enh.description, originalFeatureId: enh.originalFeatureId })),
            },
            Reactions: finalCalcs.Reactions.map(re => ({ name: `${re.name} (${re.cost || 'Reaction'})`, details: re.description, originalFeatureId: re.originalFeatureId })),
        }
    };
};

export const generateDefaultActionFeatures = (inputs) => {
    const { FinalWithDeltas } = calculateCreatureStats(inputs, [], {}, {});
    const parseRange = (rangeStr) => {
        if (!rangeStr) return { rangeValue: 0, rangeUnit: '' };
        const match = rangeStr.match(/(\d+)\s*(\w+)/);
        if (match) {
            return { rangeValue: parseInt(match[1], 10), rangeUnit: match[2].replace(/s$/, '') };
        }
        return { rangeValue: 0, rangeUnit: rangeStr };
    };
    return (FinalWithDeltas.DefaultAttacks || []).map((att, idx) => {
        const { rangeValue, rangeUnit } = parseRange(att.range);
        return {
            id: `default-${idx}`,
            name: att.name,
            category: 'action',
            actionType: att.type ? `${att.type} Attack` : '',
            costAP: att.costAP,
            costMP: 0,
            costSP: 0,
            damageMod: 0,
            damageType: att.damageType,
            targetsDefense: att.targetsDefense,
            rangeValue,
            rangeUnit,
            targetDescription: att.targetDescription,
            descriptionCore: att.details
        };
    });
};
