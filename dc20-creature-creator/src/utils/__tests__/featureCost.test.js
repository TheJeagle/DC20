import { describe, expect, it } from 'vitest';
import { normalizeFeatureBalanceCost, sumFeatureBalanceCost } from '../featureCost';

describe('feature cost helpers', () => {
  it('normalizes numeric values directly', () => {
    expect(normalizeFeatureBalanceCost({ balanceCost: 2 })).toBe(2);
  });

  it('defaults to 1 when value missing', () => {
    expect(normalizeFeatureBalanceCost({})).toBe(1);
  });

  it('parses string values and clamps negatives to zero', () => {
    expect(normalizeFeatureBalanceCost({ balanceCost: '3.5' })).toBe(3.5);
    expect(normalizeFeatureBalanceCost({ balanceCost: '-2' })).toBe(0);
  });

  it('sums an array of features with defaults', () => {
    const features = [
      { balanceCost: 2 },
      { balanceCost: '1' },
      {},
    ];
    expect(sumFeatureBalanceCost(features)).toBe(2 + 1 + 1);
  });

  it('returns 0 when given a non-array', () => {
    expect(sumFeatureBalanceCost(null)).toBe(0);
    expect(sumFeatureBalanceCost(undefined)).toBe(0);
  });
});
