/**
 * LuaShield - Info Command
 */

const {
    SlashCommandBuilder,
    EmbedBuilder,
    version: djsVersion
} = require('discord.js');

const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('ℹ️ Show bot information and statistics'),

    cooldown: 10,

    async execute(interaction, client) {
        const uptime = formatUptime(client.uptime);
        const memUsage = process.memoryUsage();
        const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
        const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024);

        const embed = new EmbedBuilder()
            .setColor(0x00D4FF)
            .setTitle('ℹ️ LuaShield Bot Information')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '🤖 Bot Info',
                    value: [
                        `**Name:** ${client.user.tag}`,
                        `**ID:** ${client.user.id}`,
                        `**Version:** ${process.env.BOT_VERSION || '1.0.0'}`,
                        `**Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📊 Statistics',
                    value: [
                        `**Servers:** ${client.guilds.cache.size}`,
                        `**Users:** ${client.users.cache.size}`,
                        `**Channels:** ${client.channels.cache.size}`,
                        `**Commands:** ${client.commands.size}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⚙️ System',
                    value: [
                        `**Uptime:** ${uptime}`,
                        `**Memory:** ${memUsed}MB / ${memTotal}MB`,
                        `**Node.js:** ${process.version}`,
                        `**Discord.js:** v${djsVersion}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🖥️ Host',
                    value: [
                        `**OS:** ${os.type()} ${os.release()}`,
                        `**Platform:** ${os.platform()}`,
                        `**CPU:** ${os.cpus()[0]?.model || 'Unknown'}`,
                        `**Cores:** ${os.cpus().length}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔒 Obfuscator Features',
                    value: [
                        '✅ VM Obfuscation',
                        '✅ String Encryption',
                        '✅ Control Flow Flattening',
                        '✅ Junk Code Injection',
                        '✅ Variable Renaming (Luraph-style)',
                        '✅ Constant Encryption',
                        '✅ Integrity Checking',
                        '✅ Environment Detection',
                        '✅ Custom Watermarks',
                        '✅ Code Minification'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎯 Supported Platforms',
                    value: [
                        '🎮 Roblox Executors (Synapse, ScriptWare, Krnl, etc)',
                        '📜 Loadstring environments',
                        '💻 Standard Lua 5.1+'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'LuaShield • Professional Lua Protection' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ') || '0s';
}
