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

const extractRangeText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.text || [value.value, value.unit].filter(Boolean).join(' ').trim();
  }
  return '';
};

const extractTargetText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.text || value.summary || value.description || '';
  }
  return '';
};

const extractDamageInfo = (attack, extra) => {
  const source = extra?.damage || attack.damage;
  if (!source) return null;

  const numericSource = typeof source === 'number' ? source : null;
  const type =
    (source && typeof source === 'object' ? source.type : undefined) ||
    extra?.damageType ||
    attack.damageType ||
    'damage';
  const total =
    typeof extra?.calculatedDamage === 'number'
      ? extra.calculatedDamage
      : typeof source.total === 'number'
      ? source.total
      : typeof source.base === 'number'
      ? source.base + (source.modifier || 0)
      : numericSource;
  const defense =
    extra?.defense ||
    (source && typeof source === 'object' ? source.defense : undefined) ||
    attack.defense ||
    attack.targetsDefense;

  if (!total) return null;

  return {
    total,
    type,
    defense,
  };
};

const extractSaveInfo = (extra) => {
  if (!extra) return null;
  if (extra.saveText) {
    return { text: extra.saveText, dc: extra.calculatedSaveDC };
  }
  if (typeof extra.save === 'string') {
    return { text: extra.save, dc: extra.calculatedSaveDC };
  }
  if (extra.save && typeof extra.save === 'object') {
    const text = extra.save.text || extra.save.summary || extra.save.description || '';
    return { text, dc: extra.calculatedSaveDC };
  }
  if (extra.saveAttribute) {
    let saveText = `Target makes a ${extra.saveAttribute} save`;
    if (extra.conditionApplied) {
      saveText += ` or becomes ${extra.conditionApplied}`;
      if (extra.conditionDuration) {
        saveText += ` (${extra.conditionDuration.replace('your', 'its')})`;
      }
    }
    return { text: saveText, dc: extra.calculatedSaveDC };
  }
  return null;
};

const createAttackDescription = (attack, extra) => {
  const parts = [];
  const damageInfo = extractDamageInfo(attack, extra);
  if (damageInfo) {
    const defenseText = damageInfo.defense ? ` vs ${damageInfo.defense}` : '';
    parts.push(`${damageInfo.total} ${damageInfo.type} damage${defenseText}.`);
  }

  const targetText = extractTargetText(extra?.target || attack.target || extra?.targetDescription || attack.targetDescription);
  const rangeText = extractRangeText(extra?.range || attack.range || (extra?.rangeValue && extra?.rangeUnit
    ? { value: extra.rangeValue, unit: extra.rangeUnit }
    : attack.rangeValue && attack.rangeUnit
    ? { value: attack.rangeValue, unit: attack.rangeUnit }
    : ''));
  if (targetText) {
    const rangeSentence = rangeText ? ` within ${rangeText}` : '';
    parts.push(`Target ${targetText}${rangeSentence}.`);
  } else if (rangeText) {
    parts.push(`Range ${rangeText}.`);
  }

  const saveInfo = extractSaveInfo(extra);
  if (saveInfo && saveInfo.text) {
    const dcText = typeof saveInfo.dc === 'number' ? ` (DC ${saveInfo.dc})` : '';
    parts.push(`${saveInfo.text}${dcText}.`);
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

  if (extra?.summary) {
    parts.push(extra.summary);
  } else if (extra?.description) {
    parts.push(extra.description);
  } else if (attack.summary) {
    parts.push(attack.summary);
  }

  return parts.filter(Boolean).join(' ');
};

const formatAttackDisplay = (attack, extras = {}) => ({
  name: attack.name,
  cost: attack.cost || { ap: attack.costAP || 0, mp: attack.costMP || 0, sp: attack.costSP || 0 },
  details: createAttackDescription(attack, extras),
  originalFeatureId: attack.originalFeatureId || null,
});

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
    name: `${enh.name} (${enh.displayCost || 'Special'})`,
    details: createAttackDescription({
      damage: enh.damage,
      defense: enh.defense,
      target: enh.target,
      range: enh.range,
      summary: enh.summary,
    }, enh),
    originalFeatureId: enh.originalFeatureId,
  }));

  display.Reactions = (derived.reactions || []).map((reaction) => ({
    name: `${reaction.name} (${reaction.displayCost || 'Reaction'})`,
    details: createAttackDescription(reaction, reaction),
    originalFeatureId: reaction.originalFeatureId,
  }));

  display.ApexActions = (derived.apexActions || []).map((action) => ({
    name: `${action.name} (${action.displayCost || 'Free'})`,
    details: createAttackDescription(action, action),
    originalFeatureId: action.originalFeatureId,
  }));

  return display;
};
