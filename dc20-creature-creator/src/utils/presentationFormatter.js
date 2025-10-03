const capitalize = (value = '') =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatSkillList = (skills = {}) => {
  const entries = Object.entries(skills).map(([skill, bonus]) => {
    const formattedSkill = capitalize(skill);
    const sign = bonus >= 0 ? '+' : '';
    return `${formattedSkill} ${sign}${bonus}`;
  });

  return entries.length > 0 ? entries.join(', ') : 'None';
};

const formatAttributeWithSave = (attributeValue, saveValue) => {
  if (saveValue === null || typeof saveValue === 'undefined') {
    return attributeValue.toString();
  }
  return `${attributeValue} (${saveValue})`;
};

const createAttackDescription = (attack, extra) => {
  const parts = [];
  const damageInfo = attack.damage && typeof attack.damage === 'object' ? attack.damage : null;
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
      if (typeof attack.rangeValue === 'number') return attack.rangeValue;
      return null;
    })();
    const rangeText = (() => {
      if (parsedRange !== null && parsedRange > 0) return ` within ${parsedRange} spaces`;
      if ((parsedRange === null || parsedRange === 0) && (attack.defense === 'AD' || attack.targetsDefense === 'AD')) return ' around yourself';
      return '';
    })();
    parts.push(`Target ${targetText}${rangeText}.`);
  }

  const saveAttribute = extra?.save || extra?.saveAttribute;
  if (saveAttribute) {
    const saveDC = extra.calculatedSaveDC;
    let saveText = `Target makes a ${saveAttribute} save (DC ${saveDC})`;
    if (extra.conditionApplied) {
      saveText += ` or becomes ${extra.conditionApplied}`;
      if (extra.conditionDuration) {
        saveText += ` (${extra.conditionDuration.replace('your', 'its')})`;
      }
    } else {
      saveText += ' for effect';
    }
    parts.push(`${saveText}.`);
  } else if (extra?.conditionApplied) {
    let conditionText = `Applies ${extra.conditionApplied}`;
    if (extra.conditionDuration) {
      conditionText += ` (${extra.conditionDuration.replace('your', 'its')})`;
    }
    parts.push(`${conditionText}.`);
  }

  if (extra?.healingAmount) {
    parts.push(
      extra.healingAmount === 'damage dealt'
        ? 'You regain HP equal to damage dealt.'
        : `Heals for ${extra.healingAmount} HP.`
    );
  }

  const summary = extra?.summary || attack.summary || extra?.description || attack.description;
  if (summary) {
    parts.push(summary);
  }

  return parts.filter(Boolean).join(' ');
};

const buildCostObject = (attack) => {
  if (attack.cost && typeof attack.cost === 'object') {
    return attack.cost;
  }
  const cost = {};
  if (attack.costAP > 0) cost.ap = attack.costAP;
  if (attack.costMP > 0) cost.mp = attack.costMP;
  if (attack.costSP > 0) cost.sp = attack.costSP;
  return Object.keys(cost).length > 0 ? cost : null;
};

const parseRangeValue = (attack) => {
  if (typeof attack.range === 'number') return attack.range;
  if (typeof attack.rangeValue === 'number') return attack.rangeValue;
  if (typeof attack.range === 'string') {
    const match = attack.range.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return undefined;
};

const formatAttackDisplay = (attack, extras = {}) => {
  const cost = buildCostObject(attack);
  const damage = attack.damage && typeof attack.damage === 'object'
    ? attack.damage
    : {
        modifier: attack.damageMod || 0,
        type: attack.damageType,
      };
  return {
    name: attack.name,
    cost,
    costAP: attack.costAP || 0,
    costMP: attack.costMP || 0,
    costSP: attack.costSP || 0,
    details: createAttackDescription(attack, extras),
    originalFeatureId: attack.originalFeatureId || null,
    damage,
    defense: attack.defense || attack.targetsDefense || null,
    range: parseRangeValue(attack),
    target: attack.target || attack.targetDescription || null,
    summary: extras.summary || attack.summary || extras.description || attack.description || '',
  };
};

export const formatForPresentation = (raw, derived) => {
  const display = {
    HP: raw.HP,
    PD: `${raw.PD} (${raw.PD + 5}/${raw.PD + 10})`,
    AD: `${raw.AD} (${raw.AD + 5}/${raw.AD + 10})`,
    MIG: formatAttributeWithSave(raw.Attributes.Mig, raw.Saves.Mig),
    AGI: formatAttributeWithSave(raw.Attributes.Agi, raw.Saves.Agi),
    CHA: formatAttributeWithSave(raw.Attributes.Cha, raw.Saves.Cha),
    INT: formatAttributeWithSave(raw.Attributes.Int, raw.Saves.Int),
    MaxMP: raw.MaxMP > 0 ? raw.MaxMP.toString() : '',
    PDR: raw.PDR || '',
    Skills: formatSkillList(raw.Skills),
    Resistant: raw.Resistances.join(', ') || 'None',
    Vulnerable: raw.Vulnerabilities.join(', ') || 'None',
    CondImmune: raw.Immunities.join(', ') || 'None',
    Senses: raw.Senses.join(', ') || 'None',
    Languages: raw.Languages.join(', ') || 'None',
    Features: raw.Features.map((feature) => ({
      name: feature.name,
      description: feature.description,
      originalFeatureId: feature.originalFeatureId,
    })),
    Combat: {
      Check: `${raw.Check >= 0 ? '+' : ''}${raw.Check}`,
      SaveDC: raw.SaveDC.toString(),
      AP: raw.AP.toString(),
      LAP: raw.LAP > 0 ? raw.LAP.toString() : '',
      Speed: raw.Speed.toString(),
      Attacks: [],
      OtherActions: [],
      AttackEnhancements: [],
    },
    Reactions: [],
    ApexActions: [],
  };

  const defaultAttacks = derived.defaultAttacks || [];
  display.Combat.Attacks = defaultAttacks.map((attack) =>
    formatAttackDisplay(
      {
        ...attack,
        originalFeatureId: null,
      },
      attack,
    )
  );

  const combatActions = derived.combatActions || [];
  combatActions.forEach((action) => {
    const formatted = formatAttackDisplay(action, action);
    if (action.isAttack) {
      display.Combat.Attacks.push(formatted);
    } else {
      display.Combat.OtherActions.push({
        name: `${action.name} (${action.displayCost || 'Free'})`,
        details: action.description,
        originalFeatureId: action.originalFeatureId,
      });
    }
  });

  display.Combat.AttackEnhancements = (derived.attackEnhancements || []).map((enh) => ({
    name: `${enh.name} (${enh.cost || 'Special'})`,
    details: createAttackDescription({
      damage: null,
      targetsDefense: null,
      targetDescription: null,
      range: null,
    }, enh),
    originalFeatureId: enh.originalFeatureId,
  }));

  display.Reactions = (derived.reactions || []).map((reaction) => ({
    name: `${reaction.name} (${reaction.displayCost || 'Reaction'})`,
    details: reaction.description,
    originalFeatureId: reaction.originalFeatureId,
  }));

  display.ApexActions = (derived.apexActions || []).map((action) => ({
    name: `${action.name} (${action.displayCost || 'Free'})`,
    details: createAttackDescription(action, action),
    originalFeatureId: action.originalFeatureId,
  }));

  return display;
};
