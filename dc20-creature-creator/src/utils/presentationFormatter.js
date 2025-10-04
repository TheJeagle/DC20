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
    return {
      text: extra.saveText,
      dc: extra.calculatedSaveDC,
    };
  }
  if (typeof extra.save === 'string') {
    return {
      text: extra.save,
      dc: extra.calculatedSaveDC,
    };
  }
  if (extra.save && typeof extra.save === 'object') {
    const attribute =
      extra.save.attribute || extra.save.ability || extra.save.stat || extra.save.attributeName;
    const effect =
      extra.save.effect ||
      extra.save.onFail ||
      extra.save.onFailure ||
      extra.save.failure ||
      extra.save.failureEffect;
    const text =
      extra.save.text ||
      extra.save.summary ||
      extra.save.description ||
      (attribute ? `${attribute} save` : '');
    return {
      text,
      dc: extra.calculatedSaveDC,
      attribute,
      effect,
    };
  }
  if (extra.saveAttribute) {
    const attribute = extra.saveAttribute;
    let effectText = '';
    if (extra.conditionApplied) {
      effectText = `On a failure, the target becomes ${extra.conditionApplied}`;
      if (extra.conditionDuration) {
        effectText += ` (${extra.conditionDuration.replace('your', 'its')})`;
      }
    }
    return {
      text: `Target makes a ${attribute} save`,
      dc: extra.calculatedSaveDC,
      attribute,
      effect: effectText,
    };
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
    if (saveInfo.effect) {
      const trimmedEffect = saveInfo.effect.trim();
      if (trimmedEffect.length > 0) {
        parts.push(/[.!?]$/.test(trimmedEffect) ? trimmedEffect : `${trimmedEffect}.`);
      }
    }
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

const ensureSentence = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const normalizeFailureClause = (value = '') => {
  if (!value) return '';
  return value.replace(/\bOn failure\b/i, (match) =>
    match.charAt(0) === 'O' ? 'On a failure' : 'on a failure',
  );
};

const createEnhancementDescription = (enh = {}) => {
  if (!enh) return '';

  const parts = [];
  const summaryText = typeof enh.summary === 'string' ? enh.summary.trim() : '';
  if (summaryText) {
    parts.push(ensureSentence(summaryText));
  }

  const {
    summary: _omitSummary,
    save: _omitSave,
    saveText: _omitSaveText,
    saveAttribute: _omitSaveAttribute,
    conditionApplied: _omitConditionApplied,
    conditionDuration: _omitConditionDuration,
    ...restEnh
  } = enh;
  const sanitizedExtras = { ...restEnh };
  const sanitizedAttack = {
    damage: enh.damage,
    defense: enh.defense,
    target: enh.target,
    range: enh.range,
  };

  const additionalDescription = createAttackDescription(sanitizedAttack, sanitizedExtras).trim();
  if (additionalDescription) {
    parts.push(additionalDescription);
  }

  const saveInfo = extractSaveInfo(enh);
  if (saveInfo && (saveInfo.text || saveInfo.attribute || saveInfo.effect || typeof saveInfo.dc === 'number')) {
    const saveParts = [];
    const basePieces = [];
    if (typeof saveInfo.dc === 'number') {
      basePieces.push(`DC ${saveInfo.dc}`);
    }
    const normalizedText = saveInfo.attribute
      ? `${saveInfo.attribute} save`
      : (saveInfo.text || '').trim();
    if (normalizedText) {
      basePieces.push(normalizedText);
    }
    const baseSentence = basePieces.join(' ').trim();
    if (baseSentence) {
      saveParts.push(ensureSentence(baseSentence));
    } else if ((saveInfo.text || '').trim()) {
      saveParts.push(ensureSentence(saveInfo.text));
    }
    if (saveInfo.effect) {
      saveParts.push(ensureSentence(normalizeFailureClause(saveInfo.effect)));
    }
    parts.push(saveParts.filter(Boolean).join(' '));
  }

  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  display.Combat.AttackEnhancements = (derived.attackEnhancements || []).map((enh) => {
    const saveInfo = extractSaveInfo(enh) || {};
    const normalizedSaveEffect = normalizeFailureClause(
      saveInfo.effect || enh.save?.effect || enh.saveEffect,
    );

    return {
      name: `${enh.name} (${enh.displayCost || 'Special'})`,
      details: createEnhancementDescription(enh),
      originalFeatureId: enh.originalFeatureId,
      saveAttribute: saveInfo.attribute || enh.saveAttribute || enh.save?.attribute || '',
      saveDC:
        typeof saveInfo.dc === 'number'
          ? saveInfo.dc
          : typeof enh.calculatedSaveDC === 'number'
          ? enh.calculatedSaveDC
          : enh.save?.dc || '',
      saveEffect: normalizedSaveEffect || '',
    };
  });

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
