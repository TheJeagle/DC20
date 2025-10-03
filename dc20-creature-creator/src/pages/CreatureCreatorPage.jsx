// src/App.jsx
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import './CreatureCreatorPage.css';
import RightBar from '../components/RightBar';
import InputPanel from '../components/InputPanel';
import StatBlockPanel from '../components/StatBlockPanel';
import BalanceChecklist from '../components/BalanceChecklist';
import {
  buildCreature,
  getDefaultCreatureState,
  loadCreatureFromSession,
  normalizeCreatureState,
  saveCreatureToSession,
  clearCreatureSession,
} from '../domain/creatureBuilder';
import { generateDefaultActionFeatures } from '../utils/calculateStats';
import { evaluateBalance } from '../utils/balanceGuidelines';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const creatureStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_INPUT':
      return {
        ...state,
        inputs: { ...state.inputs, [action.payload.key]: action.payload.value },
      };
    case 'SET_INPUTS':
      return {
        ...state,
        inputs: { ...state.inputs, ...action.payload },
      };
    case 'SET_SELECTED_FEATURES':
      return {
        ...state,
        selectedFeatures: action.payload,
      };
    case 'SET_OVERRIDES':
      return {
        ...state,
        overrides: action.payload,
      };
    case 'SET_ACTION_OVERRIDES':
      return {
        ...state,
        actionOverrides: action.payload,
      };
    case 'RESET':
      return normalizeCreatureState(action.payload || getDefaultCreatureState());
    default:
      return state;
  }
};

const initializeCreatureState = () => normalizeCreatureState(loadCreatureFromSession());

