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
      category: 'action',
      actionType: 'Melee Spell Attack',
      costAP: 1,
      damageMod: 2,
      saveAttribute: 'Mig',
      saveDCMod: 2,
      damageType: 'fire',
      targetsDefense: 'PD',
      rangeValue: 1,
      rangeUnit: 'space',
      targetDescription: '1 creature',
      descriptionCore: 'Strike with fire.'
    };

    const result = calculateCreatureStats(inputs, [action], {});
    const displayAttack = result.Display.Combat.Attacks.find(a => a.name.startsWith('Fiery Strike'));
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

    const overrides = {
      'Combat_Attacks_0_damage_set': 8,
      'Combat_Attacks_0_name_set': 'Custom Attack',
      'Combat_Attacks_0_details_set': '8 physical damage vs PD. Target 1 creature within 1 space.'
    };

    const result = calculateCreatureStats(inputs, [], overrides);

    expect(result.FinalWithDeltas.DefaultAttacks[0].damage).toBe(8);
    const displayAttack = result.Display.Combat.Attacks[0];
    expect(displayAttack.name).toBe('Custom Attack (1 AP)');
    expect(displayAttack.details).toContain('8 physical damage');
  });
});
