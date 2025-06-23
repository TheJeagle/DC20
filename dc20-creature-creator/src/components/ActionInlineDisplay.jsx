import React, { useState } from 'react';
import EditableField from './EditableField';

const ActionInlineDisplay = ({ action, onSaveField }) => {
    const [isEditingDefense, setIsEditingDefense] = useState(false);

    if (!action) return null;

    const {
        name = '',
        costAP = 0,
        costMP = 0,
        damage,
        calculatedDamage,
        damageType = 'damage',
        targetsDefense = 'PD',
        targetDescription = 'target',
        range,
        rangeValue,
        rangeUnit,
        details = '',
    } = action;

    const finalDamage = typeof damage === 'number' ? damage : (typeof calculatedDamage === 'number' ? calculatedDamage : '');

    let rangeDisplay = range;
    if (!rangeDisplay && rangeValue) {
        rangeDisplay = `${rangeValue} ${rangeUnit || ''}`.trim();
    }

    const handleSave = (field, value) => {
        if (onSaveField) onSaveField(field, value);
    };

    const renderCost = () => {
        if (costAP === 0 && costMP === 0) return <span>Free</span>;

        const parts = [];
        if (costAP > 0) parts.push(`${costAP} AP`);
        if (costMP > 0) parts.push(`${costMP} MP`);
        const costString = parts.join(' + ');

        const onCostSave = (field, val) => {
            const apMatch = val.match(/(\d+)\s*AP/i);
            const mpMatch = val.match(/(\d+)\s*MP/i);
            const parsedAP = apMatch ? parseInt(apMatch[1], 10) : 0;
            const parsedMP = mpMatch ? parseInt(mpMatch[1], 10) : 0;
            if (onSaveField) {
                onSaveField('costAP', parsedAP);
                onSaveField('costMP', parsedMP);
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
                value={damageType}
                onSave={(f, val) => handleSave('damageType', val)}
                fieldType="text"
                className="editable-description-field"
            />{' '}
            damage vs{' '}
            {isEditingDefense ? (
                <select
                    value={targetsDefense}
                    onChange={(e) => {
                        handleSave('targetsDefense', e.target.value);
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
                    {targetsDefense}
                </span>
            )}
            . Target{' '}
            <EditableField
                value={targetDescription}
                onSave={(f, val) => handleSave('targetDescription', val)}
                fieldType="text"
                className="editable-description-field"
            />{' '}
            within{' '}
            <EditableField
                value={rangeDisplay}
                onSave={(f, val) => handleSave('range', val)}
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
