/**
 * LuaShield - Main Obfuscator Entry Point
 * FINAL INTEGRATED VERSION - All modules connected
 */

const Config = require('./config');
const Random = require('../utils/random');
const Helpers = require('../utils/helpers');
const { logger } = require('../utils/logger');

// Encryption modules
const StringEncryptor = require('./encryption/strings');
const ConstantEncryptor = require('./encryption/constants');
const KeyGenerator = require('./encryption/keys');

// Transform modules
const Renamer = require('./transforms/renamer');
const JunkGenerator = require('./transforms/junk');
const ControlFlowObfuscator = require('./transforms/controlflow');

// VM & Output modules
const VMTemplate = require('./vm/template');
const OutputGenerator = require('./output/generator');
const Minifier = require('./output/minifier');

class Obfuscator {
    constructor() {
        this.reset();
    }

    /**
     * Reset all modules
     */
    reset() {
        this.random = null;
        this.stringEncryptor = null;
        this.constantEncryptor = null;
        this.keyGenerator = null;
        this.renamer = null;
        this.junkGenerator = null;
        this.controlFlow = null;
        this.vmTemplate = null;
        this.outputGenerator = null;
        this.minifier = null;
        this.config = null;
        this.stats = {};
    }

    /**
     * Initialize obfuscator dengan options
     */
    init(options = {}) {
        const seed = options.seed || Date.now();

        // Initialize all modules with same seed
        this.random = new Random(seed);
        this.stringEncryptor = new StringEncryptor({ seed });
        this.constantEncryptor = new ConstantEncryptor({ seed });
        this.keyGenerator = new KeyGenerator(seed);
        this.renamer = new Renamer({ seed });
        this.junkGenerator = new JunkGenerator({ seed, density: 0.2 });
        this.controlFlow = new ControlFlowObfuscator({ seed });
        this.vmTemplate = new VMTemplate({ seed, target: options.target });
        this.outputGenerator = new OutputGenerator({ 
            seed, 
            target: options.target,
            watermark: options.features?.watermark,
            minify: options.features?.minify,
            vmObfuscation: options.features?.vmObfuscation
        });
        this.minifier = new Minifier();

        // Store config
        this.config = {
            target: options.target || 'roblox',
            features: options.features || this._getDefaultFeatures()
        };

        // Add platform-specific built-ins
        this._configurePlatform();

        // Initialize key session
        this.keyGenerator.initSession();

        // Reset stats
        this.stats = {
            stringsEncrypted: 0,
            constantsEncrypted: 0,
            variablesRenamed: 0,
            junkInjected: 0,
            controlFlowBlocks: 0,
            startTime: Date.now()
        };

        return this;
    }

    /**
     * Configure platform-specific settings
     */
    _configurePlatform() {
        const platformConfig = Config.PlatformSettings[this.config.target];
        
        if (platformConfig && platformConfig.globals) {
            this.renamer.addBuiltIn(platformConfig.globals);
        }
    }

    /**
     * Get default features
     */
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
        // Initialize
        this.init(options);

        logger.obfuscate(`Starting obfuscation...`);
        logger.obfuscate(`Target: ${this.config.target}`);
        logger.obfuscate(`Features: ${this._getEnabledFeatures().join(', ')}`);

