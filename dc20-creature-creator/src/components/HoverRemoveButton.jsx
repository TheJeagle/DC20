// src/components/HoverRemoveButton.jsx
import React from 'react';
import { GiTrashCan } from 'react-icons/gi'; // Or any other remove icon
import './HoverRemoveButton.css'; // Create this CSS file

const HoverRemoveButton = ({ onClick, title = "Remove item" }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="hover-remove-button"
            title={title}
        >
            <GiTrashCan />
        </button>
    );
};

export default HoverRemoveButton;