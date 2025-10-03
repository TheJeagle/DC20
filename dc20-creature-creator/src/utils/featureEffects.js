import { deepClone } from './baseStats';

const getFeatureKind = (feature) => feature?.kind || feature?.category;

const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseRange = (range) => {
  if (typeof range === 'number') {
    return {
      rangeText: `${range} spaces`,
      rangeValue: range,
      rangeUnit: 'spaces',
    };
  }

  if (typeof range === 'string') {
    const numericMatch = range.match(/(\d+)/);
    return {
      rangeText: range,
      rangeValue: numericMatch ? parseInt(numericMatch[1], 10) : 0,
      rangeUnit: numericMatch ? 'spaces' : range,
    };
  }

  return {
    rangeText: range || '',
    rangeValue: 0,
    rangeUnit: '',
  };
};

const extractConditionFromEffects = (feature) => {
  if (!Array.isArray(feature?.effects)) {
    return {};
  }

  const conditionEffect = feature.effects.find(
    (effect) => effect && effect.type === 'condition'
  );

  if (!conditionEffect) {
    return {};
  }

  return {
    conditionApplied: conditionEffect.name || conditionEffect.condition || conditionEffect.value || '',
    conditionDuration: conditionEffect.duration || conditionEffect.timing || '',
  };
};

const extractHealingFromEffects = (feature) => {
  if (!Array.isArray(feature?.effects)) {
    return null;
  }

  const healingEffect = feature.effects.find((effect) => effect && effect.type === 'healing');

  if (!healingEffect) {
    return null;
  }

  return healingEffect.amount || healingEffect.value || null;
};

const mapActionFeature = (feature) => {
  const cost = feature.cost || {};
  const damage = feature.damage || {};
  const save = feature.save || {};
  const { rangeText, rangeValue, rangeUnit } = parseRange(
    feature.range ?? feature.rangeDescription ?? feature.rangeText
  );

  const conditionFields = {
    conditionApplied: feature.conditionApplied,
    conditionDuration: feature.conditionDuration,
  };

  if (!conditionFields.conditionApplied && !conditionFields.conditionDuration) {
    Object.assign(conditionFields, extractConditionFromEffects(feature));
  }

  const normalizedRange =
    typeof feature.range === 'number'
      ? `${feature.range}`
      : feature.range || feature.rangeDescription || rangeText;

  return {
    id: feature.id,
    name: feature.name,
    category: getFeatureKind(feature),
    actionType: feature.method || feature.actionType,
    costAP: toNumber(cost.ap || feature.costAP, 0),
    costMP: toNumber(cost.mp || feature.costMP, 0),
    costSP: toNumber(cost.sp || feature.costSP, 0),
    damageMod: toNumber(
      typeof damage === 'number' ? damage : damage.bonus ?? feature.damageMod,
      0
    ),
    damageType:
      typeof damage === 'object' && damage.type
        ? damage.type
        : feature.damageType,
    targetsDefense: feature.defense || feature.targetsDefense,
    range: normalizedRange,
    rangeValue,
    rangeUnit,
    areaShape: feature.areaShape,
    areaSize: feature.areaSize,
    targetDescription: feature.target || feature.targetDescription,
    saveAttribute: save.attribute || feature.saveAttribute,
    saveDCMod: toNumber(save.dcMod || feature.saveDCMod, 0),
    ...conditionFields,
    healingAmount:
      feature.healing?.amount || feature.healingAmount || extractHealingFromEffects(feature),
    description: feature.summary || feature.descriptionCore || feature.description,
    baseDamageOverride:
      typeof damage === 'object' && Object.prototype.hasOwnProperty.call(damage, 'base')
        ? damage.base
        : feature.baseDamageOverride,
    descriptionCore: feature.summary || feature.descriptionCore,
    originalFeatureId: feature.id || feature.originalFeatureId,
    balanceCost: feature.balanceCost,
    trigger: feature.trigger,
  };
};

const mapEnhancementFeature = (feature) => {
  const cost = feature.cost || {};
  const save = feature.save || {};
  const conditionFields = {
    conditionApplied: feature.conditionApplied,
    conditionDuration: feature.conditionDuration,
  };

  if (!conditionFields.conditionApplied && !conditionFields.conditionDuration) {
    Object.assign(conditionFields, extractConditionFromEffects(feature));
  }

  return {
    id: feature.id,
    name: feature.name,
    costAP: toNumber(cost.ap || feature.costAP, 0),
    costMP: toNumber(cost.mp || feature.costMP, 0),
    costSP: toNumber(cost.sp || feature.costSP, 0),
    description: feature.summary || feature.descriptionCore || feature.description,
    saveAttribute: save.attribute || feature.saveAttribute,
    saveDCMod: toNumber(save.dcMod || feature.saveDCMod, 0),
    ...conditionFields,
    originalFeatureId: feature.id || feature.originalFeatureId,
    balanceCost: feature.balanceCost,
    trigger: feature.trigger,
  };
};

export const applyFeatureEffects = (stats, selectedFeatures = []) => {
  const working = deepClone(stats);

  selectedFeatures.forEach((feature) => {
    if (!feature || typeof feature !== 'object') return;

    const kind = getFeatureKind(feature);

    if (kind === 'feature' && Array.isArray(feature.effects)) {
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
      value,
      displayValue,
      originalFeatureId,
    } = feature;

    const kind = getFeatureKind(feature);

    switch (kind) {
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

  const meleeAttack = {
    name: buildAttackName('Melee Attack', flags),
    costAP: 1,
    type: buildAttackName('Melee', flags),
    damage: baseDamage,
    damageType: stats.isCaster && !stats.isMartial ? 'magical' : 'physical',
    range: '1 space',
    targetsDefense: 'PD',
    targetDescription: '1 creature',
  };
  attacks.push(meleeAttack);

  const rangeType = (stats.Range || '').toLowerCase();
  if (rangeType && !['melee', 'touch', 'reach'].includes(rangeType)) {
    const rangedDamageMod = roleMods?.DamageModRanged ?? 0;
    const rangedAttack = {
      name: buildAttackName('Ranged Attack', flags),
      costAP: 2,
      type: buildAttackName('Ranged', flags),
      damage: baseDamage + rangedDamageMod + 1,
      damageType: stats.isCaster && !stats.isMartial ? 'magical' : 'physical',
      range: stats.Range,
      targetsDefense: 'PD',
      targetDescription: '1 creature',
    };
    attacks.push(rangedAttack);
  }

  return attacks;
};
