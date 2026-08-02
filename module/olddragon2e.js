/**
 * Shows a dialog with the provided options.
 *
 * @param {Object} options - The options for the dialog.
 * @param {string} options.title - The title of the dialog.
 * @param {string} options.content - The content of the dialog. If it ends with '.hbs', it will be treated as a Handlebars template.
 * @param {Object} options.data - The data to be passed to the Handlebars template.
 * @param {Object} options.buttons - An object mapping button keys to their properties.
 * @param {string} options.buttons.icon - The icon for the button.
 * @param {string} options.buttons.label - The label for the button.
 * @param {Function} options.buttons.callback - The callback function to execute when the button is clicked.
 * @param {Function} options.render - Whether to render the dialog immediately.
 *
 * @returns {Promise<void>} A promise that resolves when the dialog is rendered.
 */

async function showDialog(options) {
  const { title, content, buttons } = options;

  let _content = content;

  if (content.endsWith('.hbs')) {
    _content = await foundry.applications.handlebars.renderTemplate(content, options.data);
  }

  const renderCallback = options.render;

  if (game.release.generation >= 14) {
    const _buttons = Object.entries(buttons).map(([key, value]) => ({
      action: key,
      label: value.label,
      icon: value.icon,
      callback: value.callback
        ? async (event, button) => {
            await value.callback($(button.form));
          }
        : undefined,
    }));

    _buttons.push({
      action: 'cancel',
      label: 'Cancelar',
      icon: "<i class='fa-solid fa-xmark'></i>",
    });

    if (renderCallback) {
      Hooks.once('renderDialogV2', (app) => {
        renderCallback($(app.element));
      });
    }

    await foundry.applications.api.DialogV2.wait({
      window: { title },
      content: _content,
      buttons: _buttons,
      rejectClose: false,
    });
  } else {
    const _buttons = {};

    for (const [key, value] of Object.entries(buttons)) {
      _buttons[key] = {
        icon: value.icon,
        label: value.label,
        callback: value.callback,
      };
    }

    new Dialog({
      title,
      content: _content,
      buttons: {
        ..._buttons,
        cancel: {
          icon: "<i class='fa-solid fa-xmark'></i>",
          label: 'Cancelar',
        },
      },
      render: renderCallback || (() => {}),
    }).render(true);
  }
}

function registerHandlebarsHelper() {
  // Stringify for Handlebars
  Handlebars.registerHelper('toJSON', function (obj) {
    return JSON.stringify(obj, null, 2);
  });

  // Times helper for Handlebars
  Handlebars.registerHelper('times', function (n, content) {
    let result = '';
    for (let i = 0; i < n; ++i) {
      content.data.index = i + 1;
      result += content.fn(i);
    }

    return result;
  });

  // Truncate helper for Handlebars
  Handlebars.registerHelper('truncate', function (str, len) {
    if (str && str.length > len) {
      var new_str = str.substr(0, len + 1);

      while (new_str.length) {
        var ch = new_str.substr(-1);
        new_str = new_str.substr(0, -1);

        if (ch == ' ') {
          break;
        }
      }

      if (new_str == '') {
        new_str = str.substr(0, len);
      }

      return new Handlebars.SafeString(new_str + '...');
    }
    return str;
  });

  // Compare operator helper for Handlebars
  Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
      case '==':
        return v1 == v2 ? options.fn(this) : options.inverse(this);
      case '===':
        return v1 === v2 ? options.fn(this) : options.inverse(this);
      case '!=':
        return v1 != v2 ? options.fn(this) : options.inverse(this);
      case '!==':
        return v1 !== v2 ? options.fn(this) : options.inverse(this);
      case '<':
        return v1 < v2 ? options.fn(this) : options.inverse(this);
      case '<=':
        return v1 <= v2 ? options.fn(this) : options.inverse(this);
      case '>':
        return v1 > v2 ? options.fn(this) : options.inverse(this);
      case '>=':
        return v1 >= v2 ? options.fn(this) : options.inverse(this);
      case '&&':
        return v1 && v2 ? options.fn(this) : options.inverse(this);
      case '||':
        return v1 || v2 ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });

  // Checks if v1 is true and v2 is equal to v3
  Handlebars.registerHelper('ifCondAndEqual', function (v1, v2, v3, options) {
    if (v1 && v2 >= v3) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

  Handlebars.registerHelper('hasDailyUses', function (dailyUses, options) {
    for (let key in dailyUses) {
      if (dailyUses[key] > 0) {
        return options.fn(this);
      }
    }
    return options.inverse(this);
  });

  Handlebars.registerHelper(
    'generateClassAbilityDailyUses',
    function (dailyUses, currentLevel, dailyUsesState, abilityId) {
      let result = '';
      const maxUses = dailyUses[currentLevel] || 0;
      for (let i = 0; i < maxUses; i++) {
        const checked = dailyUsesState && dailyUsesState[i + 1] ? 'checked' : '';
        const title = checked ? 'Recuperar' : 'Usar';
        result += `<input type="checkbox"
        class="class-ability-use-checkbox"
        name="daily_use_${currentLevel}_${i + 1}"
        data-ability-id="${abilityId}"
        data-use-index="${i + 1}"
        title="${title}"
        ${checked} />`;
      }
      return new Handlebars.SafeString(result);
    },
  );

  Handlebars.registerHelper('generateRaceAbilityDailyUses', function (dailyUses, dailyUsesState, abilityId) {
    let result = '';
    for (let i = 0; i < dailyUses; i++) {
      const checked = dailyUsesState && dailyUsesState[i + 1] ? 'checked' : '';
      const title = checked ? 'Recuperar' : 'Usar';
      result += `<input type="checkbox"
      class="race-ability-use-checkbox"
      name="race_daily_use_${i + 1}"
      data-ability-id="${abilityId}"
      data-use-index="${i + 1}"
      title="${title}"
      ${checked} />`;
    }
    return new Handlebars.SafeString(result);
  });
}

// Print a + or a - in front of numbers
Handlebars.registerHelper('signed_number', function (number, zero) {
  if (typeof zero !== 'string') zero = '+0';
  const n = Number(number);
  if (isNaN(n) || n === 0) return zero;
  return n < 0 ? n.toString() : `+${n}`;
});

Handlebars.registerHelper('range', function (from, to) {
  let result = [];
  for (let i = from; i <= to; i++) result.push(i);
  return result;
});

Handlebars.registerHelper('and', function (a, b) {
  return a && b;
});

Handlebars.registerHelper('lookup', function (obj, field) {
  return obj && obj[field];
});

Handlebars.registerHelper('toString', function (value) {
  return value != null ? value.toString() : '';
});

Handlebars.registerHelper('toNumber', function (value) {
  return Number(value);
});
Handlebars.registerHelper('gte', function (a, b) {
  return Number(a) >= Number(b);
});
Handlebars.registerHelper('lte', function (a, b) {
  return Number(a) <= Number(b);
});
Handlebars.registerHelper('ne', function (a, b) {
  return a !== b;
});

Handlebars.registerHelper('diceIcon', function (damage, weapon) {
  if (weapon === true) {
    return new Handlebars.SafeString('<i class="fa-thin fa-dice-d6"></i>');
  }
  const icons = {
    2: 'fa-hockey-puck',
    4: 'fa-dice-d4',
    6: 'fa-dice-d6',
    8: 'fa-dice-d8',
    10: 'fa-dice-d10',
    12: 'fa-dice-d12',
  };
  const supported = [2, 4, 6, 8, 10, 12];
  const matches = String(damage || '').matchAll(/d(\d+)/gi);
  const sizes = [...matches].map((m) => parseInt(m[1], 10));
  const largest = sizes.length ? Math.max(...sizes) : 0;
  const icon = supported.includes(largest) ? icons[largest] : 'fa-dice-d20';
  return new Handlebars.SafeString(`<i class="fa-thin ${icon}"></i>`);
});

Handlebars.registerHelper('raceBonusDamage', function (actor, weapon) {
  if (!actor?.raceBonusDamage) return 0;
  return actor.raceBonusDamage(weapon);
});

Handlebars.registerHelper('generateVariableConstructionSelectors', function (ability, selections) {
  const choicesCount = ability.system.variable_construction?.choices_count || 0;
  const availableOptions = ability.system.variable_construction?.available_options || [];
  const abilitySelections = selections?.[ability._id] || [];

  if (choicesCount <= 0) return '';

  const ordinals = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª'];
  const selectOptionLabel = game.i18n.localize('olddragon2e.select_option');
  const customLabel = game.i18n.localize('olddragon2e.custom');
  const choiceLabel = game.i18n.localize('olddragon2e.choice');
  const namePlaceholder = game.i18n.localize('olddragon2e.name');
  const descriptionPlaceholder = game.i18n.localize('olddragon2e.description');

  let result = '';

  for (let i = 0; i < choicesCount; i++) {
    const currentSelection = abilitySelections[i] || {};
    const selectedKey = currentSelection.key || '';
    const customName = currentSelection.custom_name || '';
    const customDescription = currentSelection.custom_description || '';
    const ordinal = ordinals[i] || `${i + 1}ª`;

    let optionsHtml = `<option value="">${selectOptionLabel}</option>`;
    for (const opt of availableOptions) {
      const isSelected = selectedKey === opt.key ? 'selected' : '';
      const escapedName = Handlebars.escapeExpression(opt.name);
      const escapedKey = Handlebars.escapeExpression(opt.key);
      optionsHtml += `<option value="${escapedKey}" ${isSelected}>${escapedName}</option>`;
    }
    const isCustomSelected = selectedKey === 'custom' ? 'selected' : '';
    optionsHtml += `<option value="custom" ${isCustomSelected}>${customLabel}</option>`;

    const selectedOption = availableOptions.find((o) => o.key === selectedKey);
    const descriptionHtml =
      selectedKey && selectedKey !== 'custom' && selectedOption?.description
        ? `<p class="choice-description">${Handlebars.escapeExpression(selectedOption.description)}</p>`
        : '';

    const customHide = selectedKey !== 'custom' ? 'style="display:none"' : '';
    const escapedCustomName = Handlebars.escapeExpression(customName);
    const escapedCustomDescription = Handlebars.escapeExpression(customDescription);

    result += `
      <div class="choice-row">
        <div class="choice-header">
          <label class="font-bold">${ordinal} ${choiceLabel}</label>
          <select class="variable-construction-select"
                  data-ability-id="${ability._id}"
                  data-choice-index="${i}">
            ${optionsHtml}
          </select>
        </div>
        ${descriptionHtml}
        <div class="custom-fields" ${customHide}>
          <input type="text"
                 class="variable-construction-custom-name"
                 data-ability-id="${ability._id}"
                 data-choice-index="${i}"
                 value="${escapedCustomName}"
                 placeholder="${namePlaceholder}">
          <textarea class="variable-construction-custom-description"
                    data-ability-id="${ability._id}"
                    data-choice-index="${i}"
                    placeholder="${descriptionPlaceholder}">${escapedCustomDescription}</textarea>
        </div>
      </div>
    `;
  }

  return new Handlebars.SafeString(`<div class="variable-construction-selectors">${result}</div>`);
});

function truncateString(string, number) {
  // If the length of string is <= to number just return string don't truncate it.
  if (string.length <= number) {
    return string;
  }
  // Return string truncated with '...' concatenated to the end of string.
  return string.slice(0, number) + '...';
}

function signed_number(number, zero = '+0') {
  const n = Number(number);
  if (isNaN(n) || n === 0) return zero;
  return n < 0 ? n.toString() : `+${n}`;
}

/**
 * Calculate attribute modifier based on Old Dragon 2e rules
 * @param {number} value - The attribute value (1-19+)
 * @returns {number} The modifier (-4 to +4)
 */
function calculateAttributeModifier(value) {
  if (value < 2) return -4;
  if (value < 4) return -3;
  if (value < 6) return -2;
  if (value < 9) return -1;
  if (value < 13) return 0;
  if (value < 15) return 1;
  if (value < 17) return 2;
  if (value < 19) return 3;
  return 4;
}

async function preloadTemplates() {
  const templatePaths = [
    'systems/olddragon2e/templates/partials/tabs/character-tab-attacks.hbs',
    'systems/olddragon2e/templates/partials/tabs/character-tab-race.hbs',
    'systems/olddragon2e/templates/partials/tabs/character-tab-class.hbs',
    'systems/olddragon2e/templates/partials/tabs/character-tab-spells.hbs',
    'systems/olddragon2e/templates/partials/tabs/character-tab-equipment.hbs',
    'systems/olddragon2e/templates/partials/tabs/character-tab-details.hbs',
    'systems/olddragon2e/templates/partials/tabs/monster-tab-attacks.hbs',
    'systems/olddragon2e/templates/partials/tabs/monster-tab-info.hbs',
    'systems/olddragon2e/templates/partials/tabs/retainer-tab-attacks.hbs',
    'systems/olddragon2e/templates/partials/tabs/retainer-tab-heroic-action.hbs',
    'systems/olddragon2e/templates/partials/tabs/retainer-tab-equipment.hbs',
    'systems/olddragon2e/templates/partials/tabs/retainer-tab-details.hbs',
    'systems/olddragon2e/templates/partials/cards/attack-card.hbs',
    'systems/olddragon2e/templates/partials/cards/weapon-card.hbs',
    'systems/olddragon2e/templates/partials/cards/armor-card.hbs',
    'systems/olddragon2e/templates/partials/cards/shield-card.hbs',
    'systems/olddragon2e/templates/partials/cards/misc-card.hbs',
    'systems/olddragon2e/templates/partials/cards/container-card.hbs',
    'systems/olddragon2e/templates/partials/cards/vehicle-card.hbs',
    'systems/olddragon2e/templates/partials/cards/spell-card.hbs',
    'systems/olddragon2e/templates/partials/tabs/race-tab-about.hbs',
    'systems/olddragon2e/templates/partials/tabs/race-tab-features.hbs',
    'systems/olddragon2e/templates/partials/tabs/race-tab-abilities.hbs',
    'systems/olddragon2e/templates/partials/cards/race_ability-card.hbs',
    'systems/olddragon2e/templates/partials/tabs/race-ability-tab-about.hbs',
    'systems/olddragon2e/templates/partials/tabs/race-ability-tab-mechanics.hbs',
    'systems/olddragon2e/templates/partials/tabs/class-tab-about.hbs',
    'systems/olddragon2e/templates/partials/tabs/class-tab-features.hbs',
    'systems/olddragon2e/templates/partials/tabs/class-tab-abilities.hbs',
    'systems/olddragon2e/templates/partials/cards/class_ability-card.hbs',
    'systems/olddragon2e/templates/partials/tabs/class-ability-tab-about.hbs',
    'systems/olddragon2e/templates/partials/tabs/class-ability-tab-mechanics.hbs',
    'systems/olddragon2e/templates/partials/cards/monster_attack-card.hbs',
  ];

  return foundry.applications.handlebars.loadTemplates(templatePaths);
}

Hooks.once('ready', async () => {
  // Apenas o GM executa a criação do macro "global"
  if (!game.user.isGM) return;

  const macroName = 'Teste de Chance em 1d6';
  // Procura um macro global pelo nome (macros globais têm folder === null)
  let macro = game.macros.find((m) => m.name === macroName && m.folder === null);

  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: 'script',
      img: 'systems/olddragon2e/assets/icons/d6.svg',
      command: `
const content = \`
<form>
  <div class="form-group">
    <label for="chance">Chance (1 a 6):</label>
    <select id="chance" name="chance">
      <option value="1">1 em 1d6</option>
      <option value="2">2 em 1d6</option>
      <option value="3">3 em 1d6</option>
      <option value="4">4 em 1d6</option>
      <option value="5">5 em 1d6</option>
      <option value="6">6 em 1d6</option>
    </select>
  </div>
</form>
\`;

new Dialog({
  title: "Teste de Chance em 1d6",
  content,
  buttons: {
    roll: {
      icon: '<i class="fas fa-dice"></i>',
      label: "Rolar",
      callback: async html => {
        const diff = parseInt(html.find('[name="chance"]').val());
        const roll = new Roll("1d6");
        await roll.evaluate();
        await roll.toMessage({
          roll,
          speaker: ChatMessage.getSpeaker(),
          flavor: \`<div class="title">Teste de <strong>Chance de \${diff} em 1d6</strong></div>\` +
                  (roll.total <= diff
                    ? '<p class="result"><strong class="success">Sucesso!</strong></p>'
                    : '<p class="result"><strong class="failure">Falha</strong></p>')
        });
      }
    },
    cancel: {
      icon: '<i class="fas fa-times"></i>',
      label: "Cancelar"
    }
  },
  default: "roll"
}).render(true);
      `,
      ownership: { default: 1 }, // 1 = LIMITED
      flags: { olddragon2e: true },
    });
  }
});

const olddragon2e = {};

// Configurações de iniciativa
olddragon2e.initiativeTypes = {
  individual: 'Individual (1d12)',
  standard: 'Padrão (Destreza/Sabedoria)',
};

olddragon2e.levels = {
  1: 'olddragon2e.levels.1',
  2: 'olddragon2e.levels.2',
  3: 'olddragon2e.levels.3',
  4: 'olddragon2e.levels.4',
  5: 'olddragon2e.levels.5',
  6: 'olddragon2e.levels.6',
  7: 'olddragon2e.levels.7',
  8: 'olddragon2e.levels.8',
  9: 'olddragon2e.levels.9',
  10: 'olddragon2e.levels.10',
  11: 'olddragon2e.levels.11',
  12: 'olddragon2e.levels.12',
  13: 'olddragon2e.levels.13',
  14: 'olddragon2e.levels.14',
  15: 'olddragon2e.levels.15',
};

olddragon2e.reputation = {
  0: 'olddragon2e.reputation_levels.0',
  1: 'olddragon2e.reputation_levels.1',
  2: 'olddragon2e.reputation_levels.2',
  3: 'olddragon2e.reputation_levels.3',
  4: 'olddragon2e.reputation_levels.4',
  5: 'olddragon2e.reputation_levels.5',
};

olddragon2e.alignment = {
  ordeiro: 'olddragon2e.ordeiro',
  neutro: 'olddragon2e.neutro',
  caotico: 'olddragon2e.caotico',
};

olddragon2e.monster_concepts = {
  Humanoide: 'olddragon2e.concepts.humanoide',
  'Humanoide Monstruoso': 'olddragon2e.concepts.humanoide_monstruoso',
  Gigante: 'olddragon2e.concepts.gigante',
  Animal: 'olddragon2e.concepts.animal',
  Inseto: 'olddragon2e.concepts.inseto',
  Constructo: 'olddragon2e.concepts.constructo',
  'Morto-Vivo': 'olddragon2e.concepts.morto_vivo',
  Planta: 'olddragon2e.concepts.planta',
  Gosma: 'olddragon2e.concepts.gosma',
  Dragão: 'olddragon2e.concepts.dragao',
  Besta: 'olddragon2e.concepts.besta',
};

olddragon2e.monster_sizes = {
  miudo: 'olddragon2e.sizes.miudo',
  pequeno: 'olddragon2e.sizes.pequeno',
  medio: 'olddragon2e.sizes.medio',
  grande: 'olddragon2e.sizes.grande',
  imenso: 'olddragon2e.sizes.imenso',
  colossal: 'olddragon2e.sizes.colossal',
};

// Deprecated
olddragon2e.monster_habitats = {
  qualquer: 'olddragon2e.habitats.qualquer',
  planicies: 'olddragon2e.habitats.planicies',
  colinas: 'olddragon2e.habitats.colinas',
  montanhas: 'olddragon2e.habitats.montanhas',
  pantanos: 'olddragon2e.habitats.pantanos',
  geleiras: 'olddragon2e.habitats.geleiras',
  desertos: 'olddragon2e.habitats.desertos',
  florestas: 'olddragon2e.habitats.florestas',
  subterraneos: 'olddragon2e.habitats.subterraneos',
  oceanos: 'olddragon2e.habitats.oceanos',
  extraplanar: 'olddragon2e.habitats.extraplanar',
};

olddragon2e.weapon_types = {
  melee: 'olddragon2e.weapon_types.melee',
  throwing: 'olddragon2e.weapon_types.throwing',
  ranged: 'olddragon2e.weapon_types.ranged',
  ammunition: 'olddragon2e.weapon_types.ammunition',
};

olddragon2e.ammo_types = {
  none: 'olddragon2e.ammo_types.none',
  self: 'olddragon2e.ammo_types.self',
  arrow: 'olddragon2e.ammo_types.arrow',
  bolt: 'olddragon2e.ammo_types.bolt',
  bolt_small: 'olddragon2e.ammo_types.bolt_small',
};

olddragon2e.damage_types = {
  none: 'olddragon2e.damage_types.none',
  bludgeoning: 'olddragon2e.damage_types.bludgeoning',
  piercing: 'olddragon2e.damage_types.piercing',
  slashing: 'olddragon2e.damage_types.slashing',
};

olddragon2e.weapon_sizes = {
  none: 'olddragon2e.weapon_sizes.none',
  small: 'olddragon2e.weapon_sizes.small',
  medium: 'olddragon2e.weapon_sizes.medium',
  large: 'olddragon2e.weapon_sizes.large',
};

olddragon2e.spell_school = {
  arcane: 'olddragon2e.arcane_spell',
  divine: 'olddragon2e.divine_spell',
  necromancer: 'olddragon2e.necromancer_spell',
  illusionist: 'olddragon2e.illusionist_spell',
};

olddragon2e.arcane_spell_circle = {
  null: 'olddragon2e.null',
  1: 'olddragon2e.spell_circle.1',
  2: 'olddragon2e.spell_circle.2',
  3: 'olddragon2e.spell_circle.3',
  4: 'olddragon2e.spell_circle.4',
  5: 'olddragon2e.spell_circle.5',
  6: 'olddragon2e.spell_circle.6',
  7: 'olddragon2e.spell_circle.7',
  8: 'olddragon2e.spell_circle.8',
  9: 'olddragon2e.spell_circle.9',
};

olddragon2e.divine_spell_circle = {
  null: 'olddragon2e.null',
  1: 'olddragon2e.spell_circle.1',
  2: 'olddragon2e.spell_circle.2',
  3: 'olddragon2e.spell_circle.3',
  4: 'olddragon2e.spell_circle.4',
  5: 'olddragon2e.spell_circle.5',
  6: 'olddragon2e.spell_circle.6',
  7: 'olddragon2e.spell_circle.7',
};

olddragon2e.necromancer_spell_circle = {
  null: 'olddragon2e.null',
  1: 'olddragon2e.spell_circle.1',
  2: 'olddragon2e.spell_circle.2',
  3: 'olddragon2e.spell_circle.3',
  4: 'olddragon2e.spell_circle.4',
  5: 'olddragon2e.spell_circle.5',
  6: 'olddragon2e.spell_circle.6',
  7: 'olddragon2e.spell_circle.7',
  8: 'olddragon2e.spell_circle.8',
  9: 'olddragon2e.spell_circle.9',
};

olddragon2e.illusionist_spell_circle = {
  null: 'olddragon2e.null',
  1: 'olddragon2e.spell_circle.1',
  2: 'olddragon2e.spell_circle.2',
  3: 'olddragon2e.spell_circle.3',
  4: 'olddragon2e.spell_circle.4',
  5: 'olddragon2e.spell_circle.5',
  6: 'olddragon2e.spell_circle.6',
  7: 'olddragon2e.spell_circle.7',
  8: 'olddragon2e.spell_circle.8',
  9: 'olddragon2e.spell_circle.9',
};

olddragon2e.alignment_tendency = {
  none: 'olddragon2e.none',
  ordeiro: 'olddragon2e.alignment_tendencies.ordeiro',
  neutro: 'olddragon2e.alignment_tendencies.neutro',
  caotico: 'olddragon2e.alignment_tendencies.caotico',
};

olddragon2e.bonus_damage_conditions = {
  none: 'olddragon2e.none',
  weight_1: 'olddragon2e.weapon_sizes.small',
  weight_2: 'olddragon2e.weapon_sizes.medium',
  weight_3: 'olddragon2e.weapon_sizes.large',
  melee: 'olddragon2e.weapon_types.melee',
  throwing: 'olddragon2e.weapon_types.throwing',
  ranged: 'olddragon2e.weapon_types.ranged',
  ammunition: 'olddragon2e.weapon_types.ammunition',
  bludgeoning: 'olddragon2e.damage_types.bludgeoning',
  piercing: 'olddragon2e.damage_types.piercing',
  slashing: 'olddragon2e.damage_types.slashing',
  arrow: 'olddragon2e.arrow',
  bolt: 'olddragon2e.bolt',
  bolt_small: 'olddragon2e.bolt_small',
  polearm: 'olddragon2e.polearm',
  two_handed: 'olddragon2e.two_handed',
  versatile: 'olddragon2e.versatile',
  magic_item: 'olddragon2e.magic_item',
};

olddragon2e.rogue_talents = {
  none: 'olddragon2e.none',
  armadilha: 'olddragon2e.armadilha',
  arrombar: 'olddragon2e.arrombar',
  cultura: 'olddragon2e.cultura',
  decifrar: 'olddragon2e.decifrar',
  disfarce: 'olddragon2e.disfarce',
  escalar: 'olddragon2e.escalar',
  furtividade: 'olddragon2e.furtividade',
  percepcao: 'olddragon2e.percepcao',
  punga: 'olddragon2e.punga',
  rastrear: 'olddragon2e.rastrear',
  senso_de_perigo: 'olddragon2e.senso_de_perigo',
  veneno: 'olddragon2e.veneno',
};

function addChatListeners(html) {
  html.querySelector('.spell-show')?.addEventListener('click', onSpellShow);
}

function onSpellShow(event) {
  event.preventDefault();
  const element = event.currentTarget.closest('.spell');
  let spellCaster = game.actors.get(element.dataset.ownerId);
  let spell = spellCaster.items.get(element.dataset.itemId);

  spell.sheet.render(true);
}

