// src/components/EditableField.jsx
import React, { useState, useEffect, useRef } from 'react';
import './EditableField.css'; // Create this CSS file

const EditableField = ({
    value,
    onSave, // Function to call when edit is confirmed: onSave(newValue)
    fieldType = "number", // "number" or "text"
    fieldName, // For identifying the field, e.g., "HP", "Attributes_Mig_Score"
    disabled = false, // If editing should be disabled for this field
    className = ""
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef(null);

    useEffect(() => {
        setCurrentValue(value); // Update if prop value changes externally
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); // Select text for easy replacement
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        if (!disabled) {
            setIsEditing(true);
        }
    };

    const handleChange = (e) => {
        setCurrentValue(e.target.value);
    };

    const handleBlur = () => {
        saveEdit();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setCurrentValue(value); // Revert to original value
        }
    };

    const saveEdit = () => {
        if (disabled) return;
        let finalValue = currentValue;
        if (fieldType === "number") {
            const numValue = parseInt(currentValue, 10);
            if (isNaN(numValue)) {
                // What to do if user types "abc" for a number?
                // Option A: Revert to original 'value' prop
                finalValue = value;
                // Option B: Save a default like 0
                // finalValueToSave = 0;
                // Option C: Don't save, keep editing (more complex UI)
                // setIsEditing(true); return;
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(
                        `Invalid number input "${currentValue}" for ${fieldName}. Saving 0.`
                    );
                }
            } else {
                finalValue = isNaN(numValue) ? value : numValue; // Revert if not a number
            }

        }
        if (process.env.NODE_ENV !== 'production') {
            console.log(
                "In Editablefield: Onsave:",
                fieldName,
                " And: ",
                finalValue
            );
        }
        onSave(fieldName, finalValue); // Pass fieldName and new value
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type={fieldType === "number" ? "number" : "text"}
                value={currentValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`editable-input ${className}`}
            />
        );
    }

    return (
        <span
            onDoubleClick={handleDoubleClick}
            className={`editable-span ${disabled ? 'disabled' : ''} ${className}`}
            title={!disabled ? "Double-click to edit" : ""}
        >
            {value}
        </span>
    );
};

export default EditableField;