/**
 * LuaShield Obfuscator - Discord Bot Entry Point
 * Terintegrasi dengan GitHub + Render
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { startServer } = require('./keep-alive');
const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// BOT INITIALIZATION
// ═══════════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Collections untuk commands
client.commands = new Collection();
client.cooldowns = new Collection();

// ═══════════════════════════════════════════════════════════
// LOAD COMMANDS
// ═══════════════════════════════════════════════════════════
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.info(`Loaded command: /${command.data.name}`);
        } else {
            logger.warn(`Command ${file} missing required properties`);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// LOAD EVENTS
// ═══════════════════════════════════════════════════════════
const eventsPath = path.join(__dirname, 'events');

if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        
        logger.info(`Loaded event: ${event.name}`);
    }
}

// ═══════════════════════════════════════════════════════════
// INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════
client.on(Events.InteractionCreate, async (interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

        // Cooldown check
        const { cooldowns } = client;
        
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return interaction.reply({
                    content: `⏳ Please wait ${timeLeft.toFixed(1)}s before using \`/${command.data.name}\` again.`,
                    ephemeral: true
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        // Execute command
        try {
            logger.bot(`Command: /${command.data.name} by ${interaction.user.tag}`);
            await command.execute(interaction, client);
        } catch (error) {
            logger.error(`Command error: ${error.message}`);
            console.error(error);
            
            const errorMessage = {
                content: '❌ An error occurred while executing this command.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
        // Will be handled by individual command collectors
    }
    
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
        // Will be handled by individual command collectors
    }
});

// ═══════════════════════════════════════════════════════════
// ERROR HANDLERS
// ═══════════════════════════════════════════════════════════
client.on(Events.Error, (error) => {
    logger.error('Client error:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// ═══════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════
async function start() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║                                                      ║');
    console.log('║     🛡️  LuaShield Obfuscator Bot                     ║');
    console.log('║         Professional Lua Protection                  ║');
    console.log('║                                                      ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  Version: ' + (process.env.BOT_VERSION || '1.0.0').padEnd(41) + '║');
    console.log('║  Node.js: ' + process.version.padEnd(41) + '║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    // Start keep-alive server for Render
    startServer();

    // Login to Discord
    try {
        await client.login(process.env.DISCORD_TOKEN);
        logger.success('Bot logged in successfully!');
    } catch (error) {
        logger.error('Failed to login:', error.message);
        process.exit(1);
    }

    // Clean temp files periodically
    setInterval(() => {
        const fileHandler = require('../utils/fileHandler');
        const cleaned = fileHandler.cleanTempFiles();
        if (cleaned > 0) {
            logger.info(`Cleaned ${cleaned} temp files`);
        }
    }, 3600000); // Every hour
}

start();

module.exports = client;
