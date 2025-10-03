# DC20 Feature Authoring Rules

This guide describes the canonical structure for authoring DC20 features so that any contributor (or AI assistant) can produce clean, machine-readable entries that render consistent rules text. When in doubt, prioritize clarity in the `summary` field.

## 1. Universal Fields

Every feature record must supply the following keys:

| Field | Description |
| --- | --- |
| `id` | Unique snake-case identifier. |
| `name` | Display name. |
| `kind` | High-level classification such as `action`, `feature`, `sense`, `immunity`, `resistance`, `vulnerability`, or `enhancement`. |
| `method` | Short label that appears under the name (e.g., `Melee Martial Attack`, `Spell Buff`). |
| `tags` | Array of lowercase keywords for filtering (roles, damage types, themes). |
| `summary` | The full rules text or flavor paragraph. Include condition riders, buff text, and other effects here so scaling numbers can change without rewriting prose. |

Omit any key whose value would be empty, zero, or redundant—absence implies default behavior.

## 2. Resource Costs and Timing

- Represent resource consumption with a single `cost` object that only lists non-zero resources, e.g. `{ "ap": 2 }` or `{ "ap": 1, "mp": 1 }`.
- Only reactions receive a `trigger`. The string should describe when the reaction can be used ("When targeted by an attack", "When you hit with an attack", etc.). Enhancements and other feature types never define `trigger`.

## 3. Targeting and Range

- `range` stores the maximum distance in spaces. Leave it out when the action relies on weapon reach or targets the user.
- `target` is a single human-readable phrase that replaces the previous `area` and `targetDescription` fields (e.g., `"one creature"`, `"a 2-space cube"`, `"up to three allies"`). Action headers will read "Target [target] within [range]".
- If `range` is omitted or `0` **and** the action rolls against AD, render the targeting line as "Target [target] around yourself" to signal a self-centered area.
- Spaces are the implied unit. Only mention other units when deviating from this standard.

## 4. Damage, Defenses, and Saves

- Any feature that deals damage must define:
  - `damage`: `{ "modifier": <int>, "type": "<damage type>" }`, where `modifier` adjusts base damage.
  - `defense`: either `"PD"` or `"AD"`.
- Non-damaging debuffs never use `defense`; they instead require a saving throw.
- Any effect that imposes a condition (Bleeding, Burning, Stunned, Exposed, etc.) must also declare a `save` with one of: `"Might"`, `"Agility"`, `"Intelligence"`, `"Charisma"`, `"Physical"`, or `"Mental"`. Describe the on-fail consequence in `summary`.
- When an action both deals damage and adds a condition, include both `defense` and `save`.

## 5. Passive Features and Stat Adjustments

- Passive features that modify core stats (PD, AD, HP, MP, attributes, etc.) should include an `effects` array to capture the mechanical change. Each entry follows `{ "stat": "<stat name>", "delta": <number> }`. Use descriptive stat keys such as `"PD"`, `"AD"`, `"HP"`, `"MP"`, or `"Speed"`.
- Mirror the mechanical payload in the `summary` so the text reads naturally even if the consuming tool ignores `effects`.
- You may also combine multiple passive adjustments within one `effects` array when a feature adjusts several stats at once.

## 6. Senses, Resistances, Immunities, and Vulnerabilities

- These feature types may include a concise `value` string (e.g., `"Darkvision 60"`, `"Resistance: Fire"`) to support UI labels while keeping fuller wording in `summary`.

## 7. Rendering Guidance

When composing the final text shown to players:
1. Start with the header: `Name (cost text):`.
2. If damage is present, append `base damage ±X <type> vs <defense>.`
3. Follow with the targeting sentence built from `target` and `range` (or "around yourself" when appropriate).
4. End with the `summary` prose for buffs, condition riders, and flavor.

## Examples

### Area Attack
```json
{
  "id": "attack_shrapnel_burst",
  "name": "Shrapnel Burst",
  "kind": "action",
  "method": "Ranged Martial Attack",
  "tags": ["martial", "ranged", "aoe"],
  "summary": "Creatures in the blast must make a Physical save or suffer Bleeding until the end of their next turn.",
  "cost": { "ap": 2 },
  "damage": { "modifier": -1, "type": "piercing" },
  "defense": "AD",
  "range": 10,
  "target": "a 2-space cube",
  "save": "Physical"
}
```

Rendered text:  
“Shrapnel Burst (2 AP): base damage -1 piercing vs AD. Target a 2-space cube within 10 spaces. Creatures in the blast must make a Physical save or suffer Bleeding until the end of their next turn.”

### Buff Spell
```json
{
  "id": "spell_guardians_aegis",
  "name": "Guardian’s Aegis",
  "kind": "action",
  "method": "Spell Buff",
  "tags": ["support", "spell"],
  "summary": "Two allies gain +1 to PD and AD until the start of your next turn.",
  "cost": { "ap": 1, "mp": 1 },
  "range": 6,
  "target": "up to two allies"
}
```

Rendered text:  
“Guardian’s Aegis (1 AP, 1 MP): Target up to two allies within 6 spaces. They gain +1 to PD and AD until the start of your next turn.”

### Passive Stat Feature
```json
{
  "id": "feature_magical_reservoir",
  "name": "Magical Reservoir",
  "kind": "feature",
  "method": "Passive",
  "tags": ["arcane", "magical"],
  "summary": "You draw on deep arcane wells, gaining +6 MP.",
  "effects": [
    { "stat": "MP", "delta": 6 }
  ]
}
```

Rendered text:  
“Magical Reservoir: You draw on deep arcane wells, gaining +6 MP.”

This template can be expanded with additional `effects` entries for other stat boosts while maintaining clear text output.
