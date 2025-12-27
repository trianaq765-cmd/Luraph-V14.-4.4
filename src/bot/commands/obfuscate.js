/**
 * LuaShield - Obfuscate Command
 * Support: Roblox Executor, Loadstring, Standard Lua
 * FIXED VERSION - Proper interaction handling
 */

const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    AttachmentBuilder,
    ComponentType
} = require('discord.js');

const { logger } = require('../../utils/logger');
const fileHandler = require('../../utils/fileHandler');

// Import obfuscator dengan error handling
let Obfuscator;
try {
    Obfuscator = require('../../obfuscator');
} catch (e) {
    console.error('Failed to load obfuscator:', e.message);
    Obfuscator = null;
}

// ═══════════════════════════════════════════════════════════
// FEATURES CONFIGURATION
// ═══════════════════════════════════════════════════════════
const FEATURES = {
    vmObfuscation: {
        id: 'vmObfuscation',
        name: 'VM Obfuscation',
        emoji: '🔀',
        description: 'Convert code to Virtual Machine bytecode',
        default: true,
        roblox: true,
        loadstring: true,
        standard: true
    },
    stringEncryption: {
        id: 'stringEncryption',
        name: 'String Encryption',
        emoji: '🔐',
        description: 'Encrypt all strings with XOR/Custom encoding',
        default: true,
        roblox: true,
        loadstring: true,
        standard: true
    },
    controlFlow: {
        id: 'controlFlow',
        name: 'Control Flow',
        emoji: '🌀',
        description: 'Flatten and obfuscate control flow',
        default: false,
        roblox: true,
        loadstring: true,
        standard: true
    },
    junkCode: {
        id: 'junkCode',
        name: 'Junk Code',
        emoji: '🗑️',
        description: 'Inject dead code and fake branches',
        default: false,
        roblox: true,
        loadstring: true,
        standard: true
    },
    variableRenaming: {
        id: 'variableRenaming',
        name: 'Variable Renaming',
        emoji: '📝',
        description: 'Rename variables (Luraph style: d, Q, FU)',
        default: true,
        roblox: true,
        loadstring: true,
        standard: true
    },
    constantEncryption: {
        id: 'constantEncryption',
        name: 'Constant Encryption',
        emoji: '🔢',
        description: 'Obfuscate numbers and booleans',
        default: false,
        roblox: true,
        loadstring: true,
        standard: true
    },
    integrityCheck: {
        id: 'integrityCheck',
        name: 'Integrity Check',
        emoji: '✅',
        description: 'Detect code tampering',
        default: false,
        roblox: true,
        loadstring: true,
        standard: true
    },
    environmentCheck: {
        id: 'environmentCheck',
        name: 'Environment Check',
        emoji: '🛡️',
        description: 'Anti-debug and environment validation',
        default: false,
        roblox: false,
        loadstring: true,
        standard: true
    },
    watermark: {
        id: 'watermark',
        name: 'Watermark',
        emoji: '💧',
        description: 'Add custom watermark to output',
        default: true,
        roblox: true,
        loadstring: true,
        standard: true
    },
    minify: {
        id: 'minify',
        name: 'Minify Output',
        emoji: '📦',
        description: 'Compress and minify final output',
        default: true,
        roblox: true,
        loadstring: true,
        standard: true
    }
};

// ═══════════════════════════════════════════════════════════
// TARGET PLATFORMS
// ═══════════════════════════════════════════════════════════
const TARGETS = {
    roblox: {
        id: 'roblox',
        name: 'Roblox Executors',
        emoji: '🎮',
        description: 'Synapse X, ScriptWare, Krnl, Fluxus, Delta, etc',
        details: [
            '✅ bit32 support',
            '✅ Executor globals (getgenv, etc)',
            '✅ Roblox API compatible'
        ]
    },
    loadstring: {
        id: 'loadstring',
        name: 'Loadstring',
        emoji: '📜',
        description: 'Compatible with loadstring() environments',
        details: [
            '✅ loadstring() compatible',
            '✅ getfenv/setfenv support',
            '✅ Standard Lua globals'
        ]
    },
    standard: {
        id: 'standard',
        name: 'Standard Lua',
        emoji: '💻',
        description: 'Lua 5.1 / 5.2 / 5.3 / LuaJIT',
        details: [
            '✅ Full Lua compatibility',
            '✅ All debug functions',
            '✅ All standard libraries'
        ]
    }
};

