// src/components/StatBlockPanel.jsx
import React, { forwardRef } from 'react';
import './StatBlockPanel.css'; // Main CSS for the stat block
import EditableField from './EditableField';
import ActionInlineDisplay from './ActionInlineDisplay';
import HoverRemoveButton from './HoverRemoveButton';
import {
    GiHeartPlus, GiRosaShield, GiCrownedExplosion,
    GiStrong, GiWalkingBoot, GiBrain, GiCharacter,
    GiMagicSwirl, GiCrossedSwords, GiUpgrade, GiReturnArrow, GiSandsOfTime
} from 'react-icons/gi';

const StatBlockPanel = forwardRef(
    (
        {
            fullStatBlock,
            onStatOverride,
            onRemoveFeature,
            onActionUpdate,
            onDefaultActionUpdate,
            generatedDefaultActions = [],
        },
        ref,
    ) => {
        const raw = fullStatBlock?.raw;
        const display = fullStatBlock?.display;
        const derived = fullStatBlock?.derived;
        const baseSnapshot = derived?.snapshots?.beforeOverrides;

        if (!raw || !display || !baseSnapshot) {
            return <div className="stat-block-panel" ref={ref}><p>Calculating stats...</p></div>;
        }

        const { Name, Level, Type, Role, Power } = raw; // Root level info
        const finalRaw = raw; // For finding original features for removal

        const defaultAttacksRaw = Array.isArray(finalRaw?.DefaultAttacks) ? finalRaw.DefaultAttacks : [];
        const defaultDisplayAttacks = Array.isArray(display?.Combat?.Attacks)
            ? display.Combat.Attacks.filter((a) => !a.originalFeatureId)
            : [];

        const normalizeCost = (source = {}) => {
            if (source.cost && typeof source.cost === 'object') {
                return source.cost;
            }
            const legacy = {};
            if (source.costAP > 0) legacy.ap = source.costAP;
            if (source.costMP > 0) legacy.mp = source.costMP;
            if (source.costSP > 0) legacy.sp = source.costSP;
            return Object.keys(legacy).length > 0 ? legacy : null;
        };

        const normalizeRange = (source = {}) => {
            const explicitValue =
                typeof source.rangeValue === 'number' && Number.isFinite(source.rangeValue)
                    ? source.rangeValue
                    : undefined;
            const explicitUnit = source.rangeUnit;
            const rawRange = source.range ?? source.rangeText;

            if (rawRange && typeof rawRange === 'object') {
                const value =
                    typeof rawRange.value === 'number' && Number.isFinite(rawRange.value)
                        ? rawRange.value
                        : explicitValue;
                const unit = rawRange.unit || explicitUnit;
                const text =
                    rawRange.text ||
                    `${value ?? ''}${value != null && unit ? ` ${unit}` : unit ? ` ${unit}` : ''}`.trim();
                return {
                    range: { ...rawRange, text },
                    rangeValue: value,
                    rangeUnit: unit,
                };
            }

            if (typeof rawRange === 'number' && Number.isFinite(rawRange)) {
                const unit = explicitUnit || (rawRange === 1 ? 'space' : 'spaces');
                return {
                    range: {
                        value: rawRange,
                        unit,
                        text: `${rawRange} ${unit}`.trim(),
                    },
                    rangeValue: rawRange,
                    rangeUnit: unit,
                };
            }

            if (typeof rawRange === 'string' && rawRange.trim()) {
                const text = rawRange.trim();
                const match = text.match(/(-?\d+(?:\.\d+)?)/);
                if (match) {
                    const value = Number(match[1]);
                    const trailing = text.slice(match.index + match[1].length).trim();
                    const inferredUnit = trailing || explicitUnit || (value === 1 ? 'space' : 'spaces');
                    const normalizedUnit = inferredUnit || undefined;
                    return {
                        range: {
                            value,
                            unit: normalizedUnit,
                            text: trailing
                                ? text
                                : `${value}${normalizedUnit ? ` ${normalizedUnit}` : ''}`.trim(),
                        },
                        rangeValue: value,
                        rangeUnit: normalizedUnit,
                    };
                }

                return {
                    range: { text },
                    rangeValue: explicitValue,
                    rangeUnit: explicitUnit,
                };
            }

            if (explicitValue != null) {
                const unit = explicitUnit || (explicitValue === 1 ? 'space' : 'spaces');
                return {
                    range: {
                        value: explicitValue,
                        unit,
                        text: `${explicitValue} ${unit}`.trim(),
                    },
                    rangeValue: explicitValue,
                    rangeUnit: unit,
                };
            }

            return { range: null, rangeValue: undefined, rangeUnit: explicitUnit };
        };

        const normalizeTarget = (source = {}) => source.target || source.targetDescription || source.targets || '';

        const normalizeSummary = (source = {}) => source.summary || source.details || source.descriptionCore || source.description || '';

        const normalizeDamage = (source = {}) => {
            if (source.damage && typeof source.damage === 'object') {
                return source.damage;
            }

            if (typeof source.damage === 'number' && Number.isFinite(source.damage)) {
                return {
                    base: source.damage,
                    modifier: 0,
                    type: source.damageType || null,
                };
            }

            const modifier = typeof source.damageMod === 'number' ? source.damageMod : 0;
            const type = source.damageType || null;
            const base =
                typeof source.baseDamageOverride === 'number' && Number.isFinite(source.baseDamageOverride)
                    ? source.baseDamageOverride
                    : undefined;

            if (typeof base === 'number' || modifier !== 0 || type) {
                return {
                    ...(typeof base === 'number' ? { base } : {}),
                    modifier,
                    type,
                };
            }

            return undefined;
        };

        const normalizeDefense = (source = {}) => source.defense || source.targetsDefense || null;

        const assembleAction = (base = {}) => {
            const { range, rangeValue, rangeUnit } = normalizeRange(base);
            return {
                name: base.name,
                cost: normalizeCost(base),
                damage: normalizeDamage(base),
                defense: normalizeDefense(base),
                range,
                rangeValue,
                rangeUnit,
                target: normalizeTarget(base),
                summary: normalizeSummary(base),
                method: base.method || base.actionType || base.type || '',
                trigger: base.trigger || null,
                category: base.category || base.kind || 'action',
                kind: base.kind || base.category || 'action',
            };
        };

        const resolvedDefaultAttacks = defaultDisplayAttacks.length > 0
            ? defaultDisplayAttacks.map((attack, index) => ({
                key: `default-attack-${index}`,
                action: assembleAction({
                    ...(defaultAttacksRaw[index] || {}),
                    ...attack,
                }),
            }))
            : generatedDefaultActions.map((action, index) => ({
                key: `generated-default-attack-${index}`,
                action: assembleAction(action),
            }));

    const getEditableNumericValue = (statString) => {
        if (typeof statString === 'string') {
            const base = statString.split(' ')[0]; // "12" from "12 (17/22)"
            const num = parseInt(base, 10);
            return isNaN(num) ? 0 : num; // Default to 0 if NaN
        }
        const num = parseInt(statString, 10); // For direct numbers like HP
        return isNaN(num) ? 0 : num;
    };

    // This function is called by EditableField's onSave
    // It will then call App.jsx's onStatOverride to calculate the delta
    const handleSave = (fieldName, newAbsoluteValueFromInput) => {
        // App.jsx's onStatOverride needs: fieldName, newAbsoluteValue, originalCalculatedValue
        // We get originalCalculatedValue from the snapshot prior to overrides
        let originalCalcValue;
        const baseObjectForDelta = baseSnapshot;
        const pathParts = fieldName.split('_');
        let tempOriginalValue = baseObjectForDelta;

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (tempOriginalValue === null || typeof tempOriginalValue === 'undefined') { originalCalcValue = undefined; break; }
            if (Array.isArray(tempOriginalValue) && !isNaN(parseInt(part, 10))) {
                tempOriginalValue = tempOriginalValue[parseInt(part, 10)];
            } else if (typeof tempOriginalValue === 'object' && Object.prototype.hasOwnProperty.call(tempOriginalValue, part)) {
                tempOriginalValue = tempOriginalValue[part];
            } else { originalCalcValue = undefined; break; }
            if (i === pathParts.length - 1) originalCalcValue = tempOriginalValue;
        }
        onStatOverride(fieldName, newAbsoluteValueFromInput, originalCalcValue);
    };

    const handleActionFieldSave = (actionIndex, field, value) => {
        if (onActionUpdate) {
            onActionUpdate(actionIndex, field, value);
        }
    };

    const handleDefaultAttackFieldSave = (actionIndex, field, value) => {
        if (onDefaultActionUpdate) {
            onDefaultActionUpdate(actionIndex, field, value);
        }
    };


    const findOriginalItemForRemove = (displayedItem, rawArrayName) => {
        const rawArray = finalRaw[rawArrayName] || []; // e.g., finalRaw.Features, finalRaw.CombatActions
        return rawArray.find(rawItem =>
            (rawItem.originalFeatureId && displayedItem.originalFeatureId && rawItem.originalFeatureId === displayedItem.originalFeatureId) ||
            (rawItem.name === displayedItem.name.split(' (')[0] && // Match base name
                (rawItem.description === displayedItem.details || rawItem.displayDescription === displayedItem.details)) // Match description
        ) || displayedItem; // Fallback, ensures `onRemoveFeature` gets an object
    };


    return (
        <div className="stat-block-panel" ref={ref}>
            {/* --- HEADER --- */}
            <div className="top-header-section">
                <h1 className="creature-title-main">
                    <EditableField value={Name || "CREATURE"} onSave={(f, val) => handleSave("Name", val)} fieldName="Name" fieldType="text" />
                </h1>
                <div className="creature-subtitle">
                    {Power && Power.toLowerCase() !== "normal" ? (
                        <>
                            <EditableField value={Power} onSave={(f, val) => handleSave("Power", val)} fieldName="Power" fieldType="text" className="editable-subtitle" />

                        </>
                    ) : ""}
                    lvl <EditableField value={Level || 1} onSave={(f, val) => handleSave("Level", val)} fieldName="Level" fieldType="number" className="editable-subtitle" />
                    |
                    <EditableField value={Type || ""} onSave={(f, val) => handleSave("Type", val)} fieldName="Type" fieldType="text" className="editable-subtitle" />
                    {Role && Role !== "none" ? ` | ${Role}` : ''}
                </div>
            </div>

            {/* --- MAIN STATS GRID --- */}
            <div className="stats-main-grid">
                <div className="stats-block defense-stats-block"> {/* More specific class */}
                    <div className="stat-item hp-container"> {/* HP takes full first column */}
                        <GiHeartPlus className="stat-icon" />
                        <div className="hp-text">
                            <span className="stat-label">HP:</span>
                            <EditableField value={display.HP} onSave={(f, val) => handleSave("HP", val)} fieldName="HP" className="stat-value hp-value" />
                        </div>
                        {/*display.PDR && <div className="sub-stat-pdr">PDR: <EditableField value={display.PDR} onSave={(f, val) => handleSave("PDR", val)} fieldName="PDR" fieldType="text" /></div>*/}
                    </div>

                    <div className="pd-ad-stack"> {/* Container for PD and AD in the second column */}
                        <div className="stat-item">
                            <GiRosaShield className="stat-icon" />
                            <span className="stat-label">PD:</span>
                            <div className="editable-field-container">
                                <EditableField value={getEditableNumericValue(display.PD)} onSave={(f, val) => handleSave("PD", val)} fieldName="PD" className="stat-value" />
                                {typeof display.PD === 'string' && display.PD.includes('(') && <span className="calculated-defense">({display.PD.split('(')[1]}</span>}
                            </div>
                        </div>
                        <div className="stat-item">
                            <GiCrownedExplosion className="stat-icon" />
                            <span className="stat-label">AD:</span>
                            <div className="editable-field-container">
                                <EditableField value={getEditableNumericValue(display.AD)} onSave={(f, val) => handleSave("AD", val)} fieldName="AD" className="stat-value" />
                                {typeof display.AD === 'string' && display.AD.includes('(') && <span className="calculated-defense">({display.AD.split('(')[1]}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="stats-block attribute-stats-simple-grid">
                    {/* MIG, AGI, INT, CHA with EditableField similar to PD/AD */}
                    <div className="stat-item">
                        <GiStrong className="stat-icon" /> <span className="stat-label">MIG:</span>
                        <div className="editable-field-container">
                            <EditableField value={getEditableNumericValue(display.MIG)} onSave={(f, val) => handleSave("Attributes_Mig", val)} fieldName="Attributes_Mig" className="stat-value" />
                            {typeof display.MIG === 'string' && display.MIG.includes('(') && <span className="calculated-save">({display.MIG.split('(')[1]}</span>}
                        </div>
                    </div>
                    <div className="stat-item">
                        <GiWalkingBoot className="stat-icon" /> <span className="stat-label">AGI:</span>
                        <div className="editable-field-container">
                            <EditableField value={getEditableNumericValue(display.AGI)} onSave={(f, val) => handleSave("Attributes_Agi", val)} fieldName="Attributes_Agi" className="stat-value" />
                            {typeof display.AGI === 'string' && display.AGI.includes('(') && <span className="calculated-save">({display.AGI.split('(')[1]}</span>}
                        </div>
                    </div>
                    <div className="stat-item">
                        <GiBrain className="stat-icon" /> <span className="stat-label">INT:</span>
                        <div className="editable-field-container">
                            <EditableField value={getEditableNumericValue(display.INT)} onSave={(f, val) => handleSave("Attributes_Int", val)} fieldName="Attributes_Int" className="stat-value" />
                            {typeof display.INT === 'string' && display.INT.includes('(') && <span className="calculated-save">({display.INT.split('(')[1]}</span>}
                        </div>
                    </div>
                    <div className="stat-item">
                        <GiCharacter className="stat-icon" /> <span className="stat-label">CHA:</span>
                        <div className="editable-field-container">
                            <EditableField value={getEditableNumericValue(display.CHA)} onSave={(f, val) => handleSave("Attributes_Cha", val)} fieldName="Attributes_Cha" className="stat-value" />
                            {typeof display.CHA === 'string' && display.CHA.includes('(') && <span className="calculated-save">({display.CHA.split('(')[1]}</span>}
                        </div>
                    </div>
                </div>

            </div>


            {/* --- DESCRIPTIVE STATS --- */}
            <div className="section descriptive-stats">
                {display.Skills && <div><strong>Skills:</strong> <EditableField value={display.Skills} onSave={(f, val) => handleSave("Display_Skills_set", val)} fieldName="Display_Skills_set" fieldType="text" className="full-width-editable" /></div>}
                {display.CondImmune && display.CondImmune !== "None" && <div><strong>Cond. Immune:</strong> <EditableField value={display.CondImmune} onSave={(f, val) => handleSave("Display_CondImmune_set", val)} fieldName="Display_CondImmune_set" fieldType="text" className="full-width-editable" /></div>}
                {display.Vulnerable && display.Vulnerable !== "None" && <div><strong>Vulnerable:</strong> <EditableField value={display.Vulnerable} onSave={(f, val) => handleSave("Display_Vulnerable_set", val)} fieldName="Display_Vulnerable_set" fieldType="text" className="full-width-editable" /></div>}
                {display.Senses && display.Senses !== "None" && <div><strong>Senses:</strong> <EditableField value={display.Senses} onSave={(f, val) => handleSave("Display_Senses_set", val)} fieldName="Display_Senses_set" fieldType="text" className="full-width-editable" /></div>}
                {display.Resistant && display.Resistant !== "None" && <div><strong>Resistant:</strong> <EditableField value={display.Resistant} onSave={(f, val) => handleSave("Display_Resistant_set", val)} fieldName="Display_Resistant_set" fieldType="text" className="full-width-editable" /></div>}
                {display.Languages && display.Languages !== "None" && <div><strong>Languages:</strong> <EditableField value={display.Languages} onSave={(f, val) => handleSave("Display_Languages_set", val)} fieldName="Display_Languages_set" fieldType="text" className="full-width-editable" /></div>}
            </div>


            {/* --- ABILITIES (Passive Features) --- */}
            {display.Features && display.Features.length > 0 && (
                <div className="section abilities-section">
                    <h3 className="sb-section-title-bar"><span><GiMagicSwirl className="title-bar-icon" />ABILITIES</span></h3>
                    {display.Features.map((feature, index) => (
                        <div key={feature.originalFeatureId || `feature-${index}`} className="sb-list-item">
                            <p>
                                <EditableField value={feature.name} onSave={(f, val) => handleSave(`Features_${index}_name_set`, val)} fieldName={`Features_${index}_name_set`} fieldType="text" className="editable-name-field" />: {' '}
                                <EditableField value={feature.description} onSave={(f, val) => handleSave(`Features_${index}_description_set`, val)} fieldName={`Features_${index}_description_set`} fieldType="text" className="editable-description-field" />
                            </p>
                            {feature.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(findOriginalItemForRemove(feature, "Features"))} />}
                        </div>
                    ))}
                </div>
            )}

            {/* --- COMBAT Section --- */}
            {(display.Combat.Check || display.Combat.Speed || display.Combat.AP || (display.Combat.Attacks && display.Combat.Attacks.length > 0) || (display.Combat.OtherActions && display.Combat.OtherActions.length > 0)) &&
                <div className="section combat-section">
                    <div className="sb-section-title-bar sb-combat-header-bar">
                        <span><GiCrossedSwords className="title-bar-icon" />COMBAT</span>
                        <div className="sb-combat-header-stats">
                            <span>CHECK: <EditableField value={display.Combat.Check.replace('+', '')} onSave={(f, val) => handleSave("Combat_Check", val)} fieldName="Combat_Check" fieldType="text" /></span>
                            <span>SAVE DC: <EditableField value={display.Combat.SaveDC} onSave={(f, val) => handleSave("Combat_SaveDC", val)} fieldName="Combat_SaveDC" /></span>
                            <span>AP: <EditableField value={display.Combat.AP} onSave={(f, val) => handleSave("Combat_AP", val)} fieldName="Combat_AP" /></span>
                            {display.Combat.LAP && <span>LAP: <EditableField value={display.Combat.LAP} onSave={(f, val) => handleSave("Combat_LAP", val)} fieldName="Combat_LAP" /></span>}
                            <span>SPEED: <EditableField value={display.Combat.Speed} onSave={(f, val) => handleSave("Combat_Speed", val)} fieldName="Combat_Speed" /></span>
                        </div>
                    </div>

                    <>
                        <div className="sb-section-title-bar mp-section-title-bar"> {/* Use specific class */}
                            <span><GiSandsOfTime className="title-bar-icon" />MANA</span>
                            <div className="mana-boxes-container">
                                {Array.from({ length: Math.min(getEditableNumericValue(display.MaxMP) || 0, 10) }).map((_, i) => (
                                    <span key={`mp-box-${i}`} className="mana-box"></span>
                                ))}
                            </div>
                            <div className="mp-header-stats">
                                <span>MAX MP:
                                    <EditableField
                                        value={getEditableNumericValue(display.MaxMP)}
                                        onSave={(f, val) => handleSave("MaxMP", val)}
                                        fieldName="MaxMP"
                                        className="editable-mp-value"
                                    />
                                </span>
                            </div>
                        </div>
                        {/* Mana-costing actions would be listed here or in main Attacks/OtherActions if filtered by cost type */}

                    </>


                    {/* Default attacks with inline editable fields */}
                    {resolvedDefaultAttacks.length > 0 && resolvedDefaultAttacks.map(({ key, action }, index) => (
                        <div key={key} className="sb-list-item attack-item">
                            <ActionInlineDisplay
                                action={action}
                                onSaveField={(field, val) => handleDefaultAttackFieldSave(index, field, val)}
                            />
                        </div>
                    ))}

                    {finalRaw.CombatActions && finalRaw.CombatActions.filter(a => a.actionType && (a.actionType.includes('Attack') || a.actionType.includes('Spell'))).map((act, idx) => {
                        const displayAction = display.Combat.Attacks.find(a => a.originalFeatureId === act.originalFeatureId);
                        const derivedAction = derived?.combatActions?.find(a => a.originalFeatureId === act.originalFeatureId);
                        return (
                            <div key={act.originalFeatureId || `attack-${idx}`} className="sb-list-item attack-item">
                                <ActionInlineDisplay
                                    action={{
                                        ...act,
                                        damage: derivedAction?.calculatedDamage ?? act.damage,
                                        calculatedDamage: derivedAction?.calculatedDamage,
                                        details: displayAction?.details,
                                    }}
                                    onSaveField={(field, val) => handleActionFieldSave(idx, field, val)}
                                />
                                {act.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(act)} />}
                            </div>
                        );
                    })}

                    {finalRaw.CombatActions && finalRaw.CombatActions.filter(a => !a.actionType || !(a.actionType.includes('Attack') || a.actionType.includes('Spell'))).map((act, idx) => {
                        const displayAction = display.Combat.OtherActions.find(a => a.originalFeatureId === act.originalFeatureId);
                        const derivedAction = derived?.combatActions?.find(a => a.originalFeatureId === act.originalFeatureId);
                        return (
                            <div key={act.originalFeatureId || `action-${idx}`} className="sb-list-item action-item">
                                <ActionInlineDisplay
                                    action={{
                                        ...act,
                                        details: displayAction?.details,
                                        damage: derivedAction?.calculatedDamage ?? act.damage,
                                        calculatedDamage: derivedAction?.calculatedDamage,
                                    }}
                                    onSaveField={(field, val) => handleActionFieldSave(idx, field, val)}
                                />
                                {act.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(act)} />}
                            </div>
                        );
                    })}
                </div>
            }

            {/* --- Attack Enhancements --- */}
            {display.Combat.AttackEnhancements && display.Combat.AttackEnhancements.length > 0 && (
                <div className="sb-sub-section attack-enhancements-section">
                    <h4 className="sb-sub-section-title"><GiUpgrade className="sb-section-icon" />Attack Enhancements</h4>
                    {display.Combat.AttackEnhancements.map((enh, index) => {
                        const rawEnhancement = finalRaw.AttackEnhancements?.[index];
                        const hasDisplaySaveDC = enh.saveDC !== '' && enh.saveDC !== null && typeof enh.saveDC !== 'undefined';
                        const showSaveEditors = Boolean(
                            rawEnhancement?.save ||
                            rawEnhancement?.saveAttribute ||
                            enh.saveAttribute ||
                            enh.saveEffect ||
                            hasDisplaySaveDC
                        );

                        const attributeValueRaw = enh.saveAttribute ?? '';
                        const attributeHasValue =
                            (typeof attributeValueRaw === 'string' && attributeValueRaw.trim().length > 0) ||
                            (typeof attributeValueRaw !== 'string' && attributeValueRaw !== '' && attributeValueRaw !== null && typeof attributeValueRaw !== 'undefined');

                        return (
                            <div key={enh.originalFeatureId || `enhance-${index}`} className="sb-list-item enhancement-item">
                                <p>
                                    <EditableField
                                        value={enh.name}
                                        onSave={(f, val) => handleSave(`Combat_AttackEnhancements_${index}_name_set`, val)}
                                        fieldName={`Combat_AttackEnhancements_${index}_name_set`}
                                        fieldType="text"
                                        className="editable-name-field"
                                    />
                                    <br />
                                    <span className="enhancement-text-line">
                                        <EditableField
                                            value={enh.summary || enh.details || ''}
                                            onSave={(f, val) => handleSave(`Combat_AttackEnhancements_${index}_summary_set`, val)}
                                            fieldName={`Combat_AttackEnhancements_${index}_summary_set`}
                                            fieldType="text"
                                            className="editable-description-field enhancement-summary-field"
                                        />
                                        {showSaveEditors && (
                                            <>
                                                {' '}The target makes a DC{' '}
                                                <EditableField
                                                    value={enh.saveDC ?? ''}
                                                    onSave={(f, val) => handleSave(`Combat_AttackEnhancements_${index}_save_dc_set`, val)}
                                                    fieldName={`Combat_AttackEnhancements_${index}_save_dc_set`}
                                                    fieldType="number"
                                                    className="enhancement-inline-field enhancement-save-dc"
                                                />{' '}
                                                <EditableField
                                                    value={enh.saveAttribute ?? ''}
                                                    onSave={(f, val) => handleSave(`Combat_AttackEnhancements_${index}_save_attribute_set`, val)}
                                                    fieldName={`Combat_AttackEnhancements_${index}_save_attribute_set`}
                                                    fieldType="text"
                                                    className="enhancement-inline-field enhancement-save-attribute"
                                                />
                                                {attributeHasValue ? ' save.' : 'save.'}{' '}
                                                <EditableField
                                                    value={enh.saveEffect ?? ''}
                                                    onSave={(f, val) => handleSave(`Combat_AttackEnhancements_${index}_save_effect_set`, val)}
                                                    fieldName={`Combat_AttackEnhancements_${index}_save_effect_set`}
                                                    fieldType="text"
                                                    className="enhancement-inline-field enhancement-save-effect"
                                                />
                                            </>
                                        )}
                                    </span>
                                </p>
                                {enh.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(findOriginalItemForRemove(enh, "AttackEnhancements"))} />}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- Reactions --- */}
            {display.Reactions && display.Reactions.length > 0 && (
                <div className="sb-sub-section reactions-section">
                    <h4 className="sb-sub-section-title"><GiReturnArrow className="sb-section-icon" />Reactions</h4>
                    {display.Reactions.map((reaction, index) => (
                        <div key={reaction.originalFeatureId || `reaction-${index}`} className="sb-list-item reaction-item">
                            <p>
                                <EditableField value={reaction.name} onSave={(f, val) => handleSave(`Reactions_${index}_name_set`, val)} fieldName={`Reactions_${index}_name_set`} fieldType="text" className="editable-name-field" />: {' '}
                                <EditableField value={reaction.details} onSave={(f, val) => handleSave(`Reactions_${index}_details_set`, val)} fieldName={`Reactions_${index}_details_set`} fieldType="text" className="editable-description-field" />
                            </p>
                            {reaction.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(findOriginalItemForRemove(reaction, "Reactions"))} />}
                        </div>
                    ))}
                </div>
            )}

            {/* --- Apex Actions --- */}
            {display.ApexActions && display.ApexActions.length > 0 && (
                <div className="sb-sub-section apex-actions-section">
                    <h4 className="sb-sub-section-title"><GiCrownedExplosion className="sb-section-icon" />Apex Actions</h4>
                    {display.ApexActions.map((apex, index) => (
                        <div key={apex.originalFeatureId || `apex-${index}`} className="sb-list-item apex-action-item">
                            <p>
                                <EditableField value={apex.name} onSave={(f, val) => handleSave(`ApexActions_${index}_name_set`, val)} fieldName={`ApexActions_${index}_name_set`} fieldType="text" className="editable-name-field" />: {' '}
                                <EditableField value={apex.details} onSave={(f, val) => handleSave(`ApexActions_${index}_details_set`, val)} fieldName={`ApexActions_${index}_details_set`} fieldType="text" className="editable-description-field" />
                            </p>
                            {apex.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(findOriginalItemForRemove(apex, "ApexActions"))} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default StatBlockPanel;