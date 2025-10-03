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
        details = '',
    } = action;

    const resolvedDamageType = damage?.type || damageType || 'damage';
    const resolvedDefense = defense || targetsDefense || 'PD';
    const finalDamage = (() => {
        if (typeof calculatedDamage === 'number') return Math.ceil(calculatedDamage);
        if (typeof damage?.total === 'number') return Math.ceil(damage.total);
        if (typeof damage?.base === 'number') return Math.ceil(damage.base + (damage.modifier || 0));
        if (typeof damage === 'number') return Math.ceil(damage);
        return '';
    })();

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
            const apMatch = val.match(/(\d+)\s*AP/i);
            const mpMatch = val.match(/(\d+)\s*MP/i);
            const spMatch = val.match(/(\d+)\s*SP/i);
            const parsedAP = apMatch ? parseInt(apMatch[1], 10) : 0;
            const parsedMP = mpMatch ? parseInt(mpMatch[1], 10) : 0;
            const parsedSP = spMatch ? parseInt(spMatch[1], 10) : 0;
            if (onSaveField) {
                onSaveField('cost.ap', parsedAP);
                onSaveField('cost.mp', parsedMP);
                onSaveField('cost.sp', parsedSP);
            }
        };

        return (
            <strong>
                <EditableField
                    value={costString}
                    onSave={onCostSave}
                    fieldType="text"
                    className="editable-number-field"
                />
            </strong>
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
            <EditableField
                value={finalDamage}
                onSave={(f, val) => handleSave('damage', val)}
                fieldType="number"
                className="editable-description-field"
            />{' '}
            <EditableField
                value={resolvedDamageType}
                onSave={(f, val) => handleSave('damageType', val)}
                fieldType="text"
                className="editable-description-field"
            />{' '}
            damage vs{' '}
            {isEditingDefense ? (
                <select
                    value={targetsDefense}
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
                        value={details}
                        onSave={(f, val) => handleSave('details', val)}
                        fieldType="text"
                        className="editable-description-field"
                    />
                </>
            )}
        </p>
    );
};

export default ActionInlineDisplay;
