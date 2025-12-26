/**
 * Keep Alive Server for Render Free Tier
 * Prevents bot from sleeping
 */

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        bot: 'LuaShield Obfuscator',
        version: process.env.BOT_VERSION || '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>LuaShield Bot</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, sans-serif;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }
                h1 { color: #00d4ff; margin-bottom: 10px; }
                .status { 
                    display: inline-block;
                    padding: 8px 20px;
                    background: #00c853;
                    border-radius: 20px;
                    margin: 20px 0;
                }
                .info { color: #888; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛡️ LuaShield Obfuscator</h1>
                <p>Professional Lua Obfuscator Bot</p>
                <div class="status">✅ Bot is Online</div>
                <p class="info">Uptime: ${Math.floor(process.uptime())}s</p>
            </div>
        </body>
        </html>
    `);
});

// Stats endpoint
app.get('/stats', (req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.BOT_VERSION || '1.0.0'
    });
});

function startServer() {
    app.listen(PORT, () => {
        console.log(`[Keep-Alive] Server running on port ${PORT}`);
    });
}

module.exports = { startServer, app };
