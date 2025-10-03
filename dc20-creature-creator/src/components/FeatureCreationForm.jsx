// src/components/FeatureCreationForm.jsx
import React, { useState, useEffect } from 'react';
import './FeatureCreationForm.css';

const FEATURE_KINDS = [
  { id: 'feature', label: 'Passive Feature' },
  { id: 'action', label: 'Action' },
  { id: 'attack_enhancement', label: 'Attack Enhancement' },
  { id: 'reaction', label: 'Reaction' },
];

const ACTION_METHODS = [
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
  { id: 'Mig', label: 'Might (Mig)' },
  { id: 'Agi', label: 'Agility (Agi)' },
  { id: 'Int', label: 'Intelligence (Int)' },
  { id: 'Cha', label: 'Charisma (Cha)' },
  { id: 'Physical', label: 'Physical' },
];

const DURATIONS = [
  { id: '', label: 'Instant / Until Triggered / Special' },
  { id: 'end of your next turn', label: 'End of your next turn' },
  { id: 'start of your next turn', label: 'Start of your next turn' },
  { id: 'end of its next turn', label: "End of target's next turn" },
  { id: 'start of its next turn', label: "Start of target's next turn" },
  { id: '1 round', label: '1 Round' },
  { id: '1 minute', label: '1 Minute' },
  { id: '1 minute (target saves each turn)', label: '1 Minute (target saves each turn)' },
];