const CreatureCreatorPage = ({ currentUser }) => {
  const [creatureState, dispatch] = useReducer(creatureStateReducer, undefined, initializeCreatureState);
  const { inputs, selectedFeatures, overrides, actionOverrides } = creatureState;

  const generatedDefaultActions = useMemo(() => {
    if (!inputs) {
      return generateDefaultActionFeatures(getDefaultCreatureState().inputs);
    }
    return generateDefaultActionFeatures(inputs);
  }, [inputs?.level, inputs?.power, inputs?.role, inputs?.type, inputs?.size]);

  const [allFeatures, setAllFeatures] = useState([]);
  const [isLoadingAllFeatures, setIsLoadingAllFeatures] = useState(true);
  const [availableTypeFeatures, setAvailableTypeFeatures] = useState([]);
  const [availableRoleFeatures, setAvailableRoleFeatures] = useState([]);
  const [availableApexActions, setAvailableApexActions] = useState([]);
  const [isCreatingFeature, setIsCreatingFeature] = useState(false);

  const statBlockRef = useRef(null);

  const creatureBuild = useMemo(
    () => buildCreature(inputs, selectedFeatures, overrides, actionOverrides),
    [inputs, selectedFeatures, overrides, actionOverrides]
  );
  const statBlock = creatureBuild.creature;

  const balanceReport = useMemo(() => {
    if (!creatureBuild?.creature) {
      return null;
    }
    return evaluateBalance({
      inputs,
      selectedFeatures,
      overrides,
      actionOverrides,
      creature: creatureBuild.creature,
    });
  }, [inputs, selectedFeatures, overrides, actionOverrides, creatureBuild]);

  useEffect(() => {
    saveCreatureToSession(creatureState);
  }, [creatureState]);

  useEffect(() => {
    const normalizeFetchedFeature = (feature) => {
      const cost = {};
      if (feature.cost && typeof feature.cost === 'object' && !Array.isArray(feature.cost)) {
        Object.entries(feature.cost).forEach(([resource, value]) => {
          const numeric = typeof value === 'number' ? value : parseInt(value, 10);
          if (!Number.isNaN(numeric) && numeric > 0) {
            cost[resource] = numeric;
          }
        });
      } else if (typeof feature.cost === 'string') {
        const apMatch = feature.cost.match(/(\d+)\s*AP/i);
        const mpMatch = feature.cost.match(/(\d+)\s*MP/i);
        const spMatch = feature.cost.match(/(\d+)\s*SP/i);
        if (apMatch) cost.ap = parseInt(apMatch[1], 10);
        if (mpMatch) cost.mp = parseInt(mpMatch[1], 10);
        if (spMatch) cost.sp = parseInt(spMatch[1], 10);
      } else {
        ['ap', 'mp', 'sp'].forEach((key) => {
          const legacy = feature[`cost${key.toUpperCase()}`];
          const numeric = typeof legacy === 'number' ? legacy : parseInt(legacy, 10);
          if (!Number.isNaN(numeric) && numeric > 0) {
            cost[key] = numeric;
          }
        });
      }

      const damage = feature.damage || {};
      const normalizedDamage =
        typeof damage === 'object'
          ? {
              bonus:
                typeof damage.bonus === 'number'
                  ? damage.bonus
                  : typeof feature.damageMod === 'number'
                  ? feature.damageMod
                  : 0,
              type: damage.type || feature.damageType || '',
              base: Object.prototype.hasOwnProperty.call(damage, 'base')
                ? damage.base
                : feature.baseDamageOverride ?? null,
            }
          : {
              bonus: typeof damage === 'number' ? damage : feature.damageMod || 0,
              type: feature.damageType || '',
              base: feature.baseDamageOverride ?? null,
            };

      const save = feature.save || {};
      const normalizedSave = {
        attribute: save.attribute || feature.saveAttribute || '',
        dcMod: typeof save.dcMod === 'number' ? save.dcMod : feature.saveDCMod || 0,
        effect: save.effect || feature.saveEffect || '',
      };

      const summary = feature.summary || feature.descriptionCore || feature.description || '';
      const method = feature.method || feature.actionType || '';
      const range =
        typeof feature.range !== 'undefined' && feature.range !== null
          ? typeof feature.range === 'number'
            ? `${feature.range}`
            : feature.range
          : feature.rangeValue
          ? `${feature.rangeValue}${feature.rangeUnit ? ` ${feature.rangeUnit}` : ''}`.trim()
          : '';
      const target = (feature.target || feature.targetDescription || '').toString().trim();
      const defense = (feature.defense || feature.targetsDefense || '').toString().trim();
      const effects = Array.isArray(feature.effects) ? feature.effects : [];

      return {
        ...feature,
        kind: feature.kind || feature.category || 'feature',
        cost,
        damage: normalizedDamage,
        save: normalizedSave,
        summary: summary.trim(),
        method,
        range: range.trim(),
        target,
        defense,
        effects,
      };
    };

    const fetchAllFeaturesData = async () => {
      setIsLoadingAllFeatures(true);
      try {
        const featuresCollectionRef = collection(db, 'features');
        const q = query(featuresCollectionRef, orderBy('name'));
        const querySnapshot = await getDocs(q);
        const featuresData = querySnapshot.docs.map((doc) =>
          normalizeFetchedFeature({
            id: doc.id,
            ...doc.data(),
          })
        );
        setAllFeatures(featuresData);
        setAvailableApexActions(featuresData.filter((f) => f.kind === 'apex_action'));
      } catch (error) {
        console.error('Error fetching all features:', error);
      } finally {
        setIsLoadingAllFeatures(false);
      }
    };
    fetchAllFeaturesData();
  }, []);

  useEffect(() => {
    if (isLoadingAllFeatures) {
      setAvailableTypeFeatures([]);
      return;
    }
    if (inputs?.type && allFeatures.length > 0) {
      const lowerCaseType = inputs.type.toLowerCase();
      const filtered = allFeatures.filter(
        (feature) => Array.isArray(feature.tags) && feature.tags.some((tag) => tag.toLowerCase() === lowerCaseType)
      );
      setAvailableTypeFeatures(filtered);
    } else {
      setAvailableTypeFeatures([]);
    }
  }, [inputs?.type, allFeatures, isLoadingAllFeatures]);

  useEffect(() => {
    if (isLoadingAllFeatures) {
      setAvailableRoleFeatures([]);
      return;
    }
    if (inputs?.role && inputs.role.toLowerCase() !== 'none' && allFeatures.length > 0) {
      const lowerCaseRole = inputs.role.toLowerCase();
      const filtered = allFeatures.filter(
        (feature) => Array.isArray(feature.tags) && feature.tags.some((tag) => tag.toLowerCase() === lowerCaseRole)
      );
      setAvailableRoleFeatures(filtered);
    } else {
      setAvailableRoleFeatures([]);
    }
  }, [inputs?.role, allFeatures, isLoadingAllFeatures]);

  const handleFeatureSelect = (feature, isSelected) => {
    dispatch({
      type: 'SET_SELECTED_FEATURES',
      payload: isSelected
        ? selectedFeatures.find((f) => f.id === feature.id)
          ? selectedFeatures
          : [...selectedFeatures, feature]
        : selectedFeatures.filter((f) => f.id !== feature.id),
    });
  };

  const handleRemoveSelectedFeature = (featureToRemove) => {
    if (!featureToRemove || !featureToRemove.id) {
      console.warn('Attempted to remove feature without an ID', featureToRemove);
      return;
    }
    dispatch({
      type: 'SET_SELECTED_FEATURES',
      payload: selectedFeatures.filter((f) => f.id !== featureToRemove.id),
    });
    console.log('Removed feature:', featureToRemove.name);
  };

  const handleStatOverride = (fieldName, newAbsoluteValueFromInput) => {
    const baseObjectForDelta = statBlock?.derived?.snapshots?.beforeOverrides;
    if (!baseObjectForDelta) {
      console.error('Cannot calculate delta: statBlock.derived.snapshots.beforeOverrides is not available.');
      dispatch({
        type: 'SET_OVERRIDES',
        payload: { ...overrides, [`${fieldName}_set`]: newAbsoluteValueFromInput },
      });
      return;
    }

    const pathParts = fieldName.split('_');

    let originalValueForDeltaCalc;
    let currentLevel = baseObjectForDelta;

    for (let i = 0; i < pathParts.length; i += 1) {
      const part = pathParts[i];
      if (currentLevel === null || typeof currentLevel === 'undefined') {
        originalValueForDeltaCalc = undefined;
        break;
      }

      if (Array.isArray(currentLevel) && !Number.isNaN(parseInt(part, 10))) {
        currentLevel = currentLevel[parseInt(part, 10)];
      } else if (typeof currentLevel === 'object' && Object.prototype.hasOwnProperty.call(currentLevel, part)) {
        currentLevel = currentLevel[part];
      } else {
        originalValueForDeltaCalc = undefined;
        break;
      }

      if (i === pathParts.length - 1) {
        originalValueForDeltaCalc = currentLevel;
      }
    }

    const updatedOverrides = { ...overrides };

    if (typeof originalValueForDeltaCalc === 'undefined') {
      console.warn(`Cannot find original value for delta for field: "${fieldName}" in base snapshot. Storing as absolute set.`);
      updatedOverrides[`${fieldName}_set`] = newAbsoluteValueFromInput;
      dispatch({ type: 'SET_OVERRIDES', payload: updatedOverrides });
      return;
    }

    const originalIsNumeric = typeof originalValueForDeltaCalc === 'number' && !Number.isNaN(originalValueForDeltaCalc);
    const newIsActualNumber = typeof newAbsoluteValueFromInput === 'number' && !Number.isNaN(newAbsoluteValueFromInput);

    let numericNewValue = newIsActualNumber ? newAbsoluteValueFromInput : parseInt(newAbsoluteValueFromInput, 10);

    if (originalIsNumeric && !Number.isNaN(numericNewValue)) {
      const numericOriginal = originalValueForDeltaCalc;
      const delta = numericNewValue - numericOriginal;

      if (delta !== 0) {
        console.log(`Setting delta for ${fieldName}: ${delta} (new: ${numericNewValue}, original_base+feat: ${numericOriginal})`);
        delete updatedOverrides[`${fieldName}_set`];
        updatedOverrides[`${fieldName}_delta`] = delta;
      } else {
        console.log(`Delta for ${fieldName} is 0. Removing override.`);
        delete updatedOverrides[`${fieldName}_delta`];
        delete updatedOverrides[`${fieldName}_set`];
      }
    } else {
      if (newAbsoluteValueFromInput !== originalValueForDeltaCalc) {
        console.log(`Setting absolute override for ${fieldName}: "${newAbsoluteValueFromInput}"`);
        delete updatedOverrides[`${fieldName}_delta`];
        updatedOverrides[`${fieldName}_set`] = newAbsoluteValueFromInput;
      } else {
        console.log(`Absolute override for ${fieldName} matches original. Removing override.`);
        delete updatedOverrides[`${fieldName}_delta`];
        delete updatedOverrides[`${fieldName}_set`];
      }
    }

    dispatch({ type: 'SET_OVERRIDES', payload: updatedOverrides });
  };

  const handleActionUpdate = (actionIndex, field, value) => {
    const actionFeatures = selectedFeatures.filter((f) => (f.kind || f.category) === 'action');
    const target = actionFeatures[actionIndex];
    if (!target) return;
    const targetId = target.id;
    const parseRangeInput = (input) => {
      if (input === '' || input === null || typeof input === 'undefined') return null;
      if (typeof input === 'number') return input;
      const match = `${input}`.match(/-?\d+/);
      return match ? parseInt(match[0], 10) : null;
    };

    const updatedFeatures = selectedFeatures.map((feature) => {
      if (feature.id !== targetId) return feature;

      if (field === 'cost') {
        const normalizedCost = value && typeof value === 'object' && Object.keys(value).length > 0 ? value : null;
        return { ...feature, cost: normalizedCost };
      }

      if (field.startsWith('damage.')) {
        const [, prop] = field.split('.');
        const currentDamage = feature.damage && typeof feature.damage === 'object' ? { ...feature.damage } : {};
        if (prop === 'modifier') {
          const num = parseInt(value, 10);
          if (Number.isNaN(num)) {
            delete currentDamage.modifier;
          } else {
            currentDamage.modifier = num;
          }
        } else if (prop === 'type') {
          const trimmed = typeof value === 'string' ? value.trim() : '';
          if (trimmed) {
            currentDamage.type = trimmed;
          } else {
            delete currentDamage.type;
          }
        }
        const cleanedDamage = Object.keys(currentDamage).length > 0 ? currentDamage : undefined;
        return { ...feature, damage: cleanedDamage };
      }

      if (field === 'defense') {
        const normalizedDefense = value ? value.toUpperCase() : null;
        return { ...feature, defense: normalizedDefense };
      }

      if (field === 'range') {
        const num = parseRangeInput(value);
        const normalizedRange = Number.isNaN(num) ? null : Math.max(0, num);
        const updated = { ...feature };
        if (normalizedRange === null) {
          delete updated.range;
        } else {
          updated.range = normalizedRange;
        }
        return updated;
      }

      if (field === 'target') {
        return { ...feature, target: value };
      }

      if (field === 'summary') {
        return { ...feature, summary: value, description: value };
      }

      return { ...feature, [field]: value };
    });
    dispatch({ type: 'SET_SELECTED_FEATURES', payload: updatedFeatures });
  };

  const handleDefaultActionUpdate = (actionIndex, field, value) => {
    const current = actionOverrides[actionIndex] || {};
    const updatedOverride = { ...current };
    const parseRangeInput = (input) => {
      if (input === '' || input === null || typeof input === 'undefined') return null;
      if (typeof input === 'number') return input;
      const match = `${input}`.match(/-?\d+/);
      return match ? parseInt(match[0], 10) : null;
    };

    if (field === 'cost') {
      const normalizedCost = value && typeof value === 'object' && Object.keys(value).length > 0 ? value : null;
      if (normalizedCost) {
        updatedOverride.cost = normalizedCost;
      } else {
        delete updatedOverride.cost;
      }
    } else if (field.startsWith('damage.')) {
      const [, prop] = field.split('.');
      const currentDamage = updatedOverride.damage && typeof updatedOverride.damage === 'object'
        ? { ...updatedOverride.damage }
        : {};
      if (prop === 'modifier') {
        const num = parseInt(value, 10);
        if (Number.isNaN(num)) {
          delete currentDamage.modifier;
        } else {
          currentDamage.modifier = num;
        }
      } else if (prop === 'type') {
        const trimmed = typeof value === 'string' ? value.trim() : '';
        if (trimmed) {
          currentDamage.type = trimmed;
        } else {
          delete currentDamage.type;
        }
      }
      if (Object.keys(currentDamage).length > 0) {
        updatedOverride.damage = currentDamage;
      } else {
        delete updatedOverride.damage;
      }
    } else if (field === 'defense') {
      if (value) {
        updatedOverride.defense = value.toUpperCase();
      } else {
        delete updatedOverride.defense;
      }
    } else if (field === 'range') {
      const num = parseRangeInput(value);
      if (Number.isNaN(num) || num === null) {
        delete updatedOverride.range;
      } else {
        updatedOverride.range = Math.max(0, num);
      }
    } else if (field === 'target') {
      if (value) {
        updatedOverride.target = value;
      } else {
        delete updatedOverride.target;
      }
    } else if (field === 'summary') {
      if (value) {
        updatedOverride.summary = value;
      } else {
        delete updatedOverride.summary;
      }
    } else {
      if (value !== undefined && value !== null) {
        updatedOverride[field] = value;
      } else {
        delete updatedOverride[field];
      }
    }

    dispatch({
      type: 'SET_ACTION_OVERRIDES',
      payload: {
        ...actionOverrides,
        [actionIndex]: updatedOverride,
      },
    });
  };

  const handleToggleFeatureCreationForm = () => setIsCreatingFeature((prev) => !prev);

  const handleAddCustomFeatureToSelection = (newFeatureData) => {
    const featureWithId = newFeatureData.id
      ? newFeatureData
      : { ...newFeatureData, id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}` };
    dispatch({ type: 'SET_SELECTED_FEATURES', payload: [...selectedFeatures, featureWithId] });
    setIsCreatingFeature(false);
  };

  const handleSaveCustomFeatureToDBAndAddToSelection = async (newFeatureData) => {
    const featureToSave = { ...newFeatureData, createdAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, 'userMadeFeatures'), featureToSave);
      handleAddCustomFeatureToSelection({ ...newFeatureData, id: docRef.id });
      return true;
    } catch (error) {
      console.error('Error saving custom feature:', error);
      return false;
    }
  };

  const handleCreateNew = () => {
    console.log('Create New clicked');
    const defaultState = getDefaultCreatureState();
    dispatch({ type: 'RESET', payload: defaultState });
    clearCreatureSession();
    setIsCreatingFeature(false);
  };

  const handleSave = async () => {
    if (!currentUser) {
      alert('Please log in to save.');
      return;
    }
    if (!inputs.creatureName?.trim() || !statBlock) {
      alert('Name/stats required.');
      return;
    }

    const creatureDataToSave = {
      name: inputs.creatureName,
      level: inputs.level,
      power: inputs.power,
      type: inputs.type,
      role: inputs.role,
      size: inputs.size,
      actions: creatureBuild.display.actions,
      selectedFeatureIds: selectedFeatures.map((f) => f.id),
      statModifiers: overrides,
      defaultActionOverrides: actionOverrides,
      votes: 0,
      createdAt: serverTimestamp(),
      ownerId: currentUser.uid,
      submittedBy: currentUser.email,
    };

    try {
      const docRef = await addDoc(collection(db, 'savedCreatures'), creatureDataToSave);
      console.log('Creature saved with ID: ', docRef.id);
      alert(`${inputs.creatureName} saved successfully!`);
    } catch (e) {
      console.error('Error saving doc: ', e);
      alert(`Failed to save ${inputs.creatureName}.`);
    }
  };

  const handleExport = async () => {
    if (!statBlockRef.current) {
      alert('No stats to export.');
      return;
    }
    try {
      const canvas = await html2canvas(statBlockRef.current);
      const imageData = canvas.toDataURL('image/png');
      const fileBase = (inputs.creatureName || 'creature').replace(/\s+/g, '_') + '_statblock';
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `${fileBase}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${fileBase}.pdf`);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <>
      <div className="app-container">
        <InputPanel
          inputs={inputs}
          onUpdateInput={(key, value) => dispatch({ type: 'SET_INPUT', payload: { key, value } })}
          allFeatures={allFeatures}
          availableTypeFeatures={availableTypeFeatures}
          availableRoleFeatures={availableRoleFeatures}
          availableApexActions={availableApexActions}
          selectedFeatures={selectedFeatures}
          onFeatureSelect={handleFeatureSelect}
          onRemoveSelectedFeature={handleRemoveSelectedFeature}
          isLoadingAllFeatures={isLoadingAllFeatures}
          isCreatingFeature={isCreatingFeature}
          onToggleFeatureCreation={handleToggleFeatureCreationForm}
          onAddCustomFeatureToSelection={handleAddCustomFeatureToSelection}
          onSaveCustomFeatureToDBAndAddToSelection={handleSaveCustomFeatureToDBAndAddToSelection}
        />
        <div className="middle-column">
          <StatBlockPanel
            ref={statBlockRef}
            fullStatBlock={statBlock}
            onStatOverride={handleStatOverride}
            onRemoveFeature={handleRemoveSelectedFeature}
            onActionUpdate={handleActionUpdate}
            onDefaultActionUpdate={handleDefaultActionUpdate}
            generatedDefaultActions={generatedDefaultActions}
          />
          <BalanceChecklist report={balanceReport} />
        </div>
        <RightBar onCreateNew={handleCreateNew} onSave={handleSave} onExport={handleExport} />
      </div>
    </>
  );
};

export default CreatureCreatorPage;
