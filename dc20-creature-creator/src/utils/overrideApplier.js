import { deepClone } from './baseStats';

const isNumeric = (value) => typeof value === 'number' && Number.isFinite(value);

export const applyUserOverrides = (stats, userOverrideDeltas = {}) => {
  const working = deepClone(stats);
  const attackOverrides = [];

  Object.entries(userOverrideDeltas || {}).forEach(([fullOverrideKey, overrideStoredValue]) => {
    const attackMatch = fullOverrideKey.match(/^Combat_Attacks_(\d+)_(.+)_(delta|set)$/);
    if (attackMatch) {
      const [, idxStr, field, type] = attackMatch;
      attackOverrides.push({
        index: parseInt(idxStr, 10),
        field,
        type,
        value: overrideStoredValue,
      });
      return;
    }

    const parts = fullOverrideKey.split('_');
    const suffix = parts.pop();
    const fieldKey = parts.join('_');
    const [mainKey, subKey] = fieldKey.split('_');

    if (suffix === 'delta' && isNumeric(overrideStoredValue)) {
      if (
        subKey &&
        working[mainKey] &&
        typeof working[mainKey][subKey] === 'number'
      ) {
        working[mainKey][subKey] = (working[mainKey][subKey] || 0) + overrideStoredValue;
      } else if (
        Object.prototype.hasOwnProperty.call(working, mainKey) &&
        typeof working[mainKey] === 'number'
      ) {
        working[mainKey] = (working[mainKey] || 0) + overrideStoredValue;
      }
      return;
    }

    if (suffix === 'set') {
      if (
        subKey &&
        Object.prototype.hasOwnProperty.call(working, mainKey) &&
        typeof working[mainKey] === 'object' &&
        working[mainKey] !== null
      ) {
        working[mainKey][subKey] = overrideStoredValue;
      } else if (Object.prototype.hasOwnProperty.call(working, fieldKey)) {
        working[fieldKey] = overrideStoredValue;
      }
    }
  });

  return { stats: working, attackOverrides };
};

export const applyDefaultActionOverrides = (defaultAttacks, overrides = {}) => {
  const working = defaultAttacks.map((attack) => ({ ...attack }));

  Object.entries(overrides || {}).forEach(([idx, override]) => {
    const index = parseInt(idx, 10);
    if (!Number.isNaN(index) && working[index]) {
      working[index] = { ...working[index], ...override };
    }
  });

  return working;
};
