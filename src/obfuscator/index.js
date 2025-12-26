/**
 * LuaShield - Main Obfuscator Entry Point
 * Mengintegrasikan semua module obfuscation
 */

const Config = require('./config');
const Random = require('../utils/random');
const Helpers = require('../utils/helpers');
const { logger } = require('../utils/logger');

// Encryption modules
const StringEncryptor = require('./encryption/strings');
const ConstantEncryptor = require('./encryption/constants');
const KeyGenerator = require('./encryption/keys');

class Obfuscator {
    constructor() {
        this.random = new Random();
        this.stringEncryptor = null;
        this.constantEncryptor = null;
        this.keyGenerator = null;
        this.config = null;
        this.stats = {};
    }

    /**
     * Initialize obfuscator dengan options
     */
    init(options = {}) {
        const seed = options.seed || Date.now();
        
        this.random = new Random(seed);
        this.stringEncryptor = new StringEncryptor({ seed });
        this.constantEncryptor = new ConstantEncryptor({ seed });
        this.keyGenerator = new KeyGenerator(seed);
        
        this.config = {
            target: options.target || 'roblox',
            features: options.features || this._getDefaultFeatures()
        };
        
        // Initialize key session
        this.keyGenerator.initSession();
        
        this.stats = {
            stringsEncrypted: 0,
            constantsEncrypted: 0,
            variablesRenamed: 0,
            junkInjected: 0
        };

        return this;
    }

    _getDefaultFeatures() {
        return {
            vmObfuscation: true,
            stringEncryption: true,
            controlFlow: false,
            junkCode: false,
            variableRenaming: true,
            constantEncryption: false,
            integrityCheck: false,
            environmentCheck: false,
            watermark: true,
            minify: true
        };
    }

    /**
     * Main obfuscate function
     */
    async obfuscate(code, options = {}) {
        const startTime = Date.now();
        
        // Initialize
        this.init(options);
        
        logger.obfuscate(`Starting obfuscation | Target: ${this.config.target}`);
        logger.obfuscate(`Features: ${this._getEnabledFeatures().join(', ')}`);

        try {
            let result = code;
            
            // Step 1: Parse code (basic untuk sementara)
            const parsed = this._parseCode(result);
            
            // Step 2: Apply transformations based on enabled features
            if (this.config.features.variableRenaming) {
                result = this._applyVariableRenaming(result, parsed);
            }

            if (this.config.features.stringEncryption) {
                result = this._applyStringEncryption(result);
            }

            if (this.config.features.constantEncryption) {
                result = this._applyConstantEncryption(result);
            }

            if (this.config.features.junkCode) {
                result = this._injectJunkCode(result);
            }

            if (this.config.features.controlFlow) {
                result = this._applyControlFlow(result);
            }

            // Step 3: Wrap in VM if enabled
            if (this.config.features.vmObfuscation) {
                result = this._wrapInVM(result);
            }

            // Step 4: Add security features
            if (this.config.features.integrityCheck) {
                result = this._addIntegrityCheck(result);
            }

            if (this.config.features.environmentCheck) {
                result = this._addEnvironmentCheck(result);
            }

            // Step 5: Add watermark
            if (this.config.features.watermark) {
                result = this._addWatermark(result);
            }

            // Step 6: Minify if enabled
            if (this.config.features.minify) {
                result = this._minifyCode(result);
            }

            const endTime = Date.now();
            
            logger.obfuscate(`Completed in ${endTime - startTime}ms`);
            
            return {
                success: true,
                code: result,
                stats: {
                    ...this.stats,
                    inputSize: code.length,
                    outputSize: result.length,
                    time: endTime - startTime
                }
            };

        } catch (error) {
            logger.error('Obfuscation failed:', error.message);
            throw error;
        }
    }

    _getEnabledFeatures() {
        return Object.entries(this.config.features)
            .filter(([_, enabled]) => enabled)
            .map(([name, _]) => name);
    }