class OD2Item extends Item {
  chatTemplate = {
    attack: 'systems/olddragon2e/templates/partials/cards/attack-card.hbs',
    weapon: 'systems/olddragon2e/templates/partials/cards/weapon-card.hbs',
    armor: 'systems/olddragon2e/templates/partials/cards/armor-card.hbs',
    shield: 'systems/olddragon2e/templates/partials/cards/shield-card.hbs',
    misc: 'systems/olddragon2e/templates/partials/cards/misc-card.hbs',
    container: 'systems/olddragon2e/templates/partials/cards/container-card.hbs',
    vehicle: 'systems/olddragon2e/templates/partials/cards/vehicle-card.hbs',
    spell: 'systems/olddragon2e/templates/chat/spell-chat.hbs',
    race_ability: 'systems/olddragon2e/templates/partials/cards/race_ability-card.hbs',
    class_ability: 'systems/olddragon2e/templates/partials/cards/class_ability-card.hbs',
    monster_attack: 'systems/olddragon2e/templates/partials/cards/monster_attack-card.hbs',
  };

  async roll() {
    let chatData = {
      user: game.user.id,
      speaker: { alias: this.actor.name },
    };

    let cardData = {
      ...this.data,
      owner: this.actor.id,
    };

    chatData.content = await foundry.applications.handlebars.renderTemplate(this.chatTemplate[this.type], cardData);

    chatData.roll = true;

    return ChatMessage.create(chatData);
  }
}

class OD2ItemSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['olddragon2e', 'sheet', 'item'],
      width: 530,
      height: 340,
      tabs: [
        { navSelector: '.race-tabs', contentSelector: '.section', initial: 'about' },
        { navSelector: '.race-ability-tabs', contentSelector: '.section', initial: 'about' },
        { navSelector: '.class-tabs', contentSelector: '.section', initial: 'about' },
        { navSelector: '.class-ability-tabs', contentSelector: '.section', initial: 'about' },
      ],
    });
  }

  get template() {
    return `systems/olddragon2e/templates/sheets/${this.item.type}-sheet.hbs`;
  }

  async getData() {
    const baseData = super.getData();
    const raceAbilities = await this.getItemsFromUUIDs(this.item.system.race_abilities || []);
    const classAbilities = await this.getItemsFromUUIDs(this.item.system.class_abilities || []);

    let sheetData = {
      owner: this.item.isOwner,
      editable: this.isEditable,
      item: baseData.item,
      system: baseData.item.system,
      race_abilities: raceAbilities,
      class_abilities: classAbilities,
      config: CONFIG.olddragon2e,
    };

    this.render();

    return sheetData;
  }

  async activateListeners(html) {
    if (this.isEditable) {
      html.find('.weapon-checkbox').change(this._isWeapon.bind(this));
      html.find('.item-edit').click(this._onItemEdit.bind(this));
      html.find('.item-delete').click(this._onItemDelete.bind(this));
      html.find('.rogue-talent-add').click(this._onRogueTalentAdd.bind(this));
      html.find('.rogue-talent-delete').click(this._onRogueTalentDelete.bind(this));
      html.find('.variable-construction-option-add').click(this._onVariableConstructionOptionAdd.bind(this));
      html.find('.variable-construction-option-delete').click(this._onVariableConstructionOptionDelete.bind(this));
    }

    html.on('drop', this._onDropItem.bind(this));

    super.activateListeners(html);
  }

  async getItemsFromUUIDs(uuids) {
    const items = [];
    for (const uuid of uuids) {
      const item = await fromUuid(uuid);
      if (item) items.push(item);
    }
    return items;
  }

  // Ao soltar um item sob outro item
  async _onDropItem(event) {
    event.preventDefault();

    const receivingItem = this.item;
    let raceAbilities = receivingItem.system.race_abilities || [];
    let classAbilities = receivingItem.system.class_abilities || [];
    const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
    const item = await Item.implementation.fromDropData(data);

    if (receivingItem.type === 'race') {
      if (item.type !== 'race_ability') {
        ui.notifications.error('Apenas habilidades de raça podem ser adicionadas.');
        return;
      }
      // Adiciona o UUID do Item
      raceAbilities.push(item.uuid);
      await receivingItem.update({ 'system.race_abilities': raceAbilities });
      receivingItem.parent && (await receivingItem.parent.system.updateRaceAbilities(raceAbilities));
    } else if (receivingItem.type === 'class') {
      if (item.type !== 'class_ability') {
        ui.notifications.error('Apenas habilidades de classe podem ser adicionadas.');
        return;
      }
      // Adiciona o UUID do Item
      classAbilities.push(item.uuid);
      await receivingItem.update({ 'system.class_abilities': classAbilities });
      receivingItem.parent && (await receivingItem.parent.system.updateClassAbilities(classAbilities));
    } else {
      ui.notifications.error('Apenas raças e classes podem receber habilidades.');
      return;
    }

    this.render();
  }

  // Editar item
  async _onItemEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemUuid;

    let item = await fromUuid(itemId);

    item.sheet.render(true);
  }

  // Excluir item
  async _onItemDelete(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemUuid;

    let item = await fromUuid(itemId);

    const raceAbilityTemplate = `
        <form>
            <div>
                <center>
                    Excluir a habilidade de raça <strong>${item.name}</strong>?
                </center>
            </div>
        </form>`;

    const classAbilityTemplate = `
        <form>
            <div>
                <center>
                    Excluir a habilidade de classe <strong>${item.name}</strong>?
                </center>
            </div>
        </form>`;

    let confirmationTemplate;

    if (item.type === 'race_ability') {
      confirmationTemplate = raceAbilityTemplate;
    } else if (item.type === 'class_ability') {
      confirmationTemplate = classAbilityTemplate;
    }

    await Dialog.confirm({
      title: game.i18n.localize('olddragon2e.delete'),
      content: confirmationTemplate,
      yes: async () => {
        if (item.type === 'race_ability') {
          let items = this.item.system.race_abilities.filter((ability) => ability !== item.uuid);
          await this.item.update({ 'system.race_abilities': items });
          this.item.parent && (await this.item.parent.system.updateRaceAbilities(items));
        } else if (item.type === 'class_ability') {
          let items = this.item.system.class_abilities.filter((ability) => ability !== item.uuid);
          await this.item.update({ 'system.class_abilities': items });
          this.item.parent && (await this.item.parent.system.updateClassAbilities(items));
        }
      },
      no: () => {},
    });
  }

  async _onRogueTalentAdd() {
    const talents = foundry.utils.duplicate(this.item.system.rogue_talents || []);
    const index = talents.length;
    talents.push({ key: `talent_${index}`, name: '', description: '' });
    await this.item.update({ 'system.rogue_talents': talents });
  }

  async _onRogueTalentDelete(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const talents = foundry.utils.duplicate(this.item.system.rogue_talents || []);
    talents.splice(index, 1);
    await this.item.update({ 'system.rogue_talents': talents });
  }

  async _onVariableConstructionOptionAdd() {
    const options = foundry.utils.duplicate(this.item.system.variable_construction?.available_options || []);
    options.push({ key: '', name: '', description: '' });
    await this.item.update({ 'system.variable_construction.available_options': options });
  }

  async _onVariableConstructionOptionDelete(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const options = foundry.utils.duplicate(this.item.system.variable_construction?.available_options || []);
    options.splice(index, 1);
    await this.item.update({ 'system.variable_construction.available_options': options });
  }

  async _isWeapon(event) {
    setTimeout(() => {
      if (event.currentTarget.checked) {
        this.item.update({
          'system.description': 'arma',
          'system.damage': '',
        });
      }
    }, 0);
  }
}

class BaseRoll {
  constructor(actor, dice) {
    this.dice = dice;
    this.actor = actor;
  }

  get characterName() {
    return this.actor.name;
  }

  get characterBac() {
    return this.actor.system.bac;
  }

  get characterBad() {
    return this.actor.system.bad;
  }

  rollMode(mode) {
    if (game.release.generation >= 14) {
      switch (mode) {
        case 'private':
          return 'gm';
        case 'blind':
          return 'blind';
        case 'self':
          return 'self';
        default:
          return 'public';
      }
    }
    switch (mode) {
      case 'private':
        return 'gmroll';
      case 'blind':
        return 'blindroll';
      case 'self':
        return 'selfroll';
      default:
        return 'roll';
    }
  }

  toMessageOptions(mode) {
    const value = this.rollMode(mode);
    return game.release.generation >= 14 ? { messageMode: value } : { rollMode: value };
  }
}

async function calculateRollResult(rollFormula) {
  const roll = new Roll(rollFormula);
  await roll.roll();
  return roll;
}

/**
 * Represents an attack roll in the game.
 *
 * @class AttackRoll
 * @extends {BaseRoll}
 *
 * @property {Actor} actor - The actor making the attack roll.
 * @property {Item} item - The item being used for the attack.
 * @property {string} baRoll - The base attack roll.
 * @property {boolean} baRollBonus - Indicates if there is a bonus for the base attack roll.
 *
 * @method constructor - Constructs the AttackRoll instance.
 * @method bac - Getter for the melee base attack.
 * @method bad - Getter for the ranged base attack.
 * @method formulaAdjustment - Adjusts the formula based on the difficulty of the attack.
 * @method formula - Constructs the formula for the attack roll.
 * @method messageBa - Constructs the message for the base attack.
 * @method messageAdjustment - Constructs the message for the adjustment.
 * @method printFormula - Prints the formula for the attack roll.
 * @method formatMessage - Formats the message for the attack roll.
 * @method roll - Performs the attack roll.
 * @method sendMessage - Sends the message for the attack roll.
 */

class AttackRoll extends BaseRoll {
  constructor(actor, item, ba, baBonus) {
    super(actor, '1d20');

    this.item = item;
    this.ba_roll = ba;
    this.ba_bonus = baBonus;
  }

  get bac() {
    return this.characterBac + (this.ba_bonus ? this.item.system.bonus_ba : 0);
  }

  get bad() {
    return this.characterBad + (this.ba_bonus ? this.item.system.bonus_ba : 0);
  }

  formulaAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return '+5';
      case 'easy':
        return '+2';
      case 'hard':
        return '-2';
      case 'very-hard':
        return '-5';
      default:
        return '';
    }
  }

  formula(bonus, adjustment) {
    let formula = `${this.dice} ${this.formulaAdjustment(adjustment)}`;

    if (bonus) {
      formula += `+${bonus}`;
    }

    if (this.ba_roll === 'bac') {
      formula += `+${this.bac}`;
    }

    if (this.ba_roll === 'bad') {
      formula += `+${this.bad}`;
    }

    return formula;
  }

  get messageBa() {
    switch (this.ba_roll) {
      case 'bac':
        return `corpo-a-corpo`;
      case 'bad':
        return `à distância`;
      default:
        return '';
    }
  }

  messageAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return 'Ataque (MF)';
      case 'easy':
        return 'Ataque (F)';
      case 'hard':
        return 'Ataque (D)';
      case 'very-hard':
        return 'Ataque (MD)';
      default:
        return 'Ataque';
    }
  }

  get printFormula() {
    let formula = this.dice;

    if (this.ba_roll === 'bac') {
      formula += ` ${signed_number(this.characterBac)} (BAC)`;
    }
    if (this.ba_roll === 'bad') {
      formula += ` ${signed_number(this.characterBad)} (BAD)`;
    }
    if (this.ba_bonus) {
      formula += ` ${signed_number(this.item.system.bonus_ba)} (bônus)`;
    }

    return formula;
  }

  formatMessage(adjustment) {
    return `<div class='title'>${this.messageAdjustment(adjustment)} ${this.messageBa} com <strong>${
      this.item.name
    }</strong></div>`;
  }

  /**
   * Roll the dice with the given bonus and adjustment.
   * @param {number} bonus - The bonus to add to the roll.
   * @param {string} adjustment - The adjustment to apply to the roll.
   * @returns {Promise<Roll>} The result of the roll.
   */
  async roll(bonus, adjustment) {
    const rollResult = await calculateRollResult(this.formula(bonus, adjustment));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  /**
   * Send the result of the attack roll as a message in the chat.
   * @param {string} mode - The mode of the message (e.g., 'private', 'blind', 'self').
   * @param {string} adjustment - The adjustment to apply to the roll.
   */
  sendMessage(mode, adjustment) {
    const message = this.formatMessage(adjustment);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

/**
 * Represents an unarmed attack roll in the game.
 *
 * @class UnarmedAttackRoll
 * @extends {AttackRoll}
 */
class UnarmedAttackRoll extends AttackRoll {
  /**
   * Create an unarmed attack roll.
   * @param {Object} actor - The character making the attack.
   */
  constructor(actor) {
    super(actor, null, 'bac', false);
  }

  /**
   * Gets the message to display when the attack is successful.
   *
   * @param {Object} adjustment - The adjustment to the attack roll.
   * @returns {string} - The message to display when the attack is successful.
   */
  formatMessage(adjustment) {
    return `<div class='title'>${this.messageAdjustment(adjustment)} ${
      this.messageBa
    } <strong>desarmado</strong></div>`;
  }
}

/**
 * Represents a damage roll in the game.
 *
 * @class DamageRoll
 * @extends {BaseRoll}
 *
 * @property {Actor} actor - The actor making the damage roll.
 * @property {Item} item - The item being used for the damage.
 *
 * @method constructor - Constructs the DamageRoll instance.
 * @method formula - Constructs the formula for the damage roll.
 * @method roll - Performs the damage roll.
 * @method sendMessage - Sends the message for the damage roll.
 */
class DamageRoll extends BaseRoll {
  constructor(actor, item) {
    super(actor, '1d20');

    this.item = item;
  }

  get raceBonusDamage() {
    return this.actor.system.raceBonusDamage(this.item);
  }

  get itemAttackType() {
    switch (this.item.system.type) {
      case 'melee':
        return 'melee';
      case 'throwing':
        return 'throwing';
      case 'ammunition':
        return 'ranged';
      default:
        return 'melee';
    }
  }

  printFormula(attackMode) {
    const _attackMode = attackMode || this.itemAttackType;

    let formula = this.item.system.damage;

    if (_attackMode === 'melee' || _attackMode === 'throwing') {
      formula += ` ${signed_number(this.actor.system.mod_forca)} (M. FOR)`;
    }

    if (this.item.system.bonus_damage) {
      formula += ` ${signed_number(this.item.system.bonus_damage)} (arma)`;
    }

    if (this.raceBonusDamage !== 0) {
      formula += ` ${signed_number(this.raceBonusDamage)} (raça)`;
    }

    return formula;
  }

  formula(bonus, attackMode, critical) {
    let formula = `${this.item.system.damage}`;

    if (critical) {
      formula += `*2`;
    }

    if (attackMode === 'melee' || attackMode === 'throwing') {
      formula += `+${this.actor.system.mod_forca}`;
    }

    if (this.item.system.bonus_damage) {
      formula += `+${this.item.system.bonus_damage}`;
    }

    if (this.raceBonusDamage !== 0) {
      formula += `+${this.raceBonusDamage}`;
    }

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  formatMessage() {
    return `<div class='title'>Dano com <strong>${this.item.name}</strong></div>`;
  }

  /**
   * Roll the dice with the given bonus.
   * @param {number} bonus - The bonus to add to the roll.
   * @returns {Promise<Roll>} The result of the roll.
   */
  async roll(bonus, attackMode, critical) {
    const rollResult = await calculateRollResult(this.formula(bonus, attackMode, critical));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  /**
   * Send the result of the damage roll as a message in the chat.
   * @param {string} mode - The mode of the message (e.g., 'private', 'blind', 'self').
   */
  sendMessage(mode) {
    const message = this.formatMessage();

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

class KnockoutRoll extends BaseRoll {
  constructor(actor) {
    super(actor, '1d6');
  }

  get knockoutChance() {
    let chance = 1;

    if (this.actor.system.mod_forca > 0 && this.actor.system.mod_forca < 5) {
      chance = this.actor.system.mod_forca;
    }

    return chance;
  }

  get printFormula() {
    return this.dice;
  }

  formula(bonus) {
    let formula = this.dice;

    if (bonus) {
      formula += ` + ${bonus}`;
    }

    return formula;
  }

  formatMessage() {
    let result = '<strong class="failure">Falha</strong>';

    if (this._success) {
      result = '<strong class="success">Sucesso!</strong>';
    }

    return `<div class='title'>Chance de <strong>nocaute</strong></div><p class='result'>${result}</p>`;
  }

  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  get _success() {
    return this.roll_result.total <= this.knockoutChance;
  }

  sendMessage(mode) {
    const message = this.formatMessage();

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

class JPRoll extends BaseRoll {
  constructor(actor, jpLabel, jpName) {
    super(actor, '1d20');

    this.jpLabel = jpLabel;
    this.jpName = jpName;
  }

  get jpValue() {
    return this.actor.system[`${this.jpName}_total`];
  }

  formulaAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return 5;
      case 'easy':
        return 2;
      case 'hard':
        return -2;
      case 'very-hard':
        return -5;
      default:
        return 0;
    }
  }

  formula(bonus) {
    let formula = this.dice;

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  messageAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return `Teste (MF) de`;
      case 'easy':
        return `Teste (F) de`;
      case 'hard':
        return `Teste (D) de`;
      case 'very-hard':
        return `Teste (MD) de`;
      default:
        return `Teste de`;
    }
  }

  _success(adjustment) {
    let jpValue = this.jpValue;
    jpValue += this.formulaAdjustment(adjustment);

    return this.roll_result.total <= jpValue;
  }

  formatMessage(adjustment) {
    let result = '<strong class="failure">Falha</strong>';

    if (this._success(adjustment)) {
      result = '<strong class="success">Sucesso!</strong>';
    }

    return `<div class='title'>${this.messageAdjustment(adjustment)} <strong>${
      this.jpLabel
    }</strong></div><p class="result">${result}</p>`;
  }

  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  sendMessage(mode, adjustment) {
    const message = this.formatMessage(adjustment);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

/**
 * Represents an attack roll in the game.
 *
 * @class AttackRoll
 * @extends {BaseRoll}
 *
 * @property {Actor} actor - The actor making the attack roll.
 * @property {string} baRoll - The base attack roll.
 *
 * @method constructor - Constructs the AttackRoll instance.
 * @method bac - Getter for the melee base attack.
 * @method bad - Getter for the ranged base attack.
 * @method formulaAdjustment - Adjusts the formula based on the difficulty of the attack.
 * @method formula - Constructs the formula for the attack roll.
 * @method messageBa - Constructs the message for the base attack.
 * @method messageAdjustment - Constructs the message for the adjustment.
 * @method printFormula - Prints the formula for the attack roll.
 * @method formatMessage - Formats the message for the attack roll.
 * @method roll - Performs the attack roll.
 * @method sendMessage - Sends the message for the attack roll.
 */

class BARoll extends BaseRoll {
  constructor(actor, ba) {
    super(actor, '1d20');

    this.ba_roll = ba;
  }

  get bac() {
    return this.characterBac;
  }

  get bad() {
    return this.characterBad;
  }

  formulaAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return '+5';
      case 'easy':
        return '+2';
      case 'hard':
        return '-2';
      case 'very-hard':
        return '-5';
      default:
        return '';
    }
  }

  formula(bonus, adjustment) {
    let formula = `${this.dice} ${this.formulaAdjustment(adjustment)}`;

    if (bonus) {
      formula += `+${bonus}`;
    }

    if (this.ba_roll === 'bac') {
      formula += `+${this.bac}`;
    }

    if (this.ba_roll === 'bad') {
      formula += `+${this.bad}`;
    }

    return formula;
  }

  get messageBa() {
    switch (this.ba_roll) {
      case 'bac':
        return `corpo a corpo`;
      case 'bad':
        return `à distância`;
      default:
        return '';
    }
  }

  messageAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return 'Ataque (MF)';
      case 'easy':
        return 'Ataque (F)';
      case 'hard':
        return 'Ataque (D)';
      case 'very-hard':
        return 'Ataque (MD)';
      default:
        return 'Ataque';
    }
  }

  get printFormula() {
    let formula = this.dice;

    if (this.ba_roll === 'bac') {
      formula += ` ${signed_number(this.characterBac)} (BAC)`;
    }
    if (this.ba_roll === 'bad') {
      formula += ` ${signed_number(this.characterBad)} (BAD)`;
    }

    return formula;
  }

  formatMessage(adjustment) {
    return `<div class='title'>${this.messageAdjustment(adjustment)} <strong>${this.messageBa}</strong></div>`;
  }

  /**
   * Roll the dice with the given bonus and adjustment.
   * @param {number} bonus - The bonus to add to the roll.
   * @param {string} adjustment - The adjustment to apply to the roll.
   * @returns {Promise<Roll>} The result of the roll.
   */

  async roll(bonus, adjustment) {
    const rollResult = await calculateRollResult(this.formula(bonus, adjustment));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  /**
   * Send the result of the attack roll as a message in the chat.
   * @param {string} mode - The mode of the message (e.g., 'private', 'blind', 'self').
   * @param {string} adjustment - The adjustment to apply to the roll.
   */
  sendMessage(mode, adjustment) {
    const message = this.formatMessage(adjustment);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

class StatRoll extends BaseRoll {
  constructor(actor, statLabel, statName) {
    super(actor, '1d20');

    this.statLabel = statLabel;
    this.statName = statName;
  }

  get statValue() {
    return this.actor.system[this.statName];
  }

  formulaAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return 5;
      case 'easy':
        return 2;
      case 'hard':
        return -2;
      case 'very-hard':
        return -5;
      default:
        return 0;
    }
  }

  formula(bonus) {
    let formula = this.dice;

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  messageAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return `Teste (MF) de`;
      case 'easy':
        return `Teste (F) de`;
      case 'hard':
        return `Teste (D) de`;
      case 'very-hard':
        return `Teste (MD) de`;
      default:
        return `Teste de`;
    }
  }

  _success(adjustment) {
    let statValue = this.statValue;
    statValue += this.formulaAdjustment(adjustment);

    return this.roll_result.total <= statValue;
  }

  formatMessage(adjustment) {
    let result = '<strong class="failure">Falha</strong>';

    if (this._success(adjustment)) {
      result = '<strong class="success">Sucesso!</strong>';
    }

    return `<div class='title'>${this.messageAdjustment(adjustment)} <strong>${
      this.statLabel
    }</strong></div><p class='result'>${result}</p>`;
  }

  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  sendMessage(mode, adjustment) {
    const message = this.formatMessage(adjustment);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

class TalentRoll extends BaseRoll {
  constructor(actor, talentLabel, talentScore) {
    super(actor, '1d6');

    this.talentLabel = talentLabel;
    this.talentScore = talentScore;
  }

  formula(bonus) {
    let formula = this.dice;

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  _success() {
    return this.roll_result.total <= this.talentScore;
  }

  formatMessage() {
    let result = '<strong class="failure">Falha</strong>';

    if (this._success()) {
      result = '<strong class="success">Sucesso!</strong>';
    }

    return `<div class='title'>Teste de <strong>${this.talentLabel}</strong> (${this.talentScore})</div><p class='result'>${result}</p>`;
  }

  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  sendMessage(mode) {
    const message = this.formatMessage();

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

class NaturalWeaponAttackRoll extends AttackRoll {
  constructor(actor, weaponName) {
    super(actor, null, 'bac', false);
    this.weaponName = weaponName;
  }

  formatMessage(adjustment) {
    return `<div class='title'>${this.messageAdjustment(adjustment)} ${this.messageBa} com <strong>${
      this.weaponName
    }</strong></div>`;
  }
}

class NaturalWeaponDamageRoll extends BaseRoll {
  constructor(actor, weaponName, damage) {
    super(actor, damage);
    this.weaponName = weaponName;
    this.damage = damage;
  }

  printFormula() {
    return this.damage;
  }

  formula(bonus, critical) {
    let f = critical ? `(${this.damage})*2` : this.damage;
    if (bonus) f += `+${bonus}`;
    return f;
  }

  formatMessage() {
    return `<div class='title'>Dano com <strong>${this.weaponName}</strong></div>`;
  }

  async roll(bonus, critical) {
    const rollResult = await calculateRollResult(this.formula(bonus, critical));
    this.roll_result = rollResult;
    return rollResult.total;
  }

  sendMessage(mode) {
    this.roll_result.toMessage(
      {
        flavor: this.formatMessage(),
        speaker: { alias: truncateString(this.characterName, 30) },
      },
      this.toMessageOptions(mode),
    );
  }
}

class MonsterJPRoll extends BaseRoll {
  constructor(actor) {
    super(actor, '1d20');
  }

  get jpValue() {
    return Number(this.actor.system.jp);
  }

  formulaAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return 5;
      case 'easy':
        return 2;
      case 'hard':
        return -2;
      case 'very-hard':
        return -5;
      default:
        return 0;
    }
  }

  formula(bonus) {
    let formula = this.dice;

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  messageAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return `Teste (MF) de`;
      case 'easy':
        return `Teste (F) de`;
      case 'hard':
        return `Teste (D) de`;
      case 'very-hard':
        return `Teste (MD) de`;
      default:
        return `Teste de`;
    }
  }

  _success(adjustment) {
    let jpValue = this.jpValue;
    jpValue += this.formulaAdjustment(adjustment);

    return this.roll_result.total <= jpValue;
  }

  formatMessage(adjustment) {
    let result = '<strong class="failure">Falha</strong>';

    if (this._success(adjustment)) {
      result = '<strong class="success">Sucesso!</strong>';
    }

    return `<div class='title'>${this.messageAdjustment(
      adjustment,
    )} <strong>Jogada de Proteção</strong></div><p class='result'>${result}</p>`;
  }

  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  sendMessage(mode, adjustment) {
    const message = this.formatMessage(adjustment);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

class MonsterMORoll extends BaseRoll {
  constructor(actor) {
    super(actor, '2d6');
  }

  get moValue() {
    return Number(this.actor.system.mo);
  }

  formulaAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return 5;
      case 'easy':
        return 2;
      case 'hard':
        return -2;
      case 'very-hard':
        return -5;
      default:
        return 0;
    }
  }

  formula(bonus) {
    let formula = this.dice;

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  messageAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return `Teste (MF) de`;
      case 'easy':
        return `Teste (F) de`;
      case 'hard':
        return `Teste (D) de`;
      case 'very-hard':
        return `Teste (MD) de`;
      default:
        return `Teste de`;
    }
  }

  _success(adjustment) {
    let moValue = this.moValue;
    moValue += this.formulaAdjustment(adjustment);

    return this.roll_result.total <= moValue;
  }

  formatMessage(adjustment) {
    let result = '<strong class="failure">Falha</strong>';

    if (this._success(adjustment)) {
      result = '<strong class="success">Sucesso!</strong>';
    }

    return `<div class='title'>${this.messageAdjustment(
      adjustment,
    )} <strong>Moral</strong></div><p class='result'>${result}</p>`;
  }

  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  sendMessage(mode, adjustment) {
    const message = this.formatMessage(adjustment);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

class MonsterDVRoll extends BaseRoll {
  constructor(actor) {
    super(actor, 'd8');
  }

  get dvInput() {
    return this.actor.system.dv.replace(/d8|\s/g, ''); // Remove 'd8' and spaces from input
  }

  get dvInputIsHalf() {
    return this.dvInput === '½';
  }

  /**
   * Returns the quantity of dice for the DV roll.
   * If the DV value includes 'a', it is treated as a range and the average is returned.
   * If the DV value is not a valid number or empty, the default value of 1 is returned.
   * @returns {number} The quantity of dice for the DV roll.
   */
  get diceQuantity() {
    let dvInput = this.dvInput;
    const dvValue = dvInput.trim();

    if (dvValue.includes('a')) {
      const rangeValues = dvValue.split('a').map((val) => parseInt(val.trim()));
      if (rangeValues.length === 2 && !isNaN(rangeValues[0]) && !isNaN(rangeValues[1])) {
        const min = rangeValues[0];
        const max = rangeValues[1];
        return Math.round((min + max) / 2);
      }
    }

    if (!dvInput || isNaN(dvInput) || !Number.isInteger(parseFloat(dvInput))) {
      dvInput = '1';
    }

    return parseInt(dvInput);
  }

  get dvBonus() {
    let dvBonusInput = this.actor.system.dv_bonus;

    if (!dvBonusInput || isNaN(dvBonusInput) || !Number.isInteger(parseFloat(dvBonusInput))) {
      dvBonusInput = '0';
    }

    return parseInt(dvBonusInput);
  }

  get currentHp() {
    return this.actor.system.hp.value;
  }

  get maxHp() {
    return this.actor.system.hp.max;
  }

  formula(bonus) {
    let formula = `${this.diceQuantity}${this.dice}`;

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));
    this.roll_result = rollResult;

    return rollResult.total;
  }

  /**
   * Calculates the hit points (hp) for a monster's DV roll.
   * @param {boolean} [withBonus=true] - Indicates whether to include the bonus in the calculation.
   * @returns {Object} - An object containing the calculated hit points.
   * @property {number} total - The total hit points.
   * @property {number} [half] - The half hit points, only calculated if the DV input is '½'.
   * @property {number} [totalWithBonus] - The total hit points with bonus, only calculated if withBonus is true and dvBonus is provided.
   * @property {number} [halfWithBonus] - The half hit points with bonus, only calculated if withBonus is true, dvBonus is provided, and the DV input is '½'.
   */

  calculateHp(withBonus = true) {
    let hp = {
      total: 0,
      half: 0,
      totalWithBonus: 0,
      halfWithBonus: 0,
    };
    hp.total = this.roll_result.total;

    if (this.dvInputIsHalf) {
      hp.half = Math.ceil(this.roll_result.total / 2);
    }

    if (withBonus && this.dvBonus) {
      const bonus = parseInt(this.dvBonus || 0);
      hp.totalWithBonus = hp.total + bonus;
      hp.halfWithBonus = hp.half + bonus;
    }

    return hp;
  }

  async updateHp() {
    const hp = this.calculateHp();

    let hpValue = hp.total;
    if (this.dvBonus !== 0) {
      hpValue = hp.totalWithBonus;
    }

    if (this.dvInputIsHalf) {
      hpValue = hp.half;

      if (this.dvBonus !== 0) {
        hpValue = hp.halfWithBonus;
      }
    }

    await this.actor.update({
      'system.hp.value': hpValue,
      'system.hp.max': hpValue,
    });
  }

  /**
   * Formats the message for displaying points of health (hp).
   *
   * @param {Object} hp - The object containing health points information.
   * @param {number} hp.total - The total health points.
   * @param {number} hp.half - The half health points.
   * @param {number} hp.halfWithBonus - The half health points with bonus.
   * @param {number} hp.totalWithBonus - The total health points with bonus.
   * @returns {string} - The formatted message for displaying points of health.
   */

  formatMessage(hp) {
    let bonusText = '';
    let resultText = '';

    let bonus = parseInt(this.dvBonus || 0);
    let hasBonus = bonus !== 0;

    resultText = ` ${hp.total}`;
    if (this.dvInputIsHalf) {
      resultText = ` ${hp.total} &div; 2 &cong; ${hp.half}`;

      if (hasBonus) {
        bonusText = ` + ${bonus} <em>(DV Bônus)</em> = <strong>${hp.halfWithBonus}</strong>`;
        resultText += `${bonusText}`;
      }
    }

    if (!this.dvInputIsHalf && hasBonus) {
      bonusText = ` + ${bonus} <em>(DV Bônus)</em> = <strong>${hp.totalWithBonus}</strong>`;
      resultText = ` ${hp.total}${bonusText}`;
    }

    return `<div class="title">Rolagem de <strong>Pontos de Vida</strong></div><p class="result">PV Totais: ${resultText}</p>`;
  }

  /**
   * Sends a message with the given mode and hp.
   * @param {string} mode - The mode of the message.
   * @param {number} hp - The hp value to format the message with.
   */

  sendMessage(mode, hp) {
    const message = this.formatMessage(hp);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

/**
 * Represents an attack roll in the game.
 *
 * @class AttackRoll
 * @extends {BaseRoll}
 *
 * @property {Actor} actor - The actor making the attack roll.
 * @property {Item} item - The item being used for the attack.
 *
 * @method constructor - Constructs the MonsterAttackRoll instance.
 * @method formulaAdjustment - Adjusts the formula based on the difficulty of the attack.
 * @method formula - Constructs the formula for the attack roll.
 * @method messageAdjustment - Constructs the message for the adjustment.
 * @method printFormula - Prints the formula for the attack roll.
 * @method formatMessage - Formats the message for the attack roll.
 * @method roll - Performs the attack roll.
 * @method sendMessage - Sends the message for the attack roll.
 */

class MonsterAttackRoll extends BaseRoll {
  constructor(actor, item) {
    super(actor, '1d20');

    this.item = item;
  }

  get ba() {
    return signed_number(this.item.system.ba) || 0;
  }

  formulaAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return '+5';
      case 'easy':
        return '+2';
      case 'hard':
        return '-2';
      case 'very-hard':
        return '-5';
      default:
        return '';
    }
  }

  formula(bonus, adjustment) {
    let formula = `${this.dice} ${this.formulaAdjustment(adjustment)} ${this.ba}`;

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  messageAdjustment(adjustment) {
    switch (adjustment) {
      case 'very-easy':
        return 'Ataque (MF)';
      case 'easy':
        return 'Ataque (F)';
      case 'hard':
        return 'Ataque (D)';
      case 'very-hard':
        return 'Ataque (MD)';
      default:
        return 'Ataque';
    }
  }

  get printFormula() {
    return `${this.dice} ${this.ba} (BA)`;
  }

  formatMessage(adjustment) {
    return `<div class='title'>${this.messageAdjustment(adjustment)} com <strong>${
      this.item.system.description
    }</strong></div>`;
  }

  /**
   * Roll the dice with the given bonus and adjustment.
   * @param {number} bonus - The bonus to add to the roll.
   * @param {string} adjustment - The adjustment to apply to the roll.
   * @returns {Promise<Roll>} The result of the roll.
   */
  async roll(bonus, adjustment) {
    const rollResult = await calculateRollResult(this.formula(bonus, adjustment));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  /**
   * Send the result of the attack roll as a message in the chat.
   * @param {string} mode - The mode of the message (e.g., 'private', 'blind', 'self').
   * @param {string} adjustment - The adjustment to apply to the roll.
   */
  sendMessage(mode, adjustment) {
    const message = this.formatMessage(adjustment);

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

/**
 * Represents a damage roll in the game.
 *
 * @class DamageRoll
 * @extends {BaseRoll}
 *
 * @property {Actor} actor - The actor making the damage roll.
 * @property {Item} item - The item being used for the damage.
 *
 * @method constructor - Constructs the MonsterDamageRoll instance.
 * @method formula - Constructs the formula for the damage roll.
 * @method roll - Performs the damage roll.
 * @method sendMessage - Sends the message for the damage roll.
 */
class MonsterDamageRoll extends BaseRoll {
  constructor(actor, item) {
    super(actor, '1d20');

    this.item = item;
  }

  printFormula() {
    let formula = this.item.system.damage;

    if (this.item.system.damage_bonus) {
      formula += ` + ${this.item.system.damage_bonus} (bônus)`;
    }

    return formula;
  }

  formula(bonus) {
    let formula = `${this.item.system.damage}`;

    if (this.item.system.damage_bonus) {
      formula += `+${this.item.system.damage_bonus}`;
    }

    if (bonus) {
      formula += `+${bonus}`;
    }

    return formula;
  }

  formatMessage() {
    return `<div class='title'>Dano com <strong>${this.item.system.description}</strong></div>`;
  }

  /**
   * Roll the dice with the given bonus.
   * @param {number} bonus - The bonus to add to the roll.
   * @returns {Promise<Roll>} The result of the roll.
   */
  async roll(bonus) {
    const rollResult = await calculateRollResult(this.formula(bonus));

    this.roll_result = rollResult;

    return rollResult.total;
  }

  /**
   * Send the result of the damage roll as a message in the chat.
   * @param {string} mode - The mode of the message (e.g., 'private', 'blind', 'self').
   */
  sendMessage(mode) {
    const message = this.formatMessage();

    this.roll_result.toMessage(
      {
        flavor: message,
        speaker: {
          alias: truncateString(this.characterName, 30),
        },
      },
      this.toMessageOptions(mode),
    );
  }
}

// Constants for initiative results
const INITIATIVE_SUCCESS = 99;
const INITIATIVE_FAILURE = 33;
const INITIATIVE_NPC = 66;
const INITIATIVE_INVALID = 21;

function calculateInitiative(actor, rolled) {
  // Get the actor's dexterity and wisdom attributes
  const dex = Number(actor.system.destreza) || 0;
  const wis = Number(actor.system.sabedoria) || 0;
  const bestAttribute = Math.max(dex, wis);

  // Warn if attributes are invalid
  if (dex === 0 || wis === 0) {
    ui.notifications.warn(game.i18n.format('olddragon2e.initiative.invalid_attributes', { name: actor.name }));
    return { initiative: INITIATIVE_INVALID, success: false, bestAttribute };
  }

  // Determine success based on the rolled value
  const success = rolled <= bestAttribute;
  const initiative = success ? INITIATIVE_SUCCESS : INITIATIVE_FAILURE;

  return { initiative, success, bestAttribute };
}

function truncateName(name, maxLength = 10) {
  // Truncate the name if it exceeds the maximum length
  return name.length > maxLength ? name.slice(0, maxLength) + '…' : name;
}

function buildInitiativeReport(successes, failures, npcs, combatantsWithoutInitiative) {
  // Build the initiative report as an HTML string
  let report = `<div class="title">${game.i18n.localize('olddragon2e.initiative.test')}</div>`;
  if (combatantsWithoutInitiative.length > 0) {
    report += `<p><i>${game.i18n.localize('olddragon2e.initiative.auto_rolled')}</i></p>`;
  }

  report += `
    <table style="width:100%; border-collapse: collapse; margin: auto;">
      <tr>
        <th style="text-align:left; padding: 2px;">${game.i18n.localize('olddragon2e.initiative.combatant')}</th>
        <th style="text-align:center; padding: 2px;">${game.i18n.localize('olddragon2e.initiative.roll')}</th>
        <th style="text-align:center; padding: 2px;">${game.i18n.localize('olddragon2e.initiative.target')}</th>
        <th style="text-align:center; padding: 2px;">${game.i18n.localize('olddragon2e.initiative.result')}</th>
      </tr>`;

  // Add rows for successes
  for (const s of successes) {
    report += `
      <tr>
        <td style="padding: 2px;">${truncateName(s.name, 10)}</td>
        <td style="text-align:center; padding: 2px;">${s.rolled}</td>
        <td style="text-align:center; padding: 2px;">${s.bestAttribute}</td>
        <td style="text-align:left; padding: 2px;">✅ ${game.i18n.localize('olddragon2e.success')}</td>
      </tr>`;
  }

  // Add rows for NPCs
  for (const n of npcs) {
    report += `
      <tr>
        <td style="padding: 2px;">${truncateName(n.name, 10)}</td>
        <td style="text-align:center; padding: 2px;">—</td>
        <td style="text-align:center; padding: 2px;">—</td>
        <td style="text-align:left; padding: 2px;">👾 ${game.i18n.localize('olddragon2e.initiative.npc')}</td>
      </tr>`;
  }

  // Add rows for failures
  for (const f of failures) {
    report += `
      <tr>
        <td style="padding: 2px;">${truncateName(f.name, 10)}</td>
        <td style="text-align:center; padding: 2px;">${f.rolled}</td>
        <td style="text-align:center; padding: 2px;">${f.bestAttribute}</td>
        <td style="text-align:left; padding: 2px;">❌ ${game.i18n.localize('olddragon2e.failure')}</td>
      </tr>`;
  }

  report += `</table>`;
  return report;
}

// Export constants and functions for use in other modules
const INITIATIVE = {
  SUCCESS: INITIATIVE_SUCCESS,
  FAILURE: INITIATIVE_FAILURE,
  NPC: INITIATIVE_NPC,
  INVALID: INITIATIVE_INVALID,
};

// Function to check if standard initiative is active
function isStandardInitiativeActive() {
  // If the game is not fully initialized, return false
  if (!game || !game.settings || !game.settings.get) return false;

  try {
    const initiativeType = game.settings.get('olddragon2e', 'initiativeType');
    return initiativeType === 'standard';
  } catch (error) {
    console.error(game.i18n.localize('olddragon2e.initiative.error_checking_type'), error);
    return false;
  }
}

// Function to remove initiative hooks
function removeInitiativeHooks() {
  Hooks.off('preUpdateCombat', handlePreUpdateCombat);
  Hooks.off('createCombatant', handleCreateCombatant);
  Hooks.off('updateCombat', handleUpdateCombat);
}

// Handlers for initiative hooks
async function handlePreUpdateCombat(combat, update) {
  // Check again if standard initiative is active
  if (!isStandardInitiativeActive()) {
    removeInitiativeHooks();
    return;
  }

  const currentRound = combat.round;
  const newRound = foundry.utils.getProperty(update, 'round');
  if (newRound !== 1 || currentRound >= 1) return;

  const combatantsWithoutInitiative = combat.combatants.contents.filter((c) => c.initiative === null);

  if (combat.getFlag('world', 'initiativeProcessed') && combatantsWithoutInitiative.length === 0) {
    return;
  }

  if (combatantsWithoutInitiative.length > 0) {
    ui.notifications.info(game.i18n.localize('olddragon2e.initiative.auto_rolling_notification'));

    for (const c of combatantsWithoutInitiative) {
      const roll = await new Roll('1d20').roll();
      await combat.setInitiative(c.id, roll.total);
    }
  }

  const successes = [];
  const failures = [];
  const npcs = [];

  for (const combatant of combat.combatants.contents) {
    const actor = combatant.actor;
    if (!actor) continue;
    const isVisible = !combatant.hidden;

    if (!['character', 'retainer'].includes(actor.type)) {
      await combat.setInitiative(combatant.id, INITIATIVE_NPC);

      if (isVisible) {
        npcs.push({
          name: actor.name,
        });
      }

      continue;
    }

    const rolled = combatant.initiative ?? 0;
    const { initiative, success, bestAttribute } = calculateInitiative(actor, rolled);

    await combat.setInitiative(combatant.id, initiative);
    await combatant.setFlag('world', 'old-dragon-2e-standard-initiative', {
      success,
      value: rolled,
      attribute: bestAttribute,
    });

    if (isVisible) {
      const entry = {
        name: actor.name,
        rolled,
        bestAttribute,
        success,
      };

      if (success) {
        successes.push(entry);
      } else {
        failures.push(entry);
      }
    }
  }

  await combat.setupTurns();

  await combat.setFlag('world', 'initiativeProcessed', true);

  const initiativeReport = buildInitiativeReport(successes, failures, npcs, combatantsWithoutInitiative);

  const chatMessageData = {
    user: game.user.id,
    speaker: { alias: game.i18n.localize('olddragon2e.initiative.system') },
    content: initiativeReport,
  };
  if (game.release.generation >= 14) {
    chatMessageData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
  } else {
    chatMessageData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;
  }
  await ChatMessage.create(chatMessageData);
}

async function handleCreateCombatant(combatant) {
  // Check again if standard initiative is active
  if (!isStandardInitiativeActive()) {
    removeInitiativeHooks();
    return;
  }

  const combat = combatant.combat;
  if (!combat || combat.round < 1) return;

  const actor = combatant.actor;
  if (!actor || combatant.initiative !== null) return;
  const isVisible = !combatant.hidden;

  const roll = await new Roll('1d20').roll();

  if (isVisible) {
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }) });
  }

  if (!['character', 'retainer'].includes(actor.type)) {
    await combat.setInitiative(combatant.id, INITIATIVE_NPC);
    return;
  }

  const { initiative } = calculateInitiative(actor, roll.total);
  await combat.setInitiative(combatant.id, initiative);
  await combat.setupTurns();
}

async function handleUpdateCombat(combat, update) {
  // Check again if standard initiative is active
  if (!isStandardInitiativeActive()) {
    removeInitiativeHooks();
    return;
  }

  if (update?.combatants) {
    const initiativeReset = update.combatants.some(
      (c) => Object.prototype.hasOwnProperty.call(c, 'initiative') && c.initiative === null,
    );
    if (initiativeReset) {
      await combat.unsetFlag('world', 'initiativeProcessed');
    }
  }
}

// Function to initialize initiative hooks
function initializeAttributeInitiative() {
  if (game.system.id !== 'olddragon2e') return;

  // Check if standard initiative is active
  if (!isStandardInitiativeActive()) {
    return;
  }

  CONFIG.Combat.initiative = {
    formula: '1d20',
    decimals: 0,
  };

  // Register hooks with handler functions
  Hooks.on('preUpdateCombat', handlePreUpdateCombat);
  Hooks.on('createCombatant', handleCreateCombatant);
  Hooks.on('updateCombat', handleUpdateCombat);

  // Register a hook for when settings are updated
  Hooks.on('updateSetting', (setting, data) => {
    if (setting.key === 'olddragon2e.initiativeType') {
      if (data.value === 'individual') {
        removeInitiativeHooks();
      } else if (data.value === 'standard') {
        // Reactivate hooks if necessary
        initializeAttributeInitiative();
      }
    }
  });
}

var InitiativeModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  INITIATIVE: INITIATIVE,
  buildInitiativeReport: buildInitiativeReport,
  calculateInitiative: calculateInitiative,
  initializeAttributeInitiative: initializeAttributeInitiative
});

const DEFAULT_BASE_URL = 'https://olddragon.com.br';

const buildOdoUrl = function (path, base) {
  return `${base.replace(/\/+$/, '')}${path}`;
};

const isOdoUrl = function (url, base) {
  try {
    return new URL(url).host === new URL(base).host;
  } catch {
    return false;
  }
};

const odoBaseUrl = function () {
  return game.settings.get('olddragon2e', 'odoBaseUrl').replace(/\/+$/, '') || DEFAULT_BASE_URL;
};

// Shared with deviceFlow.js's postForm, so the two never send a different
// User-Agent for the same module.
const userAgent = function () {
  return `olddragon2e/${game.system.version} (+https://olddragon.com.br)`;
};

// Single choke point for every ODO request, so headers and the base URL cannot
// drift between call sites. Never sends credentials: the API answers with
// `Access-Control-Allow-Origin: *`, which browsers reject for credentialed
// requests. Always sends Accept: application/json, without which an auth
// failure comes back as a 302 to /authorize instead of a 401.
const odoFetch = async function (path, { method = 'GET', body = null, token = null } = {}) {
  const headers = {
    Accept: 'application/json',
    'User-Agent': userAgent(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  return fetch(buildOdoUrl(path, odoBaseUrl()), {
    method,
    headers,
    credentials: 'omit',
    body: body ? JSON.stringify(body) : undefined,
  });
};

// Authenticated request: refreshes once on 401 and retries, and waits out a 429.
// deviceFlow.js imports from this module, so this import stays dynamic to
// avoid a load-time circular import between the two.
const odoFetchAuthenticated = async function (path, options = {}) {
  const { getValidAccessToken, refreshAccessToken } = await Promise.resolve().then(function () { return deviceFlow; });

  let token = await getValidAccessToken();
  if (!token) throw new Error('Não conectado ao Old Dragon Online.');

  let response = await odoFetch(path, { ...options, token });

  if (response.status === 401) {
    token = await refreshAccessToken();
    if (!token) throw new Error('Sua conexão expirou. Conecte-se novamente.');
    response = await odoFetch(path, { ...options, token });
  }

  if (response.status === 429) {
    const waitSeconds = Number(response.headers.get('Retry-After') ?? 1);
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
    response = await odoFetch(path, { ...options, token });
  }

  return response;
};

const FLAG_SCOPE = 'olddragon2e';
const FLAG_UPDATED_AT = 'odoUpdatedAt';

const clampHealthPoints = function (value, max) {
  return Math.min(Math.max(Math.round(value), 0), max);
};

const hasRemoteChanged = function (remoteUpdatedAt, lastSyncedAt) {
  if (!lastSyncedAt) return true;
  return new Date(remoteUpdatedAt).getTime() !== new Date(lastSyncedAt).getTime();
};

const recordSyncedAt = async function (actor, updatedAt) {
  await actor.setFlag(FLAG_SCOPE, FLAG_UPDATED_AT, updatedAt);
};

const lastSyncedAt = function (actor) {
  return actor.getFlag(FLAG_SCOPE, FLAG_UPDATED_AT) ?? null;
};

// Pushes the actor's current hit points to ODO. Fetches first so we can warn
// before overwriting play that happened on the site or at another table.
const pushHealthPoints = async function (actor) {
  const odoId = actor.system.odo_id;
  if (!odoId) {
    ui.notifications.error(game.i18n.localize('olddragon2e.odo_not_linked'));
    return false;
  }

  const healthPoints = clampHealthPoints(actor.system.hp.value, actor.system.hp.max);

  const current = await odoFetchAuthenticated(`/personagens/${odoId}.json`);
  if (!current.ok) {
    ui.notifications.error(`${game.i18n.localize('olddragon2e.odo_push_failed')} (${current.status})`);
    return false;
  }
  const remote = await current.json();

  if (hasRemoteChanged(remote.updated_at, lastSyncedAt(actor))) {
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize('olddragon2e.odo_conflict_title'),
      content: `<p>${game.i18n.format('olddragon2e.odo_conflict_body', {
        remote: remote.health_points,
        local: healthPoints,
      })}</p>`,
    });
    if (!confirmed) return false;
  }

  const response = await odoFetchAuthenticated(`/personagens/${odoId}.json`, {
    method: 'PATCH',
    body: { health_points: healthPoints },
  });

  if (response.status === 403) {
    ui.notifications.error(game.i18n.localize('olddragon2e.odo_push_forbidden'));
    return false;
  }
  if (!response.ok) {
    ui.notifications.error(`${game.i18n.localize('olddragon2e.odo_push_failed')} (${response.status})`);
    return false;
  }

  // The PATCH response has no body (the controller returns head :ok for
  // JSON), so we cannot read the new updated_at from it — this follow-up GET
  // is what lets us record the fresh timestamp.
  const confirmation = await odoFetchAuthenticated(`/personagens/${odoId}.json`);
  if (confirmation.ok) await recordSyncedAt(actor, (await confirmation.json()).updated_at);

  ui.notifications.info(game.i18n.format('olddragon2e.odo_push_ok', { hp: healthPoints }));
  return true;
};

const RACE_UUIDS = {
  anao: 'Compendium.olddragon2e.races.Item.d9seo5qPELZJetH6',
  elfo: 'Compendium.olddragon2e.races.Item.qZ5T7ZHQpGlmdfOq',
  gnomo: 'Compendium.olddragon2e.races.Item.GLAN1JCU7dTEVHmZ',
  halfling: 'Compendium.olddragon2e.races.Item.3VqpR0B3GFRHm9i7',
  humano: 'Compendium.olddragon2e.races.Item.LVAnPRB3y5OexOmz',
  'meio-elfo': 'Compendium.olddragon2e.races.Item.sdsNB4qd7pXkRBy9',
  // Raças de Legião
  grizzi: 'Compendium.olddragon2e-legiao.races.Item.1f25F4v2vMOSoZCp',
  'meio-elfo-kaduriano': 'Compendium.olddragon2e-legiao.races.Item.bchRiwagDwkAToHU',
  tenebrum: 'Compendium.olddragon2e-legiao.races.Item.Afas2pzK75wylg4r',
  // Raças do Guia de Raças
  atlante: 'Compendium.olddragon2e-racas.races.Item.2ZgnqWBxFihzPpZo',
  autokthon: 'Compendium.olddragon2e-racas.races.Item.dpT6s5hAIMTFTwKQ',
  bugbear: 'Compendium.olddragon2e-racas.races.Item.w4uEgGMY3OdlHxgk',
  cambion: 'Compendium.olddragon2e-racas.races.Item.PMECuRBiJabRab4O',
  centauro: 'Compendium.olddragon2e-racas.races.Item.6UlAnVK7ysIhKCvd',
  ceratopos: 'Compendium.olddragon2e-racas.races.Item.BZCqEkxVKFAmqe2y',
  ciclope: 'Compendium.olddragon2e-racas.races.Item.JGuLoU3pNWQlECNG',
  derro: 'Compendium.olddragon2e-racas.races.Item.g3Iw4z9ZlhZePn1N',
  drakold: 'Compendium.olddragon2e-racas.races.Item.cN0jWa7Bu6tFIxkH',
  duende: 'Compendium.olddragon2e-racas.races.Item.DVdGESO6gNuaL6MZ',
  duergar: 'Compendium.olddragon2e-racas.races.Item.0e2w3eNbq5X9Nzzy',
  'elfo-drow': 'Compendium.olddragon2e-racas.races.Item.gWdgiuRPp8T117wg',
  'fera-do-pantano': 'Compendium.olddragon2e-racas.races.Item.9HRRY0k6dQICU7i0',
  'fungo-pigmeu': 'Compendium.olddragon2e-racas.races.Item.xmulnel0RvqWwwsK',
  gnoll: 'Compendium.olddragon2e-racas.races.Item.2vwS5hIQ6GCFCXg2',
  goblin: 'Compendium.olddragon2e-racas.races.Item.EFefWgmQWX7p4qWD',
  hobgoblin: 'Compendium.olddragon2e-racas.races.Item.45XDu2sP4ZOCRLH2',
  'homem-lagarto': 'Compendium.olddragon2e-racas.races.Item.xBa68EbdDBXrg0Jm',
  'homem-lagarto-povo-camaleao': 'Compendium.olddragon2e-racas.races.Item.PhHv2tHfft3EImfb',
  'homem-lagarto-povo-gila': 'Compendium.olddragon2e-racas.races.Item.yU2ji6yP0j6FDl7C',
  'homem-lagarto-povo-lagartixa': 'Compendium.olddragon2e-racas.races.Item.Mc9yoinN1Xk9XfgE',
  'homem-lagarto-povo-lagarto-subterraneo': 'Compendium.olddragon2e-racas.races.Item.inq2kMiMUSmCz9Nr',
  'homem-lagarto-povo-lagarto-voador': 'Compendium.olddragon2e-racas.races.Item.KMzh57CBIoRwypBB',
  'homem-lagarto-povo-moloch': 'Compendium.olddragon2e-racas.races.Item.Q8vPH3vOksewuicw',
  howkar: 'Compendium.olddragon2e-racas.races.Item.LAULwpLKcWMH4mJK',
  kobold: 'Compendium.olddragon2e-racas.races.Item.ysSpjUHQqBX6wCA0',
  mantis: 'Compendium.olddragon2e-racas.races.Item.EHjWlXRakNdn1OXc',
  'meio-anao': 'Compendium.olddragon2e-racas.races.Item.7Iy6OoVcwGZRrEET',
  'meio-dragao': 'Compendium.olddragon2e-racas.races.Item.jv0RJOg0c0rljz9A',
  'meio-gigante': 'Compendium.olddragon2e-racas.races.Item.Elg4U55xBOKuGVIX',
  'meio-orc': 'Compendium.olddragon2e-racas.races.Item.e23XaoQHgSDqnJqr',
  minotauro: 'Compendium.olddragon2e-racas.races.Item.FLBgz4EG1CtLvtMQ',
  muskin: 'Compendium.olddragon2e-racas.races.Item.pZE0MyykzBX0uB4F',
  nefilim: 'Compendium.olddragon2e-racas.races.Item.jrEnAACLCvdufx8h',
  ogro: 'Compendium.olddragon2e-racas.races.Item.7kmnP2OIE8kNizA7',
  orc: 'Compendium.olddragon2e-racas.races.Item.zhNSMiBSsw9bHjgl',
  pixie: 'Compendium.olddragon2e-racas.races.Item.34p0PIsHqjE6D3DI',
  pteros: 'Compendium.olddragon2e-racas.races.Item.LED2AY0WIUKuqHH6',
  sahuagin: 'Compendium.olddragon2e-racas.races.Item.KHdHyP6SIZRcyjKa',
  satiro: 'Compendium.olddragon2e-racas.races.Item.taxNz4ZkJlwUKHKb',
  sibilante: 'Compendium.olddragon2e-racas.races.Item.XzdZlAbHku4mwDPS',
  teropodes: 'Compendium.olddragon2e-racas.races.Item.il6jvAPVLwv1DtxP',
  thoul: 'Compendium.olddragon2e-racas.races.Item.J4lAuTigET7tzIdl',
  treant: 'Compendium.olddragon2e-racas.races.Item.9x9wnU1I2AUoQE5r',
  troglodita: 'Compendium.olddragon2e-racas.races.Item.wrKtBeIgR1OoDLu4',
  varkos: 'Compendium.olddragon2e-racas.races.Item.4fwAIsiiTJEsdvcD',
};

const CLASS_UUIDS = {
  academico: 'Compendium.olddragon2e.classes.Item.UbJdOGEnK1AHoHrh',
  'anao-aventureiro': 'Compendium.olddragon2e.classes.Item.Y46BnHjmf9v2sYYA',
  arqueiro: 'Compendium.olddragon2e.classes.Item.zVsnFVV3I7aOGLzK',
  assassino: 'Compendium.olddragon2e.classes.Item.qmcr4miRTUGaUZgr',
  barbaro: 'Compendium.olddragon2e.classes.Item.XyMxtlkHTVeuXict',
  bardo: 'Compendium.olddragon2e.classes.Item.zhBTrsrVCJuh0TIP',
  bruxo: 'Compendium.olddragon2e.classes.Item.RwWjaex47rIj9FwO',
  clerigo: 'Compendium.olddragon2e.classes.Item.cYfvA9p2XprFpamU',
  druida: 'Compendium.olddragon2e.classes.Item.tRhKnE5D6grdUwzL',
  'elfo-aventureiro': 'Compendium.olddragon2e.classes.Item.HufLva6gVWRi1l48',
  guerreiro: 'Compendium.olddragon2e.classes.Item.bkzh1k7B0ncxQfHR',
  'halfling-aventureiro': 'Compendium.olddragon2e.classes.Item.BMGOU1kveWlIJNx8',
  ilusionista: 'Compendium.olddragon2e.classes.Item.PBtvkfo69YBlKrGY',
  ladrao: 'Compendium.olddragon2e.classes.Item.o8cAybQI9lQp2MTd',
  mago: 'Compendium.olddragon2e.classes.Item.0VpxbklOWK0SaHMY',
  necromante: 'Compendium.olddragon2e.classes.Item.auquWM2cFz5Otr9z',
  paladino: 'Compendium.olddragon2e.classes.Item.UwfTTsIz4YlhQViE',
  proscrito: 'Compendium.olddragon2e.classes.Item.9cxLzlDnQQTEwuhD',
  ranger: 'Compendium.olddragon2e.classes.Item.fjNBciFT3punx7Ks',
  xama: 'Compendium.olddragon2e.classes.Item.mLrl21J2PMKmGLuh',
  // Classes de Legião
  'feiticeiro-clerigo': 'Compendium.olddragon2e-legiao.classes.Item.rViqghGwgybm5LHN',
  'feiticeiro-guerreiro': 'Compendium.olddragon2e-legiao.classes.Item.bRQgIXBLJa7gAlSm',
  'feiticeiro-ladrao': 'Compendium.olddragon2e-legiao.classes.Item.KofM93KX0N1Yglgw',
  legionario: 'Compendium.olddragon2e-legiao.classes.Item.AXvfz6DD6IM3JfjG',
};

const importRetainerActor = async (json) => {
  const data = await _jsonToRetainerActorData(json);

  // Extrair antes de Actor.create() para evitar que cleanData() do V14 mute data.system
  const raceItemData = data.system.race;
  delete data.system.race;

  const actor = await Actor.create(data);

  if (raceItemData) {
    await actor.createEmbeddedDocuments('Item', [raceItemData]);
  }

  await _addRaceAndClassAbilities(actor, raceItemData, null);
  await _addInventoryItems(actor, json.inventory_items);

  return actor;
};

const importActor = async (json) => {
  const data = await _jsonToActorData(json);

  // Extrair antes de Actor.create() para evitar que cleanData() do V14 mute data.system
  const raceItemData = data.system.race;
  const classItemData = data.system.class;
  delete data.system.race;
  delete data.system.class;

  const actor = await Actor.create(data);

  const itemsToAdd = [];
  if (raceItemData) itemsToAdd.push(raceItemData);
  if (classItemData) itemsToAdd.push(classItemData);
  if (itemsToAdd.length > 0) {
    await actor.createEmbeddedDocuments('Item', itemsToAdd);
  }

  await _addRaceAndClassAbilities(actor, raceItemData, classItemData);

  const vcSelections = _extractVariableConstructionSelections(json, actor);
  if (vcSelections) {
    await actor.update({ 'system.variable_construction_selections': vcSelections });
  }

  await _addInventoryItems(actor, json.inventory_items);

  return actor;
};

const _jsonToActorData = async (json) => {
  const raceUUID = RACE_UUIDS[json.character_race?.id];
  const classUUID = CLASS_UUIDS[json.character_class?.id];

  const isLegiaoModuleAvailable = game.modules.get('olddragon2e-legiao')?.active;
  const isRacasModuleAvailable = game.modules.get('olddragon2e-racas')?.active;

  let raceItem = null;
  let classItem = null;

  const raceName = json.character_race?.name;
  const className = json.character_class?.name;

  if (raceUUID) {
    raceItem = await fromUuid(raceUUID).catch(() => null);
    if (!raceItem && raceUUID.startsWith('Compendium.olddragon2e-legiao') && !isLegiaoModuleAvailable) {
      ui.notifications.warn(`A Raça "${raceName}" é exclusiva do módulo premium "Legião - A Era da Desolação".`);
    } else if (!raceItem && raceUUID.startsWith('Compendium.olddragon2e-racas') && !isRacasModuleAvailable) {
      ui.notifications.warn(`A Raça "${raceName}" é exclusiva do módulo premium "Guia de Campanha: Raças".`);
    } else if (!raceItem) {
      ui.notifications.warn(`A Raça "${raceName}" não foi encontrada.`);
    }
  } else {
    ui.notifications.warn(`Raça "${raceName}" não encontrada.`);
  }

  if (classUUID) {
    classItem = await fromUuid(classUUID).catch(() => null);
    if (!classItem && classUUID.startsWith('Compendium.olddragon2e-legiao') && !isLegiaoModuleAvailable) {
      ui.notifications.warn(`A Classe "${className}" é exclusiva do módulo premium "Legião - A Era da Desolação".`);
    } else if (!classItem) {
      ui.notifications.warn(`A Classe "${className}" não foi encontrada.`);
    }
  } else {
    ui.notifications.warn(`Classe "${className}" não encontrada.`);
  }

  const actorData = {
    name: json.name,
    type: 'character',
    system: {
      odo_id: json.id,
      level: json.level,
      hp: {
        value: json.health_points,
        max: json.max_hp,
      },
      forca: json.forca,
      destreza: json.destreza,
      constituicao: json.constituicao,
      inteligencia: json.inteligencia,
      sabedoria: json.sabedoria,
      carisma: json.carisma,
      jp_race_bonus: _extractJpRaceBonus(json),
      current_xp: json.experience_points,
      economy: {
        cp: json.money_cp,
        sp: json.money_sp,
        gp: json.money_gp,
      },
      details: {
        alignment: json.alignment,
        languages: json.languages.join(', '),
        appearance: json.appearance,
        personality: json.personality,
        background: json.background,
        notes: json.notes,
      },
      race: raceItem ? raceItem.toObject() : null,
      class: classItem ? classItem.toObject() : null,
    },
  };

  if (json.picture) {
    actorData.img = await _downloadAndSaveImage(json.picture);
  }

  return actorData;
};

const _jsonToRetainerActorData = async (json) => {
  const raceUUID = RACE_UUIDS[json.character_race?.id];
  const isLegiaoModuleAvailable = game.modules.get('olddragon2e-legiao')?.active;
  const isRacasModuleAvailable = game.modules.get('olddragon2e-racas')?.active;
  let raceItem = null;
  const raceName = json.character_race?.name;

  if (raceUUID) {
    raceItem = await fromUuid(raceUUID).catch(() => null);
    if (!raceItem && raceUUID.startsWith('Compendium.olddragon2e-legiao') && !isLegiaoModuleAvailable) {
      ui.notifications.warn(`A Raça "${raceName}" é exclusiva do módulo premium "Legião - A Era da Desolação".`);
    } else if (!raceItem && raceUUID.startsWith('Compendium.olddragon2e-racas') && !isRacasModuleAvailable) {
      ui.notifications.warn(`A Raça "${raceName}" é exclusiva do módulo premium "Guia de Campanha: Raças".`);
    } else if (!raceItem) {
      ui.notifications.warn(`A Raça "${raceName}" não foi encontrada.`);
    }
  } else {
    ui.notifications.warn(`Raça "${raceName}" não encontrada.`);
  }

  const actorData = {
    name: json.name,
    type: 'retainer',
    system: {
      odo_id: json.id,
      level: json.level,
      hp: { value: json.health_points, max: json.max_hp },
      forca: json.forca,
      destreza: json.destreza,
      constituicao: json.constituicao,
      inteligencia: json.inteligencia,
      sabedoria: json.sabedoria,
      carisma: json.carisma,
      economy: { cp: json.money_cp, sp: json.money_sp, gp: json.money_gp },
      details: { notes: json.notes },
      profession: json.profession,
      heroic_action_used: json.heroic_action_used,
      url: json.url,
      race: raceItem ? raceItem.toObject() : null,
    },
  };

  if (json.picture) {
    const imgPath = await _downloadAndSaveImage(json.picture);
    if (imgPath) actorData.img = imgPath;
  }

  return actorData;
};

// Promises pendentes aguardando resposta do GM para upload de retrato: requestId → { resolve, reject }
const _pendingImageRequests = new Map();

const handleCharacterImporterSocket = (data) => {
  if (data.type === 'uploadImageRequest') {
    if (!game.user.isGM) return;
    _downloadAndSaveImage(data.url).then(
      (filePath) =>
        game.socket.emit('system.olddragon2e', { type: 'uploadImageResponse', requestId: data.requestId, filePath }),
      (error) =>
        game.socket.emit('system.olddragon2e', {
          type: 'uploadImageResponse',
          requestId: data.requestId,
          error: error.message,
        }),
    );
  }
  if (data.type === 'uploadImageResponse') {
    const pending = _pendingImageRequests.get(data.requestId);
    if (!pending) return;
    _pendingImageRequests.delete(data.requestId);
    if (data.error) pending.reject(new Error(data.error));
    else pending.resolve(data.filePath);
  }
};

const _downloadAndSaveImage = async (url) => {
  if (!game.user.isGM) {
    if (!game.users.activeGM) {
      console.warn('olddragon2e | Nenhum GM ativo. O retrato não será atualizado.');
      return null;
    }
    return new Promise((resolve, reject) => {
      const requestId = foundry.utils.randomID();
      _pendingImageRequests.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (_pendingImageRequests.has(requestId)) {
          _pendingImageRequests.delete(requestId);
          reject(new Error('Timeout: GM não respondeu ao pedido de upload do retrato.'));
        }
      }, 30000);
      game.socket.emit('system.olddragon2e', {
        type: 'uploadImageRequest',
        requestId,
        url,
      });
    });
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${url}`);
  }

  const blob = await response.blob();
  const fileName = url.split('/').pop(); // Extrai a parte final da URL
  const file = new File([blob], `${fileName}.webp`, { type: blob.type });

  const worldName = game.world.id;
  const folderPath = `worlds/${worldName}/assets/character-picture`;
  const filePath = `${folderPath}/${fileName}.webp`;

  try {
    await foundry.applications.apps.FilePicker.implementation.browse('data', folderPath);
  } catch (e) {
    if (e.message.includes('does not exist or is not accessible')) {
      const parts = folderPath.split('/');
      for (let i = 1; i <= parts.length; i++) {
        const subPath = parts.slice(0, i).join('/');
        try {
          await foundry.applications.apps.FilePicker.implementation.createDirectory('data', subPath);
        } catch (err) {
          if (!err.message.includes('EEXIST')) {
            throw err;
          }
        }
      }
    } else {
      throw e;
    }
  }

  await foundry.applications.apps.FilePicker.implementation.upload('data', folderPath, file, { bucket: null });

  return filePath;
};

const _addRaceAndClassAbilities = async (actor, raceItem, classItem) => {
  const itemsToAdd = [];

  if (raceItem && raceItem.system.race_abilities) {
    const raceAbilities = await _getItemsFromUUIDs(raceItem.system.race_abilities);
    itemsToAdd.push(...raceAbilities);
  }

  if (classItem && classItem.system.class_abilities) {
    const classAbilities = await _getItemsFromUUIDs(classItem.system.class_abilities);
    itemsToAdd.push(...classAbilities);
  }

  if (itemsToAdd.length > 0) {
    await actor.createEmbeddedDocuments('Item', itemsToAdd);
  }
};

const _getItemsFromUUIDs = async (uuids) => {
  const items = [];
  for (const uuid of uuids) {
    const item = await fromUuid(uuid);
    if (item) items.push(item.toObject());
  }
  return items;
};

const JP_KEYS = ['jpd', 'jpc', 'jps'];

/**
 * Extracts the JP race bonus from the new race_mechanic_selections structure.
 * @param {Object} json - Character JSON from Old Dragon Online
 * @returns {string} The selection_key value ('jpd', 'jpc', 'jps') or empty string
 */
const _extractJpRaceBonus = (json) => {
  if (!json.race_mechanic_selections || json.race_mechanic_selections.length === 0) return '';

  const jpSelection = json.race_mechanic_selections.find((s) => JP_KEYS.includes(s.selection_key));

  return jpSelection ? jpSelection.selection_key : '';
};

/**
 * Extracts variable-construction selections from race_mechanic_selections and maps them to Foundry item IDs.
 * @param {Object} json - Character JSON from Old Dragon Online
 * @param {Actor} actor - The Foundry actor (must already have race_ability items embedded)
 * @returns {Object|null} The variable_construction_selections object, or null if none found
 */
const _extractVariableConstructionSelections = (json, actor) => {
  if (!json.race_mechanic_selections || json.race_mechanic_selections.length === 0) return null;

  const vcSelections = json.race_mechanic_selections.filter((s) => !JP_KEYS.includes(s.selection_key));
  if (vcSelections.length === 0) return null;

  // Group by character_race_ability_id, preserving order (order = choice-index)
  const grouped = {};
  for (const sel of vcSelections) {
    const id = sel.character_race_ability_id;
    if (!grouped[id]) grouped[id] = { ability_name: sel.ability_name, selections: [] };
    grouped[id].selections.push(sel);
  }

  // Match each group to its Foundry item by name and build the selections object
  const result = {};
  for (const { ability_name, selections } of Object.values(grouped)) {
    const item = actor.items.find((i) => i.type === 'race_ability' && i.name === ability_name);
    if (!item) continue;
    result[item.id] = selections.map((sel) => ({
      key: sel.selection_key,
      custom_name: sel.custom_name ?? '',
      custom_description: sel.custom_description ?? '',
    }));
  }

  return Object.keys(result).length > 0 ? result : null;
};

const _convertCost = (costInPC) => {
  if (costInPC >= 100) {
    return `${Math.floor(costInPC / 100)} PO`;
  } else if (costInPC >= 10) {
    return `${Math.floor(costInPC / 10)} PP`;
  } else {
    return `${costInPC} PC`;
  }
};

const _determineWeaponType = (item) => {
  if (item.throw_range) {
    return 'throwing';
  } else if (item.shoot_range) {
    return 'ranged';
  } else if (item.arrow || item.bolt || item.bolt_small) {
    return 'ammunition';
  } else {
    return 'melee';
  }
};

const _addInventoryItems = async (actor, inventoryItems) => {
  const itemsToAdd = inventoryItems.map((item) => {
    const isEquipped = item.name === 'Mochila' && item.concept === 'container' ? true : item.equipped;

    const itemData = {
      name: item.name,
      type: item.concept,
      system: {
        is_equipped: isEquipped,
        description: item.description,
        quantity: item.quantity,
        cost: _convertCost(item.cost),
        weight_in_load: item.weight_in_load,
        weight_in_grams: item.weight_in_grams,
        magic_item: item.magic_item,
        damage_type: item.damage_type,
        damage: item.damage,
        bonus_damage: item.bonus_damage,
        bonus_ba: item.bonus_ba,
        bonus_ca: item.bonus_ca,
        shoot_range: item.shoot_range,
        throw_range: item.throw_range,
        arrow: item.arrow,
        bolt: item.bolt,
        bolt_small: item.bolt_small,
        polearm: item.polearm,
        two_handed: item.two_handed,
        versatile: item.versatile,
        increases_load_by: item.increases_load_by,
      },
    };

    if (item.concept === 'weapon') {
      itemData.system.type = _determineWeaponType(item);
    }

    return itemData;
  });

  if (itemsToAdd.length > 0) {
    await actor.createEmbeddedDocuments('Item', itemsToAdd);
  }
};

/**
 * Removes all inventory items from an actor, preserving spells.
 * @param {Actor} actor - The Foundry actor
 */
const _removeInventoryItems = async (actor) => {
  const INVENTORY_TYPES = ['weapon', 'armor', 'shield', 'misc', 'container', 'vehicle'];

  const itemsToRemove = actor.items.filter((item) => INVENTORY_TYPES.includes(item.type));

  const itemIds = itemsToRemove.map((item) => item.id);

  if (itemIds.length > 0) {
    await actor.deleteEmbeddedDocuments('Item', itemIds);
  }
};

/**
 * Fetches retainer data from Old Dragon Online API and updates an existing retainer actor.
 * @param {Actor} actor - The Foundry retainer actor to update
 * @returns {Promise<Actor>} The updated actor
 */
const updateRetainerActor = async (actor) => {
  const odoId = actor.system.odo_id;
  if (!odoId) {
    ui.notifications.error('Este ajudante não possui um ID do Old Dragon Online.');
    return actor;
  }

  const apiUrl = buildOdoUrl(`/ajudantes/${odoId}.json`, odoBaseUrl());

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.status}`);
    }

    const json = await response.json();

    const updateData = {
      name: json.name,
      'system.level': json.level,
      'system.hp.value': json.health_points,
      'system.hp.max': json.max_hp,
      'system.forca': json.forca,
      'system.destreza': json.destreza,
      'system.constituicao': json.constituicao,
      'system.inteligencia': json.inteligencia,
      'system.sabedoria': json.sabedoria,
      'system.carisma': json.carisma,
      'system.economy.cp': json.money_cp,
      'system.economy.sp': json.money_sp,
      'system.economy.gp': json.money_gp,
      'system.profession': json.profession,
      'system.heroic_action_used': json.heroic_action_used,
      'system.url': json.url,
      'system.details.notes': json.notes,
    };

    if (json.picture) {
      const newImg = await _downloadAndSaveImage(json.picture);
      if (newImg) updateData.img = newImg;
    }

    await actor.update(updateData);

    await _removeInventoryItems(actor);
    await _addInventoryItems(actor, json.inventory_items);

    ui.notifications.info(`Ajudante "${json.name}" atualizado com sucesso!`);
    return actor;
  } catch (error) {
    ui.notifications.error(`Erro ao atualizar ajudante: ${error.message}`);
    console.error('Error updating retainer actor from ODO:', error);
    return actor;
  }
};

