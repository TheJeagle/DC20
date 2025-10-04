import { calculateCreatureStats } from '../utils/calculateStats';

const STORAGE_KEY = 'creatureCreatorState';

const DEFAULT_INPUTS = {
  creatureName: 'Creature',
  level: 1,
  power: 'Normal',
  type: 'undead',
  role: 'none',
  size: 'medium',
};

const toNumber = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const getDefaultCreatureState = () => ({
  inputs: { ...DEFAULT_INPUTS },
  selectedFeatures: [],
  overrides: {},
  actionOverrides: {},
});

export const createBaseCreature = (inputs = {}) => {
  const defaults = getDefaultCreatureState();
  const incomingInputs = inputs && typeof inputs === 'object' ? inputs : {};

  return {
    ...defaults,
    inputs: {
      ...defaults.inputs,
      ...incomingInputs,
      creatureName: (incomingInputs.creatureName || defaults.inputs.creatureName || '').toString(),
      level: toNumber(incomingInputs.level, defaults.inputs.level),
      power:
        typeof incomingInputs.power === 'string' && incomingInputs.power.length > 0
          ? incomingInputs.power
          : defaults.inputs.power,
      role:
        typeof incomingInputs.role === 'string' && incomingInputs.role.length > 0
          ? incomingInputs.role.toLowerCase()
          : defaults.inputs.role,
      type:
        typeof incomingInputs.type === 'string' && incomingInputs.type.length > 0
          ? incomingInputs.type.toLowerCase()
          : defaults.inputs.type,
      size:
        typeof incomingInputs.size === 'string' && incomingInputs.size.length > 0
          ? incomingInputs.size.toLowerCase()
          : defaults.inputs.size,
    },
  };
};

export const applyRole = (creatureState) => ({
  ...creatureState,
  inputs: {
    ...creatureState.inputs,
    role: (creatureState.inputs.role || DEFAULT_INPUTS.role).toLowerCase(),
  },
});

export const applyType = (creatureState) => ({
  ...creatureState,
  inputs: {
    ...creatureState.inputs,
    type: (creatureState.inputs.type || DEFAULT_INPUTS.type).toLowerCase(),
  },
});

export const applyFeatures = (creatureState, selectedFeatures = []) => ({
  ...creatureState,
  selectedFeatures: Array.isArray(selectedFeatures)
    ? selectedFeatures.map((feature) => ({ ...feature }))
    : [],
});

export const applyOverrides = (creatureState, overrides = {}, actionOverrides = {}) => ({
  ...creatureState,
  overrides: overrides && typeof overrides === 'object' ? { ...overrides } : {},
  actionOverrides:
    actionOverrides && typeof actionOverrides === 'object' ? { ...actionOverrides } : {},
});

const toCostObject = (action = {}) => {
  const cost = action.cost && typeof action.cost === 'object' ? action.cost : {};
  return {
    ap: typeof cost.ap === 'number' ? cost.ap : action.costAP || 0,
    mp: typeof cost.mp === 'number' ? cost.mp : action.costMP || 0,
    sp: typeof cost.sp === 'number' ? cost.sp : action.costSP || 0,
    special: cost.special,
    summary: cost.summary,
  };
};

const toNumeric = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const normalizeDamage = (action = {}) => {
  const rawDamage = action.damage;
  const resolvedType =
    (rawDamage && typeof rawDamage === 'object' && rawDamage.type) || action.damageType || '';

  if (!rawDamage && !action.damageMod && !action.damageBonus) {
    return { modifier: 0, type: resolvedType };
  }

  if (typeof rawDamage === 'number') {
    return {
      base: rawDamage,
      modifier: toNumeric(action.damageMod) || 0,
      total: rawDamage + (toNumeric(action.damageMod) || 0),
      type: resolvedType,
    };
  }

  const modifier =
    toNumeric(rawDamage?.modifier) ??
    toNumeric(rawDamage?.bonus) ??
    toNumeric(action.damageMod) ??
    toNumeric(action.damageBonus) ??
    0;

  const base =
    toNumeric(rawDamage?.base) ??
    (typeof rawDamage?.total === 'number' && Number.isFinite(modifier)
      ? rawDamage.total - modifier
      : undefined);

  const total =
    toNumeric(rawDamage?.total) ??
    (typeof base === 'number'
      ? Math.ceil(base + (Number.isFinite(modifier) ? modifier : 0))
      : undefined);

  return {
    ...(rawDamage && typeof rawDamage === 'object' ? { ...rawDamage } : {}),
    base,
    modifier,
    bonus:
      rawDamage && typeof rawDamage === 'object' && typeof rawDamage.bonus !== 'undefined'
        ? rawDamage.bonus
        : undefined,
    total,
    type: resolvedType,
  };
};

