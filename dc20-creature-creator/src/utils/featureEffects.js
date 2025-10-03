import { deepClone } from './baseStats';

const numberOr = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeCost = (feature) => {
  const raw = typeof feature.cost === 'object' && feature.cost !== null ? feature.cost : {};
  const cost = {
    ap: numberOr(raw.ap, numberOr(feature.costAP, 0)),
    mp: numberOr(raw.mp, numberOr(feature.costMP, 0)),
    sp: numberOr(raw.sp, numberOr(feature.costSP, 0)),
  };

  if (raw.special) cost.special = raw.special;
  if (raw.summary) {
    cost.summary = raw.summary;
  } else if (feature.costSummary) {
    cost.summary = feature.costSummary;
  }

  return cost;
};

const buildRangeText = (value, unit, fallback = '') => {
  if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback;
  if (typeof value === 'number' && value > 0) {
    return `${value} ${unit || ''}`.trim();
  }
  return '';
};

const normalizeRange = (feature) => {
  const raw = feature.range;
  if (typeof raw === 'string') {
    return {
      text: raw,
    };
  }

  if (raw && typeof raw === 'object') {
    const text =
      raw.text ||
      raw.summary ||
      buildRangeText(raw.value, raw.unit, raw.label || raw.display || '');
    return {
      ...raw,
      text,
    };
  }

  const value = numberOr(feature.rangeValue, null);
  const unit = feature.rangeUnit;
  const text = buildRangeText(value, unit, feature.range);

  if (!text && value === null && !unit) {
    return null;
  }

  return {
    value,
    unit,
    text,
  };
};

const normalizeTarget = (feature) => {
  const raw = feature.target;
  if (typeof raw === 'string') {
    return { text: raw };
  }
  if (raw && typeof raw === 'object') {
    return {
      ...raw,
      text: raw.text || raw.summary || raw.description || '',
    };
  }

  if (!feature.targetDescription) return null;
  return { text: feature.targetDescription };
};

const normalizeDamage = (feature) => {
  const raw = feature.damage && typeof feature.damage === 'object' ? { ...feature.damage } : {};
  if (typeof raw.modifier !== 'number') {
    raw.modifier = numberOr(feature.damageMod, 0);
  }
  if (!raw.type && feature.damageType) {
    raw.type = feature.damageType;
  }
  if (typeof raw.base !== 'number' && typeof feature.baseDamageOverride === 'number') {
    raw.base = feature.baseDamageOverride;
  }
  return Object.keys(raw).length > 0 ? raw : null;
};

const normalizeSave = (feature) => {
  const raw = feature.save;
  if (typeof raw === 'string') {
    return {
      text: raw,
      attribute: feature.saveAttribute || null,
      dcMod: numberOr(feature.saveDCMod, 0),
    };
  }

  if (raw && typeof raw === 'object') {
    return {
      ...raw,
      attribute: raw.attribute ?? feature.saveAttribute ?? null,
      dcMod:
        numberOr(raw.dcMod, null) ??
        numberOr(raw.dcModifier, null) ??
        numberOr(raw.dc?.modifier, null) ??
        numberOr(feature.saveDCMod, 0),
      text: raw.text || raw.summary || raw.description || '',
    };
  }

  if (!feature.saveAttribute && !feature.conditionApplied) {
    return null;
  }

  const parts = [];
  if (feature.saveAttribute) {
    parts.push(`${feature.saveAttribute} save`);
  }
  if (feature.conditionApplied) {
    let conditionText = feature.conditionApplied;
    if (feature.conditionDuration) {
      conditionText += ` (${feature.conditionDuration.replace('your', 'its')})`;
    }
    parts.push(`on failure ${conditionText}`);
  }

  return {
    attribute: feature.saveAttribute || null,
    dcMod: numberOr(feature.saveDCMod, 0),
    text: parts.join('; '),
  };
};

const normalizeSummary = (feature) =>
  feature.summary || feature.descriptionCore || feature.description || '';

const mapActionFeature = (feature) => {
  const cost = normalizeCost(feature);
  const range = normalizeRange(feature);
  const target = normalizeTarget(feature);
  const damage = normalizeDamage(feature);
  const save = normalizeSave(feature);

  return {
    id: feature.id,
    name: feature.name,
    category: feature.category,
    actionType: feature.actionType,
    cost,
    costAP: cost.ap,
    costMP: cost.mp,
    costSP: cost.sp,
    damage,
    damageMod: damage?.modifier ?? 0,
    damageType: damage?.type || feature.damageType,
    targetsDefense: feature.targetsDefense,
    defense: feature.defense || feature.targetsDefense,
    rangeValue: range?.value || 0,
    rangeUnit: range?.unit,
    range,
    areaShape: feature.areaShape,
    areaSize: feature.areaSize,
    targetDescription: feature.targetDescription,
    target,
    saveAttribute: save?.attribute,
    saveDCMod: save?.dcMod || 0,
    save,
    conditionApplied: feature.conditionApplied,
    conditionDuration: feature.conditionDuration,
    healingAmount: feature.healingAmount,
    description: feature.descriptionCore || feature.description,
    baseDamageOverride: feature.baseDamageOverride,
    descriptionCore: feature.descriptionCore,
    summary: normalizeSummary(feature),
    originalFeatureId: feature.id || feature.originalFeatureId,
    balanceCost: feature.balanceCost,
  };
};

const mapEnhancementFeature = (feature) => {
  const cost = normalizeCost(feature);
  const save = normalizeSave(feature);

  return {
    id: feature.id,
    name: feature.name,
    cost,
    costAP: cost.ap,
    costMP: cost.mp,
    costSP: cost.sp,
    description: feature.descriptionCore || feature.description,
    saveAttribute: save?.attribute,
    saveDCMod: save?.dcMod || 0,
    save,
    conditionApplied: feature.conditionApplied,
    conditionDuration: feature.conditionDuration,
    summary: normalizeSummary(feature),
    originalFeatureId: feature.id || feature.originalFeatureId,
    balanceCost: feature.balanceCost,
  };
};

