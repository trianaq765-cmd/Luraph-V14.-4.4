/**
 * LuaShield - Obfuscate Command
 * FIXED VERSION v2 - Non-blocking dengan timeout
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

// Import obfuscator
let Obfuscator;
try {
    Obfuscator = require('../../obfuscator');
} catch (e) {
    console.error('Failed to load obfuscator:', e.message);
    Obfuscator = null;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const MAX_FILE_SIZE = 100 * 1024; // 100KB max
const OBFUSCATION_TIMEOUT = 60000; // 60 seconds timeout
const activeSessions = new Map();

// ═══════════════════════════════════════════════════════════
// FEATURES & TARGETS & PRESETS (sama seperti sebelumnya)
// ═══════════════════════════════════════════════════════════
const FEATURES = {
    vmObfuscation: { id: 'vmObfuscation', name: 'VM Obfuscation', emoji: '🔀', description: 'Convert code to VM bytecode', default: true, roblox: true, loadstring: true, standard: true },
    stringEncryption: { id: 'stringEncryption', name: 'String Encryption', emoji: '🔐', description: 'Encrypt all strings', default: true, roblox: true, loadstring: true, standard: true },
    controlFlow: { id: 'controlFlow', name: 'Control Flow', emoji: '🌀', description: 'Flatten control flow', default: false, roblox: true, loadstring: true, standard: true },
    junkCode: { id: 'junkCode', name: 'Junk Code', emoji: '🗑️', description: 'Inject dead code', default: false, roblox: true, loadstring: true, standard: true },
    variableRenaming: { id: 'variableRenaming', name: 'Variable Renaming', emoji: '📝', description: 'Rename variables', default: true, roblox: true, loadstring: true, standard: true },
    constantEncryption: { id: 'constantEncryption', name: 'Constant Encryption', emoji: '🔢', description: 'Obfuscate numbers', default: false, roblox: true, loadstring: true, standard: true },
    integrityCheck: { id: 'integrityCheck', name: 'Integrity Check', emoji: '✅', description: 'Detect tampering', default: false, roblox: true, loadstring: true, standard: true },
    environmentCheck: { id: 'environmentCheck', name: 'Environment Check', emoji: '🛡️', description: 'Anti-debug checks', default: false, roblox: false, loadstring: true, standard: true },
    watermark: { id: 'watermark', name: 'Watermark', emoji: '💧', description: 'Add watermark', default: true, roblox: true, loadstring: true, standard: true },
    minify: { id: 'minify', name: 'Minify Output', emoji: '📦', description: 'Compress output', default: true, roblox: true, loadstring: true, standard: true }
};

const TARGETS = {
    roblox: { id: 'roblox', name: 'Roblox Executors', emoji: '🎮', description: 'Delta, Fluxus, etc', details: ['✅ bit32', '✅ Executor globals', '✅ Roblox API'] },
    loadstring: { id: 'loadstring', name: 'Loadstring', emoji: '📜', description: 'loadstring() environments', details: ['✅ loadstring()', '✅ getfenv/setfenv', '✅ Standard Lua'] },
    standard: { id: 'standard', name: 'Standard Lua', emoji: '💻', description: 'Lua 5.1-5.4 / LuaJIT', details: ['✅ Full compatibility', '✅ All libraries'] }
};

const PRESETS = {
    light: { name: 'Light', emoji: '💡', features: { vmObfuscation: false, stringEncryption: true, controlFlow: false, junkCode: false, variableRenaming: true, constantEncryption: false, integrityCheck: false, environmentCheck: false, watermark: true, minify: true } },
    medium: { name: 'Medium', emoji: '⚡', features: { vmObfuscation: true, stringEncryption: true, controlFlow: false, junkCode: false, variableRenaming: true, constantEncryption: true, integrityCheck: false, environmentCheck: false, watermark: true, minify: true } },
    heavy: { name: 'Heavy', emoji: '🔥', features: { vmObfuscation: true, stringEncryption: true, controlFlow: true, junkCode: true, variableRenaming: true, constantEncryption: true, integrityCheck: true, environmentCheck: false, watermark: true, minify: true } },
    maximum: { name: 'Maximum', emoji: '💀', features: { vmObfuscation: true, stringEncryption: true, controlFlow: true, junkCode: true, variableRenaming: true, constantEncryption: true, integrityCheck: true, environmentCheck: true, watermark: true, minify: true } }
};

// ═══════════════════════════════════════════════════════════
// COMMAND DEFINITION
// ═══════════════════════════════════════════════════════════
module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('🛡️ Obfuscate your Lua code')
        .addAttachmentOption(option => option.setName('file').setDescription('Upload .lua/.txt file').setRequired(false))
        .addStringOption(option => option.setName('code').setDescription('Paste code directly').setRequired(false).setMaxLength(4000))
        .addStringOption(option => option.setName('target').setDescription('Target platform').setRequired(false)
            .addChoices(
                { name: '🎮 Roblox', value: 'roblox' },
                { name: '📜 Loadstring', value: 'loadstring' },
                { name: '💻 Standard Lua', value: 'standard' }
            ))
        .addStringOption(option => option.setName('preset').setDescription('Quick preset').setRequired(false)
            .addChoices(
                { name: '💡 Light', value: 'light' },
                { name: '⚡ Medium', value: 'medium' },
                { name: '🔥 Heavy', value: 'heavy' },
                { name: '💀 Maximum', value: 'maximum' }
            )),

    cooldown: 10,

    async execute(interaction) {
        // Cleanup old session
        cleanupSession(interaction.user.id);

        if (!Obfuscator) {
            return interaction.reply({ embeds: [createErrorEmbed('Obfuscator not available.')], ephemeral: true });
        }

        const file = interaction.options.getAttachment('file');
        const code = interaction.options.getString('code');
        const targetOption = interaction.options.getString('target');
        const presetOption = interaction.options.getString('preset');

        if (!file && !code) {
            return interaction.reply({ embeds: [createInputHelpEmbed()], ephemeral: true });
        }

        // Get code content
        let luaCode = '';
        let fileName = 'script';

        try {
            if (file) {
                // ✅ FIX: Check file size
                if (file.size > MAX_FILE_SIZE) {
                    return interaction.reply({
                        embeds: [createErrorEmbed(`File too large! Max: ${formatBytes(MAX_FILE_SIZE)}\nYour file: ${formatBytes(file.size)}`)],
                        ephemeral: true
                    });
                }

                const validExt = ['.lua', '.txt', '.luau'];
                const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                if (!validExt.includes(ext)) {
                    return interaction.reply({ embeds: [createErrorEmbed(`Invalid file type: ${ext}`)], ephemeral: true });
                }

                const processed = await fileHandler.processAttachment(file);
                luaCode = processed.content;
                fileName = processed.filename;
            } else {
                luaCode = code;
            }
        } catch (error) {
            return interaction.reply({ embeds: [createErrorEmbed(error.message)], ephemeral: true });
        }

        // Validate
        const validation = fileHandler.validateLuaContent(luaCode);
        if (!validation.valid) {
            return interaction.reply({ embeds: [createErrorEmbed(validation.errors.join('\n'))], ephemeral: true });
        }

        // Create session
        const session = {
            id: Date.now().toString(36),
            userId: interaction.user.id,
            code: luaCode,
            fileName: fileName,
            target: targetOption || 'roblox',
            features: presetOption ? { ...PRESETS[presetOption].features } : getDefaultFeatures(),
            collector: null
        };

        applyTargetRestrictions(session);

        // Direct obfuscate or show menu
        if (presetOption && targetOption) {
            await interaction.deferReply();
            await performObfuscation(interaction, session);
        } else {
            await showFeatureMenu(interaction, session);
        }
    }
};

// ═══════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════

function cleanupSession(userId) {
    const session = activeSessions.get(userId);
    if (session) {
        if (session.collector) {
            try { session.collector.stop('cleanup'); } catch (e) {}
        }
        activeSessions.delete(userId);
    }
}

function getDefaultFeatures() {
    const features = {};
    for (const [key, val] of Object.entries(FEATURES)) {
        features[key] = val.default;
    }
    return features;
}

function applyTargetRestrictions(session) {
    for (const [key, feature] of Object.entries(FEATURES)) {
        if (!feature[session.target]) {
            session.features[key] = false;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// EMBEDS
// ═══════════════════════════════════════════════════════════

function createErrorEmbed(msg) {
    return new EmbedBuilder().setColor(0xFF0000).setTitle('❌ Error').setDescription(msg).setTimestamp();
}

function createInputHelpEmbed() {
    return new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('📝 How to Use')
        .setDescription('Upload a `.lua` file or paste code directly.')
        .addFields(
            { name: '📁 File Upload', value: '`/obfuscate file: [upload]`', inline: true },
            { name: '📋 Paste Code', value: '`/obfuscate code: print("hi")`', inline: true }
        );
}

function createMainEmbed(session) {
    const enabled = Object.entries(session.features)
        .filter(([k, v]) => v && FEATURES[k])
        .map(([k]) => `${FEATURES[k].emoji} ${FEATURES[k].name}`)
        .join('\n') || '*None*';

    const preview = session.code.length > 100 ? session.code.slice(0, 100).replace(/`/g, "'") + '...' : session.code.replace(/`/g, "'");

    return new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('🛡️ LuaShield')
        .addFields(
            { name: '📄 Preview', value: `\`\`\`lua\n${preview}\n\`\`\``, inline: false },
            { name: '📊 Size', value: formatBytes(session.code.length), inline: true },
            { name: '🎯 Target', value: TARGETS[session.target].name, inline: true },
            { name: '✅ Features', value: enabled, inline: false }
        )
        .setFooter({ text: `Session: ${session.id}` });
}

function createProcessingEmbed() {
    return new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('⏳ Processing...')
        .setDescription('Obfuscating your code. This may take a moment...')
        .setTimestamp();
}

function createSuccessEmbed(stats, target) {
    return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Complete!')
        .addFields(
            { name: '📥 Input', value: formatBytes(stats.inputSize), inline: true },
            { name: '📤 Output', value: formatBytes(stats.outputSize), inline: true },
            { name: '📈 Ratio', value: `${stats.ratio}x`, inline: true },
            { name: '⏱️ Time', value: `${stats.processingTime}ms`, inline: true },
            { name: '🎯 Target', value: target, inline: true }
        )
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

function createTargetSelect(current) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder('🎯 Target')
            .addOptions(Object.values(TARGETS).map(t => ({
                label: t.name, value: t.id, emoji: t.emoji, default: t.id === current
            })))
    );
}

function createFeatureSelect(features, target) {
    const available = Object.entries(FEATURES).filter(([_, f]) => f[target]);
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_features')
            .setPlaceholder('⚙️ Features')
            .setMinValues(0)
            .setMaxValues(available.length)
            .addOptions(available.map(([k, f]) => ({
                label: f.name, value: k, emoji: f.emoji, default: features[k]
            })))
    );
}

function createPresetButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('preset_light').setLabel('💡').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('preset_medium').setLabel('⚡').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('preset_heavy').setLabel('🔥').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('preset_maximum').setLabel('💀').setStyle(ButtonStyle.Danger)
    );
}

function createActionButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_obfuscate').setLabel('🔒 Obfuscate').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_cancel').setLabel('🚫 Cancel').setStyle(ButtonStyle.Secondary)
    );
}

// ═══════════════════════════════════════════════════════════
// FEATURE MENU
// ═══════════════════════════════════════════════════════════

async function showFeatureMenu(interaction, session) {
    await interaction.reply({
        embeds: [createMainEmbed(session)],
        components: [
            createTargetSelect(session.target),
            createFeatureSelect(session.features, session.target),
            createPresetButtons(),
            createActionButtons()
        ]
    });

    const response = await interaction.fetchReply();
    
    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === session.userId,
        time: 180000 // 3 minutes
    });

    session.collector = collector;
    activeSessions.set(session.userId, session);

    collector.on('collect', async (i) => {
        try {
            if (i.customId === 'select_target') {
                await i.deferUpdate();
                session.target = i.values[0];
                applyTargetRestrictions(session);
                await updateMenu(interaction, session);
            }
            else if (i.customId === 'select_features') {
                await i.deferUpdate();
                Object.keys(session.features).forEach(k => session.features[k] = false);
                i.values.forEach(k => { if (FEATURES[k]?.[session.target]) session.features[k] = true; });
                await updateMenu(interaction, session);
            }
            else if (i.customId.startsWith('preset_')) {
                await i.deferUpdate();
                const preset = i.customId.replace('preset_', '');
                if (PRESETS[preset]) {
                    session.features = { ...PRESETS[preset].features };
                    applyTargetRestrictions(session);
                }
                await updateMenu(interaction, session);
            }
            else if (i.customId === 'btn_cancel') {
                collector.stop('cancelled');
                cleanupSession(session.userId);
                await i.update({
                    embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('🚫 Cancelled')],
                    components: []
                });
            }
            else if (i.customId === 'btn_obfuscate') {
                collector.stop('obfuscating');
                cleanupSession(session.userId);
                await i.update({ embeds: [createProcessingEmbed()], components: [] });
                await performObfuscation(interaction, session);
            }
        } catch (error) {
            logger.error('Menu error:', error);
            cleanupSession(session.userId);
        }
    });

    collector.on('end', (_, reason) => {
        cleanupSession(session.userId);
        if (reason === 'time') {
            interaction.editReply({
                embeds: [new EmbedBuilder().setColor(0xFF9900).setTitle('⏰ Timeout')],
                components: []
            }).catch(() => {});
        }
    });
}

async function updateMenu(interaction, session) {
    await interaction.editReply({
        embeds: [createMainEmbed(session)],
        components: [
            createTargetSelect(session.target),
            createFeatureSelect(session.features, session.target),
            createPresetButtons(),
            createActionButtons()
        ]
    });
}

// ═══════════════════════════════════════════════════════════
// OBFUSCATION WITH TIMEOUT - CRITICAL FIX
// ═══════════════════════════════════════════════════════════

async function performObfuscation(interaction, session) {
    try {
        // ✅ FIX: Wrap obfuscation in Promise with timeout
        const result = await Promise.race([
            // Actual obfuscation
            (async () => {
                // ✅ FIX: Use setImmediate to not block event loop
                await new Promise(resolve => setImmediate(resolve));
                
                return await Obfuscator.obfuscate(session.code, {
                    target: session.target,
                    features: session.features,
                    seed: Date.now(),
                    luraphStyle: true
                });
            })(),
            
            // Timeout
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Obfuscation timeout (60s)')), OBFUSCATION_TIMEOUT)
            )
        ]);

        if (!result.success) {
            throw new Error(result.error || 'Failed');
        }

        // Create attachment
        const outputName = session.fileName.replace(/\.(lua|txt|luau)$/i, '_protected.lua');
        const attachment = new AttachmentBuilder(
            Buffer.from(result.code, 'utf-8'),
            { name: outputName }
        );

        await interaction.editReply({
            embeds: [createSuccessEmbed(result.stats, TARGETS[session.target].name)],
            files: [attachment],
            components: []
        });

        logger.obfuscate(`Success: ${formatBytes(result.stats.inputSize)} → ${formatBytes(result.stats.outputSize)}`);

    } catch (error) {
        logger.error('Obfuscation error:', error);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Failed')
                    .setDescription(`\`\`\`${error.message}\`\`\``)
                    .addFields({
                        name: '💡 Try',
                        value: '• Use "Light" preset\n• Reduce file size\n• Check Lua syntax'
                    })
            ],
            components: []
        }).catch(() => {});
    }
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
                }