// ═══════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════
const PRESETS = {
    light: {
        name: 'Light',
        emoji: '💡',
        description: 'Fast, minimal protection',
        features: {
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
        }
    },
    medium: {
        name: 'Medium',
        emoji: '⚡',
        description: 'Balanced protection & performance',
        features: {
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
        }
    },
    heavy: {
        name: 'Heavy',
        emoji: '🔥',
        description: 'Strong protection',
        features: {
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
        }
    },
    maximum: {
        name: 'Maximum',
        emoji: '💀',
        description: 'Maximum security (slower)',
        features: {
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
    }
};

// ═══════════════════════════════════════════════════════════
// ACTIVE SESSIONS (untuk tracking)
// ═══════════════════════════════════════════════════════════
const activeSessions = new Map();

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
                .setDescription('Upload a .lua or .txt file to obfuscate')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('code')
                .setDescription('Or paste your Lua code directly (for short scripts)')
                .setRequired(false)
                .setMaxLength(4000)
        )
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('Select target platform')
                .setRequired(false)
                .addChoices(
                    { name: '🎮 Roblox Executors', value: 'roblox' },
                    { name: '📜 Loadstring', value: 'loadstring' },
                    { name: '💻 Standard Lua', value: 'standard' }
                )
        )
        .addStringOption(option =>
            option
                .setName('preset')
                .setDescription('Quick preset (or customize in menu)')
                .setRequired(false)
                .addChoices(
                    { name: '💡 Light - Fast, minimal', value: 'light' },
                    { name: '⚡ Medium - Balanced', value: 'medium' },
                    { name: '🔥 Heavy - Strong', value: 'heavy' },
                    { name: '💀 Maximum - Full protection', value: 'maximum' }
                )
        ),

    cooldown: 10, // Reduced cooldown

    // ═══════════════════════════════════════════════════════════
    // EXECUTE
    // ═══════════════════════════════════════════════════════════
    async execute(interaction) {
        // ✅ FIX: Clean up old session if exists
        const existingSession = activeSessions.get(interaction.user.id);
        if (existingSession && existingSession.collector) {
            try {
                existingSession.collector.stop('new_session');
            } catch (e) { /* ignore */ }
        }

        // Check if obfuscator is available
        if (!Obfuscator) {
            return interaction.reply({
                embeds: [createErrorEmbed('Obfuscator module failed to load. Please try again later.')],
                ephemeral: true
            });
        }

        const file = interaction.options.getAttachment('file');
        const code = interaction.options.getString('code');
        const targetOption = interaction.options.getString('target');
        const presetOption = interaction.options.getString('preset');

        // Validate input
        if (!file && !code) {
            return interaction.reply({
                embeds: [createInputHelpEmbed()],
                ephemeral: true
            });
        }

        // Get Lua code content
        let luaCode = '';
        let fileName = 'script';

        try {
            if (file) {
                const validExtensions = ['.lua', '.txt', '.luau'];
                const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                
                if (!validExtensions.includes(fileExt)) {
                    return interaction.reply({
                        embeds: [createErrorEmbed(`Invalid file type: ${fileExt}\nAllowed: .lua, .txt, .luau`)],
                        ephemeral: true
                    });
                }

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
                embeds: [createErrorEmbed('**Validation Errors:**\n' + validation.errors.join('\n'))],
                ephemeral: true
            });
        }

        // Create session
        const session = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            odriverId: interaction.user.id,
            code: luaCode,
            fileName: fileName,
            target: targetOption || 'roblox',
            features: presetOption ? { ...PRESETS[presetOption].features } : getDefaultFeatures(),
            startTime: Date.now(),
            collector: null // Will be set later
        };

        // Apply target-specific feature restrictions
        applyTargetRestrictions(session);

        // If preset provided and target provided, obfuscate directly
        if (presetOption && targetOption) {
            // ✅ FIX: Defer reply IMMEDIATELY before any async operation
            await interaction.deferReply();
            await performObfuscation(interaction, session, true);
        } else {
            // Show feature selection menu
            await showFeatureMenu(interaction, session);
        }
    }
};

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function getDefaultFeatures() {
    const features = {};
    for (const [key, value] of Object.entries(FEATURES)) {
        features[key] = value.default;
    }
    return features;
}

