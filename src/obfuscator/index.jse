/**
 * LuaShield - Main Obfuscator Entry Point
 * FINAL COMPLETE VERSION - Full Integration
 */

const Config = require('./config');
const Random = require('../utils/random');
const Helpers = require('../utils/helpers');
const { logger } = require('../utils/logger');

// Parser (dengan safe import)
let LuaParser;
try {
    LuaParser = require('./parser/init');
} catch (e) {
    console.warn('Parser not available, using regex-based obfuscation');
    LuaParser = null;
}

// Encryption
const StringEncryptor = require('./encryption/strings');
const ConstantEncryptor = require('./encryption/constants');
const KeyGenerator = require('./encryption/keys');

// Transforms
const Renamer = require('./transforms/renamer');
const JunkGenerator = require('./transforms/junk');
const ControlFlowObfuscator = require('./transforms/controlflow');
const VMObfuscator = require('./transforms/vm_obfuscator');

// VM
const VMCompiler = require('./vm/compiler');
const VMShuffler = require('./vm/shuffler');
const VMTemplate = require('./vm/template');
const { OpcodeManager } = require('./vm/opcodes');

// Security
const IntegrityChecker = require('./security/integrity');
const EnvironmentChecker = require('./security/environment');
const WatermarkGenerator = require('./security/watermark');

// Output
const OutputGenerator = require('./output/generator');
const Minifier = require('./output/minifier');
const Serializer = require('./output/serializer');

class Obfuscator {
    constructor() {
        this.modules = {};
        this.config = null;
        this.stats = {};
        this.initialized = false;
    }

    /**
     * Initialize semua modules
     */
    init(options = {}) {
        const seed = options.seed || Date.now();

        // Store config
        this.config = {
            target: options.target || 'roblox',
            features: { ...this._getDefaultFeatures(), ...(options.features || {}) },
            seed: seed
        };

        // Initialize all modules dengan error handling
        try {
            this.modules = {
                random: new Random(seed),
                
                // Parser (optional)
                parser: LuaParser ? new LuaParser() : null,
                
                // Encryption
                stringEncryptor: new StringEncryptor({ seed }),
                constantEncryptor: new ConstantEncryptor({ seed }),
                keyGenerator: new KeyGenerator(seed),
                
                // Transforms
                renamer: new Renamer({ seed }),
                junkGenerator: new JunkGenerator({ seed, density: 0.2 }),
                controlFlow: new ControlFlowObfuscator({ seed }),
                vmObfuscator: new VMObfuscator({ 
                    seed, 
                    target: this.config.target,
                    encryptStrings: this.config.features.stringEncryption
                }),
                
                // VM
                vmCompiler: new VMCompiler({ seed }),
                vmShuffler: new VMShuffler({ seed }),
                vmTemplate: new VMTemplate({ seed, target: this.config.target }),
                opcodeManager: new OpcodeManager(seed),
                
                // Security
                integrityChecker: new IntegrityChecker({ seed }),
                environmentChecker: new EnvironmentChecker({ seed, target: this.config.target }),
                watermarkGenerator: new WatermarkGenerator({ seed }),
                
                // Output
                outputGenerator: new OutputGenerator({ seed, target: this.config.target }),
                minifier: new Minifier({ preserveWatermark: true }),
                serializer: new Serializer({ seed, luraphStyle: true })
            };
        } catch (error) {
            logger.error('Failed to initialize modules:', error.message);
            throw error;
        }

        // Configure platform
        this._configurePlatform();

        // Initialize keys
        if (this.modules.keyGenerator) {
            this.modules.keyGenerator.initSession();
        }

        // Reset stats
        this.stats = {
            inputSize: 0,
            outputSize: 0,
            stringsEncrypted: 0,
            constantsEncrypted: 0,
            variablesRenamed: 0,
            junkInjected: 0,
            processingTime: 0,
            startTime: Date.now()
        };

        this.initialized = true;
        return this;
    }

