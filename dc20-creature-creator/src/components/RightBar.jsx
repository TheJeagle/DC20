// src/components/RightBar.js
import React from 'react';
import './RightBar.css';

// Accept props for event handlers
const RightBar = ({ onCreateNew, onSave, onExport }) => {
    return (
        <div className="right-bar">
            {/* Call the passed-in handlers */}
            <button onClick={onCreateNew} title="Create New">New</button>
            <button onClick={onSave} title="Save">Save</button>
            <button onClick={onExport} title="Export">Export</button>
        </div>
    );
};

export default RightBar;