function applyTargetRestrictions(session) {
    const target = session.target;
    for (const [key, feature] of Object.entries(FEATURES)) {
        if (!feature[target]) {
            session.features[key] = false;
        }
    }
}

function getAvailableFeatures(target) {
    return Object.entries(FEATURES)
        .filter(([_, feature]) => feature[target])
        .map(([key, feature]) => ({ key, ...feature }));
}

// ═══════════════════════════════════════════════════════════
// EMBED BUILDERS
// ═══════════════════════════════════════════════════════════

function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription(message)
        .setTimestamp();
}

function createInputHelpEmbed() {
    return new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('📝 How to Use /obfuscate')
        .setDescription('You need to provide Lua code to obfuscate.')
        .addFields(
            {
                name: '📁 Option 1: Upload File',
                value: '```\n/obfuscate file: [upload .lua file]\n```\nSupported: `.lua`, `.txt`, `.luau`',
                inline: false
            },
            {
                name: '📋 Option 2: Paste Code',
                value: '```\n/obfuscate code: print("Hello World")\n```\nMax 4000 characters',
                inline: false
            },
            {
                name: '⚡ Quick Start',
                value: '```\n/obfuscate file: script.lua target: roblox preset: medium\n```',
                inline: false
            }
        )
        .setFooter({ text: 'LuaShield Obfuscator' })
        .setTimestamp();
}

function createMainEmbed(session) {
    const enabledFeatures = Object.entries(session.features)
        .filter(([key, enabled]) => enabled && FEATURES[key])
        .map(([key]) => `${FEATURES[key].emoji} ${FEATURES[key].name}`)
        .join('\n') || '*No features selected*';

    const disabledFeatures = Object.entries(session.features)
        .filter(([key, enabled]) => !enabled && FEATURES[key] && FEATURES[key][session.target])
        .map(([key]) => `~~${FEATURES[key].emoji} ${FEATURES[key].name}~~`)
        .join('\n') || '*All available features enabled*';

    const unavailableFeatures = Object.entries(FEATURES)
        .filter(([key, feature]) => !feature[session.target])
        .map(([key, feature]) => `⛔ ${feature.name}`)
        .join('\n');

    const targetInfo = TARGETS[session.target];
    const codePreview = session.code.length > 150 
        ? session.code.substring(0, 150).replace(/`/g, "'") + '...' 
        : session.code.replace(/`/g, "'");

    const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('🛡️ LuaShield Obfuscator')
        .setDescription('Configure your obfuscation settings below.')
        .addFields(
            {
                name: '📄 Input Preview',
                value: `\`\`\`lua\n${codePreview}\n\`\`\``,
                inline: false
            },
            {
                name: '📊 Input Stats',
                value: `📝 ${session.code.length} chars | 📃 ${session.code.split('\n').length} lines`,
                inline: false
            },
            {
                name: `🎯 Target: ${targetInfo.emoji} ${targetInfo.name}`,
                value: targetInfo.details.join('\n'),
                inline: false
            },
            {
                name: '✅ Enabled Features',
                value: enabledFeatures,
                inline: true
            },
            {
                name: '❌ Disabled Features',
                value: disabledFeatures || '*None*',
                inline: true
            }
        )
        .setFooter({ text: `Session: ${session.id}` })
        .setTimestamp();

    if (unavailableFeatures) {
        embed.addFields({
            name: `⚠️ Unavailable for ${targetInfo.name}`,
            value: unavailableFeatures,
            inline: false
        });
    }

    return embed;
}

