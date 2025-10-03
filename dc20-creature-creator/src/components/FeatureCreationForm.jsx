import React, { useEffect, useState } from 'react';
import './FeatureCreationForm.css';

const FEATURE_KINDS = [
  { id: 'feature', label: 'Passive Feature' },
  { id: 'action', label: 'Action' },
  { id: 'attack_enhancement', label: 'Attack Enhancement' },
  { id: 'reaction', label: 'Reaction' },
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
  { id: 'end of your next turn', label: 'End of your next turn' },
  { id: 'start of your next turn', label: 'Start of your next turn' },
  { id: 'end of its next turn', label: "End of target's next turn" },
  { id: 'start of its next turn', label: "Start of target's next turn" },
  { id: '1 round', label: '1 Round' },
  { id: '1 minute', label: '1 Minute' },
  { id: '1 minute (target saves each turn)', label: '1 Minute (target saves each turn)' },
];

const parseNumberOrNull = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeTags = (tagsInput) =>
  tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());

const FeatureCreationForm = ({ onCancel, onAddFeature, onSaveFeatureToDB }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('feature');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [balanceCost, setBalanceCost] = useState('1');
  const [costInputs, setCostInputs] = useState({ ap: '', mp: '', sp: '' });
  const [method, setMethod] = useState('Passive');
  const [range, setRange] = useState('');
  const [target, setTarget] = useState('');
  const [defense, setDefense] = useState('');
  const [damageMod, setDamageMod] = useState('');
  const [damageType, setDamageType] = useState('');
  const [duration, setDuration] = useState('');
  const [saveAttribute, setSaveAttribute] = useState('');
  const [saveEffect, setSaveEffect] = useState('');
  const [conditionApplied, setConditionApplied] = useState('');
  const [healingAmount, setHealingAmount] = useState('');
  const [trigger, setTrigger] = useState('');

  useEffect(() => {
    if (category === 'feature') {
      setMethod('Passive');
      setCostInputs({ ap: '', mp: '', sp: '' });
      setRange('');
      setTarget('');
      setDefense('');
      setDamageMod('');
      setDamageType('');
      setDuration('');
      setSaveAttribute('');
      setSaveEffect('');
      setConditionApplied('');
      setHealingAmount('');
      setTrigger('');
    } else {
      setMethod('');
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
      if (category !== 'reaction') {
        setTrigger('');
      }
    }
  }, [category]);

  const resetForm = () => {
    setName('');
    setCategory('feature');
    setSummary('');
    setTags('');
    setBalanceCost('1');
    setCostInputs({ ap: '', mp: '', sp: '' });
    setMethod('Passive');
    setRange('');
    setTarget('');
    setDefense('');
    setDamageMod('');
    setDamageType('');
    setDuration('');
    setSaveAttribute('');
    setSaveEffect('');
    setConditionApplied('');
    setHealingAmount('');
    setTrigger('');
  };

  const constructFeatureData = () => {
    const trimmedName = name.trim();
    const trimmedSummary = summary.trim();
    const parsedBalance = parseFloat(balanceCost);
    const normalizedBalance = Number.isNaN(parsedBalance) ? 1 : Math.max(parsedBalance, 0);

    const cost = {};
    ['ap', 'mp', 'sp'].forEach((key) => {
      const parsed = parseNumberOrNull(costInputs[key]);
      if (parsed !== null && parsed > 0) {
        cost[key] = parsed;
      }
    });

    const featureData = {
      name: trimmedName,
      category,
      kind: category,
      summary: trimmedSummary,
      description: trimmedSummary,
      balanceCost: normalizedBalance,
      tags: normalizeTags(tags),
    };

    if (Object.keys(cost).length > 0) {
      featureData.cost = cost;
      featureData.costAP = cost.ap ?? 0;
      featureData.costMP = cost.mp ?? 0;
      featureData.costSP = cost.sp ?? 0;
    }

    if (category === 'feature') {
      featureData.effects = [];
    } else {
      const trimmedMethod = method.trim();
      const methodLower = trimmedMethod.toLowerCase();
      const isHealingMethod = methodLower.includes('healing');
      const rangeValue = parseNumberOrNull(range);
      const trimmedTarget = target.trim();
      const trimmedDefense = defense.trim();
      const trimmedTrigger = trigger.trim();
      const parsedDamageMod = parseNumberOrNull(damageMod);
      const trimmedDamageType = damageType.trim();
      const trimmedCondition = conditionApplied.trim();
      const trimmedSaveEffect = saveEffect.trim();
      const trimmedHealing = healingAmount.trim();

      featureData.method = trimmedMethod || null;
      featureData.actionType = trimmedMethod || null;

      if (rangeValue !== null) {
        featureData.range = rangeValue;
        featureData.rangeValue = rangeValue;
        featureData.rangeUnit = 'spaces';
      }

      if (trimmedTarget) {
        featureData.target = trimmedTarget;
      }

      if (trimmedDefense) {
        featureData.defense = trimmedDefense;
        featureData.targetsDefense = trimmedDefense;
      }

      if (parsedDamageMod !== null || trimmedDamageType) {
        featureData.damage = {};
        if (parsedDamageMod !== null) {
          featureData.damage.modifier = parsedDamageMod;
          featureData.damageMod = parsedDamageMod;
        }
        if (trimmedDamageType) {
          featureData.damage.type = trimmedDamageType;
          featureData.damageType = trimmedDamageType;
        }
      }

      if (saveAttribute) {
        featureData.saveAttribute = saveAttribute;
        featureData.save = {
          attribute: saveAttribute,
          effect: trimmedSaveEffect || null,
          dcMod: 0,
        };
      }

      if (trimmedSaveEffect) {
        featureData.saveEffect = trimmedSaveEffect;
      }

      if (trimmedCondition) {
        featureData.conditionApplied = trimmedCondition;
      }

      if (duration) {
        featureData.conditionDuration = duration;
        featureData.duration = duration;
      }

      if (isHealingMethod && trimmedHealing) {
        featureData.healingAmount = trimmedHealing;
      }

      if (category === 'reaction' && trimmedTrigger) {
        featureData.trigger = trimmedTrigger;
      }
    }

    return featureData;
  };

  const handleAdd = () => {
    const data = constructFeatureData();
    onAddFeature?.(data);
    resetForm();
  };

  const handleSaveAndAdd = async () => {
    const data = constructFeatureData();
    const success = await onSaveFeatureToDB?.(data);
    if (success) {
      resetForm();
    }
  };

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
  const showDurationField = showSaveFields || !!conditionApplied;
  const showTriggerField = isReaction;

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
            className={`category-button ${category === option.id ? 'active' : ''}`}
            onClick={() => setCategory(option.id)}
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

      {showMethodField && (
        <fieldset className="form-section">
          <legend>Action Details</legend>
          <div className="form-group">
            <label>Method:</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
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
          {showTriggerField && (
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

      {showAttackSpecificFields && (
        <fieldset className="form-section">
          <legend>Attack Properties</legend>
          <div className="form-group">
            <label>Damage Modifier:</label>
            <input
              type="number"
              value={damageMod}
              onChange={(e) => setDamageMod(e.target.value)}
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

      {(showSaveFields || showDurationField) && (
        <fieldset className="form-section">
          <legend>Effects &amp; Duration</legend>
          {showSaveFields && (
            <>
              <div className="form-group">
                <label>Save Attribute:</label>
                <select value={saveAttribute} onChange={(e) => setSaveAttribute(e.target.value)}>
                  {SAVE_ATTRIBUTES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {saveAttribute && (
                <div className="form-group">
                  <label>Effect on Save:</label>
                  <input
                    type="text"
                    value={saveEffect}
                    onChange={(e) => setSaveEffect(e.target.value)}
                    placeholder="half damage, negates"
                  />
                </div>
              )}
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
          Save &amp; Add to Creature
        </button>
      </div>
    </div>
  );
};

export default FeatureCreationForm;
