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
    const final = result.raw;

    expect(final).toBeDefined();
    expect(final.HP).toBe(10);
    expect(final.PD).toBe(12);
    expect(final.AD).toBe(12);
    expect(final.Check).toBe(4);
    expect(final.Damage).toBe(2);
    expect(final.AP).toBe(4);
    expect(final.Speed).toBe(5);
    expect(final.MaxMP).toBe(0);
    expect(final.Attributes).toEqual({ Mig: 3, Agi: 2, Cha: 1, Int: -2, Prime: 3 });
    expect(final.Saves).toEqual({ Mig: 4, Agi: 3, Cha: 2, Int: -1 });
    expect(result.display.PD).toBe('12 (17/22)');
    expect(result.display.Combat.Check).toBe('+4');
    expect(result.display.Combat.AP).toBe('4');
    expect(result.display.Combat.Speed).toBe('5');
  });


  it('applies damageMod and saveDCMod in action descriptions', () => {
    const inputs = {
      level: 1,
      power: 'normal',
      role: 'none',
      type: 'beast',
      size: 'medium',
      creatureName: 'Mod Test'
    };

    const action = {
      name: 'Fiery Strike',
      kind: 'action',
      method: 'Melee Spell Attack',
      cost: { ap: 1 },
      damage: { bonus: 2, type: 'fire', base: null },
      save: { attribute: 'Mig', dcMod: 2, effect: '' },
      defense: 'PD',
      range: 'melee',
      target: '1 creature',
      summary: 'Strike with fire.'
    };

    const result = calculateCreatureStats(inputs, [action], {});
    const displayAttack = result.display.Combat.Attacks.find(a => a.name.startsWith('Fiery Strike'));
    expect(displayAttack).toBeDefined();
    expect(displayAttack.details).toContain('4 fire damage vs PD.');
    expect(displayAttack.details).toContain('DC 16');

  });

  it('applies overrides to default attacks', () => {
    const inputs = {
      level: 1,
      power: 'normal',
      role: 'none',
      type: 'beast',
      size: 'medium',
      creatureName: 'Override Test'
    };

    const actionOverrides = {
      0: {
        damage: 8,
        name: 'Custom Attack',
        details: '8 physical damage vs PD. Target 1 creature within 1 space.'
      }
    };

    const result = calculateCreatureStats(inputs, [], {}, actionOverrides);

    expect(result.raw.DefaultAttacks[0].damage).toBe(8);
    const displayAttack = result.display.Combat.Attacks[0];
    expect(displayAttack.name).toBe('Custom Attack');
    expect(displayAttack.details).toContain('8 physical damage');
  });

  it('assigns LAP and formats apex actions', () => {
    const inputs = {
      level: 1,
      power: 'apex',
      role: 'none',
      type: 'beast',
      size: 'medium',
      creatureName: 'Apex Test'
    };

    const apexAction = {
      id: 'apex_test_action',
      name: 'Tail Sweep',
      kind: 'apex_action',
      cost: { ap: 1 },
      summary: 'Swipe your tail at a foe.',
      method: 'Melee Attack',
      range: 'melee',
      target: '1 creature'
    };

    const result = calculateCreatureStats(inputs, [apexAction], {});
    expect(result.raw.LAP).toBe(3);
    expect(result.display.Combat.LAP).toBe('3');
    const aa = result.display.ApexActions.find(a => a.name.startsWith('Tail Sweep'));
    expect(aa).toBeDefined();
    expect(aa.details).toContain('Swipe your tail');
  });
});
