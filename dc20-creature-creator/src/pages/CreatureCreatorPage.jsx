// src/App.jsx
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import './CreatureCreatorPage.css';
import RightBar from '../components/RightBar';
import InputPanel from '../components/InputPanel';
import StatBlockPanel from '../components/StatBlockPanel';
import {
  buildCreature,
  getDefaultCreatureState,
  loadCreatureFromSession,
  normalizeCreatureState,
  saveCreatureToSession,
  clearCreatureSession,
} from '../domain/creatureBuilder';
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

  useEffect(() => {
    saveCreatureToSession(creatureState);
  }, [creatureState]);

  useEffect(() => {
    const fetchAllFeaturesData = async () => {
      setIsLoadingAllFeatures(true);
      try {
        const featuresCollectionRef = collection(db, 'features');
        const q = query(featuresCollectionRef, orderBy('category'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        const featuresData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllFeatures(featuresData);
        setAvailableApexActions(featuresData.filter((f) => f.category === 'apex_action'));
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
    const actionFeatures = selectedFeatures.filter((f) => f.category === 'action');
    const target = actionFeatures[actionIndex];
    if (!target) return;
    const targetId = target.id;
    const updatedFeatures = selectedFeatures.map((feature) => {
      if (feature.id !== targetId) return feature;
      let newVal = value;
      if (['costAP', 'costMP', 'costSP', 'damageMod', 'saveDCMod', 'rangeValue', 'areaSize'].includes(field)) {
        const num = parseInt(value, 10);
        newVal = Number.isNaN(num) ? 0 : num;
      }
      return { ...feature, [field]: newVal };
    });
    dispatch({ type: 'SET_SELECTED_FEATURES', payload: updatedFeatures });
  };

  const handleDefaultActionUpdate = (actionIndex, field, value) => {
    const current = actionOverrides[actionIndex] || {};
    let newVal = value;
    if (['costAP', 'costMP', 'damage'].includes(field)) {
      const num = parseInt(value, 10);
      newVal = Number.isNaN(num) ? 0 : num;
    }
    dispatch({
      type: 'SET_ACTION_OVERRIDES',
      payload: {
        ...actionOverrides,
        [actionIndex]: { ...current, [field]: newVal },
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
    dispatch({ type: 'RESET', payload: getDefaultCreatureState() });
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
        <StatBlockPanel
          ref={statBlockRef}
          fullStatBlock={statBlock}
          onStatOverride={handleStatOverride}
          onRemoveFeature={handleRemoveSelectedFeature}
          onActionUpdate={handleActionUpdate}
          onDefaultActionUpdate={handleDefaultActionUpdate}
        />
        <RightBar onCreateNew={handleCreateNew} onSave={handleSave} onExport={handleExport} />
      </div>
    </>
  );
};

export default CreatureCreatorPage;
