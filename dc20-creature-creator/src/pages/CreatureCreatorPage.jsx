// src/App.jsx
import React, { useState, useEffect } from 'react';
import './CreatureCreatorPage.css'; // Your main stylesheet
import RightBar from '../components/RightBar';
import InputPanel from '../components/InputPanel';
import StatBlockPanel from '../components/StatBlockPanel';
import { calculateCreatureStats } from '../utils/calculateStats';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const CreatureCreatorPage = ({ currentUser }) => {
  // --- State for Creature Inputs ---
  const [creatureName, setCreatureName] = useState('Creature');
  const [level, setLevel] = useState(1);
  const [power, setPower] = useState('Normal'); // User-facing state
  const [type, setType] = useState('undead');
  const [role, setRole] = useState('none');
  const [size, setSize] = useState('medium');

  // --- State for Features & Actions ---
  const [allFeatures, setAllFeatures] = useState([]);
  const [isLoadingAllFeatures, setIsLoadingAllFeatures] = useState(true);
  const [availableTypeFeatures, setAvailableTypeFeatures] = useState([]);
  const [availableRoleFeatures, setAvailableRoleFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  // --- State for Overrides (Deltas and Sets) ---
  const [overrides, setOverrides] = useState({});

  // --- State for the Final Calculated Stat Block ---
  const [statBlock, setStatBlock] = useState(null);

  const [isCreatingFeature, setIsCreatingFeature] = useState(false);

  // --- Effect 1: Fetch ALL features ONCE on component mount ---
  useEffect(() => {
    const fetchAllFeaturesData = async () => {
      setIsLoadingAllFeatures(true);
      // console.log("Fetching ALL features from Firestore..."); // Keep for debug if needed
      try {
        const featuresCollectionRef = collection(db, "features");
        const q = query(featuresCollectionRef, orderBy("category"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        const featuresData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllFeatures(featuresData);
        // console.log(`Fetched ${featuresData.length} total features.`);
      } catch (error) {
        console.error("Error fetching all features:", error);
      } finally {
        setIsLoadingAllFeatures(false);
      }
    };
    fetchAllFeaturesData();
  }, []);

  // --- Effect 2: Filter allFeatures to create availableTypeFeatures ---
  useEffect(() => {
    if (isLoadingAllFeatures) {
      setAvailableTypeFeatures([]); return;
    }
    if (type && allFeatures.length > 0) {
      const lowerCaseType = type.toLowerCase();
      const filtered = allFeatures.filter(feature =>
        Array.isArray(feature.tags) && feature.tags.some(tag => tag.toLowerCase() === lowerCaseType)
      );
      setAvailableTypeFeatures(filtered);
    } else {
      setAvailableTypeFeatures([]);
    }
  }, [type, allFeatures, isLoadingAllFeatures]);

  // --- Effect 3: Filter allFeatures to create availableRoleFeatures ---
  useEffect(() => {
    if (isLoadingAllFeatures) {
      setAvailableRoleFeatures([]); return;
    }
    if (role && role.toLowerCase() !== 'none' && allFeatures.length > 0) {
      const lowerCaseRole = role.toLowerCase();
      const filtered = allFeatures.filter(feature =>
        Array.isArray(feature.tags) && feature.tags.some(tag => tag.toLowerCase() === lowerCaseRole)
      );
      setAvailableRoleFeatures(filtered);
    } else {
      setAvailableRoleFeatures([]);
    }
  }, [role, allFeatures, isLoadingAllFeatures]);

  // --- Effect 4: Re-calculate statBlock (NOW PASSES OVERRIDES) ---
  useEffect(() => {
    const inputs = { level, power: power.toLowerCase(), role, type, size, creatureName };
    const newCalculatedStats = calculateCreatureStats(inputs, selectedFeatures, overrides); // Pass overrides
    setStatBlock(newCalculatedStats);
    // console.log("Stat block recalculated with overrides:", newCalculatedStats);
  }, [creatureName, level, power, type, role, size, selectedFeatures, overrides]); // Added 'overrides'

  // --- Handler for selecting/deselecting features via checkboxes ---
  const handleFeatureSelect = (feature, isSelected) => {
    setSelectedFeatures(prev =>
      isSelected
        ? (prev.find(f => f.id === feature.id) ? prev : [...prev, feature])
        : prev.filter(f => f.id !== feature.id)
    );
  };

  // --- Handler for removing features from selected list OR directly from stat block ---
  const handleRemoveSelectedFeature = (featureToRemove) => {
    if (!featureToRemove || !featureToRemove.id) {
      console.warn("Attempted to remove feature without an ID", featureToRemove);
      return;
    }
    setSelectedFeatures(prev => prev.filter(f => f.id !== featureToRemove.id));
    console.log("Removed feature:", featureToRemove.name);
  };

  // --- Handler for when a user edits a field in StatBlockPanel ---
  // src/App.jsx

  // ... (inside the App component)

  const handleStatOverride = (fieldName, newAbsoluteValueFromInput) => {
    if (!statBlock || !statBlock.CalculatedBeforeDeltas) {
      console.error("Cannot calculate delta: statBlock.CalculatedBeforeDeltas is not available.");
      setOverrides(prev => ({ ...prev, [`${fieldName}_set`]: newAbsoluteValueFromInput }));
      return;
    }

    const baseObjectForDelta = statBlock.CalculatedBeforeDeltas;
    const pathParts = fieldName.split('_'); // e.g., ["Features", "0", "name"] or ["Attributes", "Mig"] or ["HP"]

    let originalValueForDeltaCalc;
    let currentLevel = baseObjectForDelta;

    // Traverse the path to get the original value
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (currentLevel === null || typeof currentLevel === 'undefined') { // Path broken earlier
        originalValueForDeltaCalc = undefined;
        break;
      }

      if (Array.isArray(currentLevel) && !isNaN(parseInt(part, 10))) { // Part is an array index
        currentLevel = currentLevel[parseInt(part, 10)];
      } else if (typeof currentLevel === 'object' && currentLevel.hasOwnProperty(part)) { // Part is an object key
        currentLevel = currentLevel[part];
      } else { // Part not found or path is invalid
        originalValueForDeltaCalc = undefined;
        break;
      }
      // If this is the last part of the path, this is our target value
      if (i === pathParts.length - 1) {
        originalValueForDeltaCalc = currentLevel;
      }
    }

    if (typeof originalValueForDeltaCalc === 'undefined') {
      console.warn(`Cannot find original value for delta for field: "${fieldName}" in CalculatedBeforeDeltas. Storing as absolute set.`);
      setOverrides(prevOverrides => ({ ...prevOverrides, [`${fieldName}_set`]: newAbsoluteValueFromInput }));
      return;
    }

    // Determine if the override should be a delta or a set
    // If original or new value is a string, or if original is not a number (e.g. null for an optional numeric field), treat as a set.
    const originalIsNumeric = typeof originalValueForDeltaCalc === 'number' && !isNaN(originalValueForDeltaCalc);
    const newIsNumericString = typeof newAbsoluteValueFromInput === 'string' && !isNaN(parseInt(newAbsoluteValueFromInput, 10));
    const newIsActualNumber = typeof newAbsoluteValueFromInput === 'number' && !isNaN(newAbsoluteValueFromInput);

    // Try to parse new input if it looks like a number but is a string
    let numericNewValue = newIsActualNumber ? newAbsoluteValueFromInput : parseInt(newAbsoluteValueFromInput, 10);


    if (originalIsNumeric && !isNaN(numericNewValue)) { // Both original and new value can be treated as numbers
      const numericOriginal = originalValueForDeltaCalc; // Already a number
      const delta = numericNewValue - numericOriginal;

      if (delta !== 0) {
        console.log(`Setting delta for ${fieldName}: ${delta} (new: ${numericNewValue}, original_base+feat: ${numericOriginal})`);
        setOverrides(prevOverrides => {
          const newO = { ...prevOverrides };
          delete newO[`${fieldName}_set`]; // Clear any _set override
          newO[`${fieldName}_delta`] = delta;
          return newO;
        });
      } else { // Delta is 0, user edited it back to original value
        console.log(`Delta for ${fieldName} is 0. Removing override.`);
        setOverrides(prevOverrides => {
          const newO = { ...prevOverrides };
          delete newO[`${fieldName}_delta`];
          delete newO[`${fieldName}_set`];
          return newO;
        });
      }
    } else { // Treat as a "set" override (e.g., for text fields, or if types mismatch)
      if (newAbsoluteValueFromInput !== originalValueForDeltaCalc) {
        console.log(`Setting absolute override for ${fieldName}: "${newAbsoluteValueFromInput}"`);
        setOverrides(prevOverrides => {
          const newO = { ...prevOverrides };
          delete newO[`${fieldName}_delta`]; // Clear any _delta override
          newO[`${fieldName}_set`] = newAbsoluteValueFromInput;
          return newO;
        });
      } else { // User edited it back to the original value
        console.log(`Absolute override for ${fieldName} matches original. Removing override.`);
        setOverrides(prevOverrides => {
          const newO = { ...prevOverrides };
          delete newO[`${fieldName}_delta`];
          delete newO[`${fieldName}_set`];
          return newO;
        });
      }
    }
  };
  // --- END OF handleStatOverride DEFINITION ---


  // --- Custom Feature Creation Handlers ---
  const handleToggleFeatureCreationForm = () => setIsCreatingFeature(prev => !prev);
  const handleAddCustomFeatureToSelection = (newFeatureData) => {
    const featureWithId = newFeatureData.id ? newFeatureData : { ...newFeatureData, id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}` };
    setSelectedFeatures(prev => [...prev, featureWithId]);
    setIsCreatingFeature(false);
  };
  const handleSaveCustomFeatureToDBAndAddToSelection = async (newFeatureData) => {
    const featureToSave = { ...newFeatureData, createdAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, "userMadeFeatures"), featureToSave);
      handleAddCustomFeatureToSelection({ ...newFeatureData, id: docRef.id });
      return true;
    } catch (error) { console.error("Error saving custom feature:", error); return false; }
  };

  // --- Handler for "Create New" (NOW CLEARS OVERRIDES) ---
  const handleCreateNew = () => {
    console.log("Create New clicked");
    setCreatureName('Creature'); setLevel(1); setPower('Normal');
    setType('humanoid'); setRole('none'); setSize('medium');
    setSelectedFeatures([]);
    setOverrides({}); // <<< CLEAR OVERRIDES
    setIsCreatingFeature(false);
  };

  // --- Handler for "Save" (NOW SAVES OVERRIDES) ---
  const handleSave = async () => {
    if (!currentUser) { alert("Please log in to save."); return; }
    if (!creatureName.trim() || !statBlock) { alert("Name/stats required."); return; }
    // console.log("Saving creature with overrides:", overrides);
    const creatureDataToSave = {
      name: creatureName,
      level,
      power,
      type,
      role,
      size,
      selectedFeatureIds: selectedFeatures.map(f => f.id),
      statModifiers: overrides, // Save the deltas/sets
      votes: 0,
      createdAt: serverTimestamp(),
      ownerId: currentUser.uid,
      submittedBy: currentUser.email,
      votes: 0,
    };
    try {
      const docRef = await addDoc(collection(db, "savedCreatures"), creatureDataToSave);
      console.log("Creature saved with ID: ", docRef.id);
      alert(`${creatureName} saved successfully!`);
    } catch (e) { console.error("Error saving doc: ", e); alert(`Failed to save ${creatureName}.`); }
  };

  // --- Handler for "Export" ---
  const handleExport = () => { /* ... same as your existing logic ... */
    if (statBlock) {
      const dataToExport = { // Export a cleaner version if desired
        inputs: { name: creatureName, level, power, type, role, size },
        selectedFeatureIds: selectedFeatures.map(f => f.id),
        statModifiers: overrides,
        generatedDisplay: statBlock.Display
      };
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(creatureName || 'creature').replace(/\s+/g, '_')}_data.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else { alert("No stats to export."); }
  };

  // Log selected features when they change (for debugging)
  // useEffect(() => {
  //   console.log("Current selectedFeatures:", selectedFeatures.map(f => ({ id: f.id, name: f.name })));
  // }, [selectedFeatures]);
  // useEffect(() => {
  //   console.log("Current Overrides:", overrides);
  // }, [overrides]);


  return (
    <>
      <div className="app-container">
        <InputPanel
          creatureName={creatureName} setCreatureName={setCreatureName}
          level={level} setLevel={setLevel}
          power={power} setPower={setPower}
          type={type} setType={setType}
          role={role} setRole={setRole}
          size={size} setSize={setSize}
          allFeatures={allFeatures}
          availableTypeFeatures={availableTypeFeatures}
          availableRoleFeatures={availableRoleFeatures}
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
          fullStatBlock={statBlock} // This now contains CalculatedBeforeDeltas, FinalWithDeltas, Display
          onStatOverride={handleStatOverride} // Pass the handler
          onRemoveFeature={handleRemoveSelectedFeature} // Pass this for removing features from stat block
        />
        <RightBar
          onCreateNew={handleCreateNew}
          onSave={handleSave}
          onExport={handleExport}
        />
      </div>
    </>
  );
}

export default CreatureCreatorPage;