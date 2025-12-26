/**
 * LuaShield - Settings Command
 * Configure default obfuscation settings per user
 */

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

// In-memory storage (bisa diganti dengan database)
const userSettings = new Map();

const DEFAULT_SETTINGS = {
    target: 'roblox',
    preset: 'medium',
    autoMinify: true,
    autoWatermark: true
};

const TARGETS = [
    { value: 'roblox', label: 'Roblox Executors', emoji: '🎮' },
    { value: 'loadstring', label: 'Loadstring', emoji: '📜' },
    { value: 'standard', label: 'Standard Lua', emoji: '💻' }
];

const PRESETS = [
    { value: 'light', label: 'Light', emoji: '💡', description: 'Basic protection' },
    { value: 'medium', label: 'Medium', emoji: '⚡', description: 'Balanced protection' },
    { value: 'heavy', label: 'Heavy', emoji: '🔥', description: 'Strong protection' },
    { value: 'maximum', label: 'Maximum', emoji: '💀', description: 'Maximum security' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('⚙️ Configure your default obfuscation settings')
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View your current settings')
        )
        .addSubcommand(sub =>
            sub
                .setName('edit')
                .setDescription('Edit your settings')
        )
        .addSubcommand(sub =>
            sub
                .setName('reset')
                .setDescription('Reset settings to default')
        ),

    cooldown: 5,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // Get or create user settings
        if (!userSettings.has(userId)) {
            userSettings.set(userId, { ...DEFAULT_SETTINGS });
        }

        const settings = userSettings.get(userId);

        switch (subcommand) {
            case 'view':
                await showSettings(interaction, settings);
                break;
            case 'edit':
                await editSettings(interaction, settings, userId);
                break;
            case 'reset':
                userSettings.set(userId, { ...DEFAULT_SETTINGS });
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle('✅ Settings Reset')
                            .setDescription('Your settings have been reset to default.')
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
                break;
        }
    }
};

async function showSettings(interaction, settings) {
    const target = TARGETS.find(t => t.value === settings.target);
    const preset = PRESETS.find(p => p.value === settings.preset);

    const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('⚙️ Your Settings')
        .addFields(
            {
                name: '🎯 Default Target',
                value: `${target.emoji} ${target.label}`,
                inline: true
            },
            {
                name: '⚡ Default Preset',
                value: `${preset.emoji} ${preset.label}`,
                inline: true
            },
            {
                name: '📦 Auto Minify',
                value: settings.autoMinify ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: '💧 Auto Watermark',
                value: settings.autoWatermark ? '✅ Enabled' : '❌ Disabled',
                inline: true
            }
        )
        .setFooter({ text: 'Use /settings edit to change these settings' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function editSettings(interaction, settings, userId) {
    const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('⚙️ Edit Settings')
        .setDescription('Use the menus below to change your default settings.')
        .setTimestamp();

    const targetRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('settings_target')
            .setPlaceholder('🎯 Select Default Target')
            .addOptions(
                TARGETS.map(t => ({
                    label: t.label,
                    value: t.value,
                    emoji: t.emoji,
                    default: t.value === settings.target
                }))
            )
    );

    const presetRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('settings_preset')
            .setPlaceholder('⚡ Select Default Preset')
            .addOptions(
                PRESETS.map(p => ({
                    label: p.label,
                    value: p.value,
                    emoji: p.emoji,
                    description: p.description,
                    default: p.value === settings.preset
                }))
            )
    );

    const toggleRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle_minify')
            .setLabel(settings.autoMinify ? '📦 Minify: ON' : '📦 Minify: OFF')
            .setStyle(settings.autoMinify ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('toggle_watermark')
            .setLabel(settings.autoWatermark ? '💧 Watermark: ON' : '💧 Watermark: OFF')
            .setStyle(settings.autoWatermark ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('settings_save')
            .setLabel('✅ Save')
            .setStyle(ButtonStyle.Primary)
    );

    const response = await interaction.reply({
        embeds: [embed],
        components: [targetRow, presetRow, toggleRow],
        ephemeral: true,
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 120000
    });

    collector.on('collect', async (i) => {
        if (i.customId === 'settings_target') {
            settings.target = i.values[0];
        } else if (i.customId === 'settings_preset') {
            settings.preset = i.values[0];
        } else if (i.customId === 'toggle_minify') {
            settings.autoMinify = !settings.autoMinify;
        } else if (i.customId === 'toggle_watermark') {
            settings.autoWatermark = !settings.autoWatermark;
        } else if (i.customId === 'settings_save') {
            userSettings.set(userId, settings);
            collector.stop('saved');
            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ Settings Saved')
                        .setDescription('Your settings have been saved successfully.')
                        .setTimestamp()
                ],
                components: []
            });
            return;
        }

        // Update buttons
        const newToggleRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('toggle_minify')
                .setLabel(settings.autoMinify ? '📦 Minify: ON' : '📦 Minify: OFF')
                .setStyle(settings.autoMinify ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('toggle_watermark')
                .setLabel(settings.autoWatermark ? '💧 Watermark: ON' : '💧 Watermark: OFF')
                .setStyle(settings.autoWatermark ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('settings_save')
                .setLabel('✅ Save')
                .setStyle(ButtonStyle.Primary)
        );

        await i.update({
            components: [targetRow, presetRow, newToggleRow]
        });
    });

    collector.on('end', (_, reason) => {
        if (reason !== 'saved') {
            interaction.editReply({
                components: []
            }).catch(() => {});
        }
    });
}

// Export untuk digunakan oleh obfuscate command
module.exports.getUserSettings = (userId) => {
    return userSettings.get(userId) || { ...DEFAULT_SETTINGS };
};