/**
 * Fetches character data from Old Dragon Online API and updates an existing actor.
 * @param {Actor} actor - The Foundry actor to update
 * @returns {Promise<Actor>} The updated actor
 */
const updateActor = async (actor) => {
  const odoId = actor.system.odo_id;
  if (!odoId) {
    ui.notifications.error('Este personagem não possui um ID do Old Dragon Online.');
    return actor;
  }

  const apiUrl = buildOdoUrl(`/personagens/${odoId}.json`, odoBaseUrl());

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.status}`);
    }

    const json = await response.json();

    // Update basic character data
    const updateData = {
      name: json.name,
      'system.level': json.level,
      'system.hp.value': json.health_points,
      'system.hp.max': json.max_hp,
      'system.forca': json.forca,
      'system.destreza': json.destreza,
      'system.constituicao': json.constituicao,
      'system.inteligencia': json.inteligencia,
      'system.sabedoria': json.sabedoria,
      'system.carisma': json.carisma,
      'system.jp_race_bonus': _extractJpRaceBonus(json),
      'system.current_xp': json.experience_points,
      'system.economy.cp': json.money_cp,
      'system.economy.sp': json.money_sp,
      'system.economy.gp': json.money_gp,
      'system.details.alignment': json.alignment,
      'system.details.languages': json.languages.join(', '),
      'system.details.appearance': json.appearance,
      'system.details.personality': json.personality,
      'system.details.background': json.background,
      'system.details.notes': json.notes,
    };

    // Update picture if changed
    if (json.picture) {
      const newImg = await _downloadAndSaveImage(json.picture);
      if (newImg) updateData.img = newImg;
    }

    const vcSelections = _extractVariableConstructionSelections(json, actor);
    if (vcSelections) {
      updateData['system.variable_construction_selections'] = vcSelections;
    }

    await actor.update(updateData);

    // Sync inventory items
    await _removeInventoryItems(actor);
    await _addInventoryItems(actor, json.inventory_items);

    await recordSyncedAt(actor, json.updated_at);

    ui.notifications.info(`Personagem "${json.name}" atualizado com sucesso!`);
    return actor;
  } catch (error) {
    ui.notifications.error(`Erro ao atualizar personagem: ${error.message}`);
    console.error('Error updating actor from ODO:', error);
    return actor;
  }
};

const EXPIRY_MARGIN_MS = 60_000;

const tokenExpiryFrom = function (expiresIn, now) {
  return now + expiresIn * 1000;
};

const isTokenExpired = function (expiresAt, now) {
  if (!expiresAt) return true;
  return expiresAt - now <= EXPIRY_MARGIN_MS;
};

const storeTokens = function (payload, now = Date.now()) {
  game.settings.set('olddragon2e', 'odoAccessToken', payload.access_token);
  // The refresh token rotates on every use; always overwrite it.
  game.settings.set('olddragon2e', 'odoRefreshToken', payload.refresh_token ?? '');
  game.settings.set('olddragon2e', 'odoExpiresAt', tokenExpiryFrom(payload.expires_in, now));
};

const storeAccountHandler = function (handler) {
  game.settings.set('olddragon2e', 'odoAccountHandler', handler ?? '');
};

const getStoredAccountHandler = function () {
  return game.settings.get('olddragon2e', 'odoAccountHandler');
};

const clearTokens = function () {
  game.settings.set('olddragon2e', 'odoAccessToken', '');
  game.settings.set('olddragon2e', 'odoRefreshToken', '');
  game.settings.set('olddragon2e', 'odoExpiresAt', 0);
  game.settings.set('olddragon2e', 'odoAccountHandler', '');
};

const getStoredAccessToken = function () {
  return game.settings.get('olddragon2e', 'odoAccessToken');
};

const getStoredRefreshToken = function () {
  return game.settings.get('olddragon2e', 'odoRefreshToken');
};

const isConnected = function () {
  return Boolean(getStoredRefreshToken());
};

const isStoredTokenExpired = function (now = Date.now()) {
  return isTokenExpired(game.settings.get('olddragon2e', 'odoExpiresAt'), now);
};

/**
 * Resolves which equipped ammunition item (if any) a weapon should consume for an attack.
 *
 * Ammo tracking is opt-in per weapon via `system.ammo_type` ('none' by default, matching every
 * real compendium item today — untracked weapons must keep attacking normally).
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {{requiresAmmo: boolean, ammoItem: Item|null, ambiguous: boolean}}
 */
const resolveAmmo = (actor, weapon) => {
  const ammoType = weapon.system.ammo_type ?? 'none';

  if (ammoType === 'none') {
    return { requiresAmmo: false, ammoItem: null, ambiguous: false };
  }

  if (ammoType === 'self') {
    return { requiresAmmo: true, ammoItem: weapon, ambiguous: false };
  }

  const equippedAmmo = actor.system.equipped_ammunition ?? [];
  const matches = equippedAmmo.filter((ammo) => ammo.system[ammoType] === true);

  if (matches.length > 1) {
    return { requiresAmmo: true, ammoItem: null, ambiguous: true };
  }

  return { requiresAmmo: true, ammoItem: matches[0] ?? null, ambiguous: false };
};

class OD2CharacterSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/olddragon2e/templates/sheets/character-sheet.hbs',
      classes: ['olddragon2e', 'sheet', 'character'],
      width: 840,
      height: 780,
      tabs: [{ navSelector: '.tabs', contentSelector: '.section', initial: 'attacks' }],
    });
  }

  async getData() {
    const baseData = super.getData();

    // Magias por círculo
    const spellItems = baseData.actor.system.spell_items;
    const spellByCircle = {};

    // Inicializa círculos (1º ao 9º)
    for (let i = 1; i <= 9; i++) {
      spellByCircle[i] = {
        circle: i,
        spells: [],
      };
    }

    // Distribui magias nos círculos correspondentes
    if (spellItems && spellItems.length > 0) {
      spellItems.forEach((spell) => {
        // Determina o círculo da magia (Arcana, Divina, Necromante ou Ilusionista)
        let circle = null;

        if (spell.system.arcane && spell.system.arcane !== 'null' && parseInt(spell.system.arcane) > 0) {
          circle = parseInt(spell.system.arcane);
        } else if (spell.system.divine && spell.system.divine !== 'null' && parseInt(spell.system.divine) > 0) {
          circle = parseInt(spell.system.divine);
        } else if (
          spell.system.necromancer &&
          spell.system.necromancer !== 'null' &&
          parseInt(spell.system.necromancer) > 0
        ) {
          circle = parseInt(spell.system.necromancer);
        } else if (
          spell.system.illusionist &&
          spell.system.illusionist !== 'null' &&
          parseInt(spell.system.illusionist) > 0
        ) {
          circle = parseInt(spell.system.illusionist);
        }

        // Vincula a magia ao círculo correspondente
        if (circle && spellByCircle[circle]) {
          spellByCircle[circle].spells.push(spell);
        } else {
          // Fallback: Se não possui círculo definido, vincula ao 1º círculo
          if (spellByCircle[1]) {
            spellByCircle[1].spells.push(spell);
          }
        }
      });
    }

    // Talentos de Ladrão
    const rogueTalents = [];
    if (baseData.actor.system.has_rogue_talents) {
      const raceBonuses = baseData.actor.system.rogue_talent_race_bonus;
      const scores = baseData.actor.system.rogue_talent_scores;
      for (const talent of baseData.actor.system.available_rogue_talents) {
        rogueTalents.push({
          key: talent.key,
          label: talent.name,
          description: talent.description,
          score: scores[talent.key],
          points: baseData.actor.system.rogue_talent_points[talent.key] || 0,
          race_bonus: raceBonuses[talent.key] || 0,
        });
      }
    }

    let sheetData = {
      owner: this.actor.isOwner,
      editable: this.isEditable,
      actor: baseData.actor,
      system: baseData.actor.system,
      race_abilities: baseData.actor.system.race_abilities,
      class_abilities: baseData.actor.system.class_abilities,
      equipped_items: baseData.actor.system.equipped_items,
      attack: baseData.actor.system.attack_items,
      natural_weapon_attacks: baseData.actor.system.natural_weapon_attacks,
      weapon: baseData.actor.system.weapon_items,
      armor: baseData.actor.system.armor_items,
      shield: baseData.actor.system.shield_items,
      misc: baseData.actor.system.misc_items,
      container: baseData.actor.system.container_items,
      vehicle: baseData.actor.system.vehicle_items,
      spell: baseData.actor.system.spell_items,
      spell_by_circle: spellByCircle,
      rogue_talents: rogueTalents,
      config: CONFIG.olddragon2e,
      // A linked sheet can be open with nobody connected (another browser, or
      // after disconnecting), so the send control reflects that.
      odo_connected: isConnected(),
    };

    return sheetData;
  }

  async _onDrop(event) {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    if (data.type === 'Folder') {
      event.preventDefault();
    } else if (data.type === 'Item') {
      this._onDropItem(event, data);
    }
  }

  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);

    if (item.type === 'race') {
      if (this.actor.system.race !== null) {
        ui.notifications.error('Este personagem já possui uma raça. Remova a raça atual antes de adicionar uma nova.');
        return;
      }
    }

    if (item.type === 'race_ability') {
      ui.notifications.error(
        'Habilidades de raça não podem ser adicionadas diretamente ao personagem. Adicione-as à raça do personagem.',
      );
      return;
    }

    if (item.type === 'class') {
      if (this.actor.system.race === null) {
        ui.notifications.error(
          'Este personagem ainda não possui uma raça definida. Adicione a raça antes de adicionar a classe.',
        );
        return;
      }
      if (this.actor.system.class !== null) {
        ui.notifications.error(
          'Este personagem já possui uma classe. Remova a classe atual antes de adicionar uma nova.',
        );
        return;
      }

      const raceName = this.actor.system.race.name;
      let classRestrictions = item.system.restrictions.races;

      // Dividir a string de raças em um array de raças individuais
      if (classRestrictions.length > 0 && typeof classRestrictions[0] === 'string') {
        classRestrictions = classRestrictions[0].split(',').map((race) => race.trim());
      }

      // Verificar se classRestrictions contém apenas uma string vazia e tratá-la como um array vazio
      if (classRestrictions.length === 1 && classRestrictions[0] === '') {
        classRestrictions = [];
      }

      if (classRestrictions.length > 0 && !classRestrictions.includes(raceName)) {
        ui.notifications.error(
          `Para vincular a classe ${
            item.name
          }, o personagem deve ser de uma das seguintes raças: ${classRestrictions.join(', ')}.`,
        );
        return;
      }
    }

    if (item.type === 'class_ability') {
      ui.notifications.error(
        'Habilidades de classe não podem ser adicionadas diretamente ao personagem. Adicione-as à classe do personagem.',
      );
      return;
    }

    await super._onDropItem(event, data);

    if (item.type === 'race') {
      await this.actor.system.syncRaceAbilities();
    }

    if (item.type === 'class') {
      await this.actor.system.syncClassAbilities();
    }
  }

  async activateListeners(html) {
    if (this.isEditable) {
      html.find('.item-create').click(this._onItemCreate.bind(this));
      html.find('.item-edit').click(this._onItemEdit.bind(this));
      html.find('.item-equip').click(this._onItemEquip.bind(this));
      html.find('.item-update-quantity').change(this._onItemUpdateQuantity.bind(this));
      html.find('.item-delete').click(this._onItemDelete.bind(this));
      html.find('input[name="system.current_xp"]').change(this._onCurrentXpChange.bind(this));
      html.find('.odo-sync').click(this._onOdoSync.bind(this));
      html.find('.odo-push').click(this._onOdoPush.bind(this));
    }

    // Owner-only Listeners
    if (this.actor.isOwner) {
      html.find('.attack-roll').click(this._onAttackRoll.bind(this));
      html.find('.unarmed-attack-roll').click(this._onUnarmedAttackRoll.bind(this));
      html.find('.natural-weapon-attack-roll').click(this._onNaturalWeaponAttackRoll.bind(this));
      html.find('.natural-weapon-damage-roll').click(this._onNaturalWeaponDamageRoll.bind(this));
      html.find('.damage-roll').click(this._onDamageRoll.bind(this));
      html.find('.knockout-roll').click(this._onKnockoutRoll.bind(this));
      html.find('.spell-cast').click(this._onSpellCast.bind(this));
      html.find('.memorized-toggle').change(this._onSpellMemorizedToggle.bind(this));
      html.find('.slots-select').change(this._onSpellSlotsChange.bind(this));
      html.find('.spell-use-checkbox').change(this._onSpellUseCheckboxChange.bind(this));
      html.find('.class-ability-use-checkbox').change(this._onClassAbilityUseCheckboxChange.bind(this));
      html.find('.race-ability-use-checkbox').change(this._onRaceAbilityUseCheckboxChange.bind(this));
      html.find('.variable-construction-select').change(this._onVariableConstructionSelectChange.bind(this));
      html.find('.variable-construction-custom-name').change(this._onVariableConstructionCustomNameChange.bind(this));
      html
        .find('.variable-construction-custom-description')
        .change(this._onVariableConstructionCustomDescriptionChange.bind(this));
      html.find('.stat-roll').click(this._onStatRoll.bind(this));
      html.find('.jp-roll').click(this._onJPRoll.bind(this));
      html.find('.ba-roll').click(this._onBARoll.bind(this));
      html.find('.talent-roll').click(this._onTalentRoll.bind(this));
    }

    super.activateListeners(html);
  }

  jpStatsMap = {
    jpd: 'destreza',
    jpc: 'constituicao',
    jps: 'sabedoria',
  };

  jpModMap = {
    jpd: 'mod_destreza',
    jpc: 'mod_constituicao',
    jps: 'mod_sabedoria',
  };

  statsJpMap = {
    destreza: 'jpd',
    constituicao: 'jpc',
    sabedoria: 'jps',
  };

  stats = {
    forca: 'forca',
    destreza: 'destreza',
    constituicao: 'constituicao',
    inteligencia: 'inteligencia',
    sabedoria: 'sabedoria',
    carisma: 'carisma',
  };

  // Notificação de level up
  _onCurrentXpChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const newValue = parseInt(input.value);

    this.actor.update({ 'system.current_xp': newValue }).then(() => {
      this.actor.system._levelUp();
    });
  }

  // Sincronizar com Old Dragon Online
  async _onOdoSync(event) {
    event.preventDefault();

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize('olddragon2e.sync_from_odo'),
      content: `<p>${game.i18n.localize('olddragon2e.sync_warning')}</p>`,
      yes: () => true,
      no: () => false,
    });

    if (confirmed) {
      await updateActor(this.actor);
    }
  }

  // Enviar PV para o Old Dragon Online
  async _onOdoPush(event) {
    event.preventDefault();
    // The actor stays linked to ODO across browsers, but the credentials do not
    // — so a linked sheet can be open with nobody connected. Point at where the
    // connection is made instead of failing at the request.
    if (!isConnected()) {
      ui.notifications.warn(game.i18n.localize('olddragon2e.odo_push_requires_connection'));
      return;
    }

    try {
      await pushHealthPoints(this.actor);
    } catch (error) {
      // odoFetchAuthenticated throws when there is no usable token at all —
      // never connected, or the refresh token was revoked.
      ui.notifications.error(error.message);
    }
  }

  // Rolagem de ataque
  async _onAttackRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const ba = target.dataset.ba;
    const baBonus = target.dataset.baBonus === '';
    const itemID = event.currentTarget.closest('.attack').dataset.itemId;
    const item = this.actor.items.get(itemID);
    if (!item) return;

    let ammoItem = null;
    if (game.settings.get('olddragon2e', 'ammoTracking')) {
      const resolved = resolveAmmo(this.actor, item);
      if (resolved.ambiguous) {
        ui.notifications.warn(game.i18n.localize('olddragon2e.warnings.ambiguousAmmo'));
        return;
      }
      if (resolved.requiresAmmo && (!resolved.ammoItem || resolved.ammoItem.system.quantity <= 0)) {
        ui.notifications.warn(game.i18n.format('olddragon2e.ammoTracking.outOfAmmo', { weapon: item.name }));
        return;
      }
      ammoItem = resolved.ammoItem;
    }

    const attackRoll = new AttackRoll(this.actor, item, ba, baBonus);

    await showDialog({
      title: `Rolar Ataque`,
      content: 'systems/olddragon2e/templates/dialog/characters/attack-roll-dialog.hbs',
      data: {
        formula: attackRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await attackRoll.roll(bonus, adjustment);
            attackRoll.sendMessage(mode, adjustment);

            if (ammoItem) {
              const liveAmmoItem = this.actor.items.get(ammoItem.id);
              const remaining = liveAmmoItem.system.quantity - 1;
              await liveAmmoItem.update({ 'system.quantity': remaining });
              if (remaining <= 0) {
                ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  content: `<div class="title">${game.i18n.format('olddragon2e.ammoTracking.ranOut', { weapon: item.name })}</div>`,
                });
              }
            }
          },
        },
      },
    });
  }

  // Rolagem de ataque desarmado
  async _onUnarmedAttackRoll(event) {
    event.preventDefault();

    const unarmedAttackRoll = new UnarmedAttackRoll(this.actor);

    await showDialog({
      title: `Rolar Ataque Desarmado`,
      content: 'systems/olddragon2e/templates/dialog/characters/unarmed-attack-roll-dialog.hbs',
      data: {
        formula: unarmedAttackRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await unarmedAttackRoll.roll(bonus, adjustment);
            unarmedAttackRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Rolagem de ataque com arma natural
  async _onNaturalWeaponAttackRoll(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const weaponName = target.dataset.nwName;
    const attackRoll = new NaturalWeaponAttackRoll(this.actor, weaponName);

    await showDialog({
      title: `Rolar Ataque`,
      content: 'systems/olddragon2e/templates/dialog/characters/attack-roll-dialog.hbs',
      data: { formula: attackRoll.printFormula },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await attackRoll.roll(bonus, adjustment);
            attackRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Rolagem de dano com arma natural
  async _onNaturalWeaponDamageRoll(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const weaponName = target.dataset.nwName;
    const damage = target.dataset.nwDamage;
    const damageRoll = new NaturalWeaponDamageRoll(this.actor, weaponName, damage);

    await showDialog({
      title: `Rolar Dano`,
      content: 'systems/olddragon2e/templates/dialog/characters/damage-roll-dialog.hbs',
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            const critical = html.find('#critical').is(':checked');
            await damageRoll.roll(bonus, critical);
            damageRoll.sendMessage(mode);
          },
        },
      },
      render: (html) => {
        html.find('#formula').val(damageRoll.printFormula());
        html.find('[name="attack-mode"]').closest('.form-group').hide();
      },
    });
  }

  // Rolagem de dano
  async _onDamageRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const itemID = target.closest('.attack').dataset.itemId;
    const item = this.actor.items.get(itemID);
    if (!item) return;

    const damageRoll = new DamageRoll(this.actor, item);

    await showDialog({
      title: `Rolar Dano`,
      content: 'systems/olddragon2e/templates/dialog/characters/damage-roll-dialog.hbs',
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            const attackMode = html.find('#attack-mode').val();
            const critical = html.find('#critical').is(':checked');

            await damageRoll.roll(bonus, attackMode, critical);

            damageRoll.sendMessage(mode);
          },
        },
      },
      render: (html) => {
        const formulaEl = html.find('#formula');
        const attackModeEl = html.find('#attack-mode');

        const updateFormula = () => {
          const selectedAttackMode = attackModeEl.val();
          formulaEl.val(damageRoll.printFormula(selectedAttackMode));
        };

        formulaEl.val(damageRoll.printFormula());
        attackModeEl.val(damageRoll.itemAttackType);

        attackModeEl.change(() => {
          updateFormula();
        });

        updateFormula();
      },
    });
  }

  // Rolagem de chance de nocaute
  async _onKnockoutRoll(event) {
    event.preventDefault();

    const knockoutRoll = new KnockoutRoll(this.actor);

    await showDialog({
      title: `Chance de nocaute`,
      content: 'systems/olddragon2e/templates/dialog/characters/knockout-roll-dialog.hbs',
      data: {
        formula: knockoutRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await knockoutRoll.roll(bonus);
            knockoutRoll.sendMessage(mode);
          },
        },
      },
    });
  }

  // Lançar magia
  async _onSpellCast(event, options = {}) {
    event.preventDefault();
    const itemID = event.currentTarget.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemID);
    if (!item) return;

    // Verifica se o item é uma magia e se ela está memorizada
    if (item.type === 'spell') {
      const spellFlags = item.getFlag('olddragon2e', 'spell') || {};
      if (!spellFlags.memorized) {
        ui.notifications.warn(`A magia "${item.name}" não está preparada. Memorize a magia para poder lançá-la.`);
        return;
      }
      if (!spellFlags.slots || Number(spellFlags.slots) < 1) {
        ui.notifications.warn('É necessário determinar a quantidade de usos de uma magia para poder lançá-la.');
        return;
      }
    }

    const chatTemplate = 'systems/olddragon2e/templates/chat/spell-chat.hbs';
    let chatData = {
      user: game.user.id,
      speaker: { alias: this.actor.name },
      sound: 'sounds/dice.wav',
    };
    let cardData = {
      name: item.name,
      owner: this.actor.id,
      id: item._id,
      system: item.system,
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(chatTemplate, cardData);

    if (item.type === 'spell') {
      const spellFlags = item.getFlag('olddragon2e', 'spell') || {};
      const slots = Number(spellFlags.slots) || 0;
      let dailyUses = foundry.utils.duplicate(spellFlags['daily-uses'] || {});
      let used = false;

      // Só marca o uso se não for um lançamento via checkbox já marcado
      if (!options.skipUsage) {
        for (let i = 1; i <= slots; i++) {
          if (!dailyUses[i]) {
            dailyUses[i] = true;
            used = true;
            break;
          }
        }
        if (slots > 0 && used) {
          await item.update({ 'flags.olddragon2e.spell.daily-uses': dailyUses });
        }
        if (slots > 0 && !used) {
          ui.notifications.warn(`Não há mais usos disponíveis para a magia "${item.name}".`);
          return;
        }
      }
    }

    return ChatMessage.create(chatData);
  }

  // Memorizar magia
  async _onSpellMemorizedToggle(event) {
    const input = event.currentTarget;
    const itemId = input.dataset.itemId;
    const item = this.actor.items.get(itemId);
    const memorized = input.checked;

    // Ao desmarcar, limpa slots e usos
    let update = { 'flags.olddragon2e.spell.memorized': memorized };
    if (!memorized) {
      update['flags.olddragon2e.spell.slots'] = '';
      update['flags.olddragon2e.spell.daily-uses'] = {};
    }
    await item.update(update);
  }

  // Definir a quantidade de slots disponíveis
  async _onSpellSlotsChange(event) {
    const select = event.currentTarget;
    const itemId = select.dataset.itemId;
    const item = this.actor.items.get(itemId);
    const slots = select.value ? Number(select.value) : '';

    // Ao alterar a quantidade de slots, zera os usos
    await item.update({
      'flags.olddragon2e.spell.slots': slots,
      'flags.olddragon2e.spell.daily-uses': {},
    });
  }

  // Usos diários de magia
  async _onSpellUseCheckboxChange(event) {
    const checkbox = event.currentTarget;
    const itemId = checkbox.dataset.itemId;
    const useIndex = checkbox.dataset.useIndex;
    const item = this.actor.items.get(itemId);

    // Atualiza apenas o uso marcado
    const spellFlags = item.getFlag('olddragon2e', 'spell') || {};
    let dailyUses = foundry.utils.duplicate(spellFlags['daily-uses'] || {});
    dailyUses[useIndex] = checkbox.checked;

    await item.update({ 'flags.olddragon2e.spell.daily-uses': dailyUses });

    // Lança a magia se o checkbox foi marcado
    if (checkbox.checked) {
      // Cria um evento "falso" para reaproveitar o método _onSpellCast
      const itemElem = checkbox.closest('.item');
      if (itemElem) {
        // Simula um evento de clique no botão "Lançar"
        const fakeEvent = new Event('click');
        Object.defineProperty(fakeEvent, 'currentTarget', {
          writable: false,
          value: itemElem.querySelector('.spell-cast'),
        });
        await this._onSpellCast(fakeEvent, { skipUsage: true });
      } else {
        // Se não encontrar o elemento .item, chama diretamente o método
        await this._onSpellCast(
          {
            preventDefault: () => {},
            currentTarget: { closest: () => ({ dataset: { itemId } }) },
          },
          { skipUsage: true },
        );
      }
    }
  }

  // Usos diários de habilidade de classe
  async _onClassAbilityUseCheckboxChange(event) {
    const checkbox = event.currentTarget;
    const abilityId = checkbox.dataset.abilityId;
    const useIndex = checkbox.dataset.useIndex;
    const ability = this.actor.items.get(abilityId);

    // Atualiza apenas o uso marcado/desmarcado
    const abilityFlags = ability.getFlag('olddragon2e', 'daily-uses') || {};
    let dailyUses = foundry.utils.duplicate(abilityFlags);
    dailyUses[useIndex] = checkbox.checked;

    await ability.update({ 'flags.olddragon2e.daily-uses': dailyUses });

    // Notifica o uso da habilidade se o checkbox foi marcado
    if (checkbox.checked) {
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<div class="title">Usou a habilidade:<br><strong>${ability.name}</strong></div>`,
      });
    }
  }

  // Usos diários de habilidade de raça
  async _onRaceAbilityUseCheckboxChange(event) {
    const checkbox = event.currentTarget;
    const abilityId = checkbox.dataset.abilityId;
    const useIndex = checkbox.dataset.useIndex;
    const ability = this.actor.items.get(abilityId);

    const abilityFlags = ability.getFlag('olddragon2e', 'daily-uses') || {};
    let dailyUses = foundry.utils.duplicate(abilityFlags);
    dailyUses[useIndex] = checkbox.checked;

    await ability.update({ 'flags.olddragon2e.daily-uses': dailyUses });

    if (checkbox.checked) {
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<div class="title">Usou a habilidade:<br><strong>${ability.name}</strong></div>`,
      });
    }
  }

  // Construção Variável — seleção de opção
  async _onVariableConstructionSelectChange(event) {
    const select = event.currentTarget;
    const abilityId = select.dataset.abilityId;
    const choiceIndex = parseInt(select.dataset.choiceIndex);
    const selectedKey = select.value;

    const selections = foundry.utils.duplicate(this.actor.system.variable_construction_selections || {});
    if (!selections[abilityId]) selections[abilityId] = [];
    while (selections[abilityId].length <= choiceIndex) {
      selections[abilityId].push({ key: '', custom_name: '', custom_description: '' });
    }
    selections[abilityId][choiceIndex].key = selectedKey;

    await this.actor.update({ 'system.variable_construction_selections': selections });

    // Mostra/oculta os campos customizados sem aguardar re-render
    const choiceRow = select.closest('.choice-row');
    if (choiceRow) {
      const customFields = choiceRow.querySelector('.custom-fields');
      if (customFields) {
        customFields.style.display = selectedKey === 'custom' ? '' : 'none';
      }
    }
  }

  // Construção Variável — nome personalizado
  async _onVariableConstructionCustomNameChange(event) {
    const input = event.currentTarget;
    const abilityId = input.dataset.abilityId;
    const choiceIndex = parseInt(input.dataset.choiceIndex);

    const selections = foundry.utils.duplicate(this.actor.system.variable_construction_selections || {});
    if (!selections[abilityId]) selections[abilityId] = [];
    while (selections[abilityId].length <= choiceIndex) {
      selections[abilityId].push({ key: '', custom_name: '', custom_description: '' });
    }
    selections[abilityId][choiceIndex].custom_name = input.value;

    await this.actor.update({ 'system.variable_construction_selections': selections });
  }

  // Construção Variável — descrição personalizada
  async _onVariableConstructionCustomDescriptionChange(event) {
    const textarea = event.currentTarget;
    const abilityId = textarea.dataset.abilityId;
    const choiceIndex = parseInt(textarea.dataset.choiceIndex);

    const selections = foundry.utils.duplicate(this.actor.system.variable_construction_selections || {});
    if (!selections[abilityId]) selections[abilityId] = [];
    while (selections[abilityId].length <= choiceIndex) {
      selections[abilityId].push({ key: '', custom_name: '', custom_description: '' });
    }
    selections[abilityId][choiceIndex].custom_description = textarea.value;

    await this.actor.update({ 'system.variable_construction_selections': selections });
  }

  // Teste de Atributos (Força; Destreza; Constituição; Inteligência; Sabedoria; Carisma)
  async _onStatRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;
    let statLabel = target.dataset.statLabel;
    const statName = target.dataset.stat;

    const statRoll = new StatRoll(this.actor, statLabel, statName);

    await showDialog({
      title: `Teste de ${statLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/stat-roll-dialog.hbs',
      data: {
        formula: statRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await statRoll.roll(bonus);

            statRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Teste de JP | Jogada de Proteção (JPD; JPC; JPS)
  async _onJPRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;
    let jpLabel = target.dataset.jpLabel;
    const jpName = target.dataset.jp;

    const jpRoll = new JPRoll(this.actor, jpLabel, jpName);

    await showDialog({
      title: `Teste de ${jpLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/jp-roll-dialog.hbs',
      data: {
        formula: jpRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await jpRoll.roll(bonus);

            jpRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Teste de BA | Base de Ataque (BAC; BAD)
  async _onBARoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const ba = target.dataset.ba;
    const baLabel = target.dataset.baLabel;

    const baRoll = new BARoll(this.actor, ba);

    await showDialog({
      title: `Teste de ${baLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/ba-roll-dialog.hbs',
      data: {
        formula: baRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await baRoll.roll(bonus, adjustment);
            baRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Teste de Talento de Ladrão
  async _onTalentRoll(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const talentLabel = target.dataset.talentLabel;
    const talentScore = parseInt(target.dataset.talentScore);

    const talentRoll = new TalentRoll(this.actor, talentLabel, talentScore);

    await showDialog({
      title: `Teste de ${talentLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/talent-roll-dialog.hbs',
      data: {
        formula: talentRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d6'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await talentRoll.roll(bonus);
            talentRoll.sendMessage(mode);
          },
        },
      },
    });
  }

  // Rolar item (não utilizado)
  _onItemRoll(event) {
    const itemID = event.currentTarget.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemID);

    item.roll();
  }

  // Criar item
  _onItemCreate(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemType = element.dataset.type;
    let itemName = '';

    switch (itemType) {
      case 'weapon':
        itemName = 'Nova Arma';
        break;
      case 'armor':
        itemName = 'Nova Armadura';
        break;
      case 'shield':
        itemName = 'Novo Escudo';
        break;
      case 'misc':
        itemName = 'Novo Item';
        break;
      case 'container':
        itemName = 'Novo Recipiente/Vasilhame';
        break;
      case 'vehicle':
        itemName = 'Nova Montaria/Transporte';
        break;
      case 'spell':
        itemName = 'Nova Magia';
    }

    let itemData = {
      name: itemName,
      type: itemType,
    };

    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  // Editar item
  _onItemEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let item = this.actor.items.get(itemId);

    item.sheet.render(true);
  }

  // Equipar/Desequipar item
  async _onItemEquip(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemId);

    let updateObject = {
      'system.is_equipped': !item.system.is_equipped,
    };

    await item.update(updateObject);
  }

  // Alterar quantidade
  async _onItemUpdateQuantity(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let item = this.actor.items.get(itemId);
    let newQuantity = element.value;

    if (newQuantity <= 0) {
      newQuantity = 1;
    }

    const updateObject = {};
    updateObject[`system.quantity`] = newQuantity;

    await item.update(updateObject);
  }

  // Excluir habilidades de raça
  async removeRaceAbilities() {
    const raceAbilities = this.actor.items.filter((item) => item.type === 'race_ability');
    for (const ability of raceAbilities) {
      await this.actor.deleteEmbeddedDocuments('Item', [ability.id]);
    }
  }

  // Excluir habilidades de classe
  async removeClassAbilities() {
    const classAbilities = this.actor.items.filter((item) => item.type === 'class_ability');
    for (const ability of classAbilities) {
      await this.actor.deleteEmbeddedDocuments('Item', [ability.id]);
    }
  }

  // Excluir item
  async _onItemDelete(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let itemName = this.actor.items.get(itemId).name;
    let itemType = this.actor.items.get(itemId).type;

    const standardTemplate = `
        <form>
            <div>
                <center>
                    Excluir <strong>${itemName}</strong>?
                </center>
            </div>
        </form>`;

    const raceTemplate = `
        <form>
            <div>
                <center>
                    Excluir a raça <strong>${itemName}</strong>?
                </center>
                <br>
                <center>
                    Ao excluir a raça, todas as características e habilidades de raça serão removidas do personagem.
                </center>
            </div>
        </form>`;

    const classTemplate = `
        <form>
            <div>
                <center>
                    Excluir a classe <strong>${itemName}</strong>?
                </center>
                <br>
                <center>
                    Ao excluir a classe, todas as características e habilidades de classe serão removidas do personagem.
                </center>
            </div>
        </form>`;

    let confirmationTemplate;

    if (itemType === 'race') {
      const characterClass = this.actor.system.class;
      if (characterClass) {
        const classRestrictions = characterClass.system.restrictions.races;
        if (classRestrictions.length > 0 && classRestrictions.includes(itemName)) {
          ui.notifications.error(
            `Não é possível excluir a raça ${itemName} enquanto a classe ${characterClass.name} estiver vinculada ao personagem.`,
          );
          return;
        }
      }
      confirmationTemplate = raceTemplate;
    } else if (itemType === 'class') {
      confirmationTemplate = classTemplate;
    } else {
      confirmationTemplate = standardTemplate;
    }

    await Dialog.confirm({
      title: game.i18n.localize('olddragon2e.delete'),
      content: confirmationTemplate,
      yes: async () => {
        await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
        if (itemType === 'race') {
          await this.actor.update({ 'system.jp_race_bonus': '' });
          await this.removeRaceAbilities();
        } else if (itemType === 'class') {
          await this.removeClassAbilities();
        }
      },
      no: () => {},
    });
  }
}

class OD2MonsterSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/olddragon2e/templates/sheets/monster-sheet.hbs',
      classes: ['olddragon2e', 'sheet', 'monster'],
      width: 600,
      height: 650,
      tabs: [{ navSelector: '.tabs', contentSelector: '.section', initial: 'attacks' }],
    });
  }

  getData() {
    const baseData = super.getData();
    let sheetData = {
      owner: this.actor.isOwner,
      editable: this.isEditable,
      actor: baseData.actor,
      system: baseData.actor.system,
      monster_attack: baseData.actor.system.monster_attack_items,
      config: CONFIG.olddragon2e,
    };

    return sheetData;
  }

  async activateListeners(html) {
    if (this.isEditable) {
      html.find('.item-create').click(this._onItemCreate.bind(this));
      html.find('.item-edit').click(this._onItemEdit.bind(this));
      html.find('.item-delete').click(this._onItemDelete.bind(this));
    }

    // Owner-only Listeners
    if (this.actor.isOwner) {
      html.find('.jp-roll').click(this._onJPRoll.bind(this));
      html.find('.mo-roll').click(this._onMORoll.bind(this));
      html.find('.dv-roll').click(this._onDVRoll.bind(this));
      html.find('.attack-roll').click(this._onAttackRoll.bind(this));
      html.find('.damage-roll').click(this._onDamageRoll.bind(this));
    }

    super.activateListeners(html);
  }

  // Teste de JP | Jogada de Proteção
  async _onJPRoll(event) {
    event.preventDefault();

    const jpRoll = new MonsterJPRoll(this.actor);

    await showDialog({
      title: `Teste de Jogada de Proteção`,
      content: 'systems/olddragon2e/templates/dialog/monsters/jp-roll-dialog.hbs',
      data: {
        formula: jpRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await jpRoll.roll(bonus);

            jpRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Teste de MO | Moral
  async _onMORoll(event) {
    event.preventDefault();

    const moRoll = new MonsterMORoll(this.actor);

    await showDialog({
      title: `Teste de Moral`,
      content: 'systems/olddragon2e/templates/dialog/monsters/mo-roll-dialog.hbs',
      data: {
        formula: moRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await moRoll.roll(bonus);

            moRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Rolagem de Dado de Vida (DV)
  async _onDVRoll(event) {
    event.preventDefault();

    const dvRoll = new MonsterDVRoll(this.actor);

    await showDialog({
      title: `Rolar Dado de Vida`,
      content: 'systems/olddragon2e/templates/dialog/monsters/dv-roll-dialog.hbs',
      data: {
        formula: dvRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await dvRoll.roll(bonus);

            const hp = dvRoll.calculateHp();

            dvRoll.sendMessage(mode, hp);
            await dvRoll.updateHp();
          },
        },
      },
    });
  }

  // Rolagem de ataque
  async _onAttackRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const ba = target.dataset.ba;
    const baBonus = target.dataset.baBonus === '';
    const itemID = event.currentTarget.closest('.attack').dataset.itemId;
    const item = this.actor.items.get(itemID);

    const attackRoll = new MonsterAttackRoll(this.actor, item, ba, baBonus);

    await showDialog({
      title: `Rolar Ataque`,
      content: 'systems/olddragon2e/templates/dialog/monsters/attack-roll-dialog.hbs',
      data: {
        formula: attackRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await attackRoll.roll(bonus, adjustment);
            attackRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Rolagem de dano
  async _onDamageRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const itemID = target.closest('.attack').dataset.itemId;
    const item = this.actor.items.get(itemID);
    let originalDamage = item.system.damage;

    // Para ataques feitos com uma arma, o dano é ajustado para "1d6"
    if (item.system.weapon) {
      item.system.damage = '1d6';
    }

    const damageRoll = new MonsterDamageRoll(this.actor, item);

    await showDialog({
      title: `Rolar Dano`,
      content: 'systems/olddragon2e/templates/dialog/monsters/damage-roll-dialog.hbs',
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await damageRoll.roll(bonus);

            damageRoll.sendMessage(mode);

            item.system.damage = originalDamage;
          },
        },
      },
      render: (html) => {
        const formulaEl = html.find('#formula');

        const updateFormula = () => {
          formulaEl.val(damageRoll.printFormula());
        };

        formulaEl.val(damageRoll.printFormula());

        updateFormula();
      },
    });
  }

  // Criar item
  _onItemCreate(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemType = element.dataset.type;
    let itemName = '';

    if (itemType === 'monster_attack') {
      itemName = 'Novo Ataque de Monstro';
    }

    let itemData = {
      name: itemName,
      type: itemType,
    };

    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  // Editar item
  _onItemEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let item = this.actor.items.get(itemId);

    item.sheet.render(true);
  }

  // Excluir item
  async _onItemDelete(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let itemName = this.actor.items.get(itemId).name;

    const confirmationTemplate = `
        <form>
            <div>
                <center>
                    Excluir <strong>${itemName}</strong>?
                </center>
                <br>
            </div>
        </form>`;

    await Dialog.confirm({
      title: game.i18n.localize('olddragon2e.delete'),
      content: confirmationTemplate,
      yes: async () => {
        await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
      },
      no: () => {},
    });
  }
}

class OD2RetainerSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/olddragon2e/templates/sheets/retainer-sheet.hbs',
      classes: ['olddragon2e', 'sheet', 'retainer'],
      width: 840,
      height: 780,
      tabs: [{ navSelector: '.tabs', contentSelector: '.section', initial: 'attacks' }],
      submitOnClose: true,
    });
  }

  async getData() {
    const baseData = super.getData();

    let sheetData = {
      owner: this.actor.isOwner,
      editable: this.isEditable,
      actor: baseData.actor,
      system: baseData.actor.system,
      attack: baseData.actor.system.attack_items,
      weapon: baseData.actor.system.weapon_items,
      armor: baseData.actor.system.armor_items,
      shield: baseData.actor.system.shield_items,
      misc: baseData.actor.system.misc_items,
      container: baseData.actor.system.container_items,
      vehicle: baseData.actor.system.vehicle_items,
      config: CONFIG.olddragon2e,
    };

    return sheetData;
  }

  async _onDrop(event) {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    if (data.type === 'Folder') {
      event.preventDefault();
    } else if (data.type === 'Item') {
      this._onDropItem(event, data);
    }
  }

  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);

    if (item.type === 'race_ability') {
      ui.notifications.error('Habilidades de raça não podem ser vinculadas a ajudantes.');
      return;
    }

    if (item.type === 'class') {
      ui.notifications.error('Ajudantes não podem ter uma classe.');
      return;
    }

    if (item.type === 'class_ability') {
      ui.notifications.error('Habilidades de classe não podem ser vinculadas a ajudantes.');
      return;
    }

    if (item.type === 'spell') {
      ui.notifications.error('Ajudantes não podem usar magias.');
      return;
    }

    if (item.type === 'race') {
      if (this.actor.system.race !== null) {
        ui.notifications.error('Este ajudante já possui uma raça. Remova a raça atual antes de adicionar uma nova.');
        return;
      }
    }

    await super._onDropItem(event, data);

    if (item.type === 'race') {
      await this.actor.system.syncRaceAbilities();
    }
  }

  async activateListeners(html) {
    if (this.isEditable) {
      html.find('.item-create').click(this._onItemCreate.bind(this));
      html.find('.item-edit').click(this._onItemEdit.bind(this));
      html.find('.item-equip').click(this._onItemEquip.bind(this));
      html.find('.item-update-quantity').change(this._onItemUpdateQuantity.bind(this));
      html.find('.item-delete').click(this._onItemDelete.bind(this));
      html.find('.odo-sync').click(this._onOdoSync.bind(this));
      html.find('.become-adventurer-button').click(this._onBecomeAdventurer.bind(this));
    }

    // Owner-only Listeners
    if (this.actor.isOwner) {
      html.find('.attack-roll').click(this._onAttackRoll.bind(this));
      html.find('.unarmed-attack-roll').click(this._onUnarmedAttackRoll.bind(this));
      html.find('.damage-roll').click(this._onDamageRoll.bind(this));
      html.find('.knockout-roll').click(this._onKnockoutRoll.bind(this));
      html.find('.stat-roll').click(this._onStatRoll.bind(this));
      html.find('.jp-roll').click(this._onJPRoll.bind(this));
      html.find('.ba-roll').click(this._onBARoll.bind(this));
    }

    super.activateListeners(html);
  }

  async _onOdoSync(event) {
    event.preventDefault();

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize('olddragon2e.sync_from_odo'),
      content: `<p>${game.i18n.localize('olddragon2e.sync_warning')}</p>`,
      yes: () => true,
      no: () => false,
    });

    if (confirmed) {
      await updateRetainerActor(this.actor);
    }
  }

  // Rolagem de ataque
  async _onAttackRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const ba = target.dataset.ba;
    const baBonus = target.dataset.baBonus === '';
    const itemID = event.currentTarget.closest('.attack').dataset.itemId;
    const item = this.actor.items.get(itemID);
    if (!item) return;

    let ammoItem = null;
    if (game.settings.get('olddragon2e', 'ammoTracking')) {
      const resolved = resolveAmmo(this.actor, item);
      if (resolved.ambiguous) {
        ui.notifications.warn(game.i18n.localize('olddragon2e.warnings.ambiguousAmmo'));
        return;
      }
      if (resolved.requiresAmmo && (!resolved.ammoItem || resolved.ammoItem.system.quantity <= 0)) {
        ui.notifications.warn(game.i18n.format('olddragon2e.ammoTracking.outOfAmmo', { weapon: item.name }));
        return;
      }
      ammoItem = resolved.ammoItem;
    }

    const attackRoll = new AttackRoll(this.actor, item, ba, baBonus);

    await showDialog({
      title: `Rolar Ataque`,
      content: 'systems/olddragon2e/templates/dialog/characters/attack-roll-dialog.hbs',
      data: {
        formula: attackRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await attackRoll.roll(bonus, adjustment);
            attackRoll.sendMessage(mode, adjustment);

            if (ammoItem) {
              const liveAmmoItem = this.actor.items.get(ammoItem.id);
              const remaining = liveAmmoItem.system.quantity - 1;
              await liveAmmoItem.update({ 'system.quantity': remaining });
              if (remaining <= 0) {
                ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  content: `<div class="title">${game.i18n.format('olddragon2e.ammoTracking.ranOut', { weapon: item.name })}</div>`,
                });
              }
            }
          },
        },
      },
    });
  }

  // Rolagem de ataque desarmado
  async _onUnarmedAttackRoll(event) {
    event.preventDefault();

    const unarmedAttackRoll = new UnarmedAttackRoll(this.actor);

    await showDialog({
      title: `Rolar Ataque Desarmado`,
      content: 'systems/olddragon2e/templates/dialog/characters/unarmed-attack-roll-dialog.hbs',
      data: {
        formula: unarmedAttackRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await unarmedAttackRoll.roll(bonus, adjustment);
            unarmedAttackRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Rolagem de dano
  async _onDamageRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const itemID = target.closest('.attack').dataset.itemId;
    const item = this.actor.items.get(itemID);
    if (!item) return;

    const damageRoll = new DamageRoll(this.actor, item);

    await showDialog({
      title: `Rolar Dano`,
      content: 'systems/olddragon2e/templates/dialog/characters/damage-roll-dialog.hbs',
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            const attackMode = html.find('#attack-mode').val();
            const critical = html.find('#critical').is(':checked');

            await damageRoll.roll(bonus, attackMode, critical);

            damageRoll.sendMessage(mode);
          },
        },
      },
      render: (html) => {
        const formulaEl = html.find('#formula');
        const attackModeEl = html.find('#attack-mode');

        const updateFormula = () => {
          const selectedAttackMode = attackModeEl.val();
          formulaEl.val(damageRoll.printFormula(selectedAttackMode));
        };

        formulaEl.val(damageRoll.printFormula());
        attackModeEl.val(damageRoll.itemAttackType);

        attackModeEl.change(() => {
          updateFormula();
        });

        updateFormula();
      },
    });
  }

  // Rolagem de chance de nocaute
  async _onKnockoutRoll(event) {
    event.preventDefault();

    const knockoutRoll = new KnockoutRoll(this.actor);

    await showDialog({
      title: `Chance de nocaute`,
      content: 'systems/olddragon2e/templates/dialog/characters/knockout-roll-dialog.hbs',
      data: {
        formula: knockoutRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await knockoutRoll.roll(bonus);
            knockoutRoll.sendMessage(mode);
          },
        },
      },
    });
  }

  // Teste de Atributos
  async _onStatRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;
    let statLabel = target.dataset.statLabel;
    const statName = target.dataset.stat;

    const statRoll = new StatRoll(this.actor, statLabel, statName);

    await showDialog({
      title: `Teste de ${statLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/stat-roll-dialog.hbs',
      data: {
        formula: statRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await statRoll.roll(bonus);

            statRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Teste de JP | Jogada de Proteção
  async _onJPRoll(event) {
    event.preventDefault();
    let target = event.currentTarget;
    let jpLabel = target.dataset.jpLabel;
    const jpName = target.dataset.jp;

    const jpRoll = new JPRoll(this.actor, jpLabel, jpName);

    await showDialog({
      title: `Teste de ${jpLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/jp-roll-dialog.hbs',
      data: {
        formula: jpRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await jpRoll.roll(bonus);

            jpRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Teste de BA | Base de Ataque
  async _onBARoll(event) {
    event.preventDefault();
    let target = event.currentTarget;

    const ba = target.dataset.ba;
    const baLabel = target.dataset.baLabel;

    const baRoll = new BARoll(this.actor, ba);

    await showDialog({
      title: `Teste de ${baLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/ba-roll-dialog.hbs',
      data: {
        formula: baRoll.printFormula,
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();

            await baRoll.roll(bonus, adjustment);
            baRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }

  // Criar item
  _onItemCreate(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemType = element.dataset.type;
    let itemName = '';

    switch (itemType) {
      case 'weapon':
        itemName = 'Nova Arma';
        break;
      case 'armor':
        itemName = 'Nova Armadura';
        break;
      case 'shield':
        itemName = 'Novo Escudo';
        break;
      case 'misc':
        itemName = 'Novo Item';
        break;
      case 'container':
        itemName = 'Novo Recipiente/Vasilhame';
        break;
      case 'vehicle':
        itemName = 'Nova Montaria/Transporte';
        break;
    }

    let itemData = {
      name: itemName,
      type: itemType,
    };

    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  // Editar item
  _onItemEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let item = this.actor.items.get(itemId);

    item.sheet.render(true);
  }

  // Equipar/Desequipar item
  async _onItemEquip(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemId);

    let updateObject = {
      'system.is_equipped': !item.system.is_equipped,
    };

    await item.update(updateObject);
  }

  // Alterar quantidade
  async _onItemUpdateQuantity(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let item = this.actor.items.get(itemId);
    let newQuantity = element.value;

    if (newQuantity <= 0) {
      newQuantity = 1;
    }

    const updateObject = {};
    updateObject[`system.quantity`] = newQuantity;

    await item.update(updateObject);
  }

  // Tornar Aventureiro
  async _onBecomeAdventurer(event) {
    event.preventDefault();
    const confirmed = await Dialog.confirm({
      title: 'Tornar Aventureiro',
      content:
        '<p class="text-center">Este ajudante está pronto para se tornar um aventureiro de 1º nível?<br>Será necessário vincular uma classe a ele.</p>',
      yes: () => true,
      no: () => false,
    });
    if (confirmed) {
      await this.becomeAdventurer();
    }
  }

  async becomeAdventurer() {
    const actor = this.actor;
    const system = actor.system;

    const itemsToCopy = [
      ...system.weapon_items,
      ...system.armor_items,
      ...system.shield_items,
      ...system.misc_items,
      ...system.container_items,
      ...system.vehicle_items,
    ].map((item) => item.toObject());

    if (system.race) {
      itemsToCopy.unshift(system.race.toObject());
    }

    const characterData = {
      name: actor.name,
      img: actor.img,
      type: 'character',
      system: {
        forca: system.forca,
        destreza: system.destreza,
        constituicao: system.constituicao,
        inteligencia: system.inteligencia,
        sabedoria: system.sabedoria,
        carisma: system.carisma,
        hp: { value: system.hp.value, max: system.hp.max },
        ac_extra: system.ac_extra,
        economy: {
          cp: system.economy.cp,
          sp: system.economy.sp,
          gp: system.economy.gp,
        },
        details: { notes: system.details.notes },
        current_xp: 0,
      },
    };

    const newActor = await Actor.create(characterData);

    if (itemsToCopy.length > 0) {
      await newActor.createEmbeddedDocuments('Item', itemsToCopy);
    }

    if (system.race) {
      await newActor.system.syncRaceAbilities();
    }

    newActor.sheet.render(true);
  }

  // Excluir item
  async _onItemDelete(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest('.item').dataset.itemId;
    let itemName = this.actor.items.get(itemId).name;
    let itemType = this.actor.items.get(itemId).type;

    const standardTemplate = `
        <form>
            <div>
                <center>
                    Excluir <strong>${itemName}</strong>?
                </center>
            </div>
        </form>`;

    const raceTemplate = `
        <form>
            <div>
                <center>
                    Excluir a raça <strong>${itemName}</strong>?
                </center>
            </div>
        </form>`;

    const confirmationTemplate = itemType === 'race' ? raceTemplate : standardTemplate;

    await Dialog.confirm({
      title: game.i18n.localize('olddragon2e.delete'),
      content: confirmationTemplate,
      yes: async () => {
        await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
        if (itemType === 'race') {
          const raceAbilityIds = this.actor.items.filter((item) => item.type === 'race_ability').map((item) => item.id);
          if (raceAbilityIds.length > 0) {
            await this.actor.deleteEmbeddedDocuments('Item', raceAbilityIds);
          }
        }
      },
      no: () => {},
    });
  }
}

// The API only serializes hit points, attributes, race and class once the
// character passes the class step, so anything missing them is still being
// created and cannot produce a usable actor.
const normalizeCharacterRow = function (json) {
  const importable = Boolean(json.max_hp && json.character_class);

  return {
    id: json.id,
    name: json.name,
    level: json.level ?? 1,
    raceName: json.character_race?.name ?? '',
    className: json.character_class?.name ?? '',
    campaignName: json.campaign?.name ?? '',
    importable,
    reason: importable ? '' : 'incomplete',
  };
};

// Paginated at a fixed 21 per page server-side; `per_page` is ignored.
const CHARACTERS_PAGE_SIZE = 21;

const fetchCharacters = async function (page = 1) {
  const response = await odoFetchAuthenticated(`/personagens.json?page=${page}`);
  if (!response.ok) throw new Error(`Falha ao listar personagens (${response.status}).`);

  const json = await response.json();
  return json.map(normalizeCharacterRow);
};

// Identifies which account the stored tokens belong to, so the connected state
// can name it. Returns null rather than throwing: not knowing the handler must
// never stop someone from using a connection that works.
const fetchAccountHandler = async function () {
  try {
    const response = await odoFetchAuthenticated('/perfil.json');
    if (!response.ok) return null;
    const json = await response.json();
    return json.handler ?? null;
  } catch {
    return null;
  }
};

// One shared public client serves every user of the module, so nobody has to
// register an application. Created by `rails foundryvtt:oauth_app`.
const CLIENT_ID = 'olddragon2e-foundryvtt';
const SCOPE = 'openid content.read content.write offline_access';
const GRANT_DEVICE_CODE = 'urn:ietf:params:oauth:grant-type:device_code';

const form = function (params) {
  return new URLSearchParams(params).toString();
};

// These OAuth endpoints take form-encoded bodies, not JSON, so this can't
// simply call odoFetch. It still goes through odoClient.js's buildOdoUrl/
// odoBaseUrl for the base URL and sends the same User-Agent, so it doesn't
// drift from the choke point — don't fold this back into odoFetch.
const postForm = async function (path, params) {
  return fetch(buildOdoUrl(path, odoBaseUrl()), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent(),
    },
    credentials: 'omit',
    body: form(params),
  });
};

// The server has no request-level rate limiter and can serve a static HTML
// error page (500/429) instead of JSON, so every /token response body must
// be parsed defensively.
const readJson = async function (response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const requestDeviceCode = async function () {
  const response = await postForm('/device-authorization', { client_id: CLIENT_ID, scope: SCOPE });
  if (!response.ok) throw new Error(`Falha ao iniciar a conexão (${response.status}).`);
  return response.json();
};

// The link we show uses the site's short `?c=` alias, which pre-fills the code
// without submitting it, so the person still confirms it matches the code shown
// here before authorizing — that check is what protects the device flow.
// Built from the server-provided verification_uri, never a hardcoded path.
const prefilledVerificationUrl = function (device) {
  try {
    const url = new URL(device.verification_uri);
    url.searchParams.set('c', device.user_code);
    return url.toString();
  } catch {
    return device.verification_uri_complete ?? device.verification_uri ?? '';
  }
};

// Polls until the user approves on the site. Honors the interval the server
// returns, backs off on slow_down, and gives up on expired_token/access_denied.
const pollForToken = async function (deviceCode, intervalSeconds, expiresInSeconds) {
  let interval = intervalSeconds * 1000;
  const deadline = Date.now() + expiresInSeconds * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const response = await postForm('/token', {
      grant_type: GRANT_DEVICE_CODE,
      device_code: deviceCode,
      client_id: CLIENT_ID,
    });
    const payload = await readJson(response);

    if (response.ok && payload) return payload;
    // A non-JSON body (a static error page during a deploy blip) is
    // transient: keep polling instead of aborting, the device code stays
    // valid for the rest of its expires_in window.
    if (!payload) continue;
    if (payload.error === 'authorization_pending') continue;
    if (payload.error === 'slow_down') {
      interval += 5_000;
      continue;
    }
    if (payload.error === 'access_denied') throw new Error('Autorização negada.');
    if (payload.error === 'expired_token') throw new Error('O código expirou. Tente novamente.');
    throw new Error(`Falha ao autorizar (${payload.error ?? response.status}).`);
  }

  throw new Error('O código expirou. Tente novamente.');
};

const refreshAccessToken = async function () {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  const response = await postForm('/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });

  if (!response.ok) {
    // invalid_grant means revoked or a year elapsed: start over. Any other
    // failure (a transient 500/502/503, a static error page, ...) leaves
    // the stored tokens alone so the caller can retry instead of forcing
    // the whole device flow again.
    const payload = await readJson(response);
    if (payload?.error === 'invalid_grant') clearTokens();
    return null;
  }

  const payload = await response.json();
  storeTokens(payload);
  return payload.access_token;
};

// Returns a usable access token, refreshing first when the stored one is stale.
const getValidAccessToken = async function () {
  if (!getStoredRefreshToken()) return null;
  if (isStoredTokenExpired()) return refreshAccessToken();
  return getStoredAccessToken();
};

const disconnect = function () {
  clearTokens();
};

var deviceFlow = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CLIENT_ID: CLIENT_ID,
  SCOPE: SCOPE,
  disconnect: disconnect,
  getValidAccessToken: getValidAccessToken,
  pollForToken: pollForToken,
  prefilledVerificationUrl: prefilledVerificationUrl,
  refreshAccessToken: refreshAccessToken,
  requestDeviceCode: requestDeviceCode
});

class CharacterImporterDialog extends Application {
  constructor(options = {}) {
    super(options);
    this._hasMore = false;
  }

  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'character-importer-dialog';
    options.title = 'Importar Ajudante ou Personagem do ODO';
    options.template = 'systems/olddragon2e/templates/dialog/character-importer-dialog.hbs';
    options.width = 420;
    options.height = 'auto';
    return options;
  }

  /** @override */
  async getData() {
    if (isConnected() && this._characters === undefined) {
      this._page = 1;
      const page = await this._loadPage(1);
      this._characters = page;
      this._hasMore = page.length === CHARACTERS_PAGE_SIZE;
      // Learn who we are connected as, once per connection.
      if (!getStoredAccountHandler()) storeAccountHandler(await fetchAccountHandler());
    }
    if (!isConnected()) {
      this._characters = undefined;
      this._hasMore = false;
    }

    return {
      odoBaseUrl: odoBaseUrl(),
      connected: isConnected(),
      accountHandler: getStoredAccountHandler(),
      characters: this._characters ?? [],
      // A further page exists only if the last fetch came back completely full.
      hasMore: this._hasMore,
    };
  }

  async _loadPage(page) {
    try {
      return await fetchCharacters(page);
    } catch (error) {
      ui.notifications.error(error.message);
      return [];
    }
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.cancel-button').on('click', this._onCancel.bind(this));
    html.find('.character-importer-button').on('click', this._onCharacterImporter.bind(this));
    html.find('.odo-connect-button').on('click', this._onConnect.bind(this));
    html.find('.odo-disconnect-button').on('click', this._onDisconnect.bind(this));
    html.find('.odo-character:not(.disabled)').on('click', this._onPickCharacter.bind(this));
    html.find('.odo-load-more').on('click', this._onLoadMore.bind(this));
  }

  async _onCancel(event) {
    event.preventDefault();
    await this.close();
  }

  async _onConnect(event) {
    event.preventDefault();
    const button = document.querySelector('.odo-connect-button');
    button.disabled = true;

    let waiting;
    let tokens;
    try {
      const device = await requestDeviceCode();
      const instructions = `
        <p>${game.i18n.localize('olddragon2e.odo_device_instructions')}</p>
        <p class="odo-user-code"><strong>${device.user_code}</strong></p>
        <p class="odo-device-link">
          <a href="${prefilledVerificationUrl(device)}" target="_blank" rel="noopener">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>${game.i18n.localize('olddragon2e.odo_open_authorization')}
          </a>
        </p>
        <p class="odo-device-manual">
          ${game.i18n.localize('olddragon2e.odo_device_manual')}
          <span class="odo-device-url">${device.verification_uri}</span>
        </p>
        <p>${game.i18n.localize('olddragon2e.odo_waiting_authorization')}</p>`;
      waiting = new Dialog({
        title: game.i18n.localize('olddragon2e.odo_connect'),
        content: instructions,
        buttons: {},
      });
      waiting.render(true);

      tokens = await pollForToken(device.device_code, device.interval, device.expires_in);
      storeTokens(tokens);
    } catch (error) {
      ui.notifications.error(`${game.i18n.localize('olddragon2e.odo_connect_failed')}: ${error.message}`);
    } finally {
      if (waiting) {
        try {
          await waiting.close();
        } catch (closeError) {
          console.error(closeError);
        }
      }
      button.disabled = false;
    }

    if (tokens) {
      this.render(true);
      ui.actors?.render();
    }
  }

  async _onDisconnect(event) {
    event.preventDefault();
    const button = document.querySelector('.odo-disconnect-button');
    button.disabled = true;

    try {
      disconnect();
      this.render(true);
      ui.actors?.render();
    } finally {
      button.disabled = false;
    }
  }

  async _onLoadMore(event) {
    event.preventDefault();
    this._page += 1;
    const page = await this._loadPage(this._page);
    if (page.length > 0) this._characters = [...this._characters, ...page];
    this._hasMore = page.length === CHARACTERS_PAGE_SIZE;
    this.render(true);
  }

  async _onPickCharacter(event) {
    event.preventDefault();
    if (this._importingCharacter) return;
    this._importingCharacter = true;

    try {
      const characterId = event.currentTarget.dataset.characterId;
      const json = await this._retrieveJson(buildOdoUrl(`/personagens/${characterId}.json`, odoBaseUrl()));
      if (json === '') return;

      const actor = await importActor(json);
      actor.sheet.render(true);
      await this.close();
    } catch (err) {
      console.error(err);
      ui.notifications.error(`Error importing character. Check console for error log.`);
    } finally {
      this._importingCharacter = false;
    }
  }

  async _onCharacterImporter(event) {
    event.preventDefault();
    const button = document.querySelector('.character-importer-button');
    button.disabled = true;

    const url = document.querySelector('#character-importer-url-text').value;
    const actorType = this._detectActorType(url);

    if (actorType === null) {
      ui.notifications.error('URL não reconhecida. Informe uma URL de personagem ou ajudante do Old Dragon Online.');
      button.disabled = false;
      return;
    }

    try {
      const parsedURL = this._parseURL(url);
      const json = await this._retrieveJson(parsedURL);

      console.debug('olddragon2e | _onCharacterImporter', json);
      if (json === '') return;

      const actor = actorType === 'retainer' ? await importRetainerActor(json) : await importActor(json);
      actor.sheet.render(true);

      await this.close();
    } catch (err) {
      console.error(err);
      ui.notifications.error(`Error importing character. Check console for error log.`);
    } finally {
      button.disabled = false;
    }
  }

  _parseURL(url) {
    // check if URL ends with .json. if not, append it
    if (!url.endsWith('.json')) {
      url += '.json';
    }

    return url;
  }

  _detectActorType(url) {
    if (!isOdoUrl(url, odoBaseUrl())) return null;
    const { pathname } = new URL(url);
    if (pathname.startsWith('/ajudantes/')) return 'retainer';
    if (pathname.startsWith('/personagens/')) return 'character';
    return null;
  }

  async _retrieveJson(url) {
    try {
      console.debug('olddragon2e | Retrieving JSON from URL: ', url);

      const response = await fetch(url);

      if (!response.ok) {
        ui.notifications.error(`Error making external request. Check console for error log.`);
        return '';
      }

      return response.json();
    } catch (error) {
      console.error(error);
      ui.notifications.error(`Error making external request. Check console for error log.`);
      return '';
    }
  }
}

const showCharacterImporter = () => {
  const characterImporterDialog = new CharacterImporterDialog();
  characterImporterDialog.render(true);
};

/**
 * @param {Application} app
 * @param {jQuery} html
 */
const renderActorDirectory = (app, html) => {
  if (game.user.can('ACTOR_CREATE')) {
    // The label depends on whether the account is connected, so a stale button is
    // replaced rather than skipped: connecting or disconnecting re-renders this
    // directory precisely so the label can change.
    html.querySelector('.character-generator')?.remove();

    const section = document.createElement('header');
    section.classList.add('character-generator');
    section.classList.add('directory-header');

    const dirHeader = html.querySelector('.directory-header');
    dirHeader.parentNode.insertBefore(section, dirHeader);

    const connected = isConnected();

    const actions = document.createElement('div');
    actions.classList.add('header-actions', 'action-buttons', 'flexrow');

    const button = document.createElement('button');
    button.classList.add('import-character-button');

    const icon = document.createElement('i');
    icon.classList.add('fas', connected ? 'fa-file-import' : 'fa-link');
    button.append(icon);
    button.append(
      game.i18n.localize(
        connected ? 'olddragon2e.odo_import_actor_directory' : 'olddragon2e.odo_connect_actor_directory',
      ),
    );

    button.addEventListener('click', () => {
      showCharacterImporter();
    });

    actions.append(button);
    section.append(actions);
  }
};

// System settings
const registerSettings = function () {
  game.settings.register('olddragon2e', 'initiativeType', {
    name: game.i18n.localize('olddragon2e.settings.initiativeType.name'),
    hint: game.i18n.localize('olddragon2e.settings.initiativeType.hint'),
    scope: 'world',
    config: true,
    type: String,
    choices: {
      standard: game.i18n.localize('olddragon2e.settings.initiativeType.choices.standard'),
      individual: game.i18n.localize('olddragon2e.settings.initiativeType.choices.individual'),
    },
    default: 'standard',
    onChange: (value) => {
      // Update the initiative formula based on the choice
      if (value === 'individual') {
        CONFIG.Combat.initiative = {
          formula: '1d12',
          decimals: 0,
        };
      } else if (value === 'standard') {
        CONFIG.Combat.initiative = {
          formula: '1d20',
          decimals: 0,
        };

        // Initialize the custom initiative module
        if (game.olddragon2e && game.olddragon2e.InitiativeModule) {
          game.olddragon2e.InitiativeModule.initializeAttributeInitiative();
        }
      }
    },
  });

  // Hidden on purpose (config: false): points the ODO integration at a
  // development or staging server. Set it from the console:
  //   game.settings.set('olddragon2e', 'odoBaseUrl', 'http://olddragon.test:3027')
  game.settings.register('olddragon2e', 'odoBaseUrl', {
    scope: 'client',
    config: false,
    type: String,
    default: 'https://olddragon.com.br',
    onChange: () => {
      // Tokens belong to one environment; a production token is meaningless
      // against staging, so switching hosts signs the user out.
      clearTokens();
    },
  });

  game.settings.register('olddragon2e', 'odoAccessToken', {
    scope: 'client',
    config: false,
    type: String,
    default: '',
  });

  game.settings.register('olddragon2e', 'odoRefreshToken', {
    scope: 'client',
    config: false,
    type: String,
    default: '',
  });

  game.settings.register('olddragon2e', 'odoAccountHandler', {
    scope: 'client',
    config: false,
    type: String,
    default: '',
  });

  game.settings.register('olddragon2e', 'odoExpiresAt', {
    scope: 'client',
    config: false,
    type: Number,
    default: 0,
  });

  game.settings.register('olddragon2e', 'ammoTracking', {
    name: game.i18n.localize('olddragon2e.settings.ammoTracking.name'),
    hint: game.i18n.localize('olddragon2e.settings.ammoTracking.hint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      // onChange roda em TODO cliente conectado quando um setting de mundo muda (não só em
      // quem chamou .set()) — sem essa checagem, cada jogador conectado geraria seu próprio
      // aviso/mensagem duplicada.
      if (!game.user.isGM) return;

      // O módulo Forien's Ammo Swapper depende deste setting; não bloqueamos desligar,
      // só avisamos que o rastreamento vai parar de funcionar corretamente pra ele.
      if (value === false && game.modules.get('forien-ammo-swapper')?.active) {
        const message = game.i18n.localize('olddragon2e.settings.ammoTracking.disableWarning');
        ui.notifications.warn(message);
        ChatMessage.create({
          user: game.user.id,
          content: `<div class="title">${message}</div>`,
          whisper: [game.user.id],
        });
        return;
      }

      // Lembrete de que o rastreamento só afeta armas com um Tipo de Munição definido, e que
      // arma e munição precisam estar equipadas — tanto ao ativar manualmente quanto quando a
      // ativação automática (Hooks 'setup') dispara este onChange.
      if (value === true) {
        const message = game.i18n.localize('olddragon2e.settings.ammoTracking.equipReminder');
        ui.notifications.info(message);
        ChatMessage.create({
          user: game.user.id,
          content: `<div class="title">${message}</div>`,
          whisper: [game.user.id],
        });
      }
    },
  });
};

// Function to get the current initiative type
const getInitiativeType = function () {
  return game.settings.get('olddragon2e', 'initiativeType');
};

const getItemsOfActorOfType$2 = (actor, filterType, filterFn = null) =>
  actor.items.filter(({ type }) => type === filterType).filter(filterFn || (() => true));

class OD2CharacterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      odo_id: new fields.StringField(),
      level: new fields.NumberField({
        required: true,
        initial: 1,
        integer: true,
      }),
      hp: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          initial: 10,
          integer: true,
        }),
        max: new fields.NumberField({
          required: true,
          initial: 10,
          integer: true,
        }),
      }),
      forca: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      destreza: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      constituicao: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      inteligencia: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      sabedoria: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      carisma: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      ac_extra: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      jp_race_bonus: new fields.StringField({
        default: '',
      }),
      jpd: new fields.SchemaField({
        class: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        race: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
      }),
      jpc: new fields.SchemaField({
        class: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        race: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
      }),
      jps: new fields.SchemaField({
        class: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        race: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
      }),
      economy: new fields.SchemaField({
        cp: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        sp: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        gp: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        count: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        load: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
      }),
      details: new fields.SchemaField({
        alignment: new fields.StringField({
          required: true,
          initial: 'neutro',
        }),
        languages: new fields.StringField(),
        reputation: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        appearance: new fields.StringField(),
        personality: new fields.StringField(),
        background: new fields.StringField(),
        notes: new fields.StringField(),
      }),
      current_xp: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      campanha_url: new fields.StringField(),
      url: new fields.StringField(),
      rogue_talent_points: new fields.ObjectField({ initial: {} }),
      variable_construction_selections: new fields.ObjectField({ initial: {} }),
    };
  }

  static migrateData(source) {
    if (typeof source.ba === 'object') {
      source.ba = source.ba.value;
    }
    if (typeof source.current_movement === 'object') {
      source.current_movement = source.current_movement.value;
    }
    return super.migrateData(source);
  }

  get ac_base() {
    for (const ability of this.race_abilities) {
      const naturalArmor = ability.system.natural_armor;
      if (naturalArmor && naturalArmor !== 0) return naturalArmor;
    }
    return 10;
  }

  get ac_total() {
    const base = this.ac_base;
    const magic_weapon = this.ac_extra;

    const shield_ac = this.ac_shield;
    const armor_ac = this.ac_armor;

    const mod = this.mod_destreza;

    return base + mod + magic_weapon + shield_ac + armor_ac;
  }

  get ac_shield() {
    const equipped_shields = this.shield_items.filter(({ system }) => system.is_equipped);

    const shield_ac = equipped_shields.reduce((acc, { system }) => acc + system.bonus_ca, 0);

    return shield_ac;
  }

  get ac_armor() {
    const equipped_armor = this.armor_items.filter(({ system }) => system.is_equipped);

    const armor_ac = equipped_armor.reduce((acc, { system }) => acc + system.bonus_ca, 0);

    return armor_ac;
  }

  get ba() {
    const characterClass = this.class;
    if (!characterClass) return 0;

    const level = this.level;
    const classLevels = characterClass.system.levels;

    const levelData = classLevels[level];

    if (!levelData) return 0;

    return levelData.ba;
  }

  get bac() {
    const base = this.ba;
    const mod = this.mod_forca;

    return base + mod;
  }

  get bad() {
    const base = this.ba;
    const mod = this.mod_destreza;

    return base + mod;
  }

  get mod_forca() {
    return calculateAttributeModifier(this.forca);
  }

  get mod_destreza() {
    return calculateAttributeModifier(this.destreza);
  }

  get mod_constituicao() {
    return calculateAttributeModifier(this.constituicao);
  }

  get mod_inteligencia() {
    return calculateAttributeModifier(this.inteligencia);
  }

  get mod_sabedoria() {
    return calculateAttributeModifier(this.sabedoria);
  }

  get mod_carisma() {
    return calculateAttributeModifier(this.carisma);
  }

  get jpd_race_bonus() {
    if (this.jp_race_bonus === 'jpd') {
      return 1;
    }
    return 0;
  }

  get jpc_race_bonus() {
    if (this.jp_race_bonus === 'jpc') {
      return 1;
    }
    return 0;
  }

  get jps_race_bonus() {
    if (this.jp_race_bonus === 'jps') {
      return 1;
    }
    return 0;
  }

  get jp() {
    const characterClass = this.class;
    if (!characterClass) return 0;

    const level = this.level;
    const classLevels = characterClass.system.levels;

    const levelData = classLevels[level];

    if (!levelData) return 0;

    return levelData.jp;
  }

  get jpd_total() {
    const class_jpd = this.jp;
    const race_bonus = this.jpd_race_bonus;
    const mod = this.mod_destreza;

    return class_jpd + race_bonus + mod;
  }

  get jpc_total() {
    const class_jpc = this.jp;
    const race_bonus = this.jpc_race_bonus;
    const mod = this.mod_constituicao;

    return class_jpc + race_bonus + mod;
  }

  get jps_total() {
    const class_jps = this.jp;
    const race_bonus = this.jps_race_bonus;
    const mod = this.mod_sabedoria;

    return class_jps + race_bonus + mod;
  }

  get current_movement() {
    if (this.race == null) {
      return 0;
    }

    return this.race.system.movement;
  }

  get movement_run() {
    return Math.floor(this.current_movement * 2);
  }

  get movement_climb() {
    if (this.current_movement <= 0) {
      return 0;
    }
    return Math.max(0, Math.floor(this.current_movement - 2));
  }

  get movement_swim() {
    if (this.race?.system.movement_swim != null) {
      return this.race.system.movement_swim;
    }
    return Math.floor(this.current_movement / 2);
  }

  get movement_fly() {
    if (this.race == null) {
      return 0;
    }
    return this.race.system.movement_fly ?? 0;
  }

  get next_level_xp() {
    const characterClass = this.class;
    if (!characterClass) return 0;

    const level = this.level;
    const classLevels = characterClass.system.levels;

    const levelData = classLevels[level + 1];

    if (!levelData) return 0;

    return levelData.xp;
  }

  _levelUp() {
    const currentXp = this.current_xp;
    const nextLevelXp = this.next_level_xp;

    if (currentXp >= nextLevelXp) {
      ui.notifications.info(`Parabéns! ${this.parent.name} já pode subir de nível!`);
    }
  }

  get load_max() {
    for (const ability of this.race_abilities) {
      const maxLoadOverride = ability.system.max_load_override;
      if (maxLoadOverride && maxLoadOverride !== 0) return maxLoadOverride;
    }

    let maxLoadValue = this._findHighestValue(this.forca, this.constituicao);

    const equipped_containers = getItemsOfActorOfType$2(this.parent, 'container', ({ system }) => system.is_equipped);

    for (const item of equipped_containers) {
      maxLoadValue += item.system.increases_load_by || 0;
    }

    for (const ability of this.race_abilities) {
      const loadModifier = ability.system.load_modifier;
      if (loadModifier && loadModifier !== 0) {
        maxLoadValue += loadModifier;
      }
    }

    return maxLoadValue;
  }

  get load_current() {
    return Math.floor(this._inventoryItemsLoad() + this._economyCoinLoad());
  }

  _inventoryItemsLoad() {
    let currentLoadValue = 0;
    const itemTypes = ['weapon', 'armor', 'shield', 'misc', 'container'];

    let armorWeightModifier = 0;
    for (const ability of this.race_abilities) {
      const modifier = ability.system.armor_weight_modifier;
      if (modifier && modifier !== 0) {
        armorWeightModifier = modifier;
        break;
      }
    }

    for (const type of itemTypes) {
      const items = getItemsOfActorOfType$2(this.parent, type);

      for (const item of items) {
        if (type === 'armor' && armorWeightModifier !== 0 && item.system.is_equipped) {
          currentLoadValue += Math.max(1, item.system.total_weight + armorWeightModifier);
        } else {
          currentLoadValue += item.system.total_weight;
        }
      }
    }

    return Math.floor(currentLoadValue);
  }

  _economyCoinSum() {
    return this.economy.cp + this.economy.sp + this.economy.gp;
  }

  _economyCoinLoad() {
    return this._economyCoinSum() / 100;
  }

  _findHighestValue(value1, value2) {
    if (value1 > value2) {
      return value1;
    } else {
      return value2;
    }
  }

  get equipped_items() {
    return this.parent.items.filter(({ system }) => system.is_equipped);
  }

  get attack_items() {
    return getItemsOfActorOfType$2(this.parent, 'weapon', ({ system }) => system.is_equipped).sort(
      (a, b) => (a.sort || 0) - (b.sort || 0),
    );
  }

  get equipped_ammunition() {
    return getItemsOfActorOfType$2(
      this.parent,
      'weapon',
      ({ system }) => system.type === 'ammunition' && system.is_equipped,
    );
  }

  get weapon_items() {
    return getItemsOfActorOfType$2(this.parent, 'weapon').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get armor_items() {
    return getItemsOfActorOfType$2(this.parent, 'armor').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get shield_items() {
    return getItemsOfActorOfType$2(this.parent, 'shield').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get misc_items() {
    return getItemsOfActorOfType$2(this.parent, 'misc').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get container_items() {
    return getItemsOfActorOfType$2(this.parent, 'container').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get vehicle_items() {
    return getItemsOfActorOfType$2(this.parent, 'vehicle').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get spell_items() {
    return getItemsOfActorOfType$2(this.parent, 'spell').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get race() {
    const raceItems = getItemsOfActorOfType$2(this.parent, 'race');

    if (raceItems && raceItems.length) {
      return raceItems[0];
    }

    return null;
  }

  get class() {
    const classItems = getItemsOfActorOfType$2(this.parent, 'class');

    if (classItems && classItems.length) {
      return classItems[0];
    }

    return null;
  }

  async getItemsFromUUIDs(uuids) {
    const items = [];
    for (const uuid of uuids) {
      const item = await fromUuid(uuid);
      if (item) items.push(item);
    }
    return items;
  }

  // Habilidades de Raça
  async updateRaceAbilities(uuids) {
    const raceAbilities = await this.getItemsFromUUIDs(uuids);
    const currentRaceAbilities = this.race_abilities;
    const currentRaceAbilitiesUUIDs = [];

    for (const ability of currentRaceAbilities) {
      currentRaceAbilitiesUUIDs.push(ability._id);
    }

    await this.parent.deleteEmbeddedDocuments('Item', currentRaceAbilitiesUUIDs);

    for (const raceAbility of raceAbilities) {
      await this.parent.createEmbeddedDocuments('Item', [raceAbility]);
    }
  }

  async syncRaceAbilities() {
    const race = this.race;
    if (!race) return [];

    const raceAbilitiesUUIDs = race.system.race_abilities || [];
    const raceAbilities = await this.getItemsFromUUIDs(raceAbilitiesUUIDs);
    const existingAbilityNames = this.race_abilities.map((a) => a.name);

    for (const raceAbility of raceAbilities) {
      // Skip if ability already exists
      if (existingAbilityNames.includes(raceAbility.name)) continue;
      await this.parent.createEmbeddedDocuments('Item', [raceAbility]);
    }

    return raceAbilities;
  }

  get race_abilities() {
    return getItemsOfActorOfType$2(this.parent, 'race_ability');
  }

  get natural_weapon_attacks() {
    const attacks = [];
    for (const ability of this.race_abilities) {
      const nw = ability.system.natural_weapon;
      if (nw?.damage) {
        attacks.push({
          name: ability.name,
          damage: nw.damage,
          damage_type: nw.damage_type,
          weapon_size: nw.weapon_size,
          damage_type_key: `olddragon2e.damage_types.${nw.damage_type}`,
          weapon_size_key: `olddragon2e.weapon_sizes.${nw.weapon_size}`,
        });
      }
    }
    return attacks;
  }

  // Habilidades de Classe
  async updateClassAbilities(uuids) {
    const classAbilities = await this.getItemsFromUUIDs(uuids);
    const currentClassAbilities = this.class_abilities;
    const currentClassAbilitiesUUIDs = [];

    for (const ability of currentClassAbilities) {
      currentClassAbilitiesUUIDs.push(ability._id);
    }

    await this.parent.deleteEmbeddedDocuments('Item', currentClassAbilitiesUUIDs);

    for (const classAbility of classAbilities) {
      await this.parent.createEmbeddedDocuments('Item', [classAbility]);
    }
  }

  async syncClassAbilities() {
    const characterClass = this.class;
    if (!characterClass) return [];

    const classAbilitiesUUIDs = characterClass.system.class_abilities || [];
    const classAbilities = await this.getItemsFromUUIDs(classAbilitiesUUIDs);
    const existingAbilityNames = this.class_abilities.map((a) => a.name);

    for (const classAbility of classAbilities) {
      // Skip if ability already exists
      if (existingAbilityNames.includes(classAbility.name)) continue;
      await this.parent.createEmbeddedDocuments('Item', [classAbility]);
    }

    return classAbilities;
  }

  get class_abilities() {
    return getItemsOfActorOfType$2(this.parent, 'class_ability');
  }

  // Talentos de Ladrão
  get has_rogue_talents() {
    return this.class_abilities.some((ability) => (ability.system.rogue_talents || []).length > 0);
  }

  get available_rogue_talents() {
    const ability = this.class_abilities.find((a) => (a.system.rogue_talents || []).length > 0);
    return ability?.system.rogue_talents ?? [];
  }

  get rogue_talent_race_bonus() {
    const bonuses = {};
    for (const ability of this.race_abilities) {
      for (const field of ['rogue_talent', 'rogue_talent_2']) {
        const talent = ability.system[field];
        if (talent && talent !== 'none') {
          bonuses[talent] = (bonuses[talent] || 0) + 1;
        }
      }
    }
    return bonuses;
  }

  raceBonusDamage(weapon) {
    const meetsCondition = (condition) => {
      if (!condition || condition === 'none') return false;
      if (['arrow', 'bolt', 'bolt_small', 'polearm', 'two_handed', 'versatile', 'magic_item'].includes(condition))
        return weapon.system[condition];
      if (condition === 'weight_1') return weapon.system.weight_in_load === 1;
      if (condition === 'weight_2') return weapon.system.weight_in_load === 2;
      if (condition === 'weight_3') return weapon.system.weight_in_load === 3;
      if (['melee', 'throwing', 'ranged', 'ammunition'].includes(condition)) return weapon.system.type === condition;
      if (['bludgeoning', 'piercing', 'slashing'].includes(condition)) return weapon.system.damage_type === condition;
      return false;
    };

    let bonus = 0;
    for (const ability of this.race_abilities) {
      const { bonus_damage, bonus_damage_condition, bonus_damage_condition_2 } = ability.system;
      if (!bonus_damage) continue;
      if (meetsCondition(bonus_damage_condition) || meetsCondition(bonus_damage_condition_2)) {
        bonus += bonus_damage;
      }
    }
    return bonus;
  }

  get rogue_talent_scores() {
    const scores = {};
    const raceBonuses = this.rogue_talent_race_bonus;
    for (const talent of this.available_rogue_talents) {
      const base = 2;
      const allocated = this.rogue_talent_points[talent.key] || 0;
      const raceBonus = raceBonuses[talent.key] || 0;
      scores[talent.key] = Math.min(5, base + allocated + raceBonus);
    }
    return scores;
  }

  get rogue_talent_total_points_available() {
    if (!this.has_rogue_talents) return 0;
    const level = this.level;
    let points = 2 + Math.max(0, this.mod_destreza);
    if (level >= 3) points += 2;
    if (level >= 6) points += 2;
    if (level >= 10) points += 2;
    return points;
  }

  get rogue_talent_points_spent() {
    let spent = 0;
    for (const talent of this.available_rogue_talents) {
      spent += this.rogue_talent_points[talent.key] || 0;
    }
    return spent;
  }

  get rogue_talent_points_remaining() {
    return this.rogue_talent_total_points_available - this.rogue_talent_points_spent;
  }
}

const getItemsOfActorOfType$1 = (actor, filterType, filterFn = null) =>
  actor.items.filter(({ type }) => type === filterType).filter(filterFn || (() => true));

class OD2MonsterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      odo_id: new fields.StringField(),
      hp: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          initial: 10,
          integer: true,
        }),
        max: new fields.NumberField({
          required: true,
          initial: 10,
          integer: true,
        }),
      }),
      flavor: new fields.StringField(),
      concept: new fields.StringField({
        initial: 'humanoide',
      }),
      size: new fields.StringField({
        initial: 'medio',
      }),
      habitat: new fields.StringField({
        initial: 'qualquer',
      }),
      alignment: new fields.StringField({
        initial: 'neutro',
      }),
      variant: new fields.BooleanField(),
      description: new fields.StringField(),
      described_attacks: new fields.StringField(),
      encounters: new fields.StringField(),
      encounters_lair: new fields.StringField(),
      xp: new fields.StringField(),
      treasure: new fields.StringField(),
      treasure_lair: new fields.StringField(),
      mv: new fields.StringField(),
      mvn: new fields.StringField(),
      mvv: new fields.StringField(),
      mvo: new fields.StringField(),
      dv: new fields.StringField(),
      dv_bonus: new fields.StringField(),
      ca: new fields.StringField(),
      jp: new fields.StringField(),
      mo: new fields.StringField(),
      url: new fields.StringField(),
    };
  }

  get mvc() {
    const mv = parseInt(this.mv);
    return isNaN(mv) ? '' : Math.floor(mv * 2);
  }

  get mve() {
    const mv = parseInt(this.mv);
    return isNaN(mv) ? '' : Math.floor(mv - 2);
  }

  get monster_attack_items() {
    return getItemsOfActorOfType$1(this.parent, 'monster_attack').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }
}

const getItemsOfActorOfType = (actor, filterType, filterFn = null) =>
  actor.items.filter(({ type }) => type === filterType).filter(filterFn || (() => true));

class OD2RetainerDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      odo_id: new fields.StringField(),
      level: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      hp: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          initial: 1,
          integer: true,
        }),
        max: new fields.NumberField({
          required: true,
          initial: 1,
          integer: true,
        }),
      }),
      forca: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      destreza: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      constituicao: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      inteligencia: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      sabedoria: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      carisma: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      ac_extra: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      economy: new fields.SchemaField({
        cp: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        sp: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        gp: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        count: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
        load: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
        }),
      }),
      details: new fields.SchemaField({
        notes: new fields.StringField(),
      }),
      profession: new fields.StringField(),
      heroic_action_used: new fields.BooleanField({
        initial: false,
      }),
      campanha_url: new fields.StringField(),
      url: new fields.StringField(),
    };
  }

  get ac_base() {
    return 10;
  }

  get ac_total() {
    const base = this.ac_base;
    const magic_weapon = this.ac_extra;

    const shield_ac = this.ac_shield;
    const armor_ac = this.ac_armor;

    const mod = this.mod_destreza;

    return base + mod + magic_weapon + shield_ac + armor_ac;
  }

  get ac_shield() {
    const equipped_shields = this.shield_items.filter(({ system }) => system.is_equipped);

    const shield_ac = equipped_shields.reduce((acc, { system }) => acc + system.bonus_ca, 0);

    return shield_ac;
  }

  get ac_armor() {
    const equipped_armor = this.armor_items.filter(({ system }) => system.is_equipped);

    const armor_ac = equipped_armor.reduce((acc, { system }) => acc + system.bonus_ca, 0);

    return armor_ac;
  }

  get ba() {
    return 0;
  }

  get bac() {
    return this.mod_forca;
  }

  get bad() {
    return this.mod_destreza;
  }

  get mod_forca() {
    return calculateAttributeModifier(this.forca);
  }

  get mod_destreza() {
    return calculateAttributeModifier(this.destreza);
  }

  get mod_constituicao() {
    return calculateAttributeModifier(this.constituicao);
  }

  get mod_inteligencia() {
    return calculateAttributeModifier(this.inteligencia);
  }

  get mod_sabedoria() {
    return calculateAttributeModifier(this.sabedoria);
  }

  get mod_carisma() {
    return calculateAttributeModifier(this.carisma);
  }

  get jpd_total() {
    return 4;
  }

  get jpc_total() {
    return 4;
  }

  get jps_total() {
    return 4;
  }

  get hp_max_suggested() {
    return Math.max(1, 4 + this.mod_constituicao);
  }

  get current_movement() {
    if (this.race == null) {
      return 0;
    }

    return this.race.system.movement;
  }

  get movement_run() {
    return Math.floor(this.current_movement * 2);
  }

  get movement_climb() {
    if (this.current_movement <= 0) {
      return 0;
    }
    return Math.max(0, Math.floor(this.current_movement - 2));
  }

  get movement_swim() {
    return Math.floor(this.current_movement / 2);
  }

  get movement_fly() {
    if (this.race == null) {
      return 0;
    }
    return this.race.system.movement_fly ?? 0;
  }

  get load_max() {
    let maxLoadValue = this._findHighestValue(this.forca, this.constituicao);

    const equipped_containers = getItemsOfActorOfType(this.parent, 'container', ({ system }) => system.is_equipped);

    for (const item of equipped_containers) {
      maxLoadValue += item.system.increases_load_by || 0;
    }

    return maxLoadValue;
  }

  get load_current() {
    return Math.floor(this._inventoryItemsLoad() + this._economyCoinLoad());
  }

  _inventoryItemsLoad() {
    let currentLoadValue = 0;
    const itemTypes = ['weapon', 'armor', 'shield', 'misc', 'container'];

    for (const type of itemTypes) {
      const items = getItemsOfActorOfType(this.parent, type);

      for (const item of items) {
        currentLoadValue += item.system.total_weight;
      }
    }

    return Math.floor(currentLoadValue);
  }

  _economyCoinSum() {
    return this.economy.cp + this.economy.sp + this.economy.gp;
  }

  _economyCoinLoad() {
    return this._economyCoinSum() / 100;
  }

  _findHighestValue(value1, value2) {
    if (value1 > value2) {
      return value1;
    } else {
      return value2;
    }
  }

  get equipped_items() {
    return this.parent.items.filter(({ system }) => system.is_equipped);
  }

  get attack_items() {
    return getItemsOfActorOfType(this.parent, 'weapon', ({ system }) => system.is_equipped).sort(
      (a, b) => (a.sort || 0) - (b.sort || 0),
    );
  }

  get equipped_ammunition() {
    return getItemsOfActorOfType(
      this.parent,
      'weapon',
      ({ system }) => system.type === 'ammunition' && system.is_equipped,
    );
  }

  get weapon_items() {
    return getItemsOfActorOfType(this.parent, 'weapon').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get armor_items() {
    return getItemsOfActorOfType(this.parent, 'armor').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get shield_items() {
    return getItemsOfActorOfType(this.parent, 'shield').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get misc_items() {
    return getItemsOfActorOfType(this.parent, 'misc').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get container_items() {
    return getItemsOfActorOfType(this.parent, 'container').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get vehicle_items() {
    return getItemsOfActorOfType(this.parent, 'vehicle').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  get race() {
    const raceItems = getItemsOfActorOfType(this.parent, 'race');

    if (raceItems && raceItems.length) {
      return raceItems[0];
    }

    return null;
  }

  get race_abilities() {
    return getItemsOfActorOfType(this.parent, 'race_ability');
  }

  async getItemsFromUUIDs(uuids) {
    const items = [];
    for (const uuid of uuids) {
      const item = await fromUuid(uuid);
      if (item) items.push(item);
    }
    return items;
  }

  async syncRaceAbilities() {
    const race = this.race;
    if (!race) return [];

    const raceAbilitiesUUIDs = race.system.race_abilities || [];
    const raceAbilities = await this.getItemsFromUUIDs(raceAbilitiesUUIDs);
    const existingAbilityNames = this.race_abilities.map((a) => a.name);

    for (const raceAbility of raceAbilities) {
      if (existingAbilityNames.includes(raceAbility.name)) continue;
      await this.parent.createEmbeddedDocuments('Item', [raceAbility]);
    }

    return raceAbilities;
  }
}

class OD2ItemDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      odo_id: new fields.StringField(),
      description: new fields.StringField(),
    };
  }
}

class OD2EquipmentDataModel extends OD2ItemDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      quantity: new fields.NumberField({
        required: true,
        initial: 1,
        integer: true,
        min: 0,
      }),
      cost: new fields.StringField(),
      weight_in_load: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      weight_in_grams: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      magic_item: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      is_equipped: new fields.BooleanField({
        required: true,
        initial: false,
      }),
    };
  }

  get total_weight() {
    return this._calculateTotalWeight(this.quantity, this.weight_in_grams, this.weight_in_load);
  }

  get total_cost() {
    return this._calculateTotalCost(this.quantity, this.cost);
  }

  // Cálculo do Peso Total de um item
  _calculateTotalWeight(quantity, weight_in_grams, weight_in_load) {
    let total_weight = 0;

    if (weight_in_grams > 0) {
      total_weight = (weight_in_grams * quantity) / 1000;
    }

    if (weight_in_load > 0) {
      total_weight = weight_in_load * quantity;
    }

    return total_weight;
  }

  // Cálculo do Valor Total de um item
  _calculateTotalCost(quantity, cost) {
    if (!cost) {
      return '0';
    }

    cost = cost.toUpperCase();
    cost.match('PO') != null;
    let isPP = cost.match('PP') != null;
    let isPC = cost.match('PC') != null;
    let match = cost.match(/\d+/);
    let costValue = match[0];
    let totalCost = costValue * Number(quantity);

    if (match === null) {
      return '0 PO';
    }

    if (totalCost <= 0) {
      return cost;
    }

    if (isPP) {
      let POvalue = Math.trunc(totalCost / 10);

      if (POvalue > 0) {
        return `${POvalue} PO`;
      }

      return `${totalCost} PP`;
    }

    if (isPC) {
      let PPvalue = Math.trunc(totalCost / 10);
      let POvalue = Math.trunc(totalCost / 100);

      if (POvalue > 0) {
        return `${POvalue} PO`;
      }

      if (PPvalue > 0) {
        return `${PPvalue} PP`;
      }

      return `${totalCost} PC`;
    }

    return `${totalCost} PO`;
  }
}

