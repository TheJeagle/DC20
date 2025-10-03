import { deepClone } from './baseStats';

const mapActionFeature = (feature) => ({
  id: feature.id,
  name: feature.name,
  category: feature.category,
  actionType: feature.method || feature.actionType,
  costAP: (feature.cost && feature.cost.ap) || feature.costAP || 0,
  costMP: (feature.cost && feature.cost.mp) || feature.costMP || 0,
  costSP: (feature.cost && feature.cost.sp) || feature.costSP || 0,
  damageMod: (feature.damage && typeof feature.damage.modifier === 'number')
    ? feature.damage.modifier
    : feature.damageMod || 0,
  damageType: (feature.damage && feature.damage.type) || feature.damageType,
  targetsDefense: feature.defense || feature.targetsDefense,
  rangeValue: typeof feature.range === 'number' ? feature.range : feature.rangeValue || 0,
  rangeUnit: feature.rangeUnit,
  areaShape: feature.areaShape,
  areaSize: feature.areaSize,
  targetDescription: feature.target || feature.targetDescription,
  saveAttribute: feature.save || feature.saveAttribute,
  saveDCMod: feature.saveDCMod || 0,
  conditionApplied: feature.conditionApplied,
  conditionDuration: feature.conditionDuration,
  healingAmount: feature.healingAmount,
  description: feature.summary || feature.descriptionCore || feature.description,
  baseDamageOverride: feature.baseDamageOverride,
  descriptionCore: feature.descriptionCore,
  originalFeatureId: feature.id || feature.originalFeatureId,
  balanceCost: feature.balanceCost,
});

const mapEnhancementFeature = (feature) => ({
  id: feature.id,
  name: feature.name,
  costAP: (feature.cost && feature.cost.ap) || feature.costAP || 0,
  costMP: (feature.cost && feature.cost.mp) || feature.costMP || 0,
  costSP: (feature.cost && feature.cost.sp) || feature.costSP || 0,
  description: feature.summary || feature.descriptionCore || feature.description,
  saveAttribute: feature.save || feature.saveAttribute,
  saveDCMod: feature.saveDCMod || 0,
  conditionApplied: feature.conditionApplied,
  conditionDuration: feature.conditionDuration,
  originalFeatureId: feature.id || feature.originalFeatureId,
  balanceCost: feature.balanceCost,
});

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
          description: feature.summary || feature.descriptionCore || feature.description,
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
