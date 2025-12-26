/**
 * LuaShield - Logger Utility
 * Untuk debugging dan monitoring
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.name = options.name || 'LuaShield';
        this.debug = options.debug || process.env.NODE_ENV !== 'production';
        this.logFile = options.logFile || null;
        this.webhookUrl = options.webhookUrl || process.env.LOG_WEBHOOK_URL;
        
        this.colors = {
            reset: '\x1b[0m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            gray: '\x1b[90m'
        };

        this.icons = {
            info: 'ℹ️',
            success: '✅',
            warn: '⚠️',
            error: '❌',
            debug: '🔧',
            bot: '🤖',
            obfuscate: '🔒',
            time: '⏱️'
        };
    }

    _timestamp() {
        return new Date().toISOString().replace('T', ' ').split('.')[0];
    }

    _format(level, message, ...args) {
        const timestamp = this._timestamp();
        const formattedArgs = args.length > 0 ? ' ' + args.map(a => 
            typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' ') : '';
        
        return `[${timestamp}] [${this.name}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
    }

    _log(level, color, icon, message, ...args) {
        const formatted = this._format(level, message, ...args);
        console.log(`${color}${icon} ${formatted}${this.colors.reset}`);
        
        if (this.logFile) {
            this._writeToFile(formatted);
        }
    }

    _writeToFile(message) {
        try {
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (err) {
            console.error('Failed to write log:', err);
        }
    }

    info(message, ...args) {
        this._log('info', this.colors.blue, this.icons.info, message, ...args);
    }

    success(message, ...args) {
        this._log('success', this.colors.green, this.icons.success, message, ...args);
    }

    warn(message, ...args) {
        this._log('warn', this.colors.yellow, this.icons.warn, message, ...args);
    }

    error(message, ...args) {
        this._log('error', this.colors.red, this.icons.error, message, ...args);
    }

    debugLog(message, ...args) {
        if (this.debug) {
            this._log('debug', this.colors.gray, this.icons.debug, message, ...args);
        }
    }

    bot(message, ...args) {
        this._log('bot', this.colors.cyan, this.icons.bot, message, ...args);
    }

    obfuscate(message, ...args) {
        this._log('obfuscate', this.colors.magenta, this.icons.obfuscate, message, ...args);
    }

    time(label) {
        console.time(`${this.icons.time} ${label}`);
        return () => console.timeEnd(`${this.icons.time} ${label}`);
    }

    /**
     * Send to Discord Webhook (untuk monitoring)
     */
    async sendWebhook(content, isError = false) {
        const url = isError ? process.env.ERROR_WEBHOOK_URL : this.webhookUrl;
        if (!url) return;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: isError ? '❌ Error' : 'ℹ️ Log',
                        description: content.substring(0, 4000),
                        color: isError ? 0xFF0000 : 0x00FF00,
                        timestamp: new Date().toISOString()
                    }]
                })
            });
        } catch (err) {
            console.error('Webhook failed:', err);
        }
    }

    /**
     * Log obfuscation stats
     */
    logObfuscation(stats) {
        console.log('');
        console.log(`${this.colors.cyan}╔══════════════════════════════════════════════╗${this.colors.reset}`);
        console.log(`${this.colors.cyan}║${this.colors.reset}     ${this.icons.obfuscate} OBFUSCATION COMPLETE                  ${this.colors.cyan}║${this.colors.reset}`);
        console.log(`${this.colors.cyan}╠══════════════════════════════════════════════╣${this.colors.reset}`);
        console.log(`${this.colors.cyan}║${this.colors.reset}  Input Size:    ${String(stats.inputSize).padEnd(10)} bytes        ${this.colors.cyan}║${this.colors.reset}`);
        console.log(`${this.colors.cyan}║${this.colors.reset}  Output Size:   ${String(stats.outputSize).padEnd(10)} bytes        ${this.colors.cyan}║${this.colors.reset}`);
        console.log(`${this.colors.cyan}║${this.colors.reset}  Time:          ${String(stats.time + 'ms').padEnd(10)}             ${this.colors.cyan}║${this.colors.reset}`);
        console.log(`${this.colors.cyan}║${this.colors.reset}  Features:      ${String(stats.features).padEnd(10)}             ${this.colors.cyan}║${this.colors.reset}`);
        console.log(`${this.colors.cyan}╚══════════════════════════════════════════════╝${this.colors.reset}`);
        console.log('');
    }
}

// Singleton instance
const logger = new Logger();

module.exports = { Logger, logger };
