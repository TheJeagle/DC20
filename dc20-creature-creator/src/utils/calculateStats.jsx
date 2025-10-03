import { calculateBaseStats, deepClone, finalizeDerivedValues } from './baseStats';
import { applyFeatureEffects, buildDefaultAttacks } from './featureEffects';
import { applyDefaultActionOverrides, applyUserOverrides } from './overrideApplier';
import { formatForPresentation } from './presentationFormatter';

const isAttackAction = (action) => {
  if (!action) return false;
  const type = (action.method || action.actionType || '').toLowerCase();
  return type.includes('attack') || type.includes('spell');
};

const enhanceActionData = (rawStats, actions = []) =>
  actions.map((action) => {
    const calculatedDamage = (() => {
      if (typeof action.baseDamageOverride === 'number') {
        return action.baseDamageOverride + ((action.damage && action.damage.modifier) || action.damageMod || 0);
      }
      if (!isAttackAction(action)) {
        return 0;
      }
      const modifier = (action.damage && action.damage.modifier) || action.damageMod || 0;
      return rawStats.Damage + modifier;
    })();

    const calculatedSaveDC = rawStats.SaveDC + (action.saveDCMod || 0);

    const buildCostParts = () => {
      if (action.cost && typeof action.cost === 'object') {
        return Object.entries(action.cost)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => `${amount} ${resource.toUpperCase()}`);
      }
      const parts = [];
      if (action.costAP > 0) parts.push(`${action.costAP} AP`);
      if (action.costMP > 0) parts.push(`${action.costMP} MP`);
      if (action.costSP > 0) parts.push(`${action.costSP} SP`);
      return parts;
    };

    const costParts = buildCostParts();
    const isReaction = (action.category && action.category === 'reaction') || (action.kind && action.kind === 'reaction');
    const displayCost =
      isReaction && costParts.length === 0
        ? 'Reaction'
        : costParts.join(' + ') || 'Free';

    return {
      ...action,
      damage: Math.ceil(calculatedDamage),
      calculatedDamage: Math.ceil(calculatedDamage),
      calculatedSaveDC,
      displayCost,
      description: action.summary || action.description,
      isAttack: isAttackAction(action),
    };
  });

const enhanceEnhancements = (rawStats, enhancements = []) =>
  enhancements.map((enh) => ({
    ...enh,
    calculatedSaveDC: rawStats.SaveDC + (enh.saveDCMod || 0),
    cost: (() => {
      if (enh.cost && typeof enh.cost === 'object') {
        const parts = Object.entries(enh.cost)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => `+${amount} ${resource.toUpperCase()}`);
        return parts.join(', ') || 'Special';
      }
      if (enh.costAP > 0) return `+${enh.costAP} AP`;
      if (enh.costMP > 0) return `+${enh.costMP} MP`;
      if (enh.costSP > 0) return `+${enh.costSP} SP`;
      return 'Special';
    })(),
  }));

const enhanceReactions = (reactions = []) =>
  reactions.map((reaction) => ({
    ...reaction,
    displayCost: (() => {
      if (reaction.cost && typeof reaction.cost === 'object') {
        const parts = Object.entries(reaction.cost)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => `${amount} ${resource.toUpperCase()}`);
        return parts.join(', ') || 'Reaction';
      }
      if (reaction.costAP > 0) return `${reaction.costAP} AP`;
      if (reaction.costMP > 0) return `${reaction.costMP} MP`;
      return 'Reaction';
    })(),
  }));

const enhanceApexActions = (rawStats, actions = []) =>
  actions.map((action) => {
    const calculatedDamage = (() => {
      if (typeof action.baseDamageOverride === 'number') {
        return action.baseDamageOverride + ((action.damage && action.damage.modifier) || action.damageMod || 0);
      }
      if (!isAttackAction(action)) {
        return 0;
      }
      const modifier = (action.damage && action.damage.modifier) || action.damageMod || 0;
      return rawStats.Damage + modifier;
    })();

    const buildCostParts = () => {
      if (action.cost && typeof action.cost === 'object') {
        return Object.entries(action.cost)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => `${amount} ${resource.toUpperCase()}`);
      }
      const parts = [];
      if (action.costAP > 0) parts.push(`${action.costAP} AP`);
      if (action.costMP > 0) parts.push(`${action.costMP} MP`);
      if (action.costSP > 0) parts.push(`${action.costSP} SP`);
      return parts;
    };

    const costParts = buildCostParts();
    const displayCost = costParts.join(' + ') || 'Free';

    return {
      ...action,
      damage: Math.ceil(calculatedDamage),
      calculatedSaveDC: rawStats.SaveDC + (action.saveDCMod || 0),
      displayCost,
      description: action.summary || action.description,
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
    const damageInfo = typeof attack.damage === 'object' ? attack.damage : null;
    if (damageInfo || typeof attack.damage === 'number' || typeof attack.damageMod === 'number') {
      const damageType = (damageInfo && damageInfo.type) || attack.damageType || 'damage';
      const modifierSource = damageInfo && typeof damageInfo.modifier === 'number'
        ? damageInfo.modifier
        : attack.damageMod || 0;
      const modifier = typeof modifierSource === 'number' ? modifierSource : 0;
      const defense = attack.defense || attack.targetsDefense;
      const modifierText = modifier >= 0 ? `+${modifier}` : modifier;
      const defenseText = defense ? ` vs ${defense}` : '';
      parts.push(`base damage ${modifierText} ${damageType}${defenseText}.`);
    }
    if (attack.target || attack.targetDescription) {
      const targetText = attack.target || attack.targetDescription;
      const parsedRange = (() => {
        if (typeof attack.range === 'number') return attack.range;
        if (typeof attack.range === 'string') {
          const match = attack.range.match(/(\d+)/);
          if (match) return parseInt(match[1], 10);
        }
        return null;
      })();
      const rangeText = (() => {
        if (parsedRange !== null && parsedRange > 0) return ` within ${parsedRange} spaces`;
        if ((parsedRange === null || parsedRange === 0) && (attack.defense === 'AD' || attack.targetsDefense === 'AD')) return ' around yourself';
        return '';
      })();
      parts.push(`Target ${targetText}${rangeText}.`);
    }
    return parts.join(' ');
  };

  return defaultAttacks.map((attack, idx) => {
    return {
      id: `default-${idx}`,
      name: attack.name,
      category: 'action',
      method: attack.type ? `${attack.type} Attack` : '',
      cost: attack.cost
        ? { ...attack.cost }
        : attack.costAP
        ? { ap: attack.costAP }
        : null,
      damage: attack.damage || { modifier: attack.damageMod || 0, type: attack.damageType },
      defense: attack.defense || attack.targetsDefense,
      range: (() => {
        if (typeof attack.range === 'number') return attack.range;
        if (typeof attack.range === 'string') {
          const match = attack.range.match(/(\d+)/);
          if (match) return parseInt(match[1], 10);
        }
        return undefined;
      })(),
      target: attack.target || attack.targetDescription,
      summary: describeAttack(attack),
      baseDamageOverride: attack.damage,
    };
  });
};
