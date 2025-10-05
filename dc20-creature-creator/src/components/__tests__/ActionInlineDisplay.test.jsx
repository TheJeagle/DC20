import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../EditableField.jsx', () => ({
    default: ({ value, children }) => (
        <span>
            {value}
            {children}
        </span>
    ),
}));

import ActionInlineDisplay from '../ActionInlineDisplay.jsx';

describe('ActionInlineDisplay', () => {
    it('renders derived attack damage without double-applying modifiers', () => {
        const action = {
            name: 'Sweeping Blow',
            cost: { ap: 2 },
            damage: { total: 1, modifier: -1, type: 'physical' },
            calculatedDamage: 1,
            damageType: 'physical',
            defense: 'AD',
            target: 'all creatures in a 3-space cone',
            range: '1 Space',
            summary: 'You swing your weapon in a wide arc, catching multiple foes.',
            isAttack: true,
        };

        const markup = renderToStaticMarkup(<ActionInlineDisplay action={action} />);

        expect(markup).toContain('1</span> <span>physical');
        expect(markup).not.toContain('0physical');
    });
});