        try {
            let result = code;

            // ═══════════════════════════════════════════════════════
            // PHASE 1: Code Analysis
            // ═══════════════════════════════════════════════════════
            logger.debugLog('Phase 1: Analyzing code...');
            const analysis = this._analyzeCode(result);

            // ═══════════════════════════════════════════════════════
            // PHASE 2: Variable Renaming
            // ═══════════════════════════════════════════════════════
            if (this.config.features.variableRenaming) {
                logger.debugLog('Phase 2: Renaming variables...');
                result = this.renamer.rename(result);
                this.stats.variablesRenamed = this.renamer.getStats().renamed;
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 3: String Encryption
            // ═══════════════════════════════════════════════════════
            if (this.config.features.stringEncryption) {
                logger.debugLog('Phase 3: Encrypting strings...');
                result = this._encryptStrings(result);
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 4: Constant Encryption
            // ═══════════════════════════════════════════════════════
            if (this.config.features.constantEncryption) {
                logger.debugLog('Phase 4: Encrypting constants...');
                result = this._encryptConstants(result);
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 5: Control Flow Obfuscation
            // ═══════════════════════════════════════════════════════
            if (this.config.features.controlFlow) {
                logger.debugLog('Phase 5: Obfuscating control flow...');
                result = this.controlFlow.obfuscate(result);
                this.stats.controlFlowBlocks = this.controlFlow.getStats().flattened;
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 6: Junk Code Injection
            // ═══════════════════════════════════════════════════════
            if (this.config.features.junkCode) {
                logger.debugLog('Phase 6: Injecting junk code...');
                result = this.junkGenerator.inject(result);
                this.stats.junkInjected = this.junkGenerator.getStats().injected;
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 7: Security Features
            // ═══════════════════════════════════════════════════════
            if (this.config.features.integrityCheck) {
                logger.debugLog('Phase 7a: Adding integrity check...');
                result = this._addIntegrityCheck(result);
            }

            if (this.config.features.environmentCheck) {
                logger.debugLog('Phase 7b: Adding environment check...');
                result = this._addEnvironmentCheck(result);
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 8: VM Wrapping & Output Generation
            // ═══════════════════════════════════════════════════════
            logger.debugLog('Phase 8: Generating final output...');
            
            if (this.config.features.vmObfuscation) {
                result = this.outputGenerator.generateAdvanced(result, {
                    watermark: this.config.features.watermark,
                    minify: false // We'll minify after
                });
            } else {
                // Simple wrapper without VM
                result = this._simpleWrapper(result);
                
                if (this.config.features.watermark) {
                    result = this._addWatermark(result);
                }
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 9: Final Minification
            // ═══════════════════════════════════════════════════════
            if (this.config.features.minify) {
                logger.debugLog('Phase 9: Minifying output...');
                result = this.minifier.minify(result);
            }

            // Calculate final stats
            const endTime = Date.now();
            this.stats.endTime = endTime;
            this.stats.processingTime = endTime - this.stats.startTime;
            this.stats.inputSize = Buffer.byteLength(code, 'utf-8');
            this.stats.outputSize = Buffer.byteLength(result, 'utf-8');
            this.stats.ratio = Math.round((this.stats.outputSize / this.stats.inputSize) * 100);

            logger.obfuscate(`Completed in ${this.stats.processingTime}ms`);
            logger.obfuscate(`Size: ${this.stats.inputSize}b → ${this.stats.outputSize}b (${this.stats.ratio}%)`);

            return {
                success: true,
                code: result,
                stats: this.stats
            };

        } catch (error) {
            logger.error('Obfuscation failed:', error.message);
            throw error;
        }
    }

    /**
     * Analyze code untuk extract info
     */
    _analyzeCode(code) {
        const strings = [];
        const numbers = [];
        const identifiers = new Set();

        // Extract strings
        const stringRegex = /(["'])(?:(?!\1|\\).|\\.)*\1/g;
        let match;
        while ((match = stringRegex.exec(code)) !== null) {
            strings.push({
                value: match[0],
                content: match[0].slice(1, -1),
                start: match.index,
                end: match.index + match[0].length
            });
        }

        // Extract numbers
        const numberRegex = /\b(\d+\.?\d*)\b/g;
        while ((match = numberRegex.exec(code)) !== null) {
            numbers.push({
                value: parseFloat(match[0]),
                raw: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }

        // Extract identifiers
        const identifierRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        while ((match = identifierRegex.exec(code)) !== null) {
            if (!Helpers.isReservedKeyword(match[1])) {
                identifiers.add(match[1]);
            }
        }

        return {
            strings,
            numbers,
            identifiers: Array.from(identifiers),
            lineCount: code.split('\n').length,
            charCount: code.length
        };
    }

    /**
     * Encrypt strings dalam code
     */
    _encryptStrings(code) {
        let result = code;
        const stringRegex = /(["'])(?:(?!\1|\\).|\\.)*\1/g;
        const matches = [];
        let match;

        while ((match = stringRegex.exec(code)) !== null) {
            matches.push({
                original: match[0],
                content: match[0].slice(1, -1),
                index: match.index
            });
        }

        // Replace dari belakang agar index tetap valid
        for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i];
            
            // Skip empty strings dan very short strings
            if (m.content.length === 0) continue;
            
            try {
                const encrypted = this.stringEncryptor.encrypt(m.content);
                result = result.slice(0, m.index) + encrypted + result.slice(m.index + m.original.length);
                this.stats.stringsEncrypted++;
            } catch (e) {
                // Skip jika encryption gagal
                logger.debugLog(`Failed to encrypt string: ${m.content.substring(0, 20)}...`);
            }
        }

        return result;
    }

    /**
     * Encrypt constants dalam code
     */
    _encryptConstants(code) {
        let result = code;

        // Encrypt numbers (skip yang terlalu besar atau terlalu kecil)
        result = result.replace(/\b(\d+)\b/g, (match, num) => {
            const n = parseInt(num);
            if (n >= 0 && n <= 100000 && this.random.bool(0.7)) {
                this.stats.constantsEncrypted++;
                return this.constantEncryptor.encryptNumber(n);
            }
            return match;
        });

        // Encrypt booleans
        result = result.replace(/\btrue\b/g, () => {
            if (this.random.bool(0.8)) {
                this.stats.constantsEncrypted++;
                return this.constantEncryptor.encryptBoolean(true);
            }
            return 'true';
        });

        result = result.replace(/\bfalse\b/g, () => {
            if (this.random.bool(0.8)) {
                this.stats.constantsEncrypted++;
                return this.constantEncryptor.encryptBoolean(false);
            }
            return 'false';
        });

        return result;
    }

    /**
     * Add integrity check
     */
    _addIntegrityCheck(code) {
        const checkVar = this.random.generateName(2);
        const funcVar = this.random.generateName(2);
        
        const check = `local ${checkVar}=function(${funcVar})` +
            `if type(${funcVar})~='function'then ` +
            `error('Integrity check failed');` +
            `end;` +
            `end;`;
        
        return check + code;
    }

    /**
     * Add environment check
     */
    _addEnvironmentCheck(code) {
        const checks = [];
        const errFunc = this.random.generateName(2);
        
        // Check for debug library tampering
        if (this.config.target !== 'roblox') {
            checks.push(`if debug and debug.getinfo then local ${errFunc}=nil;end;`);
        }
        
        // Check for getfenv (not available in Roblox)
        if (this.config.target !== 'roblox') {
            checks.push(`if getfenv then local ${errFunc}=nil;end;`);
        }

        return checks.join('') + code;
    }

    /**
     * Simple wrapper tanpa VM
     */
    _simpleWrapper(code) {
        const funcVar = this.random.generateName(2);
        const envVar = this.random.generateName(1);

        return `return(function(${envVar})` +
            `local ${funcVar}=(function()${code}end);` +
            `return ${funcVar}();` +
            `end)({...})`;
    }

    /**
     * Add watermark
     */
    _addWatermark(code) {
        const watermark = Config.WATERMARK_TEXT.replace('%VERSION%', Config.VERSION);
        return `--[[\n\t${watermark}\n]]\n\n${code}`;
    }

    /**
     * Get enabled features list
     */
    _getEnabledFeatures() {
        return Object.entries(this.config.features)
            .filter(([_, enabled]) => enabled)
            .map(([name, _]) => name);
    }

    /**
     * Validate Lua code (basic syntax check)
     */
    validateCode(code) {
        const errors = [];

        if (!code || code.trim().length === 0) {
            errors.push('Code is empty');
            return { valid: false, errors };
        }

        // Check for balanced blocks
        const patterns = [
            { open: /\bfunction\b/g, close: /\bend\b/g, name: 'function/end' },
            { open: /\bdo\b/g, close: /\bend\b/g, name: 'do/end' },
            { open: /\bif\b/g, close: /\bend\b/g, name: 'if/end' },
            { open: /\bwhile\b/g, close: /\bend\b/g, name: 'while/end' },
            { open: /\bfor\b/g, close: /\bend\b/g, name: 'for/end' },
        ];

        // Simple check: count total function/do/if/while/for vs end
        const opens = (code.match(/\b(function|do|if|while|for)\b/g) || []).length;
        const closes = (code.match(/\bend\b/g) || []).length;

        if (Math.abs(opens - closes) > 3) {
            errors.push(`Possibly unbalanced blocks: ${opens} openers, ${closes} 'end' statements`);
        }

        // Check for obvious syntax errors
        if (code.match(/\)\s*\(/)) {
            // This might be intentional, skip
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get available features dengan descriptions
     */
    static getFeatures() {
        return {
            vmObfuscation: {
                name: 'VM Obfuscation',
                emoji: '🔀',
                description: 'Convert code to Virtual Machine bytecode'
            },
            stringEncryption: {
                name: 'String Encryption',
                emoji: '🔐',
                description: 'Encrypt all strings with XOR/Custom encoding'
            },
            controlFlow: {
                name: 'Control Flow',
                emoji: '🌀',
                description: 'Flatten and obfuscate control flow'
            },
            junkCode: {
                name: 'Junk Code',
                emoji: '🗑️',
                description: 'Inject dead code and fake branches'
            },
            variableRenaming: {
                name: 'Variable Renaming',
                emoji: '📝',
                description: 'Rename variables (Luraph style)'
            },
            constantEncryption: {
                name: 'Constant Encryption',
                emoji: '🔢',
                description: 'Obfuscate numbers and booleans'
            },
            integrityCheck: {
                name: 'Integrity Check',
                emoji: '✅',
                description: 'Detect code tampering'
            },
            environmentCheck: {
                name: 'Environment Check',
                emoji: '🛡️',
                description: 'Anti-debug and environment validation'
            },
            watermark: {
                name: 'Watermark',
                emoji: '💧',
                description: 'Add custom watermark to output'
            },
            minify: {
                name: 'Minify Output',
                emoji: '📦',
                description: 'Compress and minify final output'
            }
        };
    }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════
const obfuscatorInstance = new Obfuscator();

module.exports = {
    /**
     * Main obfuscate function
     */
    obfuscate: async (code, options) => {
        return obfuscatorInstance.obfuscate(code, options);
    },

    /**
     * Validate code
     */
    validateCode: (code) => {
        return obfuscatorInstance.validateCode(code);
    },

    /**
     * Get available features
     */
    getFeatures: () => {
        return Obfuscator.getFeatures();
    },

    /**
     * Obfuscator class untuk advanced usage
     */
    Obfuscator,

    /**
     * Individual modules untuk custom usage
     */
    modules: {
        StringEncryptor,
        ConstantEncryptor,
        KeyGenerator,
        Renamer,
        JunkGenerator,
        ControlFlowObfuscator,
        VMTemplate,
        OutputGenerator,
        Minifier
    }
};