    /**
     * Configure platform-specific settings
     */
    _configurePlatform() {
        const platformConfig = Config.PlatformSettings[this.config.target];
        
        if (platformConfig && platformConfig.globals && this.modules.renamer) {
            this.modules.renamer.addBuiltIn(platformConfig.globals);
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
        
        this.stats.inputSize = Buffer.byteLength(code, 'utf-8');
        
        logger.obfuscate(`Starting obfuscation...`);
        logger.obfuscate(`Target: ${this.config.target}`);
        logger.obfuscate(`Features: ${this._getEnabledFeatures().join(', ')}`);

        try {
            let result = code;

            // ═══════════════════════════════════════════════════════════
            // PHASE 1: Parse & Analyze (optional)
            // ═══════════════════════════════════════════════════════════
            let analysis = null;
            if (this.modules.parser) {
                logger.debugLog('Phase 1: Parsing code...');
                try {
                    const parseResult = this.modules.parser.analyze(result);
                    if (parseResult.success) {
                        analysis = parseResult.analysis;
                    }
                } catch (e) {
                    logger.debugLog('Parse failed, using regex-based approach');
                }
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 2: Variable Renaming
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.variableRenaming && this.modules.renamer) {
                logger.debugLog('Phase 2: Renaming variables...');
                result = this.modules.renamer.rename(result);
                this.stats.variablesRenamed = this.modules.renamer.getStats().renamed;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 3: String Encryption
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.stringEncryption && this.modules.stringEncryptor) {
                logger.debugLog('Phase 3: Encrypting strings...');
                result = this._encryptStrings(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 4: Constant Encryption
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.constantEncryption && this.modules.constantEncryptor) {
                logger.debugLog('Phase 4: Encrypting constants...');
                result = this._encryptConstants(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 5: Control Flow
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.controlFlow && this.modules.controlFlow) {
                logger.debugLog('Phase 5: Obfuscating control flow...');
                result = this.modules.controlFlow.obfuscate(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 6: Junk Code
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.junkCode && this.modules.junkGenerator) {
                logger.debugLog('Phase 6: Injecting junk code...');
                result = this.modules.junkGenerator.inject(result);
                this.stats.junkInjected = this.modules.junkGenerator.getStats().injected;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 7: Security Features
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.environmentCheck && this.modules.environmentChecker) {
                logger.debugLog('Phase 7a: Adding environment checks...');
                const envCode = this.modules.environmentChecker.generate();
                result = envCode + result;
            }

            if (this.config.features.integrityCheck && this.modules.integrityChecker) {
                logger.debugLog('Phase 7b: Adding integrity checks...');
                const integrityResult = this.modules.integrityChecker.generate(result);
                result = integrityResult.wrappedCode;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 8: VM Obfuscation
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.vmObfuscation && this.modules.vmObfuscator) {
                logger.debugLog('Phase 8: Applying VM obfuscation...');
                const vmResult = this.modules.vmObfuscator.obfuscate(result);
                if (vmResult.success) {
                    result = vmResult.code;
                }
            } else if (this.modules.vmTemplate) {
                // Simple wrapper tanpa full VM
                result = this.modules.vmTemplate.generate(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 9: Watermark
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.watermark && this.modules.watermarkGenerator) {
                logger.debugLog('Phase 9: Adding watermark...');
                result = this.modules.watermarkGenerator.apply(result, 'top');
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 10: Minify
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.minify && this.modules.minifier) {
                logger.debugLog('Phase 10: Minifying...');
                result = this.modules.minifier.minify(result);
            }

            // Calculate final stats
            this.stats.outputSize = Buffer.byteLength(result, 'utf-8');
            this.stats.endTime = Date.now();
            this.stats.processingTime = this.stats.endTime - this.stats.startTime;
            this.stats.ratio = Math.round((this.stats.outputSize / this.stats.inputSize) * 100);

            logger.obfuscate(`Completed in ${this.stats.processingTime}ms`);
            logger.obfuscate(`Size: ${this.stats.inputSize}b → ${this.stats.outputSize}b (${this.stats.ratio}%)`);

            return {
                success: true,
                code: result,
                stats: { ...this.stats }
            };

        } catch (error) {
            logger.error('Obfuscation failed:', error.message);
            console.error(error);
            throw error;
        }
    }

    /**
     * Encrypt strings in code
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
                index: match.index,
                quote: match[1]
            });
        }

        // Replace dari belakang
        for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i];
            
            // Skip empty strings dan strings pendek
            if (m.content.length < 2) continue;
            
            // Skip escape sequences yang kompleks
            if (m.content.includes('\\x') || m.content.includes('\\u')) continue;
            
            try {
                // Unescape string content
                let unescaped = m.content
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'")
                    .replace(/\\\\/g, '\\');
                
                const encrypted = this.modules.stringEncryptor.encrypt(unescaped);
                result = result.slice(0, m.index) + encrypted + result.slice(m.index + m.original.length);
                this.stats.stringsEncrypted++;
            } catch (e) {
                // Skip jika encryption gagal
            }
        }

        return result;
    }

    /**
     * Encrypt constants in code
     */
    _encryptConstants(code) {
        let result = code;

        // Encrypt numbers (dengan batasan)
        result = result.replace(/(?<![a-zA-Z_\d.])(\d+)(?![a-zA-Z_\d.])/g, (match, num) => {
            const n = parseInt(num);
            // Skip numbers yang terlalu besar atau dalam konteks tertentu
            if (n >= 0 && n <= 100000 && this.modules.random.bool(0.6)) {
                this.stats.constantsEncrypted++;
                return this.modules.constantEncryptor.encryptNumber(n);
            }
            return match;
        });

        // Encrypt booleans (dengan probability)
        result = result.replace(/\btrue\b/g, () => {
            if (this.modules.random.bool(0.7)) {
                this.stats.constantsEncrypted++;
                return this.modules.constantEncryptor.encryptBoolean(true);
            }
            return 'true';
        });

        result = result.replace(/\bfalse\b/g, () => {
            if (this.modules.random.bool(0.7)) {
                this.stats.constantsEncrypted++;
                return this.modules.constantEncryptor.encryptBoolean(false);
            }
            return 'false';
        });

        return result;
    }

    /**
     * Get enabled features
     */
    _getEnabledFeatures() {
        return Object.entries(this.config.features)
            .filter(([_, enabled]) => enabled)
            .map(([name]) => name);
    }

    /**
     * Validate code
     */
    validateCode(code) {
        if (!code || code.trim().length === 0) {
            return { valid: false, errors: ['Code is empty'] };
        }

        const errors = [];
        
        // Check balanced blocks
        const opens = (code.match(/\b(function|do|if|while|for|repeat)\b/g) || []).length;
        const closes = (code.match(/\b(end|until)\b/g) || []).length;

        if (Math.abs(opens - closes) > 3) {
            errors.push(`Possibly unbalanced blocks: ${opens} openers, ${closes} closers`);
        }

        // Check for syntax errors menggunakan parser
        if (this.modules.parser) {
            const parseResult = this.modules.parser.validate(code);
            if (!parseResult.valid) {
                errors.push(parseResult.error);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Get features
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
                description: 'Rename variables (Luraph style: d, Q, FU, etc)' 
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

    /**
     * Get stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset all modules
     */
    reset() {
        if (this.modules.random) this.modules.random.resetNames();
        if (this.modules.renamer) this.modules.renamer.reset();
        if (this.modules.junkGenerator) this.modules.junkGenerator.reset();
        if (this.modules.controlFlow) this.modules.controlFlow.reset();
        if (this.modules.vmObfuscator) this.modules.vmObfuscator.reset();
        if (this.modules.stringEncryptor) this.modules.stringEncryptor.reset();
        if (this.modules.keyGenerator) this.modules.keyGenerator.reset();
        
        this.stats = {};
        this.initialized = false;
    }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

// Singleton instance
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
        obfuscatorInstance.init({});
        return obfuscatorInstance.validateCode(code);
    },

    /**
     * Get available features
     */
    getFeatures: () => {
        return Obfuscator.getFeatures();
    },

    /**
     * Obfuscator class for custom usage
     */
    Obfuscator,

    /**
     * Individual modules for advanced usage
     */
    modules: {
        // Parser
        LuaParser,
        
        // Encryption
        StringEncryptor,
        ConstantEncryptor,
        KeyGenerator,
        
        // Transforms
        Renamer,
        JunkGenerator,
        ControlFlowObfuscator,
        VMObfuscator,
        
        // VM
        VMCompiler,
        VMShuffler,
        VMTemplate,
        OpcodeManager,
        
        // Security
        IntegrityChecker,
        EnvironmentChecker,
        WatermarkGenerator,
        
        // Output
        OutputGenerator,
        Minifier,
        Serializer
    }
};
