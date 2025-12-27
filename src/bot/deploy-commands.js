/**
 * LuaShield - Deploy Slash Commands
 */

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Validate environment
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN not found in environment!');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('❌ CLIENT_ID not found in environment!');
    process.exit(1);
}

console.log('🚀 Starting command deployment...');
console.log(`📋 Client ID: ${process.env.CLIENT_ID}`);
console.log(`🏠 Guild ID: ${process.env.GUILD_ID || 'Not set (global deploy)'}`);

// Load commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
    console.error('❌ Commands directory not found:', commandsPath);
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`📂 Found ${commandFiles.length} command files`);

for (const file of commandFiles) {
    try {
        const command = require(path.join(commandsPath, file));
        if ('data' in command) {
            commands.push(command.data.toJSON());
            console.log(`  ✅ Loaded: /${command.data.name}`);
        } else {
            console.log(`  ⚠️ Skipped: ${file} (no data property)`);
        }
    } catch (error) {
        console.error(`  ❌ Error loading ${file}:`, error.message);
    }
}

if (commands.length === 0) {
    console.error('❌ No commands to deploy!');
    process.exit(1);
}

// Deploy
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`\n📤 Deploying ${commands.length} commands...`);

        let data;

        if (process.env.GUILD_ID) {
            // Guild commands (instant)
            console.log('📍 Deploying to guild (instant)...');
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ Deployed ${data.length} commands to guild!`);
        } else {
            // Global commands (up to 1 hour)
            console.log('🌐 Deploying globally (may take up to 1 hour)...');
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ Deployed ${data.length} commands globally!`);
        }

        console.log('\n╔════════════════════════════════════════╗');
        console.log('║     ✅ Commands Deployed Successfully   ║');
        console.log('╠════════════════════════════════════════╣');
        commands.forEach(cmd => {
            console.log(`║  /${cmd.name.padEnd(35)}║`);
        });
        console.log('╚════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('❌ Failed to deploy commands:', error);
        
        if (error.code === 50001) {
            console.error('💡 Bot missing access. Re-invite with applications.commands scope.');
        } else if (error.code === 10002) {
            console.error('💡 Invalid CLIENT_ID. Check your environment variables.');
        } else if (error.status === 401) {
            console.error('💡 Invalid token. Check DISCORD_TOKEN.');
        }
        
        process.exit(1);
    }
})();
