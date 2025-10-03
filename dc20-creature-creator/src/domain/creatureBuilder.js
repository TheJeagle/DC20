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

const mapDisplayAction = (action = {}, source = 'default') => {
  const cost = toCostObject(action);
  const target = action.target?.text || action.target || action.targetDescription || action.targets || '';
  const range =
    (action.range && typeof action.range === 'object'
      ? action.range.text || `${action.range.value || ''} ${action.range.unit || ''}`.trim()
      : action.range) || '';

  return {
    name: action.name || '',
    cost,
    costAP: cost.ap,
    costMP: cost.mp,
    costSP: cost.sp,
    damage: action.damage || { modifier: action.damageMod || 0, type: action.damageType },
    damageMod: action.damage?.modifier || action.damageMod || 0,
    save: action.save || null,
    saveDCMod: action.save?.dcMod || action.saveDCMod || 0,
    range,
    target,
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

