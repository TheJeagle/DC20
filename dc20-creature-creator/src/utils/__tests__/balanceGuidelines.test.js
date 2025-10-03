import { describe, expect, it } from 'vitest';
import { calculateBaseStats, finalizeDerivedValues, deepClone } from '../baseStats';
import { evaluateBalance, getFeatureCostBudget } from '../balanceGuidelines';

const buildBaselineCreature = (inputs) => {
  const { stats, context } = calculateBaseStats(inputs);
  finalizeDerivedValues(stats, context);
  const base = deepClone(stats);
  base.DefaultAttacks = [
    { name: 'Melee Attack', targetsDefense: 'PD' },
    { name: 'Ranged Attack', targetsDefense: 'AD' },
  ];
  base.CombatActions = [];
  base.ApexActions = [];
  base.Reactions = [];
  return base;
};

describe('getFeatureCostBudget', () => {
  it('scales the expected range by power tier', () => {
    const normal = getFeatureCostBudget(5, 'Normal');
    const legendary = getFeatureCostBudget(5, 'Legendary');

    expect(normal.expected).toBe(3);
    expect(normal.min).toBe(2);
    expect(normal.max).toBe(4);

    expect(legendary.expected).toBe(6);
    expect(legendary.min).toBe(4);
    expect(legendary.max).toBe(8);
  });
});

describe('evaluateBalance', () => {
  const baseInputs = {
    level: 3,
    power: 'Normal',
    role: 'none',
    type: 'undead',
    size: 'medium',
  };

  it('reports on-target when stats and feature cost are within expectations', () => {
    const baseline = buildBaselineCreature(baseInputs);
    const selectedFeatures = Array.from({ length: 2 }, (_, index) => ({
      id: `feat-${index}`,
      balanceCost: 1,
      kind: 'feature',
    }));

    const report = evaluateBalance({
      inputs: baseInputs,
      selectedFeatures,
      creature: { raw: baseline },
    });

    expect(report.overall.status).toBe('on-target');
    expect(report.featureCost.status).toBe('ok');
    expect(report.metrics.every((metric) => metric.tone === 'ok')).toBe(true);
    expect(report.attackCoverage.tone).toBe('ok');
  });

  it('flags multiple high deviations and missing AD coverage', () => {
    const baseline = buildBaselineCreature(baseInputs);
    const boosted = {
      ...baseline,
      HP: baseline.HP + 20,
      PD: baseline.PD + 4,
      Attributes: {
        ...baseline.Attributes,
        Mig: (baseline.Attributes.Mig || 0) + 3,
      },
      Saves: {
        ...baseline.Saves,
        Mig: (baseline.Saves.Mig || 0) + 4,
      },
      DefaultAttacks: [{ name: 'Melee Attack', targetsDefense: 'PD' }],
    };

    const selectedFeatures = [
      { id: 'feat-over', balanceCost: 5, kind: 'feature' },
      { id: 'feat-over-2', balanceCost: 5, kind: 'feature' },
    ];

    const report = evaluateBalance({
      inputs: baseInputs,
      selectedFeatures,
      creature: { raw: boosted },
    });

    expect(report.featureCost.status).toBe('over');
    expect(report.attributeSummary.total.direction).toBe('high');
    expect(report.attackCoverage.tone).toBe('warning');
    expect(report.overall.status).toBe('likely-too-strong');
  });
});
