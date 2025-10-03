import { calculateBaseStats, finalizeDerivedValues, deepClone } from './baseStats';
import { attributeScoresByLevel } from '../data/gameRules';
import { sumFeatureBalanceCost } from './featureCost';

const powerCostMultipliers = {
  minion: 0.5,
  weak: 0.75,
  normal: 1,
  apex: 1.5,
  legendary: 2,
};

const METRIC_DEFINITIONS = [
  {
    id: 'hp',
    key: 'HP',
    label: 'Hit Points',
    soft: { pct: 0.2, abs: 4 },
    hard: { pct: 0.3, abs: 6 },
  },
  {
    id: 'pd',
    key: 'PD',
    label: 'Precision Defense',
    soft: { abs: 2 },
    hard: { abs: 4 },

  },
  {
    id: 'ad',
    key: 'AD',
    label: 'Area Defense',

    soft: { abs: 2 },
    hard: { abs: 4 },
  },
  {
    id: 'check',
    key: 'Check',
    label: 'To Hit Bonus',
    soft: { abs: 1 },
    hard: { abs: 2 },
  },
  {
    id: 'damage',
    key: 'Damage',
    label: 'Base Damage',
    soft: { pct: 0.15, abs: 1 },
    hard: { pct: 0.25, abs: 2 },
  },
  {
    id: 'savedc',
    key: 'SaveDC',
    label: 'Save DC',
    soft: { abs: 1 },
    hard: { abs: 2 },
  },
];

const halfStep = (value) => Math.round(value * 2) / 2;

export const getFeatureCostBudget = (level = 0, power = 'normal') => {
  const normalizedLevel = Number.isFinite(level) ? Math.max(0, level) : 0;
  const baseBudget = normalizedLevel + 2; // Normal power expectation scales directly with level
  const lowerBand = Math.max(0, baseBudget - 1);
  const upperBand = baseBudget + 1;

  const multiplier = powerCostMultipliers[power?.toLowerCase?.() || 'normal'] ?? 1;

  const expected = halfStep(baseBudget * multiplier);
  const min = halfStep(lowerBand * multiplier);
  const max = halfStep(Math.max(lowerBand, upperBand) * multiplier);

  return {
    expected,
    min,
    max,
  };
};

const evaluateStatMetric = (definition, actualValue, baselineValue) => {
  const { id, label } = definition;
  const safeActual = typeof actualValue === 'number' ? actualValue : null;
  const safeBaseline = typeof baselineValue === 'number' ? baselineValue : null;

  if (safeActual === null || safeBaseline === null) {
    return {
      id,
      label,
      actual: safeActual,
      baseline: safeBaseline,
      delta: null,
      percentDelta: null,
      direction: 'unknown',
      tone: 'ok',
      exceedsHard: false,
    };
  }

  const delta = safeActual - safeBaseline;
  const absDelta = Math.abs(delta);

  const softLimitPct = (definition.soft?.pct || 0) * safeBaseline;
  const softLimitAbs = definition.soft?.abs ?? 0;
  const hardLimitPct = (definition.hard?.pct || 0) * safeBaseline;
  const hardLimitAbs = definition.hard?.abs ?? 0;

  const softLimit = Math.max(softLimitPct, softLimitAbs);
  const hardLimit = Math.max(hardLimitPct, hardLimitAbs);

  let tone = 'ok';
  let direction = 'ok';
  let exceedsHard = false;

  if (hardLimit > 0 && absDelta >= hardLimit) {
    tone = 'critical';
    direction = delta > 0 ? 'high' : 'low';
    exceedsHard = true;
  } else if (softLimit > 0 && absDelta >= softLimit) {
    tone = 'warning';
    direction = delta > 0 ? 'high' : 'low';
  }

  return {
    id,
    label,
    actual: safeActual,
    baseline: safeBaseline,
    delta,
    percentDelta: safeBaseline !== 0 ? (delta / safeBaseline) * 100 : null,
    direction,
    tone,
    exceedsHard,
  };
};

const describeSignals = (signals) =>
  signals
    .map((signal) => signal.label || signal.attribute || signal.name)
    .filter(Boolean)
    .join(', ');

