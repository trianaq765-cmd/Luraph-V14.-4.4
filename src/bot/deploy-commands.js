/**
 * LuaShield - Deploy Slash Commands to Discord
 * Run: npm run deploy
 */

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

// ═══════════════════════════════════════════════════════════
// LOAD COMMANDS
// ═══════════════════════════════════════════════════════════
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
    logger.error('Commands directory not found!');
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command) {
        commands.push(command.data.toJSON());
        logger.info(`Prepared command: /${command.data.name}`);
    }
}

// ═══════════════════════════════════════════════════════════
// DEPLOY
// ═══════════════════════════════════════════════════════════
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        logger.info(`Deploying ${commands.length} commands...`);

        let data;

        // Deploy to specific guild (for testing) or globally
        if (process.env.GUILD_ID) {
            // Guild-specific (instant)
            data = await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID, 
                    process.env.GUILD_ID
                ),
                { body: commands }
            );
            logger.success(`Deployed ${data.length} commands to guild ${process.env.GUILD_ID}`);
        } else {
            // Global (takes up to 1 hour)
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            logger.success(`Deployed ${data.length} commands globally`);
        }

        console.log('');
        console.log('╔════════════════════════════════════════╗');
        console.log('║     ✅ Commands Deployed Successfully   ║');
        console.log('╠════════════════════════════════════════╣');
        commands.forEach(cmd => {
            console.log(`║  /${cmd.name.padEnd(35)}║`);
        });
        console.log('╚════════════════════════════════════════╝');
        console.log('');

    } catch (error) {
        logger.error('Failed to deploy commands:', error);
        process.exit(1);
    }
})();