function createSuccessEmbed(stats, targetName) {
    return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Obfuscation Complete!')
        .setDescription('Your Lua code has been protected successfully.')
        .addFields(
            {
                name: '📊 Statistics',
                value: [
                    `📥 **Input Size:** ${formatBytes(stats.inputSize)}`,
                    `📤 **Output Size:** ${formatBytes(stats.outputSize)}`,
                    `📈 **Ratio:** ${stats.ratio}x`,
                    `⏱️ **Time:** ${stats.processingTime}ms`,
                    `🎯 **Target:** ${targetName}`
                ].join('\n'),
                inline: false
            },
            {
                name: '📈 Details',
                value: [
                    `🔤 Strings: ${stats.stringsEncrypted || 0}`,
                    `🔢 Constants: ${stats.constantsEncrypted || 0}`,
                    `📝 Variables: ${stats.variablesRenamed || 0}`,
                    `🔀 VM Instructions: ${stats.vmInstructions || 0}`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'Powered by LuaShield' })
        .setTimestamp();
}

function createProcessingEmbed(session) {
    return new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('⏳ Processing...')
        .setDescription('Your code is being obfuscated. Please wait...')
        .addFields(
            { name: '🎯 Target', value: TARGETS[session.target].name, inline: true },
            { name: '✨ Features', value: `${Object.values(session.features).filter(v => v).length} enabled`, inline: true },
            { name: '📊 Input', value: formatBytes(session.code.length), inline: true }
        )
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════
// COMPONENT BUILDERS
// ═══════════════════════════════════════════════════════════

function createTargetSelectMenu(currentTarget) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder('🎯 Select Target Platform')
            .addOptions(
                Object.values(TARGETS).map(target => ({
                    label: target.name,
                    description: target.description.substring(0, 100),
                    value: target.id,
                    emoji: target.emoji,
                    default: target.id === currentTarget
                }))
            )
    );
}

function createFeatureSelectMenu(features, target) {
    const availableFeatures = getAvailableFeatures(target);
    
    const options = availableFeatures.map(feature => ({
        label: feature.name,
        description: feature.description.substring(0, 100),
        value: feature.key,
        emoji: feature.emoji,
        default: features[feature.key]
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_features')
            .setPlaceholder('⚙️ Select Features (multiple)')
            .setMinValues(0)
            .setMaxValues(options.length)
            .addOptions(options)
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
            .setLabel('💀 Max')
            .setStyle(ButtonStyle.Danger)
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
            .setLabel('✅ All')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('btn_deselect_all')
            .setLabel('❌ None')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_cancel')
            .setLabel('🚫 Cancel')
            .setStyle(ButtonStyle.Danger)
    );
}

// ═══════════════════════════════════════════════════════════
// FEATURE MENU - FIXED VERSION
// ═══════════════════════════════════════════════════════════

async function showFeatureMenu(interaction, session) {
    const embed = createMainEmbed(session);
    const components = [
        createTargetSelectMenu(session.target),
        createFeatureSelectMenu(session.features, session.target),
        createPresetButtons(),
        createActionButtons()
    ];

    // ✅ FIX: Use new method without fetchReply
    await interaction.reply({
        embeds: [embed],
        components: components
    });

    // ✅ FIX: Fetch reply separately
    const response = await interaction.fetchReply();

    // Create collector with proper error handling
    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });

    // Store collector in session for cleanup
    session.collector = collector;
    activeSessions.set(interaction.user.id, session);

    collector.on('collect', async (i) => {
        try {
            // ✅ FIX: Defer update immediately to prevent timeout
            if (i.customId !== 'btn_obfuscate' && i.customId !== 'btn_cancel') {
                await i.deferUpdate();
            }

            // Target selection
            if (i.customId === 'select_target') {
                session.target = i.values[0];
                applyTargetRestrictions(session);
                await safeUpdateMenu(interaction, session);
            }

            // Feature selection
            else if (i.customId === 'select_features') {
                for (const key of Object.keys(session.features)) {
                    session.features[key] = false;
                }
                for (const key of i.values) {
                    if (FEATURES[key] && FEATURES[key][session.target]) {
                        session.features[key] = true;
                    }
                }
                await safeUpdateMenu(interaction, session);
            }

            // Preset buttons
            else if (i.customId.startsWith('preset_')) {
                const presetName = i.customId.replace('preset_', '');
                if (PRESETS[presetName]) {
                    session.features = { ...PRESETS[presetName].features };
                    applyTargetRestrictions(session);
                }
                await safeUpdateMenu(interaction, session);
            }

            // Select all
            else if (i.customId === 'btn_select_all') {
                for (const [key, feature] of Object.entries(FEATURES)) {
                    session.features[key] = feature[session.target];
                }
                await safeUpdateMenu(interaction, session);
            }

            // Deselect all
            else if (i.customId === 'btn_deselect_all') {
                for (const key of Object.keys(session.features)) {
                    session.features[key] = false;
                }
                await safeUpdateMenu(interaction, session);
            }

            // Cancel
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
                // ✅ FIX: Cleanup session
                activeSessions.delete(interaction.user.id);
            }

            // Obfuscate
            else if (i.customId === 'btn_obfuscate') {
                collector.stop('obfuscating');
                // ✅ FIX: Cleanup session before obfuscation
                activeSessions.delete(interaction.user.id);
                await performObfuscation(i, session, false);
            }

        } catch (error) {
            logger.error('Interaction error:', error);
            console.error(error);
            
            // ✅ FIX: Try to respond to user about error
            try {
                await interaction.editReply({
                    embeds: [createErrorEmbed(`Interaction error: ${error.message}`)],
                    components: []
                });
            } catch (e) { /* ignore */ }
            
            // Cleanup
            activeSessions.delete(interaction.user.id);
        }
    });

    collector.on('end', async (collected, reason) => {
        // ✅ FIX: Cleanup session on end
        activeSessions.delete(interaction.user.id);
        
        if (reason === 'time') {
            try {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF9900)
                            .setTitle('⏰ Session Expired')
                            .setDescription('The session has timed out. Please use `/obfuscate` again.')
                            .setTimestamp()
                    ],
                    components: []
                });
            } catch (e) { /* ignore - message may be deleted */ }
        }
    });
}

