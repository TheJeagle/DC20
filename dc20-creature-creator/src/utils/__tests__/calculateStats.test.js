import { describe, it, expect } from 'vitest';
import { calculateCreatureStats } from '../calculateStats.jsx';

describe('calculateCreatureStats', () => {
  it('returns expected base stats and structure for minimal inputs', () => {
    const inputs = {
      level: 1,
      power: 'normal',
      role: 'none',
      type: 'beast',
      size: 'medium',
      creatureName: 'Test Creature'
    };

    const result = calculateCreatureStats(inputs, [], {});
    const final = result.FinalWithDeltas;

    expect(final).toBeDefined();
    expect(final.HP).toBe(10);
    expect(final.PD).toBe(12);
    expect(final.AD).toBe(9);
    expect(final.Check).toBe(4);
    expect(final.Damage).toBe(2);
    expect(final.AP).toBe(4);
    expect(final.Speed).toBe(5);
    expect(final.MaxMP).toBe(0);
    expect(final.Attributes).toEqual({ Mig: 3, Agi: 2, Cha: 1, Int: -2, Prime: 3 });
    expect(final.Saves).toEqual({ Mig: 4, Agi: 3, Cha: 2, Int: -1 });
    expect(result.Display.PD).toBe('12 (17/22)');
    expect(result.Display.Combat.Check).toBe('+4');
    expect(result.Display.Combat.AP).toBe('4');
    expect(result.Display.Combat.Speed).toBe('5');
  });
});
