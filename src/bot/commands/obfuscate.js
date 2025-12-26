/**
 * LuaShield - Obfuscate Command
 * Command utama untuk obfuscate Lua code
 * Fitur dipilih satu-satu dengan interactive menu
 */

const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    AttachmentBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ComponentType
} = require('discord.js');

const { logger } = require('../../utils/logger');
const fileHandler = require('../../utils/fileHandler');

// ═══════════════════════════════════════════════════════════
// FEATURES CONFIGURATION
// ═══════════════════════════════════════════════════════════
const FEATURES = {
    vmObfuscation: {
        id: 'vmObfuscation',
        name: 'VM Obfuscation',
        emoji: '🔀',
        description: 'Convert code to Virtual Machine bytecode',
        default: true
    },
    stringEncryption: {
        id: 'stringEncryption',
        name: 'String Encryption',
        emoji: '🔐',
        description: 'Encrypt all strings with XOR/Custom encoding',
        default: true
    },
    controlFlow: {
        id: 'controlFlow',
        name: 'Control Flow',
        emoji: '🌀',
        description: 'Flatten and obfuscate control flow',
        default: false
    },
    junkCode: {
        id: 'junkCode',
        name: 'Junk Code',
        emoji: '🗑️',
        description: 'Inject dead code and fake branches',
        default: false
    },
    variableRenaming: {
        id: 'variableRenaming',
        name: 'Variable Renaming',
        emoji: '📝',
        description: 'Rename variables (Luraph style)',
        default: true
    },
    constantEncryption: {
        id: 'constantEncryption',
        name: 'Constant Encryption',
        emoji: '🔢',
        description: 'Obfuscate numbers and booleans',
        default: false
    },
    integrityCheck: {
        id: 'integrityCheck',
        name: 'Integrity Check',
        emoji: '✅',
        description: 'Detect code tampering',
        default: false
    },
    environmentCheck: {
        id: 'environmentCheck',
        name: 'Environment Check',
        emoji: '🛡️',
        description: 'Anti-debug and environment validation',
        default: false
    },
    watermark: {
        id: 'watermark',
        name: 'Watermark',
        emoji: '💧',
        description: 'Add custom watermark to output',
        default: true
    },
    minify: {
        id: 'minify',
        name: 'Minify Output',
        emoji: '📦',
        description: 'Compress and minify final output',
        default: true
    }
};

const TARGETS = {
    roblox: {
        id: 'roblox',
        name: 'Roblox Executors',
        emoji: '🎮',
        description: 'Synapse X, Script-Ware, Krnl, Fluxus, etc'
    },
    loadstring: {
        id: 'loadstring',
        name: 'Loadstring',
        emoji: '📜',
        description: 'Compatible with loadstring() environments'
    },
    standard: {
        id: 'standard',
        name: 'Standard Lua',
        emoji: '💻',
        description: 'Lua 5.1 / 5.2 / 5.3 / LuaJIT'
    }
};

// ═══════════════════════════════════════════════════════════
// COMMAND DEFINITION
// ═══════════════════════════════════════════════════════════
module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('🛡️ Obfuscate your Lua code with professional protection')
        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Upload a .lua file to obfuscate')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('code')
                .setDescription('Or paste your Lua code directly (for short scripts)')
                .setRequired(false)
        ),

    cooldown: 30, // 30 seconds cooldown

    // ═══════════════════════════════════════════════════════════
    // EXECUTE
    // ═══════════════════════════════════════════════════════════
    async execute(interaction) {
        const file = interaction.options.getAttachment('file');
        const code = interaction.options.getString('code');

        // Validate input
        if (!file && !code) {
            return interaction.reply({
                embeds: [createErrorEmbed('Please provide a file or paste code to obfuscate.')],
                ephemeral: true
            });
        }

        // Get Lua code content
        let luaCode = '';
        let fileName = 'script';

        try {
            if (file) {
                const processed = await fileHandler.processAttachment(file);
                luaCode = processed.content;
                fileName = processed.filename;
                logger.obfuscate(`Processing file: ${fileName} (${processed.size} bytes)`);
            } else {
                luaCode = code;
                logger.obfuscate(`Processing pasted code (${code.length} chars)`);
            }
        } catch (error) {
            return interaction.reply({
                embeds: [createErrorEmbed(error.message)],
                ephemeral: true
            });
        }

        // Validate Lua content
        const validation = fileHandler.validateLuaContent(luaCode);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [createErrorEmbed(validation.errors.join('\n'))],
                ephemeral: true
            });
        }

        // Create session for this obfuscation request
        const session = {
            userId: interaction.user.id,
            code: luaCode,
            fileName: fileName,
            target: 'roblox',
            features: getDefaultFeatures(),
            startTime: Date.now()
        };

        // Show feature selection menu
        await showFeatureMenu(interaction, session);
    }
};

// ═══════════════════════════════════════════════════════════
// GET DEFAULT FEATURES
// ═══════════════════════════════════════════════════════════
function getDefaultFeatures() {
    const features = {};
    for (const [key, value] of Object.entries(FEATURES)) {
        features[key] = value.default;
    }
    return features;
}