const evaluateAttributes = (actualStats, baselineStats, level) => {
  const attributeEntry = attributeScoresByLevel
    .slice()
    .reverse()
    .find((entry) => typeof level === 'number' && level >= entry.level) || attributeScoresByLevel[0];

  const expectedScores = attributeEntry?.scores || [0, 0, 0, 0];
  const expectedTotal = expectedScores.slice(0, 4).reduce((sum, value) => sum + value, 0);
  const expectedMax = Math.max(...expectedScores.slice(0, 4));

  const actualAttributes = actualStats?.Attributes || {};
  const attributeKeys = ['Mig', 'Agi', 'Int', 'Cha'];
  const actualValues = attributeKeys.map((key) => actualAttributes[key] ?? 0);
  const actualTotal = actualValues.reduce((sum, value) => sum + value, 0);
  const actualMax = Math.max(...actualValues);

  const totalDelta = actualTotal - expectedTotal;
  const maxDelta = actualMax - expectedMax;

  const totalTone = Math.abs(totalDelta) >= 2 ? 'critical' : Math.abs(totalDelta) >= 1 ? 'warning' : 'ok';
  const maxTone = Math.abs(maxDelta) >= 2 ? 'critical' : Math.abs(maxDelta) >= 1 ? 'warning' : 'ok';

  const totalDirection = totalDelta > 0 ? 'high' : totalDelta < 0 ? 'low' : 'ok';
  const maxDirection = maxDelta > 0 ? 'high' : maxDelta < 0 ? 'low' : 'ok';


  return {
    total: {
      id: 'attribute-total',
      actual: actualTotal,
      baseline: expectedTotal,

      expected: expectedTotal,
      delta: totalDelta,
      tone: totalTone,
      direction: totalDirection,
      label: 'Attribute Total',
    },
    max: {

      id: 'attribute-max',
      actual: actualMax,
      baseline: expectedMax,
      expected: expectedMax,
      delta: maxDelta,
      tone: maxTone,
      direction: maxDirection,
      label: 'Highest Attribute',
    },
  };
};

const evaluateFeatureCost = (totalCost, budget) => {
  const delta = totalCost - budget.expected;
  const direction = delta > 0 ? 'high' : delta < 0 ? 'low' : 'ok';

  let tone = 'ok';
  let status = 'ok';

  if (totalCost > budget.max) {
    status = 'over';
    const excess = totalCost - budget.max;
    const tolerance = Math.max(1, budget.max - budget.min);
    tone = excess >= tolerance ? 'critical' : 'warning';
  } else if (totalCost < budget.min) {
    status = 'under';
    const shortage = budget.min - totalCost;
    const tolerance = Math.max(1, budget.max - budget.min);
    tone = shortage >= tolerance ? 'critical' : 'warning';
  }

  return {
    label: 'Feature Cost',
    total: totalCost,
    budget,
    delta,
    direction,
    tone,
    status,
  };
};

const evaluateAttackCoverage = (creatureStats, selectedFeatures = []) => {
  const defTargets = new Set();

  const registerDefense = (value) => {
    if (typeof value !== 'string') return;
    const clean = value.trim().toUpperCase();
    if (clean) {
      defTargets.add(clean);
    }
  };

  const iterateActions = (actions) => {
    if (!Array.isArray(actions)) return;
    actions.forEach((action) => {
      if (!action || typeof action !== 'object') return;
      registerDefense(action.targetsDefense || action.targets_defense || action.defenseTarget);
    });
  };

  iterateActions(creatureStats?.DefaultAttacks);
  iterateActions(creatureStats?.CombatActions);
  iterateActions(creatureStats?.ApexActions);
  iterateActions(creatureStats?.Reactions);

  selectedFeatures
    .filter((feature) => feature && (feature.kind || feature.category) === 'action')
    .forEach((feature) => registerDefense(feature.defense || feature.targetsDefense));

  const hasPD = defTargets.has('PD');
  const hasAD = defTargets.has('AD');

  let tone = 'ok';
  const missing = [];
  if (!hasPD) missing.push('an attack targeting PD');
  if (!hasAD) missing.push('an attack targeting AD');
  if (missing.length > 0) {
    tone = 'warning';
  }

  return {
    hasPD,
    hasAD,
    tone,
    missing,
    message:
      missing.length === 0
        ? 'This creature pressures both PD and AD.'
        : `Add ${missing.join(' and ')} to keep defenses balanced.`,
  };
};