class OD2ArmorDataModel extends OD2EquipmentDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      bonus_ca: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
    };
  }
}

class OD2ContainerDataModel extends OD2EquipmentDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      increases_load_by: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
    };
  }
}

class OD2MonsterAttackDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      text: new fields.StringField(),
      times: new fields.NumberField({
        required: true,
        initial: 1,
        integer: true,
      }),
      description: new fields.StringField(),
      ba: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      damage_description: new fields.StringField(),
      damage: new fields.StringField(),
      damage_bonus: new fields.NumberField({
        integer: true,
      }),
      weapon: new fields.BooleanField({
        required: true,
        initial: false,
      }),
    };
  }
}

class OD2ShieldDataModel extends OD2EquipmentDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      bonus_ca: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
    };
  }
}

class OD2SpellDataModel extends OD2ItemDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      arcane: new fields.StringField({
        initial: 'null',
      }),
      divine: new fields.StringField({
        initial: 'null',
      }),
      necromancer: new fields.StringField({
        initial: 'null',
      }),
      illusionist: new fields.StringField({
        initial: 'null',
      }),
      reverse: new fields.BooleanField({
        initial: false,
      }),
      range: new fields.StringField(),
      duration: new fields.StringField(),
      jp: new fields.StringField(),
    };
  }
}

