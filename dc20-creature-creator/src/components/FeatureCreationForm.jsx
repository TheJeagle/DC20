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

const METHOD_OPTIONS = [
    { id: '', label: 'Select Method...' },
    { id: 'Melee Martial Attack', label: 'Melee Martial Attack' },
    { id: 'Ranged Martial Attack', label: 'Ranged Martial Attack' },
    { id: 'Melee Spell Attack', label: 'Melee Spell Attack' },
    { id: 'Ranged Spell Attack', label: 'Ranged Spell Attack' },
    { id: 'Buff', label: 'Buff' },
    { id: 'Debuff', label: 'Debuff' },
    { id: 'Healing', label: 'Healing' },
    { id: 'Utility', label: 'Utility' },
];

const SAVE_ATTRIBUTES = [
    { id: '', label: 'None' },
    { id: 'Might', label: 'Might' },
    { id: 'Agility', label: 'Agility' },
    { id: 'Intelligence', label: 'Intelligence' },
    { id: 'Charisma', label: 'Charisma' },
    { id: 'Physical', label: 'Physical' },
    { id: 'Mental', label: 'Mental' },
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
    const [costInputs, setCostInputs] = useState({ ap: '', mp: '', sp: '' });
    const [balanceCost, setBalanceCost] = useState('1');
    const [method, setMethod] = useState('Passive');
    const [damageMod, setDamageMod] = useState('');
    const [damageType, setDamageType] = useState('');
    const [range, setRange] = useState('');
    const [target, setTarget] = useState('');
    const [defense, setDefense] = useState('');
    const [duration, setDuration] = useState('');
    const [saveAttribute, setSaveAttribute] = useState('');
    const [saveEffect, setSaveEffect] = useState('');
    const [conditionApplied, setConditionApplied] = useState('');
    const [healingAmount, setHealingAmount] = useState('');
    const [trigger, setTrigger] = useState('');

    // Reset fields when category changes to prevent carrying over irrelevant data
    useEffect(() => {
        setMethod(category === 'feature' ? 'Passive' : '');
        setDamageMod('');
        setDamageType('');
        setRange('');
        setTarget('');
        setDefense('');
        setHealingAmount('');
        if (category === 'feature') {
            setCostInputs({ ap: '', mp: '', sp: '' });
            setSaveAttribute('');
            setSaveEffect('');
            setConditionApplied('');
            setDuration('');
        }
        if (category !== 'reaction') {
            setTrigger('');
        }
    }, [category]);

    const resetForm = () => {
        setName('');
        setCategory('feature');
        setDescription('');
        setTags('');
        setCostInputs({ ap: '', mp: '', sp: '' });
        setBalanceCost('1');
        setMethod('Passive');
        setDamageMod('');
        setDamageType('');
        setRange('');
        setTarget('');
        setDefense('');
        setDuration('');
        setSaveAttribute('');
        setSaveEffect('');
        setConditionApplied('');
        setHealingAmount('');
        setTrigger('');
    };

    const constructFeatureData = () => {
        const numAP = parseInt(costInputs.ap, 10) || 0;
        const numMP = parseInt(costInputs.mp, 10) || 0;
        const numSP = parseInt(costInputs.sp, 10) || 0;
        const parsedBalanceCost = parseFloat(balanceCost);
        const numericBalanceCost = Number.isNaN(parsedBalanceCost) ? 1 : Math.max(0, parsedBalanceCost);

        const costObject = {};
        if (numAP > 0) costObject.ap = numAP;
        if (numMP > 0) costObject.mp = numMP;
        if (numSP > 0) costObject.sp = numSP;

        const parsedRange = parseInt(range, 10);
        const normalizedRange = Number.isNaN(parsedRange) ? undefined : Math.max(0, parsedRange);

        const parsedDamageModifier = parseInt(damageMod, 10);
        const normalizedDamageModifier = Number.isNaN(parsedDamageModifier) ? undefined : parsedDamageModifier;

        const trimmedSummary = description.trim();
        const trimmedTarget = target.trim();
        const trimmedMethod = method.trim();
        const normalizedMethodLower = trimmedMethod.toLowerCase();
        const isHealingMethod = normalizedMethodLower.includes('healing');

        const featureData = {
            name: name.trim(),
            category,
            description: trimmedSummary,
            summary: trimmedSummary,
            tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
            method: trimmedMethod || (category === 'feature' ? 'Passive' : null),
            cost: Object.keys(costObject).length > 0 ? costObject : null,
            duration: duration.trim() || null,
            save: saveAttribute || null,
            saveEffect: saveAttribute ? saveEffect.trim() : null,
            conditionApplied: conditionApplied.trim() || null,
            healingAmount: (category === 'action' && isHealingMethod) ? healingAmount.trim() : null,
            balanceCost: numericBalanceCost,
            trigger: category === 'reaction' ? (trigger.trim() || null) : null,
        };

        if (category === 'feature') {
            featureData.effects = [];
        }

        if (category === 'action' || category === 'attack_enhancement' || category === 'reaction') {
            if (trimmedTarget) {
                featureData.target = trimmedTarget;
            }
            if (normalizedRange !== undefined) {
                featureData.range = normalizedRange;
            }
        }

        if ((category === 'action' || category === 'reaction') && (normalizedDamageModifier !== undefined || damageType.trim())) {
            featureData.damage = {
                modifier: normalizedDamageModifier || 0,
                type: damageType.trim() || null,
            };
        }

        if ((category === 'action' || category === 'reaction') && defense) {
            featureData.defense = defense;
        }

        return featureData;
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

    const methodLower = (method || '').toLowerCase();
    const isAttackMethod = methodLower.includes('attack') || methodLower.includes('spell');
    const isHealingMethod = methodLower.includes('healing');
    const showCostFields = isAction || isAttackEnhancement || isReaction;
    const showMethodField = category !== 'feature';
    const showTargetingFields = isAction || isAttackEnhancement || isReaction;
    const showAttackSpecificFields = (isAction || isReaction) && isAttackMethod;
    const showDefenseField = (isAction || isReaction) && isAttackMethod;
    const showHealingField = isAction && isHealingMethod;
    const showSaveFields = isAction || isAttackEnhancement || isReaction;
    const showDurationField = isAction || isAttackEnhancement || isReaction || conditionApplied;


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

            <div className="form-group">
                <label htmlFor="customFeatureBalanceCost">Balance Cost:</label>
                <input
                    type="number"
                    id="customFeatureBalanceCost"
                    min="0"
                    step="0.5"
                    value={balanceCost}
                    onChange={(e) => setBalanceCost(e.target.value)}
                />
                <small className="form-helper-text">Set to 1 for a standard-strength feature. Increase the value for stronger effects.</small>
            </div>

            {/* --- Cost Inputs --- */}
            {showCostFields && (
                <fieldset className="form-section">
                    <legend>Costs</legend>
                    <div className="cost-inputs">
                        <div>
                            <label>AP:</label>
                            <input
                                type="number"
                                min="0"
                                value={costInputs.ap}
                                onChange={(e) => setCostInputs((prev) => ({ ...prev, ap: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label>MP:</label>
                            <input
                                type="number"
                                min="0"
                                value={costInputs.mp}
                                onChange={(e) => setCostInputs((prev) => ({ ...prev, mp: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label>SP:</label>
                            <input
                                type="number"
                                min="0"
                                value={costInputs.sp}
                                onChange={(e) => setCostInputs((prev) => ({ ...prev, sp: e.target.value }))}
                            />
                        </div>
                    </div>
                </fieldset>
            )}

            {/* --- Method, Targeting, and Reaction Details --- */}
            {showMethodField && (
                <fieldset className="form-section">
                    <legend>Action Details</legend>
                    <div className="form-group">
                        <label>Method:</label>
                        <select value={method} onChange={(e) => setMethod(e.target.value)}>
                            {METHOD_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {showDefenseField && (
                        <div className="form-group">
                            <label>Defense:</label>
                            <select value={defense} onChange={(e) => setDefense(e.target.value)}>
                                <option value="">Select defense...</option>
                                <option value="PD">PD</option>
                                <option value="AD">AD</option>
                            </select>
                        </div>
                    )}
                    {showTargetingFields && (
                        <>
                            <div className="form-group">
                                <label>Target:</label>
                                <input
                                    type="text"
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                    placeholder="one creature, cone, all allies"
                                />
                            </div>
                            <div className="form-group">
                                <label>Range (spaces):</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={range}
                                    onChange={(e) => setRange(e.target.value)}
                                    placeholder="Leave blank for default"
                                />
                            </div>
                        </>
                    )}
                    {isReaction && (
                        <div className="form-group">
                            <label>Trigger:</label>
                            <input
                                type="text"
                                value={trigger}
                                onChange={(e) => setTrigger(e.target.value)}
                                placeholder="When an ally within 6 spaces is hit..."
                            />
                        </div>
                    )}
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
                            <div className="form-group"><label>Save Attribute:</label>
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