// ═══════════════════════════════════════════════════════════
// CREATE EMBEDS
// ═══════════════════════════════════════════════════════════
function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription(message)
        .setTimestamp();
}

function createMainEmbed(session) {
    const enabledFeatures = Object.entries(session.features)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => `${FEATURES[key].emoji} ${FEATURES[key].name}`)
        .join('\n') || '*No features selected*';

    const disabledFeatures = Object.entries(session.features)
        .filter(([_, enabled]) => !enabled)
        .map(([key, _]) => `${FEATURES[key].emoji} ~~${FEATURES[key].name}~~`)
        .join('\n') || '*All features enabled*';

    const targetInfo = TARGETS[session.target];
    const codePreview = session.code.length > 100 
        ? session.code.substring(0, 100) + '...' 
        : session.code;

    return new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('🛡️ LuaShield Obfuscator')
        .setDescription('Configure your obfuscation settings below.')
        .addFields(
            {
                name: '📄 Input',
                value: `\`\`\`lua\n${codePreview}\n\`\`\``,
                inline: false
            },
            {
                name: '🎯 Target Platform',
                value: `${targetInfo.emoji} **${targetInfo.name}**\n${targetInfo.description}`,
                inline: false
            },
            {
                name: '✅ Enabled Features',
                value: enabledFeatures,
                inline: true
            },
            {
                name: '❌ Disabled Features',
                value: disabledFeatures,
                inline: true
            }
        )
        .setFooter({ text: `File: ${session.fileName} • ${session.code.length} characters` })
        .setTimestamp();
}

function createSuccessEmbed(stats) {
    return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Obfuscation Complete!')
        .setDescription('Your Lua code has been protected successfully.')
        .addFields(
            {
                name: '📊 Statistics',
                value: [
                    `📥 **Input Size:** ${stats.inputSize} bytes`,
                    `📤 **Output Size:** ${stats.outputSize} bytes`,
                    `📈 **Ratio:** ${stats.ratio}%`,
                    `⏱️ **Time:** ${stats.time}ms`,
                    `🎯 **Target:** ${stats.target}`,
                    `✨ **Features:** ${stats.featureCount} enabled`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'Powered by LuaShield • Luraph-style protection' })
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════
// CREATE COMPONENTS
// ═══════════════════════════════════════════════════════════
function createTargetSelectMenu(currentTarget) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder('🎯 Select Target Platform')
            .addOptions(
                Object.values(TARGETS).map(target => ({
                    label: target.name,
                    description: target.description,
                    value: target.id,
                    emoji: target.emoji,
                    default: target.id === currentTarget
                }))
            )
    );
}

function createFeatureSelectMenu(features) {
    const options = Object.values(FEATURES).map(feature => ({
        label: feature.name,
        description: feature.description,
        value: feature.id,
        emoji: feature.emoji,
        default: features[feature.id]
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_features')
            .setPlaceholder('⚙️ Toggle Features (select multiple)')
            .setMinValues(0)
            .setMaxValues(options.length)
            .addOptions(options)
    );
}

function createActionButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_obfuscate')
            .setLabel('🔒 Obfuscate Now')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('btn_select_all')
            .setLabel('✅ Select All')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('btn_deselect_all')
            .setLabel('❌ Deselect All')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_cancel')
            .setLabel('🚫 Cancel')
            .setStyle(ButtonStyle.Danger)
    );
}

function createPresetButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('preset_light')
            .setLabel('💡 Light')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('preset_medium')
            .setLabel('⚡ Medium')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('preset_heavy')
            .setLabel('🔥 Heavy')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('preset_maximum')
            .setLabel('💀 Maximum')
            .setStyle(ButtonStyle.Danger)
    );
}

// ═══════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════
const PRESETS = {
    light: {
        vmObfuscation: false,
        stringEncryption: true,
        controlFlow: false,
        junkCode: false,
        variableRenaming: true,
        constantEncryption: false,
        integrityCheck: false,
        environmentCheck: false,
        watermark: true,
        minify: true
    },
    medium: {
        vmObfuscation: true,
        stringEncryption: true,
        controlFlow: false,
        junkCode: false,
        variableRenaming: true,
        constantEncryption: true,
        integrityCheck: false,
        environmentCheck: false,
        watermark: true,
        minify: true
    },
    heavy: {
        vmObfuscation: true,
        stringEncryption: true,
        controlFlow: true,
        junkCode: true,
        variableRenaming: true,
        constantEncryption: true,
        integrityCheck: true,
        environmentCheck: false,
        watermark: true,
        minify: true
    },
    maximum: {
        vmObfuscation: true,
        stringEncryption: true,
        controlFlow: true,
        junkCode: true,
        variableRenaming: true,
        constantEncryption: true,
        integrityCheck: true,
        environmentCheck: true,
        watermark: true,
        minify: true
    }
};

