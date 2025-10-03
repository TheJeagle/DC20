// src/components/InputPanel.js
import React, { useState, useEffect } from 'react';
import './InputPanel.css';
import FeatureCreationForm from './FeatureCreationForm';
import { normalizeFeatureBalanceCost } from '../utils/featureCost';

const InputPanel = ({
  inputs,
  onUpdateInput,
  allFeatures,
  availableTypeFeatures,
  availableRoleFeatures,
  availableApexActions,
  selectedFeatures,
  onFeatureSelect,
  onRemoveSelectedFeature,
  isLoadingAllFeatures,
  isCreatingFeature,
  onToggleFeatureCreation,
  onAddCustomFeatureToSelection,
  onSaveCustomFeatureToDBAndAddToSelection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const { creatureName = 'Creature', level = 1, power = 'Normal', type = 'undead', role = 'none', size = 'medium' } =
    inputs || {};

  const powerLevels = ['Minion', 'Weak', 'Normal', 'Apex', 'Legendary'];
  const types = ['undead', 'humanoid', 'beast', 'elemental', 'construct'];
  const roles = ['artillerist', 'brute', 'controller', 'defender', 'leader', 'lurker', 'skirmisher', 'support', 'none', 'caster'];
  const sizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

  useEffect(() => {
    if (isLoadingAllFeatures || !allFeatures || allFeatures.length === 0) {
      setSearchResults([]);
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    if (lowerSearchTerm === '') {
      setSearchResults([]);
      return;
    }

    const filtered = allFeatures.filter((feature) => {
      if (!feature || !feature.name) return false;
      if (feature.name.toLowerCase().includes(lowerSearchTerm)) return true;
      if (feature.kind && feature.kind.toLowerCase().includes(lowerSearchTerm)) return true;
      if (Array.isArray(feature.tags) && feature.tags.some((tag) => tag.toLowerCase().includes(lowerSearchTerm))) return true;
      return false;
    });
    setSearchResults(filtered);
  }, [searchTerm, allFeatures, isLoadingAllFeatures]);

  const renderFeatureItems = (featuresToRender, listContextKey) => {
    if (!featuresToRender || featuresToRender.length === 0) {
      if (listContextKey === 'search-results' && searchTerm.trim() !== '') {
        return <p style={{ fontStyle: 'italic', fontSize: '0.9em' }}>No features match "{searchTerm}".</p>;
      }
      if ((listContextKey === 'type-list' || listContextKey === 'role-list') && searchTerm.trim() === '') {
        return <p style={{ fontStyle: 'italic', fontSize: '0.9em' }}>None available for current selection.</p>;
      }
      return null;
    }

    return (
      <ul>
        {featuresToRender.map((feature) => {
          if (!feature || !feature.id || !feature.name) {
            console.warn(`[InputPanel.js] Malformed feature object in list (${listContextKey}):`, feature);
            return null;
          }
          const isChecked = selectedFeatures.some((sf) => sf.id === feature.id);
          const normalizedBalance = normalizeFeatureBalanceCost(feature);
          const displayBalance = Number.isInteger(normalizedBalance) ? normalizedBalance : normalizedBalance.toFixed(1);
          const kind = feature.kind || feature.category || 'feature';
          const costEntries = Object.entries(feature.cost || {})
            .filter(([, value]) => typeof value === 'number' && value > 0)
            .map(([resource, value]) => `${value} ${resource.toUpperCase()}`);
          const costLabel = costEntries.length > 0 ? costEntries.join(' + ') : null;
          return (
            <li key={`${listContextKey}-${feature.id}`}>
              <label title={feature.summary || feature.description}>
                <input type="checkbox" checked={isChecked} onChange={(e) => onFeatureSelect(feature, e.target.checked)} />
                <strong className="feature-name">{feature.name}</strong>
                <span className="feature-category">({kind})</span>
                {costLabel && <span className="feature-cost"> - Cost: {costLabel}</span>}
                <span className="feature-balance-cost">• Feature Cost: {displayBalance}</span>
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

          <div className="form-group">
            <label htmlFor="creatureName">Name:</label>
            <input
              type="text"
              id="creatureName"
              value={creatureName}
              onChange={(e) => onUpdateInput('creatureName', e.target.value)}
            />
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
                onUpdateInput('level', Number.isNaN(val) ? 0 : val);
              }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="power">Power Tier:</label>
            <select id="power" value={power} onChange={(e) => onUpdateInput('power', e.target.value)}>
              {powerLevels.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="type">Type:</label>
            <select id="type" value={type} onChange={(e) => onUpdateInput('type', e.target.value)}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="role">Role:</label>
            <select id="role" value={role} onChange={(e) => onUpdateInput('role', e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="size">Size:</label>
            <select id="size" value={size} onChange={(e) => onUpdateInput('size', e.target.value)}>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <hr />

          <div className="form-group feature-search-bar">
            <label htmlFor="featureSearch">Search All Features/Actions:</label>
            <input
              type="text"
              id="featureSearch"
              placeholder="Name, tag, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoadingAllFeatures}
            />
          </div>

          <div className="form-group">
            <button type="button" onClick={onToggleFeatureCreation} className="toggle-feature-form-button">
              + Create Custom Feature/Action
            </button>
          </div>

          {isLoadingAllFeatures ? (
            <p className="loading-message">Loading all features...</p>
          ) : searchTerm.trim() !== '' ? (
            <div className="search-results-group available-features-group">
              <h3>Search Results ({searchResults.length})</h3>
              <div className="feature-list-container">{renderFeatureItems(searchResults, 'search-results')}</div>
            </div>
          ) : (
            <>
              <div className="available-features-group">
                <h3>Available by Type ({type})</h3>
                <div className="feature-list-container">{renderFeatureItems(availableTypeFeatures, 'type-list')}</div>
              </div>
              <div className="available-features-group">
                <h3>Available by Role ({role})</h3>
                <div className="feature-list-container">{renderFeatureItems(availableRoleFeatures, 'role-list')}</div>
              </div>
              <div className="available-features-group">
                <h3>Apex Actions</h3>
                <div className="feature-list-container">{renderFeatureItems(availableApexActions, 'apex-list')}</div>
              </div>
            </>
          )}

          {selectedFeatures && selectedFeatures.length > 0 && (
            <div className="selected-features-group">
              <h3>Selected Features/Actions ({selectedFeatures.length})</h3>
              <ul>
                {selectedFeatures.map((feature) => (
                  <li key={`selected-${feature.id}`}>
                    <span>{feature.name}</span>
                    <button type="button" onClick={() => onRemoveSelectedFeature(feature)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <FeatureCreationForm
          onCancel={onToggleFeatureCreation}
          onAddFeature={onAddCustomFeatureToSelection}
          onSaveFeatureToDB={onSaveCustomFeatureToDBAndAddToSelection}
        />
      )}
    </div>
  );
};

export default InputPanel;
