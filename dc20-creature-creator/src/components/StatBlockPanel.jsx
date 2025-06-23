// src/components/StatBlockPanel.jsx
import React from 'react';
import './StatBlockPanel.css'; // Main CSS for the stat block
import EditableField from './EditableField';
import ActionInlineDisplay from './ActionInlineDisplay';
import HoverRemoveButton from './HoverRemoveButton';
import {
    GiHeartPlus, GiRosaShield, GiCrownedExplosion,
    GiStrong, GiWalkingBoot, GiBrain, GiCharacter,
    GiMagicSwirl, GiCrossedSwords, GiUpgrade, GiReturnArrow, GiSandsOfTime
} from 'react-icons/gi';

const StatBlockPanel = ({ fullStatBlock, onStatOverride, onRemoveFeature, onActionUpdate, onDefaultActionUpdate }) => {
    if (!fullStatBlock || !fullStatBlock.Display || !fullStatBlock.CalculatedBeforeDeltas || !fullStatBlock.FinalWithDeltas) {
        return <div className="stat-block-panel"><p>Calculating stats...</p></div>;
    }

    const { Name, Level, Type, Role, Power } = fullStatBlock; // Root level info
    const display = fullStatBlock.Display; // Convenience alias
    const finalRaw = fullStatBlock.FinalWithDeltas; // For finding original features for removal

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
        // We get originalCalculatedValue from fullStatBlock.CalculatedBeforeDeltas
        let originalCalcValue;
        const baseObjectForDelta = fullStatBlock.CalculatedBeforeDeltas;
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
        <div className="stat-block-panel">
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
                    {display.Combat.Attacks && display.Combat.Attacks.filter(a => !a.originalFeatureId).map((attack, index) => (
                        <div key={`default-attack-${index}`} className="sb-list-item attack-item">
                            <ActionInlineDisplay
                                action={{
                                    ...finalRaw.DefaultAttacks[index],
                                    ...attack,
                                }}
                                onSaveField={(field, val) => handleDefaultAttackFieldSave(index, field, val)}
                            />
                        </div>
                    ))}

                    {finalRaw.CombatActions && finalRaw.CombatActions.filter(a => a.actionType && (a.actionType.includes('Attack') || a.actionType.includes('Spell'))).map((act, idx) => (
                        <div key={act.originalFeatureId || `attack-${idx}`} className="sb-list-item attack-item">
                            <ActionInlineDisplay
                                action={{ ...act, details: act.details || act.displayDescription }}
                                onSaveField={(field, val) => handleActionFieldSave(idx, field, val)}
                            />
                            {act.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(act)} />}
                        </div>
                    ))}

                    {finalRaw.CombatActions && finalRaw.CombatActions.filter(a => !a.actionType || !(a.actionType.includes('Attack') || a.actionType.includes('Spell'))).map((act, idx) => (
                        <div key={act.originalFeatureId || `action-${idx}`} className="sb-list-item action-item">
                            <ActionInlineDisplay
                                action={{ ...act, details: act.details || act.displayDescription }}
                                onSaveField={(field, val) => handleActionFieldSave(idx, field, val)}
                            />
                            {act.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(act)} />}
                        </div>
                    ))}
                </div>
            }

            {/* --- Attack Enhancements --- */}
            {display.Combat.AttackEnhancements && display.Combat.AttackEnhancements.length > 0 && (
                <div className="sb-sub-section attack-enhancements-section">
                    <h4 className="sb-sub-section-title"><GiUpgrade className="sb-section-icon" />Attack Enhancements</h4>
                    {display.Combat.AttackEnhancements.map((enh, index) => (
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
                                <EditableField
                                    value={enh.details}
                                    onSave={(f, val) => handleSave(`Combat_AttackEnhancements_${index}_details_set`, val)}
                                    fieldName={`Combat_AttackEnhancements_${index}_details_set`}
                                    fieldType="text"
                                    className="editable-description-field"
                                />
                            </p>
                            {enh.originalFeatureId && <HoverRemoveButton onClick={() => onRemoveFeature(findOriginalItemForRemove(enh, "AttackEnhancements"))} />}
                        </div>
                    ))}
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
        </div>
    );
};

export default StatBlockPanel;