export const evaluateBalance = ({ inputs, selectedFeatures = [], creature }) => {
  if (!inputs) {
    return null;
  }

  const { stats: baselineStatsRaw, context } = calculateBaseStats(inputs);
  const baselineStats = finalizeDerivedValues(deepClone(baselineStatsRaw), context);

  const actualContainer = creature || {};
  const actualStats = actualContainer.raw || actualContainer;

  const metrics = METRIC_DEFINITIONS.map((definition) =>
    evaluateStatMetric(definition, actualStats?.[definition.key], baselineStats?.[definition.key])
  );

  const featureCostTotal = sumFeatureBalanceCost(selectedFeatures);
  const featureBudget = getFeatureCostBudget(inputs.level, inputs.power);
  const featureCost = evaluateFeatureCost(featureCostTotal, featureBudget);

  const attributeSummary = evaluateAttributes(actualStats, baselineStats, inputs.level);

  const attackCoverage = evaluateAttackCoverage(actualStats, selectedFeatures);

  const highSignals = [];
  const lowSignals = [];

  metrics.forEach((metric) => {
    if (metric.direction === 'high' && metric.tone !== 'ok') {
      highSignals.push(metric);
    } else if (metric.direction === 'low' && metric.tone !== 'ok') {
      lowSignals.push(metric);
    }
  });

  if (featureCost.direction === 'high' && featureCost.tone !== 'ok') {
    highSignals.push(featureCost);
  } else if (featureCost.direction === 'low' && featureCost.tone !== 'ok') {
    lowSignals.push(featureCost);
  }

  [attributeSummary.total, attributeSummary.max].forEach((summary) => {
    if (summary.tone !== 'ok') {
      if (summary.direction === 'high') {
        highSignals.push(summary);
      } else if (summary.direction === 'low') {
        lowSignals.push(summary);
      }
    }
  });

  const highCritical = highSignals.some((signal) => signal.tone === 'critical' || signal.exceedsHard);
  const lowCritical = lowSignals.some((signal) => signal.tone === 'critical' || signal.exceedsHard);

  const overall = { status: 'on-target', tone: 'ok', message: 'Creature is within expected ranges.', details: [] };

  if (highCritical) {
    overall.status = 'likely-too-strong';
    overall.tone = 'critical';
    overall.message = 'Likely too strong for its level.';
    overall.details.push(`High metrics: ${describeSignals(highSignals)}.`);
  } else if (lowCritical) {
    overall.status = 'likely-too-weak';
    overall.tone = 'critical';
    overall.message = 'Likely too weak for its level.';
    overall.details.push(`Low metrics: ${describeSignals(lowSignals)}.`);
  } else if (highSignals.length >= 2) {
    overall.status = 'likely-too-strong';
    overall.tone = 'warning';
    overall.message = 'Multiple metrics suggest this creature punches above its weight.';
    overall.details.push(`Above baseline: ${describeSignals(highSignals)}.`);
  } else if (lowSignals.length >= 2) {
    overall.status = 'likely-too-weak';
    overall.tone = 'warning';
    overall.message = 'Multiple metrics suggest this creature falls below expectations.';
    overall.details.push(`Below baseline: ${describeSignals(lowSignals)}.`);
  } else if (highSignals.length === 1) {
    overall.status = 'slightly-above';
    overall.tone = 'warning';
    overall.message = `Slightly above curve because ${describeSignals(highSignals)} is high.`;
  } else if (lowSignals.length === 1) {
    overall.status = 'slightly-below';
    overall.tone = 'warning';
    overall.message = `Slightly below curve because ${describeSignals(lowSignals)} is low.`;
  }

  if (attackCoverage.tone === 'warning') {
    overall.details.push('Ensure the creature can pressure both PD and AD.');
  }

  return {
    metrics,
    featureCost,
    attributeSummary,
    attackCoverage,
    overall,
  };
};
