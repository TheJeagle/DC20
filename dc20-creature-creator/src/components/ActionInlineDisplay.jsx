import React, { useState } from 'react';
import EditableField from './EditableField';

const ActionInlineDisplay = ({ action, onSaveField }) => {
    const [isEditingDefense, setIsEditingDefense] = useState(false);

    if (!action) return null;

    const {
        name = '',
        cost = {},
        damage,
        calculatedDamage,
        damageType,
        defense,
        targetsDefense,
        target,
        targetDescription,
        range,
        rangeValue,
        rangeUnit,
        summary,
        details = '',
    } = action;

    const resolvedDamageType = damage?.type || damageType || 'damage';
    const damageModifier = (() => {
        if (typeof damage?.modifier === 'number') return damage.modifier;
        if (typeof damage?.modifier === 'string') return damage.modifier;
        if (typeof action.damageMod === 'number') return action.damageMod;
        if (typeof action.damageMod === 'string') return action.damageMod;
        return 0;
    })();
    const numericDamageModifier = Number(damageModifier);
    const modifierIsNumeric = !Number.isNaN(numericDamageModifier);
    const resolvedDamageAmount = (() => {
        if (typeof calculatedDamage === 'number' && Number.isFinite(calculatedDamage)) {
            return calculatedDamage;
        }
        if (typeof damage?.total === 'number' && Number.isFinite(damage.total)) {
            return damage.total;
        }
        if (
            typeof damage?.base === 'number'
            && modifierIsNumeric
            && Number.isFinite(damage.base + numericDamageModifier)
        ) {
            return Math.ceil(damage.base + numericDamageModifier);
        }
        return null;
    })();
    const damageModifierPrefix = modifierIsNumeric
        ? numericDamageModifier >= 0
            ? '+'
            : ''
        : '';
    const resolvedDefense = defense || targetsDefense || 'PD';
    const rangeDisplay = (() => {
        if (typeof range === 'string') return range;
        if (range && typeof range === 'object') return range.text || `${range.value || ''} ${range.unit || ''}`.trim();
        if (rangeValue) return `${rangeValue} ${rangeUnit || ''}`.trim();
        return '';
    })();

    const targetDisplay = (() => {
        if (typeof target === 'string') return target;
        if (target && typeof target === 'object') return target.text || target.summary || target.description || '';
        if (targetDescription) return targetDescription;
        return 'target';
    })();

    const handleSave = (field, value) => {
        if (onSaveField) onSaveField(field, value);
    };

    const parseCostString = (value) => {
        const result = {};
        if (!value) return result;

        const normalized = value.trim();
        if (!normalized) return result;

        const apMatch = normalized.match(/(\d+)\s*AP\b/i);
        const mpMatch = normalized.match(/(\d+)\s*MP\b/i);
        const spMatch = normalized.match(/(\d+)\s*SP\b/i);

        if (apMatch) result.ap = parseInt(apMatch[1], 10);
        if (mpMatch) result.mp = parseInt(mpMatch[1], 10);
        if (spMatch) result.sp = parseInt(spMatch[1], 10);

        const remainder = normalized
            .replace(/(\d+)\s*AP\b/gi, '')
            .replace(/(\d+)\s*MP\b/gi, '')
            .replace(/(\d+)\s*SP\b/gi, '')
            .replace(/\+/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (remainder) {
            if (!('ap' in result) && !('mp' in result) && !('sp' in result)) {
                result.summary = remainder;
            } else {
                result.special = remainder;
            }
        }

        return result;
    };

    const renderCost = () => {
        const ap = typeof cost.ap === 'number' ? cost.ap : action.costAP || 0;
        const mp = typeof cost.mp === 'number' ? cost.mp : action.costMP || 0;
        const sp = typeof cost.sp === 'number' ? cost.sp : action.costSP || 0;
        const summary = typeof cost.summary === 'string' && cost.summary.trim() ? cost.summary.trim() : '';
        if (summary) return <span>{summary}</span>;
        if (ap === 0 && mp === 0 && sp === 0) return <span>Free</span>;
        const parts = [];
        if (ap > 0) parts.push(`${ap} AP`);
        if (mp > 0) parts.push(`${mp} MP`);
        if (sp > 0) parts.push(`${sp} SP`);
        if (cost.special) parts.push(cost.special);
        const costString = parts.join(' + ');

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
            {typeof resolvedDamageAmount === 'number' ? (
                <>
                    {resolvedDamageAmount} ({damageModifierPrefix}
                </>
            ) : (
                <>
                    base damage {damageModifierPrefix}
                </>
            )}
            <EditableField
                value={damageModifier}
                onSave={(f, val) => handleSave('damage.modifier', val)}
                fieldType="number"
                className="editable-description-field"
            />
            {typeof resolvedDamageAmount === 'number' ? ') ' : ' '}
            <EditableField
                value={resolvedDamageType}
                onSave={(f, val) => handleSave('damageType', val)}
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
                    {resolvedDefense}
                </span>
            )}
            . Target{' '}
            <EditableField
                value={targetDisplay}
                onSave={(f, val) => handleSave('target.text', val)}
                fieldType="text"
                className="editable-description-field"
            />{' '}
            within{' '}
            <EditableField
                value={rangeDisplay}
                onSave={(f, val) => handleSave('range.text', val)}
                fieldType="text"
                className="editable-description-field"
            />.
            {details && (
                <>
                    <br />
                    <EditableField
                        value={summary || ''}
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
