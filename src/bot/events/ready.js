/**
 * LuaShield - Ready Event
 */

const { Events, ActivityType } = require('discord.js');
const { logger } = require('../../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    
    execute(client) {
        logger.success(`Logged in as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} guilds`);
        logger.info(`Commands loaded: ${client.commands.size}`);

        // Set bot status
        client.user.setActivity('/obfuscate | LuaShield', {
            type: ActivityType.Playing
        });

        // Log guild list
        console.log('');
        console.log('📋 Connected Guilds:');
        client.guilds.cache.forEach(guild => {
            console.log(`   • ${guild.name} (${guild.memberCount} members)`);
        });
        console.log('');
        
        logger.success('Bot is ready!');
    }
};
