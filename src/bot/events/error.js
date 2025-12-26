/**
 * LuaShield - Error Event Handler
 */

const { Events } = require('discord.js');
const { logger } = require('../../utils/logger');

module.exports = {
    name: Events.Error,
    once: false,
    
    execute(error) {
        logger.error('Discord client error:', error.message);
        console.error(error);
        
        // Send to error webhook if configured
        if (process.env.ERROR_WEBHOOK_URL) {
            logger.sendWebhook(`**Error:** ${error.message}\n\`\`\`${error.stack}\`\`\``, true);
        }
    }
};