const parseNumberOrZero = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const FeatureCreationForm = ({ onCancel, onAddOnlyToCreature, onSaveAndAddToCreature }) => {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('feature');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [costAP, setCostAP] = useState('');
  const [costMP, setCostMP] = useState('');
  const [costSP, setCostSP] = useState('');
  const [balanceCost, setBalanceCost] = useState('1');
  const [method, setMethod] = useState('');
  const [damageBonus, setDamageBonus] = useState('');
  const [damageType, setDamageType] = useState('');
  const [range, setRange] = useState('');
  const [defense, setDefense] = useState('');
  const [target, setTarget] = useState('');
  const [duration, setDuration] = useState('');
  const [saveAttribute, setSaveAttribute] = useState('');
  const [saveEffect, setSaveEffect] = useState('');
  const [conditionApplied, setConditionApplied] = useState('');
  const [healingAmount, setHealingAmount] = useState('');
  const [trigger, setTrigger] = useState('');

  useEffect(() => {
    setMethod('');
    setDamageBonus('');
    setDamageType('');
    setRange('');
    setDefense('');
    setTarget('');
    setDuration('');
    setSaveAttribute('');
    setSaveEffect('');
    setConditionApplied('');
    setHealingAmount('');
    setTrigger('');

    if (kind === 'feature') {
      setCostAP('');
      setCostMP('');
      setCostSP('');
    }
  }, [kind]);

  const resetForm = () => {
    setName('');
    setKind('feature');
    setSummary('');
    setTags('');
    setCostAP('');
    setCostMP('');
    setCostSP('');
    setBalanceCost('1');
    setMethod('');
    setDamageBonus('');
    setDamageType('');
    setRange('');
    setDefense('');
    setTarget('');
    setDuration('');
    setSaveAttribute('');
    setSaveEffect('');
    setConditionApplied('');
    setHealingAmount('');
    setTrigger('');
  };

  const buildCostObject = () => {
    const cost = {};
    const ap = parseNumberOrZero(costAP);
    const mp = parseNumberOrZero(costMP);
    const sp = parseNumberOrZero(costSP);

    if (ap > 0) cost.ap = ap;
    if (mp > 0) cost.mp = mp;
    if (sp > 0) cost.sp = sp;

    return cost;
  };

  const buildEffects = () => {
    const effects = [];
    const trimmedCondition = conditionApplied.trim();
    if (trimmedCondition) {
      effects.push({
        type: 'condition',
        name: trimmedCondition,
        duration: duration || '',
      });
    }
    const trimmedHealing = healingAmount.trim();
    if (trimmedHealing) {
      effects.push({ type: 'healing', amount: trimmedHealing });
    }
    return effects;
  };

  const constructFeatureData = () => {
    const numericBalanceCost = Math.max(0, parseFloat(balanceCost) || 1);
    const normalizedTags = tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    const cost = buildCostObject();
    const effects = buildEffects();
    const damageBonusNumber = parseNumberOrZero(damageBonus);

    const featureData = {
      name: name.trim(),
      kind,
      summary: summary.trim(),
      tags: normalizedTags,
      balanceCost: numericBalanceCost,
    };

    if (Object.keys(cost).length > 0 || kind === 'action' || kind === 'reaction' || kind === 'attack_enhancement') {
      featureData.cost = cost;
    }

    const damageData = {
      bonus: damageBonusNumber,
      type: damageType.trim(),
      base: null,
    };

    const isAttackLike = kind === 'action' && method && (method.includes('Attack') || method.includes('Spell'));
    if (isAttackLike || (kind === 'attack_enhancement' && (damageBonus || damageType))) {
      featureData.damage = damageData;
    }

    const saveData = {
      attribute: saveAttribute,
      dcMod: 0,
      effect: saveEffect.trim(),
    };

    if (kind !== 'feature') {
      featureData.method = method;
      featureData.range = range.trim();
      featureData.target = target.trim();
      if (defense) {
        featureData.defense = defense;
      }
      featureData.save = saveData;
      featureData.trigger = trigger.trim();
    }

    if (effects.length > 0) {
      featureData.effects = effects;
    }

    return featureData;
  };

  const handleAdd = () => {
    const data = constructFeatureData();
    onAddOnlyToCreature?.(data);
    resetForm();
  };

  const handleSaveAndAdd = async () => {
    const data = constructFeatureData();
    const success = await onSaveAndAddToCreature?.(data);
    if (success) {
      resetForm();
    }
  };

  const isAction = kind === 'action';
  const isAttackEnhancement = kind === 'attack_enhancement';
  const isReaction = kind === 'reaction';

  const showCostFields = isAction || isAttackEnhancement || isReaction;
  const showMethodField = isAction || isReaction;
  const showAttackSpecificFields = isAction && method && (method.includes('Attack') || method.includes('Spell'));
  const showHealingField = isAction && method === 'Healing';
  const showSaveFields = isAction || isAttackEnhancement || isReaction;
  const showDurationField = (isAction || isAttackEnhancement || isReaction) && !!conditionApplied;
  const showTriggerField = isReaction || isAttackEnhancement;

  return (
    <div className="feature-creation-form">
      <h3>Create Custom Trait</h3>

      <div className="form-group">
        <label htmlFor="customFeatureName">Name:</label>
        <input
          type="text"
          id="customFeatureName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Unique Name"
        />
      </div>

      <div className="form-group button-group">
        <label>Category:</label>
        {FEATURE_KINDS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`category-button ${kind === option.id ? 'active' : ''}`}
            onClick={() => setKind(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="form-group">
        <label htmlFor="customFeatureDesc">Summary:</label>
        <textarea
          id="customFeatureDesc"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows="3"
          placeholder="What this trait does..."
        />
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
        <small className="form-helper-text">
          Set to 1 for a standard-strength feature. Increase the value for stronger effects.
        </small>
      </div>

      {showCostFields && (
        <fieldset className="form-section">
          <legend>Costs</legend>
          <div className="cost-inputs">
            <div>
              <label>AP:</label>
              <input type="number" min="0" value={costAP} onChange={(e) => setCostAP(e.target.value)} />
            </div>
            <div>
              <label>MP:</label>
              <input type="number" min="0" value={costMP} onChange={(e) => setCostMP(e.target.value)} />
            </div>
            <div>
              <label>SP:</label>
              <input type="number" min="0" value={costSP} onChange={(e) => setCostSP(e.target.value)} />
            </div>
          </div>
        </fieldset>
      )}

      {showMethodField && (
        <fieldset className="form-section">
          <legend>Action Details</legend>
          <div className="form-group">
            <label>Method:</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {ACTION_METHODS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Range:</label>
            <input
              type="text"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="Melee, 5 spaces, Self"
            />
          </div>
          <div className="form-group">
            <label>Defense Targeted:</label>
            <select value={defense} onChange={(e) => setDefense(e.target.value)}>
              <option value="">Select...</option>
              <option value="PD">PD</option>
              <option value="AD">AD</option>
            </select>
          </div>
          <div className="form-group">
            <label>Target:</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="1 creature, Cone, All allies"
            />
          </div>
        </fieldset>
      )}

      {showAttackSpecificFields && (
        <fieldset className="form-section">
          <legend>Attack Properties</legend>
          <div className="form-group">
            <label>Damage Modifier:</label>
            <input
              type="number"
              value={damageBonus}
              onChange={(e) => setDamageBonus(e.target.value)}
              placeholder="0, 1, -2"
            />
          </div>
          <div className="form-group">
            <label>Damage Type:</label>
            <input
              type="text"
              value={damageType}
              onChange={(e) => setDamageType(e.target.value)}
              placeholder="physical, fire"
            />
          </div>
        </fieldset>
      )}

      {showHealingField && (
        <fieldset className="form-section">
          <legend>Healing Properties</legend>
          <div className="form-group">
            <label>Healing Amount:</label>
            <input
              type="text"
              value={healingAmount}
              onChange={(e) => setHealingAmount(e.target.value)}
              placeholder="5, MIG Mod"
            />
          </div>
        </fieldset>
      )}

      {(showSaveFields || showDurationField || showTriggerField) && (
        <fieldset className="form-section">
          <legend>Effects & Duration</legend>
          {showSaveFields && (
            <>
              <div className="form-group">
                <label>Target Save Attribute:</label>
                <select value={saveAttribute} onChange={(e) => setSaveAttribute(e.target.value)}>
                  {SAVE_ATTRIBUTES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Effect on Save:</label>
                <input
                  type="text"
                  value={saveEffect}
                  onChange={(e) => setSaveEffect(e.target.value)}
                  placeholder="half damage, negates"
                />
              </div>
              <div className="form-group">
                <label>Condition Applied:</label>
                <input
                  type="text"
                  value={conditionApplied}
                  onChange={(e) => setConditionApplied(e.target.value)}
                  placeholder="Stunned, Prone"
                />
              </div>
            </>
          )}
          {showDurationField && (
            <div className="form-group">
              <label>Duration:</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                {DURATIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showTriggerField && (
            <div className="form-group">
              <label>Trigger:</label>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="When hit, After you attack, Reaction to..."
              />
            </div>
          )}
        </fieldset>
      )}

      <div className="form-group">
        <label>Tags (comma-separated):</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="undead, buff, magical"
        />
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="button-cancel">
          Cancel
        </button>
        <button type="button" onClick={handleAdd} className="button-add">
          Add to Creature
        </button>
        <button type="button" onClick={handleSaveAndAdd} className="button-save">
          Save & Add to Creature
        </button>
      </div>
    </div>
  );
};

export default FeatureCreationForm;
