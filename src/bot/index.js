/**
 * LuaShield Obfuscator - Discord Bot Entry Point
 * FIXED VERSION - Proper error handling
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// ✅ FIX: Safe import for keep-alive
let startServer;
try {
    const keepAlive = require('./keep-alive');
    startServer = keepAlive.startServer;
} catch (e) {
    startServer = () => console.log('Keep-alive not available');
}

// ═══════════════════════════════════════════════════════════
// BOT INITIALIZATION
// ═══════════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// ═══════════════════════════════════════════════════════════
// LOAD COMMANDS
// ═══════════════════════════════════════════════════════════
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            // ✅ FIX: Clear cache before requiring
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                logger.info(`Loaded command: /${command.data.name}`);
            } else {
                logger.warn(`Command ${file} missing required properties`);
            }
        } catch (error) {
            logger.error(`Failed to load command ${file}:`, error.message);
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
        try {
            const filePath = path.join(eventsPath, file);
            delete require.cache[require.resolve(filePath)];
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            
            logger.info(`Loaded event: ${event.name}`);
        } catch (error) {
            logger.error(`Failed to load event ${file}:`, error.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// INTERACTION HANDLER - FIXED
// ═══════════════════════════════════════════════════════════
client.on(Events.InteractionCreate, async (interaction) => {
    // ✅ FIX: Only handle chat input commands here
    // Button and select menu are handled by collectors in commands
    if (!interaction.isChatInputCommand()) return;

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
            }).catch(() => {});
        }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Execute command with proper error handling
    try {
        logger.bot(`Command: /${command.data.name} by ${interaction.user.tag}`);
        await command.execute(interaction, client);
    } catch (error) {
        logger.error(`Command error: ${error.message}`);
        console.error(error);
        
        // ✅ FIX: Proper error response
        const errorMessage = {
            content: '❌ An error occurred while executing this command.',
            ephemeral: true
        };

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (e) {
            // Interaction may have expired, ignore
            logger.error('Failed to send error message:', e.message);
        }
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
    // ✅ FIX: Don't exit on uncaught exception, just log
    // process.exit(1);
});

// ═══════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════
async function start() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║     🛡️  LuaShield Obfuscator Bot                     ║');
    console.log('║         Professional Lua Protection                  ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  Version: ' + (process.env.BOT_VERSION || '1.0.0').padEnd(41) + '║');
    console.log('║  Node.js: ' + process.version.padEnd(41) + '║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    // Start keep-alive server
    if (startServer) startServer();

    // Login to Discord
    try {
        await client.login(process.env.DISCORD_TOKEN);
        logger.success('Bot logged in successfully!');
    } catch (error) {
        logger.error('Failed to login:', error.message);
        process.exit(1);
    }

    // ✅ FIX: Safe cleanup interval
    setInterval(() => {
        try {
            const fileHandler = require('../utils/fileHandler');
            if (fileHandler && fileHandler.cleanTempFiles) {
                const cleaned = fileHandler.cleanTempFiles();
                if (cleaned > 0) {
                    logger.info(`Cleaned ${cleaned} temp files`);
                }
            }
        } catch (e) { /* ignore */ }
    }, 3600000);
}

start();

module.exports = client;