class OD2RaceDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      flavor: new fields.StringField(),
      description: new fields.StringField(),
      movement: new fields.NumberField({
        required: true,
        integer: true,
        initial: 0,
      }),
      movement_swim: new fields.NumberField({
        integer: true,
        nullable: true,
        min: 0,
      }),
      movement_fly: new fields.NumberField({
        integer: true,
        initial: 0,
        min: 0,
      }),
      movement_notes: new fields.StringField(),
      infravision: new fields.NumberField({
        integer: true,
      }),
      infravision_notes: new fields.StringField(),
      alignment_tendency: new fields.StringField({
        initial: 'none',
      }),
      alignment_notes: new fields.StringField(),
      race_abilities: new fields.ArrayField(new fields.StringField(), {
        default: [],
      }),
    };
  }
}

class OD2RaceAbilityDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.StringField(),
      xp: new fields.NumberField({
        integer: true,
      }),
      jp: new fields.SchemaField({
        jpc: new fields.BooleanField({
          default: false,
        }),
        jpd: new fields.BooleanField({
          default: false,
        }),
        jps: new fields.BooleanField({
          default: false,
        }),
      }),
      bonus_damage: new fields.NumberField({ integer: true, initial: 0 }),
      bonus_damage_condition: new fields.StringField({ default: 'none' }),
      bonus_damage_condition_2: new fields.StringField({ default: 'none' }),
      rogue_talent: new fields.StringField({
        default: 'none',
      }),
      rogue_talent_2: new fields.StringField({
        default: 'none',
      }),
      daily_uses: new fields.NumberField({ integer: true, initial: 0 }),
      natural_armor: new fields.NumberField({ integer: true, initial: 0 }),
      load_modifier: new fields.NumberField({ integer: true, initial: 0 }),
      max_load_override: new fields.NumberField({ integer: true, initial: 0 }),
      armor_weight_modifier: new fields.NumberField({ integer: true, initial: 0 }),
      natural_weapon: new fields.SchemaField({
        damage: new fields.StringField({ initial: '' }),
        damage_type: new fields.StringField({ initial: 'none' }),
        weapon_size: new fields.StringField({ initial: 'none' }),
      }),
      variable_construction: new fields.SchemaField({
        choices_count: new fields.NumberField({ integer: true, initial: 0 }),
        available_options: new fields.ArrayField(
          new fields.SchemaField({
            key: new fields.StringField({ initial: '' }),
            name: new fields.StringField({ initial: '' }),
            description: new fields.StringField({ initial: '' }),
          }),
        ),
      }),
    };
  }
}