const normalizeRange = (action = {}) => {
  const explicitValue = toNumeric(action.rangeValue);
  const explicitUnit = action.rangeUnit;
  const rawRange = action.range ?? action.rangeText;

  if (rawRange && typeof rawRange === 'object') {
    const text = rawRange.text || `${rawRange.value || explicitValue || ''} ${rawRange.unit || explicitUnit || ''}`.trim();
    return {
      range: { ...rawRange, text },
      rangeValue: toNumeric(rawRange.value) ?? explicitValue,
      rangeUnit: rawRange.unit || explicitUnit || undefined,
    };
  }

  if (typeof rawRange === 'number') {
    const inferredUnit = explicitUnit || (rawRange === 1 ? 'space' : 'spaces');
    const text = `${rawRange} ${inferredUnit}`.trim();
    return {
      range: { value: rawRange, unit: inferredUnit, text },
      rangeValue: rawRange,
      rangeUnit: inferredUnit || undefined,
    };
  }

  if (typeof rawRange === 'string' && rawRange.trim().length > 0) {
    const text = rawRange.trim();
    const match = text.match(/(-?\d+(?:\.\d+)?)/);
    const value = match ? Number(match[1]) : explicitValue;
    const rawUnitCandidate = match ? text.slice(match.index + match[1].length).trim() : '';
    const inferredUnit =
      rawUnitCandidate ||
      explicitUnit ||
      (typeof value === 'number' && Number.isFinite(value)
        ? value === 1
          ? 'space'
          : 'spaces'
        : undefined);
    const normalizedText =
      rawUnitCandidate || !value
        ? text
        : `${value} ${inferredUnit}`.trim();
    return {
      range: {
        text: normalizedText,
        ...(typeof value === 'number' && Number.isFinite(value) ? { value } : {}),
        ...(inferredUnit ? { unit: inferredUnit.replace(/s$/, '') } : {}),
      },
      rangeValue: typeof value === 'number' && Number.isFinite(value) ? value : explicitValue,
      rangeUnit:
        inferredUnit && typeof inferredUnit === 'string'
          ? inferredUnit.replace(/s$/, '')
          : explicitUnit || undefined,
    };
  }

  if (typeof explicitValue === 'number') {
    const unit = explicitUnit || (explicitValue === 1 ? 'space' : 'spaces');
    const text = `${explicitValue} ${unit}`.trim();
    return {
      range: { value: explicitValue, unit, text },
      rangeValue: explicitValue,
      rangeUnit: unit || undefined,
    };
  }

  return { range: rawRange || '', rangeValue: explicitValue, rangeUnit: explicitUnit || undefined };
};

const normalizeTarget = (action = {}) => {
  if (action.target && typeof action.target === 'object') return action.target;
  const textCandidate =
    (typeof action.target === 'string' && action.target.trim()) ||
    (typeof action.targetDescription === 'string' && action.targetDescription.trim()) ||
    (typeof action.targets === 'string' && action.targets.trim()) ||
    '';
  return textCandidate ? { text: textCandidate } : action.target;
};

