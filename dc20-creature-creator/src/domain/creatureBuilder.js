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

const createDisplayActions = (statBlock, selectedFeatures = []) => {
  const defaultActions = (statBlock?.FinalWithDeltas?.DefaultAttacks || []).map((attack) => ({
    name: attack.name,
    costAP: attack.costAP || 0,
    costMP: attack.costMP || 0,
    damageMod: 0,
    saveDCMod: 0,
    range: attack.range || '',
    targets: attack.targetDescription || '',
    actionType: attack.type || '',
    description: attack.details || '',
    source: 'default',
  }));

  const featureActions = (selectedFeatures || [])
    .filter((feature) => feature && feature.category === 'action')
    .map((feature) => ({
      name: feature.name,
      costAP: feature.costAP || 0,
      costMP: feature.costMP || 0,
      damageMod: feature.damageMod || 0,
      saveDCMod: feature.saveDCMod || 0,
      range: feature.range || '',
      targets: feature.targets || '',
      actionType: feature.actionType || '',
      description: feature.descriptionCore || feature.description || '',
      source: 'feature',
      id: feature.id,
    }));

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

