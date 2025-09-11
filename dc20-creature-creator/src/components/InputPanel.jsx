// src/components/InputPanel.js
import React, { useState, useEffect } from 'react'; // Added useEffect
import './InputPanel.css';
import FeatureCreationForm from './FeatureCreationForm'; // Import the new form component

const InputPanel = ({
    creatureName, setCreatureName,
    level, setLevel,
    power, setPower,
    type, setType,
    role, setRole,
    size, setSize,
    allFeatures,             // <<< NEW: All features from App.jsx
    availableTypeFeatures,   // Pre-filtered by App.jsx
    availableRoleFeatures,   // Pre-filtered by App.jsx
    availableApexActions,
    selectedFeatures,
    onFeatureSelect,
    onRemoveSelectedFeature,
    isLoadingAllFeatures,     // <<< NEW: Loading state from App.jsx
    // Props for custom feature creation
    isCreatingFeature,
    onToggleFeatureCreation,
    onAddCustomFeatureToSelection,
    onSaveCustomFeatureToDBAndAddToSelection
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]); // For results of global search

    const powerLevels = ['Minion', 'Weak', 'Normal', 'Apex', 'Legendary']; // Updated power tiers
    const types = ['undead', 'humanoid', 'beast', 'elemental', 'construct'];
    const roles = ['artillerist', 'brute', 'controller', 'defender', 'leader', 'lurker', 'skirmisher', 'support', 'none', 'caster'];
    const sizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

    // Effect to perform global search on allFeatures when searchTerm changes
    useEffect(() => {
        if (isLoadingAllFeatures || !allFeatures || allFeatures.length === 0) {
            setSearchResults([]); // Clear results if still loading or no features
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        if (lowerSearchTerm === '') {
            setSearchResults([]); // Clear search results if search term is empty
            return; // Don't filter, show type/role lists instead
        }

        // Filter ALL features for the search term
        const filtered = allFeatures.filter(feature => {
            if (!feature || !feature.name) return false;
            if (feature.name.toLowerCase().includes(lowerSearchTerm)) return true;
            if (feature.category && feature.category.toLowerCase().includes(lowerSearchTerm)) return true;
            if (Array.isArray(feature.tags) && feature.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) return true;
            // Optional: if (feature.description && feature.description.toLowerCase().includes(lowerSearchTerm)) return true;
            return false;
        });
        setSearchResults(filtered);
    }, [searchTerm, allFeatures, isLoadingAllFeatures]);


    // Helper to render the list items (common for all lists)
    const renderFeatureItems = (featuresToRender, listContextKey) => {
        if (!featuresToRender || featuresToRender.length === 0) {
            // Specific messages for different contexts
            if (listContextKey === 'search-results' && searchTerm.trim() !== '') {
                return <p style={{ fontStyle: 'italic', fontSize: '0.9em' }}>No features match "{searchTerm}".</p>;
            }
            if ((listContextKey === 'type-list' || listContextKey === 'role-list') && searchTerm.trim() === '') {
                return <p style={{ fontStyle: 'italic', fontSize: '0.9em' }}>None available for current selection.</p>;
            }
            return null; // Or a generic "No items" if preferred for search when it's empty
        }

        return (
            // Renders features that are currently selected. 
            <ul>
                {featuresToRender.map(feature => {
                    if (!feature || !feature.id || !feature.name) {
                        console.warn(`[InputPanel.js] Malformed feature object in list (${listContextKey}):`, feature);
                        return null;
                    }
                    const isChecked = selectedFeatures.some(sf => sf.id === feature.id);
                    return (
                        <li key={`${listContextKey}-${feature.id}`}> {/* Unique key prefix */}
                            <label title={feature.description}>
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => onFeatureSelect(feature, e.target.checked)}
                                />
                                <strong className="feature-name">{feature.name}</strong>
                                <span className="feature-category">({feature.category})</span>
                                {feature.cost && <span className="feature-cost"> - Cost: {feature.cost}</span>}
                            </label>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className="input-panel">
            {!isCreatingFeature ? (
                <>
                    <h2>Creature Configuration</h2>

                    {/* --- Creature Basic Inputs  --- */}
                    <div className="form-group">
                        <label htmlFor="creatureName">Name:</label>
                        <input type="text" id="creatureName" value={creatureName} onChange={(e) => setCreatureName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="level">Level (0-10+):</label>
                        <input
                            type="number"
                            id="level"
                            value={level}
                            min="0"
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setLevel(isNaN(val) ? 0 : val);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="power">Power Tier:</label>
                        <select id="power" value={power} onChange={(e) => setPower(e.target.value)}>
                            {powerLevels.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()}</option>)} {/* Ensure consistent casing for display */}
                        </select>
                    </div>

                    {/* ... Type, Role, Size dropdowns ... */}
                    <div className="form-group">
                        <label htmlFor="type">Type:</label>
                        <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
                            {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="role">Role:</label>
                        <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                            {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="size">Size:</label>
                        <select id="size" value={size} onChange={(e) => setSize(e.target.value)}>
                            {sizes.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>

                    <hr />

                    {/* --- Search Bar --- */}
                    <div className="form-group feature-search-bar">
                        <label htmlFor="featureSearch">Search All Features/Actions:</label>
                        <input
                            type="text"
                            id="featureSearch"
                            placeholder="Name, tag, category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLoadingAllFeatures} // Disable search input while loading
                        />
                    </div>

                    {/* --- Button to open feature creation form --- */}
                    <div className="form-group">
                        <button type="button" onClick={onToggleFeatureCreation} className="toggle-feature-form-button">
                            + Create Custom Feature/Action
                        </button>
                    </div>

                    {/* --- Conditional Display of Feature Lists --- */}
                    {isLoadingAllFeatures ? (
                        <p className="loading-message">Loading all features...</p>
                    ) : searchTerm.trim() !== '' ? (
                        // If there's an active search term, show search results
                        <div className="search-results-group available-features-group">
                            <h3>Search Results ({searchResults.length})</h3>
                            <div className="feature-list-container">
                                {renderFeatureItems(searchResults, 'search-results')}
                            </div>
                        </div>
                    ) : (
                        // Otherwise (no active search term), show the type and role filtered lists
                        <> 
                            <div className="available-features-group">
                                <h3>Available by Type ({type})</h3>
                                <div className="feature-list-container">
                                    {renderFeatureItems(availableTypeFeatures, 'type-list')}
                                </div>
                            </div>
                            <div className="available-features-group">
                                <h3>Available by Role ({role})</h3>
                                <div className="feature-list-container">
                                    {renderFeatureItems(availableRoleFeatures, 'role-list')}
                                </div>
                            </div>
                            <div className="available-features-group">
                                <h3>Apex Actions</h3>
                                <div className="feature-list-container">
                                    {renderFeatureItems(availableApexActions, 'apex-list')}
                                </div>
                            </div>
                        </>
                    )}
                    <hr />

                    {/* --- Currently Selected Features Section --- */}
                    {selectedFeatures && selectedFeatures.length > 0 && (
                        <div className="selected-features-section">
                            <h3>Currently Selected ({selectedFeatures.length})</h3>
                            <ul>
                                {selectedFeatures.map(feature => {
                                    if (!feature || !feature.id || !feature.name) return null;
                                    return (
                                        <li key={'selected-' + feature.id} className="selected-feature-item">
                                            <span className="selected-feature-info" title={feature.description}>
                                                <strong className="feature-name">{feature.name}</strong>
                                                <span className="feature-category">({feature.category})</span>
                                                {feature.cost && <span className="feature-cost"> - Cost: {feature.cost}</span>}
                                            </span>
                                            <button
                                                onClick={() => onRemoveSelectedFeature(feature)}
                                                className="remove-feature-button"
                                                title="Remove Feature"
                                            >
                                                ×
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </>
            ) : (
                <FeatureCreationForm
                    onCancel={onToggleFeatureCreation} // Pass toggle to use as cancel
                    onAddOnlyToCreature={onAddCustomFeatureToSelection}
                    onSaveAndAddToCreature={onSaveCustomFeatureToDBAndAddToSelection}
                // Pass any other necessary props, e.g., existing tags for suggestions
                />
            )}
        </div>
    );
};

export default InputPanel;