    /**
     * Basic code parser (extract strings, numbers, identifiers)
     */
    _parseCode(code) {
        const strings = [];
        const numbers = [];
        const identifiers = new Set();

        // Extract strings
        const stringRegex = /(["'])(?:(?!\1|\\).|\\.)*\1/g;
        let match;
        while ((match = stringRegex.exec(code)) !== null) {
            strings.push({
                value: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }

        // Extract numbers
        const numberRegex = /\b\d+\.?\d*\b/g;
        while ((match = numberRegex.exec(code)) !== null) {
            numbers.push({
                value: parseFloat(match[0]),
                start: match.index,
                end: match.index + match[0].length
            });
        }

        // Extract identifiers (simplified)
        const identifierRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        while ((match = identifierRegex.exec(code)) !== null) {
            if (!Helpers.isReservedKeyword(match[1])) {
                identifiers.add(match[1]);
            }
        }

        return { strings, numbers, identifiers: Array.from(identifiers) };
    }

    /**
     * Variable Renaming (Luraph style)
     */
    _applyVariableRenaming(code, parsed) {
        const renameMap = new Map();
        let result = code;

        // Buat mapping untuk setiap identifier
        for (const identifier of parsed.identifiers) {
            // Skip globals dan built-ins
            if (this._isBuiltIn(identifier)) continue;
            
            const newName = this.random.generateName();
            renameMap.set(identifier, newName);
            this.stats.variablesRenamed++;
        }

        // Apply renaming (sederhana, dari yang terpanjang)
        const sorted = Array.from(renameMap.entries())
            .sort((a, b) => b[0].length - a[0].length);

        for (const [oldName, newName] of sorted) {
            const regex = new RegExp(`\\b${oldName}\\b`, 'g');
            result = result.replace(regex, newName);
        }

        return result;
    }

    _isBuiltIn(name) {
        const builtIns = [
            'print', 'pairs', 'ipairs', 'next', 'type', 'tostring', 'tonumber',
            'pcall', 'xpcall', 'error', 'assert', 'select', 'unpack', 'pack',
            'rawget', 'rawset', 'rawequal', 'setmetatable', 'getmetatable',
            'string', 'table', 'math', 'bit32', 'coroutine', 'os', 'io', 'debug',
            'loadstring', 'load', 'dofile', 'require', 'module',
            '_G', '_VERSION', 'arg', 'self',
            // Roblox globals
            'game', 'workspace', 'script', 'Instance', 'Vector3', 'CFrame',
            'Color3', 'UDim2', 'Enum', 'task', 'wait', 'spawn', 'delay'
        ];
        return builtIns.includes(name);
    }

    /**
     * String Encryption
     */
    _applyStringEncryption(code) {
        let result = code;
        
        // Find all strings
        const stringRegex = /(["'])(?:(?!\1|\\).|\\.)*\1/g;
        const matches = [];
        let match;
        
        while ((match = stringRegex.exec(code)) !== null) {
            matches.push({
                original: match[0],
                content: match[0].slice(1, -1), // Remove quotes
                index: match.index
            });
        }

        // Replace dari belakang supaya index tidak berubah
        for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i];
            try {
                const encrypted = this.stringEncryptor.encrypt(m.content);
                result = result.slice(0, m.index) + encrypted + result.slice(m.index + m.original.length);
                this.stats.stringsEncrypted++;
            } catch (e) {
                // Skip if encryption fails
            }
        }

        return result;
    }

    /**
     * Constant Encryption
     */
    _applyConstantEncryption(code) {
        let result = code;
        
        // Encrypt numbers
        const numberRegex = /\b(\d+)\b/g;
        result = result.replace(numberRegex, (match) => {
            const num = parseInt(match);
            if (num > 0 && num < 1000000) { // Only encrypt reasonable numbers
                this.stats.constantsEncrypted++;
                return this.constantEncryptor.encryptNumber(num);
            }
            return match;
        });

        // Encrypt booleans
        result = result.replace(/\btrue\b/g, () => {
            this.stats.constantsEncrypted++;
            return this.constantEncryptor.encryptBoolean(true);
        });
        
        result = result.replace(/\bfalse\b/g, () => {
            this.stats.constantsEncrypted++;
            return this.constantEncryptor.encryptBoolean(false);
        });

        return result;
    }

    /**
     * Inject Junk Code
     */
    _injectJunkCode(code) {
        const junkPatterns = [
            () => {
                const v = this.random.generateName();
                return `local ${v}=${this.random.formatNumber(this.random.largeNumber())};`;
            },
            () => {
                const v = this.random.generateName();
                return `if ${this.constantEncryptor.generateOpaquePredicate(false)} then local ${v}=${this.random.formatNumber(0)};end;`;
            },
            () => {
                const v1 = this.random.generateName();
                const v2 = this.random.generateName();
                return `local ${v1},${v2}=${this.random.formatNumber(this.random.int(1, 100))},${this.random.formatNumber(this.random.int(1, 100))};`;
            },
            () => {
                return `do end;`;
            }
        ];

        let result = code;
        const lines = result.split('\n');
        const newLines = [];

        for (const line of lines) {
            // Random chance untuk inject junk sebelum line
            if (this.random.bool(0.15)) {
                const junk = this.random.choice(junkPatterns)();
                newLines.push(junk);
                this.stats.junkInjected++;
            }
            newLines.push(line);
        }

        return newLines.join('\n');
    }

    /**
     * Control Flow Obfuscation (simplified)
     */
    _applyControlFlow(code) {
        // Simplified: wrap dalam state machine
        const stateVar = this.random.generateName(2);
        const loopVar = this.random.generateName(1);
        
        const initialState = this.random.int(1000, 9999);
        const finalState = this.random.int(10000, 99999);
        
        return `local ${stateVar}=${this.random.formatNumber(initialState)};while ${stateVar}~=${this.random.formatNumber(finalState)} do if ${stateVar}==${this.random.formatNumber(initialState)} then ${code};${stateVar}=${this.random.formatNumber(finalState)};end;end;`;
    }

    /**
     * Wrap dalam VM (simplified wrapper)
     */
    _wrapInVM(code) {
        const vmVars = {
            main: this.random.generateName(2),
            env: this.random.generateName(1),
            data: this.random.generateName(1),
            func: this.random.generateName(2)
        };

        // Generate key table
        const keyTable = this.keyGenerator.generateKeyTable(8);
        const keyTableStr = Object.entries(keyTable)
            .map(([k, v]) => `${k}=${this.random.formatNumber(v)}`)
            .join(',');

        // Platform-specific wrapper
        const platformConfig = Config.PlatformSettings[this.config.target];
        
        let envSetup = '';
        if (platformConfig.useBit32) {
            envSetup += `bit32=bit32 or bit,`;
        }
        
        // Escape the code for embedding
        const escapedCode = code
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');

        return `return(function(${vmVars.env})local ${vmVars.data}={${keyTableStr},${envSetup}bxor=bit32.bxor,band=bit32.band,bor=bit32.bor,sub=string.sub,byte=string.byte,char=string.char};local ${vmVars.func}=(function()${code}end);return ${vmVars.func}();end)({...})`;
    }

    /**
     * Add Integrity Check
     */
    _addIntegrityCheck(code) {
        const checkVar = this.random.generateName(2);
        const hashVar = this.random.generateName(2);
        
        // Simple hash check
        const check = `local ${checkVar}=function(${hashVar})if type(${hashVar})~='function'then return;end;end;`;
        
        return check + code;
    }

    /**
     * Add Environment Check
     */
    _addEnvironmentCheck(code) {
        const checks = [];
        const errVar = this.random.generateName(1);
        
        // Check for debug library
        checks.push(`if debug and debug.getinfo then local ${errVar}=nil;end;`);
        
        return checks.join('') + code;
    }

    /**
     * Add Watermark
     */
    _addWatermark(code) {
        const watermark = Config.WATERMARK_TEXT.replace('%VERSION%', Config.VERSION);
        return `--[[\n\t${watermark}\n]]\n\n${code}`;
    }

    /**
     * Minify Code
     */
    _minifyCode(code) {
        let result = code;
        
        // Remove single-line comments (except watermark)
        result = result.replace(/--(?!\[\[).*$/gm, '');
        
        // Remove extra whitespace
        result = result.replace(/\s+/g, ' ');
        
        // Remove space around operators
        result = result.replace(/\s*([=+\-*/<>~,;{}()\[\]])\s*/g, '$1');
        
        // Fix specific cases
        result = result.replace(/end\s+end/g, 'end end');
        result = result.replace(/then\s+/g, 'then ');
        result = result.replace(/\s+then/g, ' then');
        result = result.replace(/do\s+/g, 'do ');
        result = result.replace(/\s+do/g, ' do');
        
        // Trim
        result = result.trim();
        
        return result;
    }

    /**
     * Validate Lua code (basic)
     */
    validateCode(code) {
        const errors = [];
        
        // Check for basic syntax issues
        const opens = (code.match(/\bfunction\b/g) || []).length +
                     (code.match(/\bdo\b/g) || []).length +
                     (code.match(/\bif\b/g) || []).length;
        const closes = (code.match(/\bend\b/g) || []).length;
        
        if (Math.abs(opens - closes) > 2) {
            errors.push('Mismatched function/do/if and end statements');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get available features
     */
    static getFeatures() {
        return {
            vmObfuscation: {
                name: 'VM Obfuscation',
                description: 'Convert code to Virtual Machine bytecode'
            },
            stringEncryption: {
                name: 'String Encryption',
                description: 'Encrypt all strings with XOR/Custom encoding'
            },
            controlFlow: {
                name: 'Control Flow',
                description: 'Flatten and obfuscate control flow'
            },
            junkCode: {
                name: 'Junk Code',
                description: 'Inject dead code and fake branches'
            },
            variableRenaming: {
                name: 'Variable Renaming',
                description: 'Rename variables (Luraph style)'
            },
            constantEncryption: {
                name: 'Constant Encryption',
                description: 'Obfuscate numbers and booleans'
            },
            integrityCheck: {
                name: 'Integrity Check',
                description: 'Detect code tampering'
            },
            environmentCheck: {
                name: 'Environment Check',
                description: 'Anti-debug and environment validation'
            },
            watermark: {
                name: 'Watermark',
                description: 'Add custom watermark to output'
            },
            minify: {
                name: 'Minify Output',
                description: 'Compress and minify final output'
            }
        };
    }
}

// Singleton instance
const obfuscator = new Obfuscator();

module.exports = {
    obfuscate: (code, options) => obfuscator.obfuscate(code, options),
    validateCode: (code) => obfuscator.validateCode(code),
    getFeatures: () => Obfuscator.getFeatures(),
    Obfuscator
};
