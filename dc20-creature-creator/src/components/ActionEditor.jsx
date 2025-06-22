import React from 'react';
import EditableField from './EditableField';
import './ActionEditor.css';

const ActionEditor = ({ action, onChange }) => {
    if (!action) return null;

    const handleSave = (field, value) => {
        onChange(field, value);
    };

    const skip = ['id', 'originalFeatureId', 'displayCost', 'displayDescription', 'category'];
    return (
        <div className="action-editor">
            {Object.entries(action).map(([key, val]) => {
                if (skip.includes(key)) return null;
                const fieldType = typeof val === 'number' ? 'number' : 'text';
                const displayVal = val !== null && val !== undefined ? val : '';
                return (
                    <div key={key} className="action-field">
                        <span className="action-label">{key}:</span>
                        <EditableField
                            value={displayVal}
                            fieldType={fieldType}
                            fieldName={key}
                            onSave={(f, v) => handleSave(key, v)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default ActionEditor;