// ═══════════════════════════════════════════════════════════
// SHOW FEATURE MENU
// ═══════════════════════════════════════════════════════════
async function showFeatureMenu(interaction, session) {
    const embed = createMainEmbed(session);
    const components = [
        createTargetSelectMenu(session.target),
        createFeatureSelectMenu(session.features),
        createPresetButtons(),
        createActionButtons()
    ];

    const response = await interaction.reply({
        embeds: [embed],
        components: components,
        fetchReply: true
    });

    // Create collector for interactions
    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === session.userId,
        time: 300000 // 5 minutes timeout
    });

    collector.on('collect', async (i) => {
        try {
            // Handle target selection
            if (i.customId === 'select_target') {
                session.target = i.values[0];
                await updateMenu(i, session);
            }

            // Handle feature selection
            else if (i.customId === 'select_features') {
                // Reset all features to false, then enable selected ones
                for (const key of Object.keys(session.features)) {
                    session.features[key] = i.values.includes(key);
                }
                await updateMenu(i, session);
            }

            // Handle preset buttons
            else if (i.customId.startsWith('preset_')) {
                const presetName = i.customId.replace('preset_', '');
                session.features = { ...PRESETS[presetName] };
                await updateMenu(i, session);
            }

            // Handle select all
            else if (i.customId === 'btn_select_all') {
                for (const key of Object.keys(session.features)) {
                    session.features[key] = true;
                }
                await updateMenu(i, session);
            }

            // Handle deselect all
            else if (i.customId === 'btn_deselect_all') {
                for (const key of Object.keys(session.features)) {
                    session.features[key] = false;
                }
                await updateMenu(i, session);
            }

            // Handle cancel
            else if (i.customId === 'btn_cancel') {
                collector.stop('cancelled');
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('🚫 Cancelled')
                            .setDescription('Obfuscation cancelled.')
                            .setTimestamp()
                    ],
                    components: []
                });
            }

            // Handle obfuscate button
            else if (i.customId === 'btn_obfuscate') {
                collector.stop('obfuscating');
                await performObfuscation(i, session);
            }

        } catch (error) {
            logger.error('Interaction error:', error);
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF9900)
                        .setTitle('⏰ Session Expired')
                        .setDescription('The obfuscation session has timed out. Please use `/obfuscate` again.')
                        .setTimestamp()
                ],
                components: []
            }).catch(() => {});
        }
    });
}

// ═══════════════════════════════════════════════════════════
// UPDATE MENU
// ═══════════════════════════════════════════════════════════
async function updateMenu(interaction, session) {
    const embed = createMainEmbed(session);
    const components = [
        createTargetSelectMenu(session.target),
        createFeatureSelectMenu(session.features),
        createPresetButtons(),
        createActionButtons()
    ];

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

// ═══════════════════════════════════════════════════════════
// PERFORM OBFUSCATION
// ═══════════════════════════════════════════════════════════
async function performObfuscation(interaction, session) {
    // Show processing message
    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle('⏳ Processing...')
                .setDescription('Your code is being obfuscated. Please wait...')
                .addFields({
                    name: '🎯 Target',
                    value: TARGETS[session.target].name,
                    inline: true
                }, {
                    name: '✨ Features',
                    value: `${Object.values(session.features).filter(v => v).length} enabled`,
                    inline: true
                })
                .setTimestamp()
        ],
        components: []
    });

    const startTime = Date.now();

    try {
        // Import obfuscator (akan dibuat nanti)
        const Obfuscator = require('../../obfuscator');

        // Perform obfuscation
        const result = await Obfuscator.obfuscate(session.code, {
            target: session.target,
            features: session.features
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Calculate stats
        const inputSize = Buffer.byteLength(session.code, 'utf-8');
        const outputSize = Buffer.byteLength(result.code, 'utf-8');
        const ratio = Math.round((outputSize / inputSize) * 100);
        const featureCount = Object.values(session.features).filter(v => v).length;

        // Create attachment
        const attachment = new AttachmentBuilder(
            Buffer.from(result.code, 'utf-8'),
            { name: `${session.fileName.replace(/\.(lua|txt)$/i, '')}_obfuscated.lua` }
        );

        // Create success embed
        const successEmbed = createSuccessEmbed({
            inputSize,
            outputSize,
            ratio,
            time: processingTime,
            target: TARGETS[session.target].name,
            featureCount
        });

        // Send result
        await interaction.editReply({
            embeds: [successEmbed],
            files: [attachment],
            components: []
        });

        // Log success
        logger.obfuscate(`Success: ${session.fileName} | ${inputSize}b → ${outputSize}b | ${processingTime}ms`);
        logger.logObfuscation({
            inputSize,
            outputSize,
            time: processingTime,
            features: featureCount
        });

    } catch (error) {
        logger.error('Obfuscation failed:', error);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Obfuscation Failed')
                    .setDescription(`An error occurred during obfuscation:\n\`\`\`${error.message}\`\`\``)
                    .addFields({
                        name: '💡 Suggestions',
                        value: [
                            '• Make sure your Lua code is valid',
                            '• Try with fewer features enabled',
                            '• Check for unsupported syntax',
                            '• Contact support if the issue persists'
                        ].join('\n')
                    })
                    .setTimestamp()
            ],
            components: []
        });
    }
          }
