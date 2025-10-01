import { calculateBaseStats, deepClone, finalizeDerivedValues } from './baseStats';
import { applyFeatureEffects, buildDefaultAttacks } from './featureEffects';
import { applyDefaultActionOverrides, applyUserOverrides } from './overrideApplier';
import { formatForPresentation } from './presentationFormatter';

const isAttackAction = (action) => {
  if (!action || typeof action.actionType !== 'string') return false;
  const type = action.actionType.toLowerCase();
  return type.includes('attack') || type.includes('spell');
};

const enhanceActionData = (rawStats, actions = []) =>
  actions.map((action) => {
    const calculatedDamage = (() => {
      if (typeof action.baseDamageOverride === 'number') {
        return action.baseDamageOverride + (action.damageMod || 0);
      }
      if (!isAttackAction(action)) {
        return 0;
      }
      return rawStats.Damage + (action.damageMod || 0);
    })();

    const calculatedSaveDC = rawStats.SaveDC + (action.saveDCMod || 0);

    const costParts = [];
    if (action.costAP > 0) costParts.push(`${action.costAP} AP`);
    if (action.costMP > 0) costParts.push(`${action.costMP} MP`);
    const displayCost =
      action.category === 'reaction' && costParts.length === 0
        ? 'Reaction'
        : costParts.join(' + ') || 'Free';

    return {
      ...action,
      damage: Math.ceil(calculatedDamage),
      calculatedDamage: Math.ceil(calculatedDamage),
      calculatedSaveDC,
      displayCost,
      description: action.description,
      isAttack: isAttackAction(action),
    };
  });

const enhanceEnhancements = (rawStats, enhancements = []) =>
  enhancements.map((enh) => ({
    ...enh,
    calculatedSaveDC: rawStats.SaveDC + (enh.saveDCMod || 0),
    cost:
      enh.costAP > 0
        ? `+${enh.costAP} AP`
        : enh.costMP > 0
        ? `+${enh.costMP} MP`
        : 'Special',
  }));

const enhanceReactions = (reactions = []) =>
  reactions.map((reaction) => ({
    ...reaction,
    displayCost: reaction.costAP > 0 ? `${reaction.costAP} AP` : 'Reaction',
  }));

const enhanceApexActions = (rawStats, actions = []) =>
  actions.map((action) => {
    const calculatedDamage = (() => {
      if (typeof action.baseDamageOverride === 'number') {
        return action.baseDamageOverride + (action.damageMod || 0);
      }
      if (!isAttackAction(action)) {
        return 0;
      }
      return rawStats.Damage + (action.damageMod || 0);
    })();

    const costParts = [];
    if (action.costAP > 0) costParts.push(`${action.costAP} AP`);
    if (action.costMP > 0) costParts.push(`${action.costMP} MP`);
    const displayCost = costParts.join(' + ') || 'Free';

    return {
      ...action,
      damage: Math.ceil(calculatedDamage),
      calculatedSaveDC: rawStats.SaveDC + (action.saveDCMod || 0),
      displayCost,
      description: action.description,
    };
  });

export const calculateCreatureStats = (
  inputs,
  selectedRawFeatures = [],
  userOverrideDeltas = {},
  defaultActionOverrides = {},
) => {
  const { stats: baseStats, context } = calculateBaseStats(inputs);

  const statsWithFeatures = applyFeatureEffects(baseStats, selectedRawFeatures);
  const snapshotBeforeOverrides = deepClone(statsWithFeatures);

  const { stats: statsWithOverrides } = applyUserOverrides(
    statsWithFeatures,
    userOverrideDeltas,
  );

  finalizeDerivedValues(statsWithOverrides, context);

  const defaultAttacks = buildDefaultAttacks(statsWithOverrides, context.roleMods);
  const overriddenDefaultAttacks = applyDefaultActionOverrides(
    defaultAttacks,
    defaultActionOverrides,
  );

  const raw = {
    ...statsWithOverrides,
    DefaultAttacks: overriddenDefaultAttacks,
  };

  const derived = {
    context,
    snapshots: {
      beforeOverrides: snapshotBeforeOverrides,
    },
    defaultAttacks: overriddenDefaultAttacks,
    combatActions: enhanceActionData(raw, raw.CombatActions),
    apexActions: enhanceApexActions(raw, raw.ApexActions),
    reactions: enhanceReactions(raw.Reactions),
    attackEnhancements: enhanceEnhancements(raw, raw.AttackEnhancements),
  };

  const display = formatForPresentation(raw, derived);

  return {
    raw,
    derived,
    display,
  };
};

export const generateDefaultActionFeatures = (inputs) => {
  const { stats: baseStats, context } = calculateBaseStats(inputs);
  const finalized = finalizeDerivedValues(baseStats, context);
  const defaultAttacks = buildDefaultAttacks(finalized, context.roleMods);

  const describeAttack = (attack) => {
    const parts = [];
    if (attack.damage) {
      const defense = attack.targetsDefense ? ` vs ${attack.targetsDefense}` : '';
      parts.push(`${attack.damage} ${attack.damageType || 'damage'} damage${defense}.`);
    }
    if (attack.targetDescription) {
      const range = attack.range ? ` within ${attack.range}` : '';
      parts.push(`Target ${attack.targetDescription}${range}.`);
    }
    return parts.join(' ');
  };

  const parseRange = (rangeStr) => {
    if (!rangeStr) return { rangeValue: 0, rangeUnit: '' };
    const match = rangeStr.match(/(\d+)\s*(\w+)/);
    if (match) {
      return { rangeValue: parseInt(match[1], 10), rangeUnit: match[2].replace(/s$/, '') };
    }
    return { rangeValue: 0, rangeUnit: rangeStr };
  };

  return defaultAttacks.map((attack, idx) => {
    const { rangeValue, rangeUnit } = parseRange(attack.range);
    return {
      id: `default-${idx}`,
      name: attack.name,
      category: 'action',
      actionType: attack.type ? `${attack.type} Attack` : '',
      costAP: attack.costAP,
      costMP: 0,
      costSP: 0,
      damageMod: 0,
      damageType: attack.damageType,
      targetsDefense: attack.targetsDefense,
      rangeValue,
      rangeUnit,
      targetDescription: attack.targetDescription,
      descriptionCore: describeAttack(attack),
      baseDamageOverride: attack.damage,
    };
  });
};
