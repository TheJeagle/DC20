import { calculateBaseStats, deepClone, finalizeDerivedValues } from './baseStats';
import { applyFeatureEffects, buildDefaultAttacks } from './featureEffects';
import { applyDefaultActionOverrides, applyUserOverrides } from './overrideApplier';
import { formatForPresentation } from './presentationFormatter';

const isAttackAction = (action) => {
  if (!action || typeof action.actionType !== 'string') return false;
  const type = action.actionType.toLowerCase();
  return type.includes('attack') || type.includes('spell');
};

const toNumberOr = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const buildCostDisplay = (cost = {}, fallback = {}, category) => {
  if (typeof cost.summary === 'string' && cost.summary.trim()) {
    return cost.summary.trim();
  }

  const ap = toNumberOr(cost.ap, toNumberOr(fallback.ap, 0));
  const mp = toNumberOr(cost.mp, toNumberOr(fallback.mp, 0));
  const sp = toNumberOr(cost.sp, toNumberOr(fallback.sp, 0));
  const parts = [];
  if (ap > 0) parts.push(`${ap} AP`);
  if (mp > 0) parts.push(`${mp} MP`);
  if (sp > 0) parts.push(`${sp} SP`);
  if (cost.special) parts.push(cost.special);

  if (category === 'reaction' && parts.length === 0) {
    return 'Reaction';
  }

  return parts.join(' + ') || 'Free';
};

const extractSaveDcMod = (action = {}) => {
  if (action.save && typeof action.save === 'object') {
    if (typeof action.save.dcMod === 'number') return action.save.dcMod;
    if (typeof action.save.dcModifier === 'number') return action.save.dcModifier;
    if (action.save.dc && typeof action.save.dc.modifier === 'number') {
      return action.save.dc.modifier;
    }
  }
  return toNumberOr(action.saveDCMod, 0);
};

const extractSaveText = (action = {}) => {
  if (!action.save) return '';
  if (typeof action.save === 'string') return action.save;
  if (typeof action.save === 'object') {
    return action.save.text || action.save.summary || action.save.description || '';
  }
  return '';
};

const enhanceActionData = (rawStats, actions = []) =>
  actions.map((action) => {
    const category = action.category || 'action';
    const damageModifier = toNumberOr(action.damage?.modifier, toNumberOr(action.damageMod, 0));
    const damageBaseOverride =
      typeof action.damage?.base === 'number'
        ? action.damage.base
        : typeof action.baseDamageOverride === 'number'
        ? action.baseDamageOverride
        : null;

    const calculatedDamage = (() => {
      if (typeof damageBaseOverride === 'number') {
        return damageBaseOverride + damageModifier;
      }
      if (!isAttackAction(action)) {
        return 0;
      }
      return rawStats.Damage + damageModifier;
    })();

    const calculatedSaveDC = rawStats.SaveDC + extractSaveDcMod(action);
    const displayCost = buildCostDisplay(action.cost, action, category);
    const saveText = extractSaveText(action);
    const totalDamage = Math.ceil(calculatedDamage);

    return {
      ...action,
      category,
      damage: {
        ...(action.damage && typeof action.damage === 'object' ? action.damage : {}),
        modifier: damageModifier,
        base:
          typeof damageBaseOverride === 'number'
            ? damageBaseOverride
            : action.damage?.base,
        total: totalDamage,
        type: action.damage?.type || action.damageType,
      },
      damageType: action.damage?.type || action.damageType,
      calculatedDamage: totalDamage,
      calculatedSaveDC,
      displayCost,
      saveText,
      description: action.description,
      isAttack: isAttackAction(action),
    };
  });

const enhanceEnhancements = (rawStats, enhancements = []) =>
  enhancements.map((enh) => {
    const category = enh.category || 'attack_enhancement';
    const damageModifier = toNumberOr(enh.damage?.modifier, toNumberOr(enh.damageMod, 0));
    const damageBaseOverride =
      typeof enh.damage?.base === 'number'
        ? enh.damage.base
        : typeof enh.baseDamageOverride === 'number'
        ? enh.baseDamageOverride
        : null;

    const totalDamage =
      typeof damageBaseOverride === 'number'
        ? Math.ceil(damageBaseOverride + damageModifier)
        : typeof enh.damage?.total === 'number'
        ? Math.ceil(enh.damage.total)
        : undefined;

    const existingDamage =
      enh.damage && typeof enh.damage === 'object' ? { ...enh.damage } : null;
    const shouldBuildDamage = existingDamage || typeof damageBaseOverride === 'number';
    const normalizedDamage = shouldBuildDamage
      ? {
          ...(existingDamage || {}),
          modifier: damageModifier,
          base:
            typeof damageBaseOverride === 'number'
              ? damageBaseOverride
              : existingDamage?.base,
          total: totalDamage,
          type: existingDamage?.type || enh.damageType,
        }
      : enh.damage;

    return {
      ...enh,
      category,
      damage: normalizedDamage,
      damageType: normalizedDamage?.type || enh.damageType,
      calculatedDamage: typeof totalDamage === 'number' ? totalDamage : enh.calculatedDamage,
      calculatedSaveDC: rawStats.SaveDC + extractSaveDcMod(enh),
      displayCost: buildCostDisplay(enh.cost, enh, category),
      saveText: extractSaveText(enh),
    };
  });