class OD2ClassDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      flavor: new fields.StringField(),
      description: new fields.StringField(),
      equipment_restrictions: new fields.SchemaField({
        weapons: new fields.StringField({
          initial: 'Sem restrições.',
        }),
        armors: new fields.StringField({
          initial: 'Sem restrições.',
        }),
        magic_items: new fields.StringField({
          initial: 'Sem restrições.',
        }),
      }),
      hp: new fields.NumberField({
        integer: true,
      }),
      high_level_hp_bonus: new fields.NumberField({
        integer: true,
      }),
      restrictions: new fields.SchemaField({
        alignments: new fields.ArrayField(new fields.StringField(), {
          default: [],
        }),
        races: new fields.ArrayField(new fields.StringField(), {
          default: [],
        }),
      }),
      levels: new fields.SchemaField({
        1: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
        }),
        2: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        3: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        4: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        5: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        6: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        7: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        8: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        9: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        10: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        11: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        12: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        13: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        14: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
        15: new fields.SchemaField({
          ba: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          jp: new fields.NumberField({
            required: true,
            integer: true,
            initial: 0,
          }),
          xp: new fields.NumberField({
            integer: true,
            initial: 0,
          }),
        }),
      }),
      class_abilities: new fields.ArrayField(new fields.StringField(), {
        default: [],
      }),
    };
  }
}

