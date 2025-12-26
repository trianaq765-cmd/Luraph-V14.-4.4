/**
 * LuaShield - Help Command
 */

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Show help and usage guide'),

    cooldown: 5,

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x00D4FF)
            .setTitle('📚 LuaShield Help')
            .setDescription('Professional Lua Obfuscator with Luraph-style protection.\nSupport Roblox Executors & Loadstring.')
            .addFields(
                {
                    name: '🔒 /obfuscate',
                    value: [
                        'Obfuscate your Lua code with customizable features.',
                        '',
                        '**Options:**',
                        '• `file` - Upload a .lua file',
                        '• `code` - Paste code directly',
                        '',
                        '**Usage:**',
                        '1. Use `/obfuscate` with file or code',
                        '2. Select target platform',
                        '3. Toggle features you want',
                        '4. Click "Obfuscate Now"',
                        '5. Download your protected script!'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚙️ /settings',
                    value: 'Configure your default obfuscation settings.',
                    inline: true
                },
                {
                    name: 'ℹ️ /info',
                    value: 'Show bot information and stats.',
                    inline: true
                },
                {
                    name: '🎯 Target Platforms',
                    value: [
                        '**🎮 Roblox Executors**',
                        '   Synapse X, Script-Ware, Krnl, Fluxus, etc',
                        '',
                        '**📜 Loadstring**',
                        '   Compatible with loadstring() environments',
                        '',
                        '**💻 Standard Lua**',
                        '   Lua 5.1 / 5.2 / 5.3 / LuaJIT'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '✨ Available Features',
                    value: [
                        '🔀 **VM Obfuscation** - Convert to VM bytecode',
                        '🔐 **String Encryption** - Encrypt all strings',
                        '🌀 **Control Flow** - Flatten control flow',
                        '🗑️ **Junk Code** - Inject dead code',
                        '📝 **Variable Renaming** - Luraph-style names',
                        '🔢 **Constant Encryption** - Obfuscate numbers',
                        '✅ **Integrity Check** - Anti-tamper',
                        '🛡️ **Environment Check** - Anti-debug',
                        '💧 **Watermark** - Custom watermark',
                        '📦 **Minify** - Compress output'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚡ Quick Presets',
                    value: [
                        '💡 **Light** - Basic protection, fast',
                        '⚡ **Medium** - Balanced protection',
                        '🔥 **Heavy** - Strong protection',
                        '💀 **Maximum** - Maximum security'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'LuaShield Obfuscator • Professional Lua Protection' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('📖 Documentation')
                .setStyle(ButtonStyle.Link)
                .setURL('https://github.com/yourusername/luashield-bot'),
            new ButtonBuilder()
                .setLabel('💬 Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/yourinvite')
        );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};
