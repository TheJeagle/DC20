import {
  baseLevelStatsData,
  attributeScoresByLevel,
  roleModifiersData,
  powerScalingFactors,
} from '../data/gameRules';

export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const sizeOrder = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

const getInitialStats = (inputs) => {
  const {
    level = 1,
    power = 'normal',
    role = 'none',
    type = 'beast',
    size = 'medium',
    creatureName,
  } = inputs || {};

  return {
    Name: creatureName || 'Unnamed Creature',
    Level: level,
    Power: power,
    Type: type,
    Role: role,
    Size: size,
    HP: 0,
    PD: 0,
    AD: 0,
    Check: 0,
    Damage: 0,
    AP: 0,
    LAP: 0,
    Speed: 0,
    MaxMP: 0,
    Attributes: { Mig: 0, Agi: 0, Cha: 0, Int: 0, Prime: 0 },
    Saves: { Mig: null, Agi: null, Cha: null, Int: null },
    Skills: {},
    Resistances: [],
    Vulnerabilities: [],
    Immunities: [],
    Senses: [],
    Languages: [],
    Features: [],
    CombatActions: [],
    ApexActions: [],
    Reactions: [],
    AttackEnhancements: [],
    PDR: '',
    Range: 'Melee',
    isCaster: false,
    isMartial: true,
    SaveDC: 10,
    DefaultAttacks: [],
  };
};

const applyLevelBase = (stats, levelBase) => {
  const working = stats;
  working.HP = levelBase.HP || 0;
  working.PD = levelBase.PD || 0;
  working.AD = levelBase.AD || 0;
  working.Check = levelBase.Check || 0;
  working.Damage = levelBase.Damage || 0;
  working.AP = levelBase.AP || 0;
  working.Speed = levelBase.Speed || 0;
  working.MaxMP = levelBase.MaxMP || 0;
  return working;
};

const applyRoleModifiers = (stats, roleMods, levelBase) => {
  const working = stats;
  working.HP = Math.round(working.HP * (roleMods.HPFactor || 1));
  working.PD += roleMods.PDMod || 0;
  working.AD += roleMods.ADMod || 0;
  working.Check += roleMods.CheckMod || 0;
  working.Damage += roleMods.DamageMod || 0;
  working.Speed += roleMods.SpeedMod || 0;
  working.MaxMP = (levelBase.MaxMP || 0) + (roleMods.MPMod || 0);
  if (roleMods.Range) {
    working.Range = roleMods.Range;
  }
  working.isCaster = !!roleMods.isCaster;
  working.isMartial = !working.isCaster;
  return working;
};

const applyPowerScaling = (stats, powerScale) => {
  const working = stats;
  working.HP = Math.round(working.HP * (powerScale.HP || 1));
  working.PD += powerScale.Defense || 0;
  working.AD += powerScale.Defense || 0;
  working.Check += powerScale.Check || 0;
  working.Damage += powerScale.Damage || 0;
  working.AP += powerScale.AP || 0;
  working.MaxMP = Math.ceil(working.MaxMP * (powerScale.MP || 1));
  working.SaveDC = 10 + (powerScale.SaveDC || 0);
  return working;
};

const applySizeAdjustments = (stats, size) => {
  const working = stats;
  const sizeIndex = sizeOrder.indexOf((size || 'medium').toLowerCase());
  const mediumIndex = sizeOrder.indexOf('medium');
  if (sizeIndex !== -1 && mediumIndex !== -1) {
    const sizeDelta = sizeIndex - mediumIndex;
    working.AD += sizeDelta;
    working.PD -= sizeDelta;
  }
  return working;
};

const assignAttributes = (stats, level, roleMods) => {
  const working = stats;
  const attributeLevelScores =
    attributeScoresByLevel.find((entry) => entry.level === level)?.scores || [0, 0, 0, 0];

  if (roleMods.AttributePriority) {
    roleMods.AttributePriority.forEach((attrName, index) => {
      if (Object.prototype.hasOwnProperty.call(working.Attributes, attrName)) {
        working.Attributes[attrName] = attributeLevelScores[index];
      }
    });
  }

  return working;
};

const assignSkills = (stats, level, roleMods) => {
  const working = stats;
  working.Skills = {};
  const getAttributeForSkill = (skillName, attrs) => {
    if (skillName === 'awareness') {
      const primeAttr = roleMods.AttributePriority?.[0];
      return primeAttr ? attrs[primeAttr] || 0 : attrs.Prime || 0;
    }
    if (['athletics', 'intimidation'].includes(skillName)) return attrs.Mig || 0;
    if (['acrobatics', 'trickery', 'stealth'].includes(skillName)) return attrs.Agi || 0;
    if (['animal handling', 'influence', 'insight'].includes(skillName)) return attrs.Cha || 0;
    return attrs.Int || 0;
  };

  if (roleMods.Skills) {
    roleMods.Skills.forEach((skillName) => {
      if (typeof skillName === 'string' && skillName.length > 0) {
        const skillBonusFromLevel = Math.ceil(level / 5) * 2;
        const attributeValue = getAttributeForSkill(skillName, working.Attributes);
        working.Skills[skillName] = skillBonusFromLevel + attributeValue;
      }
    });
  }

  return working;
};

export const calculateBaseStats = (inputs = {}) => {
  const normalizedInputs = {
    ...inputs,
    power: typeof inputs.power === 'string' ? inputs.power.toLowerCase() : 'normal',
    role: typeof inputs.role === 'string' ? inputs.role.toLowerCase() : 'none',
    size: typeof inputs.size === 'string' ? inputs.size.toLowerCase() : 'medium',
  };

  const stats = getInitialStats(normalizedInputs);
  const levelBase = baseLevelStatsData.find((entry) => entry.level === stats.Level);

  if (!levelBase) {
    console.error(`No base stats for level ${stats.Level}`);
    return {
      stats,
      context: {
        roleMods: roleModifiersData.none,
        powerScale: powerScalingFactors.normal,
        levelBase: null,
      },
    };
  }

  applyLevelBase(stats, levelBase);

  const roleMods = roleModifiersData[stats.Role] || roleModifiersData.none;
  applyRoleModifiers(stats, roleMods, levelBase);

  const powerScale = powerScalingFactors[stats.Power] || powerScalingFactors.normal;
  applyPowerScaling(stats, powerScale);

  applySizeAdjustments(stats, stats.Size);
  assignAttributes(stats, stats.Level, roleMods);
  assignSkills(stats, stats.Level, roleMods);

  stats.LAP =
    stats.Power === 'apex' ? 3 : stats.Power === 'legendary' ? 6 : 0;

  return {
    stats,
    context: {
      roleMods,
      powerScale,
      levelBase,
    },
  };
};

export const finalizeDerivedValues = (stats, context) => {
  const working = stats;
  const { roleMods, powerScale } = context;

  if (roleMods.AttributePriority) {
    const prime = roleMods.AttributePriority[0];
    working.Attributes.Prime = working.Attributes[prime] || 0;
  }

  working.Damage = Math.ceil(working.Damage);

  const CM_final = Math.ceil(working.Level / 2);
  working.Saves = { Mig: null, Agi: null, Cha: null, Int: null };
  if (roleMods.SavesProficient) {
    roleMods.SavesProficient.forEach((attr) => {
      if (Object.prototype.hasOwnProperty.call(working.Attributes, attr)) {
        working.Saves[attr] = (working.Attributes[attr] || 0) + CM_final;
      }
    });
  }

  working.SaveDC =
    10 + (working.Attributes.Prime || 0) + CM_final + (powerScale?.SaveDC || 0);

  return working;
};