class OD2ClassAbilityDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      level: new fields.NumberField({
        required: true,
        integer: true,
        initial: 1,
      }),
      description: new fields.StringField(),
      level3: new fields.StringField(),
      level6: new fields.StringField(),
      level10: new fields.StringField(),
      rogue_talents: new fields.ArrayField(
        new fields.SchemaField({
          key: new fields.StringField({ required: true }),
          name: new fields.StringField({ required: true }),
          description: new fields.StringField({ default: '' }),
        }),
        { default: [] },
      ),
      daily_uses: new fields.SchemaField({
        1: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        2: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        3: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        4: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        5: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        6: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        7: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        8: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        9: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        10: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        11: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        12: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        13: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        14: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
        15: new fields.NumberField({
          integer: true,
          initial: 0,
        }),
      }),
    };
  }
}

class OD2WeaponDataModel extends OD2EquipmentDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      type: new fields.StringField({
        initial: 'melee',
      }),
      ammo_type: new fields.StringField({
        required: true,
        initial: 'none',
      }),
      damage_type: new fields.StringField({
        initial: 'none',
      }),
      damage: new fields.StringField(),
      bonus_damage: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      bonus_ba: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      bonus_ca: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      shoot_range: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      throw_range: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
      }),
      arrow: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      bolt: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      bolt_small: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      polearm: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      two_handed: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      versatile: new fields.BooleanField({
        required: true,
        initial: false,
      }),
    };
  }
}

// Import JavaScript modules

// Initialize system
Hooks.once('init', async () => {
  console.log('olddragon2e | Initializing Old Dragon 2e system');

  // Assign custom classes and constants here

  CONFIG.olddragon2e = olddragon2e;
  CONFIG.Item.documentClass = OD2Item;

  CONFIG.Actor.dataModels = {
    character: OD2CharacterDataModel,
    monster: OD2MonsterDataModel,
    retainer: OD2RetainerDataModel,
  };

  CONFIG.Item.dataModels = {
    weapon: OD2WeaponDataModel,
    armor: OD2ArmorDataModel,
    shield: OD2ShieldDataModel,
    misc: OD2EquipmentDataModel,
    container: OD2ContainerDataModel,
    vehicle: OD2EquipmentDataModel,
    spell: OD2SpellDataModel,
    race: OD2RaceDataModel,
    race_ability: OD2RaceAbilityDataModel,
    class: OD2ClassDataModel,
    class_ability: OD2ClassAbilityDataModel,
    monster_attack: OD2MonsterAttackDataModel,
  };

  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet('olddragon2e', OD2ItemSheet, { makeDefault: true });

  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet('olddragon2e', OD2CharacterSheet, {
    types: ['character'],
    label: 'Personagem',
    makeDefault: true,
  });
  foundry.documents.collections.Actors.registerSheet('olddragon2e', OD2MonsterSheet, {
    types: ['monster'],
    label: 'Monstro/Inimigo',
    makeDefault: true,
  });
  foundry.documents.collections.Actors.registerSheet('olddragon2e', OD2RetainerSheet, {
    types: ['retainer'],
    label: 'Ajudante',
    makeDefault: true,
  });

  // Disponibilizar o módulo de iniciativa globalmente
  game.olddragon2e = game.olddragon2e || {};
  game.olddragon2e.InitiativeModule = InitiativeModule;

  // Disponibilizar as classes de rolagem globalmente
  game.olddragon2e.BaseRoll = BaseRoll;
  game.olddragon2e.AttackRoll = AttackRoll;
  game.olddragon2e.UnarmedAttackRoll = UnarmedAttackRoll;
  game.olddragon2e.DamageRoll = DamageRoll;
  game.olddragon2e.KnockoutRoll = KnockoutRoll;
  game.olddragon2e.JPRoll = JPRoll;
  game.olddragon2e.BARoll = BARoll;
  game.olddragon2e.StatRoll = StatRoll;
  game.olddragon2e.MonsterJPRoll = MonsterJPRoll;
  game.olddragon2e.MonsterMORoll = MonsterMORoll;
  game.olddragon2e.MonsterDVRoll = MonsterDVRoll;
  game.olddragon2e.MonsterAttackRoll = MonsterAttackRoll;
  game.olddragon2e.MonsterDamageRoll = MonsterDamageRoll;

  // Registrar configurações do sistema
  registerSettings();

  // Register custom Handlebars helpers
  registerHandlebarsHelper();

  // Preload Handlebars templates
  await preloadTemplates();

  // Register custom sheets (if any)
});

// Setup system
Hooks.once('setup', async () => {
  // Ativa o rastreamento de munição automaticamente se o módulo que depende
  // dele (Forien's Ammo Swapper) estiver ativo neste mundo. Settings de escopo
  // 'world' só podem ser alterados por um GM — sem essa checagem, cada cliente
  // jogador tentaria (e falharia) a mesma chamada.
  const ammoModuleActive = game.modules.get('forien-ammo-swapper')?.active;
  if (game.user.isGM && ammoModuleActive && !game.settings.get('olddragon2e', 'ammoTracking')) {
    ChatMessage.create({
      user: game.user.id,
      content: `<div class="title">${game.i18n.localize('olddragon2e.settings.ammoTracking.autoEnabled')}</div>`,
      whisper: [game.user.id],
    });
    // Dispara o onChange do setting, que já avisa (tela + chat) sobre equipar arma e munição.
    await game.settings.set('olddragon2e', 'ammoTracking', true);
  }
});

// When ready
Hooks.once('ready', async () => {
  // Do anything once the system is ready

  game.socket.on('system.olddragon2e', handleCharacterImporterSocket);

  // Configurar iniciativa com base nas configurações
  const initiativeType = getInitiativeType();
  if (initiativeType === 'individual') {
    CONFIG.Combat.initiative = {
      formula: '1d12',
      decimals: 0,
    };
    console.log('olddragon2e | Iniciativa individual (1d12) configurada');
  } else if (initiativeType === 'standard') {
    // Usar a iniciativa baseada em atributos
    CONFIG.Combat.initiative = {
      formula: '1d20',
      decimals: 0,
    };

    // Inicializar o módulo de iniciativa personalizada
    initializeAttributeInitiative();
    console.log('olddragon2e | Iniciativa standard (baseada em atributos) configurada');
  }
});

// Add any additional hooks if necessary
Hooks.on('renderActorDirectory', renderActorDirectory);
Hooks.on('renderChatLog', (_app, html) => addChatListeners(html));

Hooks.on('updateItem', (item, data, options, userId) => {
  console.log('olddragon2e | Hooks.on(updateItem)', item, data, options, userId);
});

Hooks.on('preUpdateActor', (actor, data) => {
  if (actor.type !== 'retainer') return;
  if (!foundry.utils.hasProperty(data, 'system.constituicao')) return;

  const newConstituicao = data.system.constituicao;
  if (newConstituicao === actor.system.constituicao) return;

  const newMod = calculateAttributeModifier(newConstituicao);
  foundry.utils.setProperty(data, 'system.hp.max', Math.max(1, 4 + newMod));
});

Hooks.on('renderGamePause', (_app, html) => {
  const img = html.querySelector('img');
  if (!img) return;
  img.src = 'systems/olddragon2e/assets/game-paused.webp';
  img.classList.remove('fa-spin');
});
//# sourceMappingURL=olddragon2e.js.map
