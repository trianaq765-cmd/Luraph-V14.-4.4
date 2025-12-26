/**
 * LuaShield - Guild Join Event
 */

const { Events } = require('discord.js');
const { logger } = require('../../utils/logger');

module.exports = {
    name: Events.GuildCreate,
    once: false,
    
    execute(guild) {
        logger.bot(`Joined new guild: ${guild.name} (${guild.memberCount} members)`);
        
        // Optional: Send welcome message to first available channel
        const channel = guild.channels.cache.find(
            ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages')
        );

        if (channel) {
            channel.send({
                embeds: [{
                    title: '🛡️ LuaShield Obfuscator',
                    description: 'Thanks for adding me! I can protect your Lua scripts with professional-grade obfuscation.',
                    color: 0x00D4FF,
                    fields: [
                        {
                            name: '🚀 Quick Start',
                            value: 'Use `/obfuscate` to protect your Lua code\nUse `/help` for more information'
                        },
                        {
                            name: '✨ Features',
                            value: '• VM Obfuscation\n• String Encryption\n• Control Flow\n• And more!'
                        }
                    ],
                    footer: { text: 'Luraph-style protection • Support Roblox & Loadstring' }
                }]
            }).catch(() => {});
        }
    }
};