// ✅ NEW: Safe update menu function
async function safeUpdateMenu(interaction, session) {
    try {
        const embed = createMainEmbed(session);
        const components = [
            createTargetSelectMenu(session.target),
            createFeatureSelectMenu(session.features, session.target),
            createPresetButtons(),
            createActionButtons()
        ];

        await interaction.editReply({
            embeds: [embed],
            components: components
        });
    } catch (error) {
        logger.error('Failed to update menu:', error);
    }
}

// ═══════════════════════════════════════════════════════════
// OBFUSCATION - FIXED VERSION
// ═══════════════════════════════════════════════════════════

async function performObfuscation(interaction, session, isDeferred) {
    const processingEmbed = createProcessingEmbed(session);
    
    try {
        // ✅ FIX: Handle both deferred and non-deferred cases
        if (isDeferred) {
            await interaction.editReply({
                embeds: [processingEmbed],
                components: []
            });
        } else {
            await interaction.update({
                embeds: [processingEmbed],
                components: []
            });
        }
    } catch (error) {
        logger.error('Failed to show processing message:', error);
        // Try alternative method
        try {
            await interaction.editReply({
                embeds: [processingEmbed],
                components: []
            });
        } catch (e) { /* ignore */ }
    }

    try {
        const enabledCount = Object.values(session.features).filter(v => v).length;
        
        // ✅ FIX: Reset obfuscator before use
        if (Obfuscator.Obfuscator) {
            const obfuscatorInstance = new Obfuscator.Obfuscator();
            obfuscatorInstance.reset();
        }
        
        // Perform obfuscation
        const result = await Obfuscator.obfuscate(session.code, {
            target: session.target,
            features: session.features,
            seed: Date.now(),
            luraphStyle: true,
            deltaCompatible: true
        });

        if (!result.success) {
            throw new Error(result.error || 'Obfuscation failed');
        }

        const stats = {
            ...result.stats,
            featuresEnabled: enabledCount
        };

        // Create attachment
        const outputFileName = session.fileName.replace(/\.(lua|txt|luau)$/i, '') + '_protected.lua';
        const attachment = new AttachmentBuilder(
            Buffer.from(result.code, 'utf-8'),
            { name: outputFileName }
        );

        const successEmbed = createSuccessEmbed(stats, TARGETS[session.target].name);

        // ✅ FIX: Use editReply for both cases
        await interaction.editReply({
            embeds: [successEmbed],
            files: [attachment],
            components: []
        });

        logger.obfuscate(`Success: ${session.fileName} | ${stats.inputSize}b → ${stats.outputSize}b | ${stats.processingTime}ms`);

    } catch (error) {
        logger.error('Obfuscation failed:', error);
        console.error(error);

        // ✅ FIX: Always use editReply for error
        try {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Obfuscation Failed')
                        .setDescription(`An error occurred:\n\`\`\`${error.message}\`\`\``)
                        .addFields({
                            name: '💡 Suggestions',
                            value: [
                                '• Make sure your Lua code is valid',
                                '• Try with fewer features enabled',
                                '• Try the "Light" preset first',
                                '• Check for unsupported syntax'
                            ].join('\n')
                        })
                        .setTimestamp()
                ],
                files: [],
                components: []
            });
        } catch (e) {
            // Last resort
            logger.error('Failed to send error message:', e);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
                                }
