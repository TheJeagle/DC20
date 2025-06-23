import React from 'react';
import EditableField from './EditableField';

const ActionInlineDisplay = ({ action, onSaveField }) => {
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
        return (
            <>
                {costAP > 0 && (
                    <>
                        <EditableField
                            value={costAP}
                            onSave={(f, val) => handleSave('costAP', val)}
                            fieldType="number"
                            className="editable-number-field"
                        />{' '}
                        AP
                    </>
                )}
                {costAP > 0 && costMP > 0 && ' + '}
                {costMP > 0 && (
                    <>
                        <EditableField
                            value={costMP}
                            onSave={(f, val) => handleSave('costMP', val)}
                            fieldType="number"
                            className="editable-number-field"
                        />{' '}
                        MP
                    </>
                )}
            </>
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
            {renderCost()}
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
            <select
                value={targetsDefense}
                onChange={(e) => handleSave('targetsDefense', e.target.value)}
                className="editable-description-field"
            >
                <option value="PD">PD</option>
                <option value="AD">AD</option>
            </select>
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
        </p>
    );
};

export default ActionInlineDisplay;