const mapDisplayAction = (action = {}, source = 'default') => {
  const cost = toCostObject(action);
  const normalizedDamage = normalizeDamage(action);
  const normalizedRange = normalizeRange(action);
  const target = normalizeTarget(action);

  const saveDcMod = toNumeric(action.save?.dcMod);
  const fallbackSaveDcMod = toNumeric(action.saveDCMod);

  return {
    name: action.name || '',
    cost,
    costAP: cost.ap,
    costMP: cost.mp,
    costSP: cost.sp,
    damage: normalizedDamage,
    damageMod: toNumeric(normalizedDamage?.modifier) || 0,
    save: action.save || null,
    saveDCMod: saveDcMod ?? fallbackSaveDcMod ?? 0,
    range: normalizedRange.range,
    rangeValue: normalizedRange.rangeValue,
    rangeUnit: normalizedRange.rangeUnit,
    target,
    targetDescription: target?.text || action.targetDescription || '',
    defense: action.defense || action.targetsDefense || '',
    actionType: action.actionType || action.type || '',
    description: action.summary || action.descriptionCore || action.description || '',
    summary: action.summary || action.descriptionCore || action.description || '',
    source,
    id: action.id,
  };
};

const createDisplayActions = (statBlock, selectedFeatures = []) => {
  const defaultActions = (statBlock?.raw?.DefaultAttacks || []).map((attack) =>
    mapDisplayAction(
      {
        ...attack,
        cost: attack.cost || { ap: attack.costAP || 0, mp: attack.costMP || 0, sp: attack.costSP || 0 },
      },
      'default',
    ),
  );

  const featureActions = (selectedFeatures || [])
    .filter((feature) => feature && feature.category === 'action')
    .map((feature) => mapDisplayAction(feature, 'feature'));

  return {
    defaultActions,
    featureActions,
    actions: [...defaultActions, ...featureActions],
  };
};

export const buildCreature = (
  inputs = {},
  selectedFeatures = [],
  overrides = {},
  actionOverrides = {},
  calculator = calculateCreatureStats
) => {
  const baseState = createBaseCreature(inputs);
  const withRole = applyRole(baseState);
  const withType = applyType(withRole);
  const withFeatures = applyFeatures(withType, selectedFeatures);
  const withOverrides = applyOverrides(withFeatures, overrides, actionOverrides);

  const calculationInputs = {
    level: toNumber(withOverrides.inputs.level, DEFAULT_INPUTS.level),
    power: (withOverrides.inputs.power || DEFAULT_INPUTS.power).toLowerCase(),
    role: withOverrides.inputs.role,
    type: withOverrides.inputs.type,
    size: withOverrides.inputs.size,
    creatureName: withOverrides.inputs.creatureName,
  };

  const rawCreature = calculator(
    calculationInputs,
    withOverrides.selectedFeatures,
    withOverrides.overrides,
    withOverrides.actionOverrides
  );

  const displayData = createDisplayActions(rawCreature, withOverrides.selectedFeatures);

  return {
    creature: rawCreature,
    display: displayData,
  };
};

export const normalizeCreatureState = (state = {}) => {
  const defaults = getDefaultCreatureState();
  const incoming = state && typeof state === 'object' ? state : {};
  const normalizedBase = createBaseCreature(incoming.inputs || defaults.inputs);

  return {
    inputs: normalizedBase.inputs,
    selectedFeatures: Array.isArray(incoming.selectedFeatures)
      ? incoming.selectedFeatures.map((feature) => ({ ...feature }))
      : [],
    overrides: incoming.overrides && typeof incoming.overrides === 'object' ? { ...incoming.overrides } : {},
    actionOverrides:
      incoming.actionOverrides && typeof incoming.actionOverrides === 'object'
        ? { ...incoming.actionOverrides }
        : {},
  };
};

export const saveCreatureToSession = (state) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const normalized = normalizeCreatureState(state);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('Failed to save creature to session storage', error);
  }
};

export const loadCreatureFromSession = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return getDefaultCreatureState();
  }
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultCreatureState();
    }
    const parsed = JSON.parse(stored);
    return normalizeCreatureState(parsed);
  } catch (error) {
    console.warn('Failed to load creature from session storage', error);
    return getDefaultCreatureState();
  }
};

export const clearCreatureSession = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear creature session storage', error);
  }
};