const enhanceReactions = (rawStats, reactions = []) =>
  enhanceActionData(
    rawStats,
    reactions.map((reaction) => ({
      category: 'reaction',
      ...reaction,
    })),
  );

const enhanceApexActions = (rawStats, actions = []) =>
  actions.map((action) => {
    const category = action.category || 'apex_action';
    const damageModifier = toNumberOr(action.damage?.modifier, toNumberOr(action.damageMod, 0));
    const damageBaseOverride =
      typeof action.damage?.base === 'number'
        ? action.damage.base
        : typeof action.baseDamageOverride === 'number'
        ? action.baseDamageOverride
        : null;

    const calculatedDamage = (() => {
      if (typeof damageBaseOverride === 'number') {
        return damageBaseOverride + damageModifier;
      }
      if (!isAttackAction(action)) {
        return 0;
      }
      return rawStats.Damage + damageModifier;
    })();

    const displayCost = buildCostDisplay(action.cost, action, category);
    const totalDamage = Math.ceil(calculatedDamage);

    return {
      ...action,
      category,
      damage: {
        ...action.damage,
        modifier: damageModifier,
        base:
          typeof damageBaseOverride === 'number'
            ? damageBaseOverride
            : action.damage?.base,
        total: totalDamage,
        type: action.damage?.type || action.damageType,
      },
      damageType: action.damage?.type || action.damageType,
      calculatedSaveDC: rawStats.SaveDC + extractSaveDcMod(action),
      displayCost,
      description: action.description,
      saveText: extractSaveText(action),
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
    reactions: enhanceReactions(raw, raw.Reactions),
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
    const damageAmount =
      typeof attack.damage?.total === 'number'
        ? attack.damage.total
        : typeof attack.damage?.base === 'number'
        ? attack.damage.base
        : attack.damage;
    if (damageAmount) {
      const defense = attack.defense || attack.targetsDefense;
      const damageType = attack.damage?.type || attack.damageType || 'damage';
      const defenseText = defense ? ` vs ${defense}` : '';
      parts.push(`${damageAmount} ${damageType} damage${defenseText}.`);
    }
    const targetText = attack.target?.text || attack.targetDescription;
    const rangeText = attack.range?.text || attack.range;
    if (targetText) {
      const rangeSentence = rangeText ? ` within ${rangeText}` : '';
      parts.push(`Target ${targetText}${rangeSentence}.`);
    } else if (rangeText) {
      parts.push(`Range ${rangeText}.`);
    }
    return parts.join(' ');
  };

  const parseRange = (rangeValue, rangeUnit, rangeText) => {
    if (rangeText && typeof rangeText === 'object') {
      return {
        rangeValue: rangeText.value || 0,
        rangeUnit: rangeText.unit,
        range: rangeText,
      };
    }
    if (typeof rangeText === 'string' && rangeText.trim()) {
      const match = rangeText.match(/(\d+)\s*(\w+)/);
      if (match) {
        return {
          rangeValue: parseInt(match[1], 10),
          rangeUnit: match[2].replace(/s$/, ''),
          range: { value: parseInt(match[1], 10), unit: match[2].replace(/s$/, ''), text: rangeText },
        };
      }
      return { rangeValue: 0, rangeUnit: rangeText, range: { text: rangeText } };
    }
    if (typeof rangeValue === 'number' && rangeValue > 0) {
      return {
        rangeValue,
        rangeUnit: rangeUnit || '',
        range: { value: rangeValue, unit: rangeUnit, text: `${rangeValue} ${rangeUnit || ''}`.trim() },
      };
    }

    return { rangeValue: 0, rangeUnit: '', range: null };
  };

  return defaultAttacks.map((attack, idx) => {
    const parsedRange = parseRange(attack.rangeValue, attack.rangeUnit, attack.range);
    const target = attack.target?.text
      ? attack.target
      : attack.targetDescription
      ? { text: attack.targetDescription }
      : null;
    const cost = attack.cost || {
      ap: attack.costAP || 0,
      mp: attack.costMP || 0,
      sp: attack.costSP || 0,
    };
    return {
      id: `default-${idx}`,
      name: attack.name,
      category: 'action',
      actionType: attack.type ? `${attack.type} Attack` : '',
      cost,
      costAP: cost.ap,
      costMP: cost.mp,
      costSP: cost.sp,
      damage: {
        base: attack.damage?.base ?? attack.damage,
        modifier: 0,
        type: attack.damage?.type || attack.damageType,
      },
      damageMod: 0,
      damageType: attack.damage?.type || attack.damageType,
      defense: attack.defense || attack.targetsDefense,
      targetsDefense: attack.targetsDefense,
      rangeValue: parsedRange.rangeValue,
      rangeUnit: parsedRange.rangeUnit,
      range: parsedRange.range,
      targetDescription: attack.targetDescription,
      target,
      summary: attack.summary || describeAttack(attack),
      descriptionCore: describeAttack(attack),
      baseDamageOverride: attack.damage?.base ?? attack.damage,
    };
  });
};
