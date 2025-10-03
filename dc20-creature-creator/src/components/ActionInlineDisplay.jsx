import React, { useState } from 'react';
import EditableField from './EditableField';

const ActionInlineDisplay = ({ action, onSaveField }) => {
    const [isEditingDefense, setIsEditingDefense] = useState(false);

    if (!action) return null;

    const {
        name = '',
        cost,
        costAP = 0,
        costMP = 0,
        costSP = 0,
        damage,
        damageMod,
        damageType: legacyDamageType,
        defense: providedDefense,
        targetsDefense,
        target,
        targetDescription,
        range,
        rangeValue,
        rangeUnit,
        summary,
        details = '',
        category,
        kind,
    } = action;

    const effectiveCost = (() => {
        if (cost && typeof cost === 'object') return cost;
        const legacy = {};
        if (costAP > 0) legacy.ap = costAP;
        if (costMP > 0) legacy.mp = costMP;
        if (costSP > 0) legacy.sp = costSP;
        return legacy;
    })();

    const damageModifier = typeof damage?.modifier === 'number'
        ? damage.modifier
        : (typeof damageMod === 'number' ? damageMod : 0);
    const damageType = damage?.type || legacyDamageType || 'damage';
    const defense = providedDefense || targetsDefense || 'PD';
    const targetText = target || targetDescription || 'target';
    const summaryText = summary || details || '';

    const parseRangeValue = () => {
        if (typeof range === 'number') return range;
        if (typeof range === 'string') {
            const match = range.match(/(\d+)/);
            if (match) return parseInt(match[1], 10);
        }
        if (typeof rangeValue === 'number') return rangeValue;
        if (typeof rangeValue === 'string') {
            const match = rangeValue.match(/(\d+)/);
            if (match) return parseInt(match[1], 10);
        }
        return null;
    };

    const normalizedRange = parseRangeValue();
    const rangeDisplayValue = typeof normalizedRange === 'number' ? normalizedRange : '';
    const showWithinRange = typeof normalizedRange === 'number' && normalizedRange > 0;
    const defaultRangeText = (!showWithinRange && defense === 'AD') ? 'around yourself' : '';

    const handleSave = (field, value) => {
        if (onSaveField) onSaveField(field, value);
    };

    const renderCost = () => {
        const entries = Object.entries(effectiveCost || {}).filter(([, amount]) => amount > 0);
        let costString = entries
            .map(([resource, amount]) => `${amount} ${resource.toUpperCase()}`)
            .join(', ');

        if (!costString) {
            const isReaction = (category && category === 'reaction') || (kind && kind === 'reaction');
            costString = isReaction ? 'Reaction' : 'Free';
        }

        const parseCostString = (input) => {
            const result = {};
            const regex = /(\d+)\s*(AP|MP|SP)/gi;
            let match;
            while ((match = regex.exec(input)) !== null) {
                const amount = parseInt(match[1], 10);
                if (!Number.isNaN(amount) && amount > 0) {
                    result[match[2].toLowerCase()] = amount;
                }
            }
            return result;
        };

        const onCostSave = (field, val) => {
            if (!onSaveField) return;
            const parsed = parseCostString(val || '');
            onSaveField('cost', Object.keys(parsed).length > 0 ? parsed : null);
        };

        return (
            <EditableField
                value={costString}
                onSave={onCostSave}
                fieldType="text"
                className="editable-number-field"
            />
        );
    };

    return (
        <p>
            <EditableField
                value={name}
                onSave={(f, val) => handleSave('name', val)}
                fieldType="text"
                className="editable-name-field"
            />{' '}
            (
            <strong>{renderCost()}</strong>
            ):
            {' '}
            base damage {damageModifier >= 0 ? '+' : ''}
            <EditableField
                value={damageModifier}
                onSave={(f, val) => handleSave('damage.modifier', val)}
                fieldType="number"
                className="editable-description-field"
            />{' '}
            <EditableField
                value={damageType}
                onSave={(f, val) => handleSave('damage.type', val)}
                fieldType="text"
                className="editable-description-field"
            />{' '}
            damage vs{' '}
            {isEditingDefense ? (
                <select
                    value={defense}
                    onChange={(e) => {
                        handleSave('defense', e.target.value);
                        setIsEditingDefense(false);
                    }}
                    onBlur={() => setIsEditingDefense(false)}
                    className="editable-select"
                >
                    <option value="PD">PD</option>
                    <option value="AD">AD</option>
                </select>
            ) : (
                <span
                    onDoubleClick={() => setIsEditingDefense(true)}
                    className="editable-select-span"
                >
                    {defense}
                </span>
            )}
            . Target{' '}
            <EditableField
                value={targetText}
                onSave={(f, val) => handleSave('target', val)}
                fieldType="text"
                className="editable-description-field"
            />{' '}
            {showWithinRange ? (
                <>
                    within{' '}
                    <EditableField
                        value={rangeDisplayValue}
                        onSave={(f, val) => handleSave('range', val)}
                        fieldType="text"
                        className="editable-description-field"
                    />{' '}
                    spaces
                </>
            ) : (
                defaultRangeText ? ` ${defaultRangeText}` : ''
            )}
            .
            {summaryText && (
                <>
                    <br />
                    <EditableField
                        value={summaryText}
                        onSave={(f, val) => handleSave('summary', val)}
                        fieldType="text"
                        className="editable-description-field"
                    />
                </>
            )}
        </p>
    );
};

export default ActionInlineDisplay;
