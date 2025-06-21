// src/components/FeatureCreationForm.jsx
import React, { useState, useEffect } from 'react';
import './FeatureCreationForm.css'; // Make sure to create/style this

const FEATURE_CATEGORIES = [
    { id: 'feature', label: 'Passive Feature' },
    { id: 'action', label: 'Action' },
    { id: 'attack_enhancement', label: 'Attack Enhancement' },
    { id: 'reaction', label: 'Reaction' },
    // Consider adding 'sense', 'resistance', 'immunity', 'language' if users *can* create these.
    // If not, keep them as admin-created only. For now, I'll stick to your core list.
];

const ACTION_TYPES = [
    { id: '', label: 'Select Action Type...' },
    { id: 'Melee Martial Attack', label: 'Melee Martial Attack' },
    { id: 'Ranged Martial Attack', label: 'Ranged Martial Attack' },
    { id: 'Melee Spell Attack', label: 'Melee Spell Attack' },
    { id: 'Ranged Spell Attack', label: 'Ranged Spell Attack' },
    { id: 'Buff', label: 'Buff' },
    { id: 'Debuff', label: 'Debuff' },
    { id: 'Healing', label: 'Healing' },
    { id: 'Utility', label: 'Utility' },
    // Add more specific action types as needed
];

const SAVE_ATTRIBUTES = [
    { id: '', label: 'None' },
    { id: 'Mig', label: 'Might (Mig)' },
    { id: 'Agi', label: 'Agility (Agi)' },
    { id: 'Int', label: 'Intelligence (Int)' },
    { id: 'Cha', label: 'Charisma (Cha)' },
    // Consider adding PD/AD if an effect can directly target these for non-damage effects
];

const DURATIONS = [
    { id: '', label: 'Instant / Until Triggered / Special' },
    { id: 'end of your next turn', label: "End of your next turn" },
    { id: 'start of your next turn', label: "Start of your next turn" },
    { id: 'end of its next turn', label: "End of target's next turn" }, // 'its' refers to target
    { id: 'start of its next turn', label: "Start of target's next turn" },
    { id: '1 round', label: "1 Round" },
    { id: '1 minute', label: "1 Minute" },
    { id: '1 minute (target saves each turn)', label: "1 Minute (target saves each turn)" },
    // Add more standard durations
];