export const applyFeatureEffects = (stats, selectedFeatures = []) => {
  const working = deepClone(stats);

  selectedFeatures.forEach((feature) => {
    if (!feature || typeof feature !== 'object') return;

    if (feature.category === 'feature' && Array.isArray(feature.effects)) {
      feature.effects.forEach((effect) => {
        const { stat, change, value } = effect || {};

        if (Object.prototype.hasOwnProperty.call(working, stat)) {
          if (change === 'add' && typeof value === 'number') {
            working[stat] = (working[stat] || 0) + value;
          } else if (change === 'set') {
            working[stat] = value;
          }
          return;
        }

        if (Object.prototype.hasOwnProperty.call(working.Attributes, stat)) {
          if (change === 'add' && typeof value === 'number') {
            working.Attributes[stat] = (working.Attributes[stat] || 0) + value;
          } else if (change === 'set') {
            working.Attributes[stat] = value;
          }
          return;
        }

        if (stat === 'PDR' && change === 'set') {
          working.PDR = value;
          return;
        }

        if (stat === 'MaxMP' && change === 'add' && typeof value === 'number') {
          working.MaxMP = (working.MaxMP || 0) + value;
        }
      });
    }
  });

  working.Features = [];
  working.CombatActions = [];
  working.ApexActions = [];
  working.Reactions = [];
  working.AttackEnhancements = [];
  working.Resistances = [];
  working.Vulnerabilities = [];
  working.Immunities = [];
  working.Senses = [];
  working.Languages = [];

  selectedFeatures.forEach((feature) => {
    if (!feature || typeof feature !== 'object') return;

    const {
      id,
      name,
      category,
      value,
      displayValue,
      originalFeatureId,
    } = feature;

    switch (category) {
      case 'feature':
        working.Features.push({
          name,
          description: feature.descriptionCore || feature.description,
          originalFeatureId: id || originalFeatureId,
        });
        break;
      case 'action':
        working.CombatActions.push(mapActionFeature(feature));
        break;
      case 'apex_action':
        working.ApexActions.push(mapActionFeature(feature));
        break;
      case 'attack_enhancement':
        working.AttackEnhancements.push(mapEnhancementFeature(feature));
        break;
      case 'reaction':
        working.Reactions.push({
          ...mapActionFeature(feature),
        });
        break;
      case 'resistance':
        working.Resistances.push(displayValue || value || name);
        break;
      case 'vulnerability':
        working.Vulnerabilities.push(displayValue || value || name);
        break;
      case 'immunity':
        working.Immunities.push(displayValue || value || name);
        break;
      case 'sense':
        working.Senses.push(displayValue || value || name);
        break;
      case 'language':
        working.Languages.push(displayValue || value || name);
        break;
      default:
        break;
    }
  });

  return working;
};

const buildAttackName = (base, flags) => {
  if (flags.isCaster && flags.isMartial) return `${base} (Martial or Spell)`;
  if (flags.isMartial) return `${base} Martial`;
  if (flags.isCaster) return `${base} Spell`;
  return base;
};

export const buildDefaultAttacks = (stats, roleMods = {}) => {
  const attacks = [];
  const baseDamage = stats.Damage;
  const flags = { isCaster: stats.isCaster, isMartial: stats.isMartial };

  const buildRangeObject = (rangeText) => {
    if (!rangeText) return null;
    const match = rangeText.match(/(\d+)\s*(\w+)/);
    if (!match) return { text: rangeText };
    return {
      value: parseInt(match[1], 10),
      unit: match[2].replace(/s$/, ''),
      text: rangeText,
    };
  };

  const meleeAttack = {
    name: buildAttackName('Melee Attack', flags),
    cost: { ap: 1, mp: 0, sp: 0 },
    costAP: 1,
    type: buildAttackName('Melee', flags),
    damage: {
      base: baseDamage,
      modifier: 0,
      type: stats.isCaster && !stats.isMartial ? 'magical' : 'physical',
    },
    damageType: stats.isCaster && !stats.isMartial ? 'magical' : 'physical',
    range: buildRangeObject('1 space'),
    rangeValue: 1,
    rangeUnit: 'space',
    targetsDefense: 'PD',
    defense: 'PD',
    target: { text: '1 creature' },
    targetDescription: '1 creature',
    summary: '',
  };
  attacks.push(meleeAttack);

  const rangeType = (stats.Range || '').toLowerCase();
  if (rangeType && !['melee', 'touch', 'reach'].includes(rangeType)) {
    const rangedDamageMod = roleMods?.DamageModRanged ?? 0;
    const rangedRange = buildRangeObject(stats.Range);
    const rangedAttack = {
      name: buildAttackName('Ranged Attack', flags),
      cost: { ap: 2, mp: 0, sp: 0 },
      costAP: 2,
      type: buildAttackName('Ranged', flags),
      damage: {
        base: baseDamage + rangedDamageMod + 1,
        modifier: 0,
        type: stats.isCaster && !stats.isMartial ? 'magical' : 'physical',
      },
      damageType: stats.isCaster && !stats.isMartial ? 'magical' : 'physical',
      range: rangedRange,
      rangeValue: rangedRange?.value || 0,
      rangeUnit: rangedRange?.unit,
      targetsDefense: 'PD',
      defense: 'PD',
      target: { text: '1 creature' },
      targetDescription: '1 creature',
      summary: '',
    };
    attacks.push(rangedAttack);
  }

  return attacks;
};