const FeatureCreationForm = ({ onCancel, onAddOnlyToCreature, onSaveAndAddToCreature }) => {
    // --- Form State ---
    const [name, setName] = useState('');
    const [category, setCategory] = useState('feature');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState(''); // Comma-separated
    const [costAP, setCostAP] = useState(''); // Use string for empty input, parse to number later
    const [costMP, setCostMP] = useState('');
    const [costSP, setCostSP] = useState('');
    const [actionType, setActionType] = useState('');
    const [damageMod, setDamageMod] = useState('');
    const [damageType, setDamageType] = useState('');
    const [range, setRange] = useState('');
    const [targets, setTargets] = useState('');
    const [duration, setDuration] = useState('');
    const [saveAttribute, setSaveAttribute] = useState('');
    const [saveEffect, setSaveEffect] = useState('');
    const [conditionApplied, setConditionApplied] = useState('');
    const [healingAmount, setHealingAmount] = useState('');

    // Reset fields when category changes to prevent carrying over irrelevant data
    useEffect(() => {
        setActionType('');
        setDamageMod(''); setDamageType(''); setRange(''); setTargets('');
        setHealingAmount('');
        // Keep AP/MP/SP if switching between action-like categories
        if (category === 'feature') {
            setCostAP(''); setCostMP(''); setCostSP('');
            setSaveAttribute(''); setSaveEffect(''); setConditionApplied(''); setDuration('');
        }
    }, [category]);

    const resetForm = () => {
        setName(''); setCategory('feature'); setDescription(''); setTags('');
        setCostAP(''); setCostMP(''); setCostSP('');
        setActionType(''); setDamageMod(''); setDamageType(''); setRange('');
        setTargets(''); setDuration(''); setSaveAttribute(''); setSaveEffect('');
        setConditionApplied(''); setHealingAmount('');
    };

    const constructFeatureData = () => {
        let costStringParts = [];
        const numAP = parseInt(costAP) || 0;
        const numMP = parseInt(costMP) || 0;
        const numSP = parseInt(costSP) || 0;

        if (numAP > 0) costStringParts.push(`${numAP} AP`);
        if (numMP > 0) costStringParts.push(`${numMP} MP`);
        if (numSP > 0) costStringParts.push(`${numSP} SP`);
        let finalCostString = costStringParts.join(' + ');

        if (!finalCostString && category === 'reaction') {
            finalCostString = 'Reaction'; // Default cost text for reaction if no AP/MP/SP
        }


        return {
            name: name.trim(),
            category,
            description: description.trim(),
            tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
            cost: finalCostString || null,
            costAP: numAP,
            costMP: numMP,
            costSP: numSP,
            actionType: category === 'action' ? actionType : null,
            damageMod: (category === 'action' && (actionType.includes('Attack') || actionType.includes('Spell'))) ? (parseInt(damageMod) || 0) : null,
            damageType: (category === 'action' && (actionType.includes('Attack') || actionType.includes('Spell'))) ? damageType.trim() : null,
            range: (category === 'action' || category === 'attack_enhancement' || (category === 'reaction' && actionType)) ? range.trim() : null,
            targets: (category === 'action' || category === 'attack_enhancement' || (category === 'reaction' && actionType)) ? targets.trim() : null,
            duration: duration.trim() || null,
            saveAttribute: saveAttribute || null,
            saveEffect: saveAttribute ? saveEffect.trim() : null, // Only relevant if there's a save
            conditionApplied: conditionApplied.trim() || null,
            healingAmount: (category === 'action' && actionType === 'Healing') ? healingAmount.trim() : null,
        };
    };

    const handleAdd = () => {
        if (!name.trim() || !category) { alert("Name and Category are required."); return; }
        const featureData = constructFeatureData();
        onAddOnlyToCreature(featureData);
        resetForm();
        onCancel();
    };

    const handleSaveAndAdd = async () => {
        if (!name.trim() || !category) { alert("Name and Category are required."); return; }
        const featureData = constructFeatureData();
        const success = await onSaveAndAddToCreature(featureData);
        if (success) {
            resetForm();
            onCancel();
        }
    };

    // --- Conditional rendering flags ---
    const isAction = category === 'action';
    const isAttackEnhancement = category === 'attack_enhancement';
    const isReaction = category === 'reaction';
    const isPassiveFeature = category === 'feature';

    const showCostFields = isAction || isAttackEnhancement || isReaction;
    const showActionTypeField = isAction;
    const showAttackSpecificFields = isAction && actionType && (actionType.includes('Attack') || actionType.includes('Spell'));
    const showHealingField = isAction && actionType === 'Healing';
    const showSaveFields = isAction || isAttackEnhancement || isReaction; // Most actions/reactions can cause saves
    const showDurationField = isAction || isAttackEnhancement || isReaction || conditionApplied; // Duration often linked to conditions or ongoing effects


    return (
        <div className="feature-creation-form">
            <h3>Create Custom Trait</h3> {/* More generic title */}

            <div className="form-group">
                <label htmlFor="customFeatureName">Name:</label>
                <input type="text" id="customFeatureName" value={name} onChange={e => setName(e.target.value)} placeholder="Unique Name" />
            </div>

            <div className="form-group button-group">
                <label>Category:</label>
                {FEATURE_CATEGORIES.map(cat => (
                    <button
                        key={cat.id} type="button"
                        className={`category-button ${category === cat.id ? 'active' : ''}`}
                        onClick={() => setCategory(cat.id)}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="form-group">
                <label htmlFor="customFeatureDesc">Description:</label>
                <textarea id="customFeatureDesc" value={description} onChange={e => setDescription(e.target.value)} rows="3" placeholder="What this trait does..."></textarea>
            </div>

            {/* --- Cost Inputs --- */}
            {showCostFields && (
                <fieldset className="form-section">
                    <legend>Costs</legend>
                    <div className="cost-inputs">
                        <div><label>AP:</label><input type="number" min="0" value={costAP} onChange={e => setCostAP(e.target.value)} /></div>
                        <div><label>MP:</label><input type="number" min="0" value={costMP} onChange={e => setCostMP(e.target.value)} /></div>
                        <div><label>SP:</label><input type="number" min="0" value={costSP} onChange={e => setCostSP(e.target.value)} /></div>
                    </div>
                </fieldset>
            )}

            {/* --- Action Specific --- */}
            {showActionTypeField && (
                <fieldset className="form-section">
                    <legend>Action Details</legend>
                    <div className="form-group">
                        <label>Action Type:</label>
                        <select value={actionType} onChange={e => setActionType(e.target.value)}>
                            {ACTION_TYPES.map(at => <option key={at.id} value={at.id}>{at.label}</option>)}
                        </select>
                    </div>
                    {/* Range & Targets are common for many actions */}
                    <div className="form-group"><label>Range:</label><input type="text" value={range} onChange={e => setRange(e.target.value)} placeholder="Melee, 5 spaces, Self" /></div>
                    <div className="form-group"><label>Targets:</label><input type="text" value={targets} onChange={e => setTargets(e.target.value)} placeholder="1 creature, Cone, All allies" /></div>
                </fieldset>
            )}

            {/* --- Attack Specific --- */}
            {showAttackSpecificFields && (
                <fieldset className="form-section">
                    <legend>Attack Properties</legend>
                    <div className="form-group"><label>Damage Modifier:</label><input type="number" value={damageMod} onChange={e => setDamageMod(e.target.value)} placeholder="0, 1, -2" /></div>
                    <div className="form-group"><label>Damage Type:</label><input type="text" value={damageType} onChange={e => setDamageType(e.target.value)} placeholder="physical, fire" /></div>
                </fieldset>
            )}

            {/* --- Healing Specific --- */}
            {showHealingField && (
                <fieldset className="form-section">
                    <legend>Healing Properties</legend>
                    <div className="form-group"><label>Healing Amount:</label><input type="text" value={healingAmount} onChange={e => setHealingAmount(e.target.value)} placeholder="5, MIG Mod" /></div>
                </fieldset>
            )}

            {/* --- Save, Condition, Duration --- */}
            {(showSaveFields || showDurationField) && (
                <fieldset className="form-section">
                    <legend>Effects & Duration</legend>
                    {showSaveFields && (
                        <>
                            <div className="form-group"><label>Target Save Attribute:</label>
                                <select value={saveAttribute} onChange={e => setSaveAttribute(e.target.value)}>
                                    {SAVE_ATTRIBUTES.map(sa => <option key={sa.id} value={sa.id}>{sa.label}</option>)}
                                </select>
                            </div>
                            {saveAttribute && <div className="form-group"><label>Effect on Save:</label><input type="text" value={saveEffect} onChange={e => setSaveEffect(e.target.value)} placeholder="half damage, negates" /></div>}
                            <div className="form-group"><label>Condition Applied:</label><input type="text" value={conditionApplied} onChange={e => setConditionApplied(e.target.value)} placeholder="Stunned, Prone" /></div>
                        </>
                    )}
                    {showDurationField && (
                        <div className="form-group"><label>Duration:</label>
                            <select value={duration} onChange={e => setDuration(e.target.value)}>
                                {DURATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                            </select>
                        </div>
                    )}
                </fieldset>
            )}

            <div className="form-group">
                <label>Tags (comma-separated):</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="undead, buff, magical" />
            </div>

            <div className="form-actions">
                <button type="button" onClick={onCancel} className="button-cancel">Cancel</button>
                <button type="button" onClick={handleAdd} className="button-add">Add to Creature</button>
                <button type="button" onClick={handleSaveAndAdd} className="button-save">Save & Add to Creature</button>
            </div>
        </div>
    );
};

export default FeatureCreationForm;