/**
 * LuaShield - Main Obfuscator Entry Point
 * FINAL COMPLETE VERSION - All modules integrated
 */

const Config = require('./config');
const Random = require('../utils/random');
const Helpers = require('../utils/helpers');
const { logger } = require('../utils/logger');

// Parser
const LuaParser = require('./parser/init');

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
    }

    /**
     * Initialize all modules
     */
    init(options = {}) {
        const seed = options.seed || Date.now();

        // Store config
        this.config = {
            target: options.target || 'roblox',
            features: options.features || this._getDefaultFeatures(),
            seed: seed
        };

        // Initialize all modules
        this.modules = {
            random: new Random(seed),
            parser: new LuaParser(),
            
            // Encryption
            stringEncryptor: new StringEncryptor({ seed }),
            constantEncryptor: new ConstantEncryptor({ seed }),
            keyGenerator: new KeyGenerator(seed),
            
            // Transforms
            renamer: new Renamer({ seed }),
            junkGenerator: new JunkGenerator({ seed, density: 0.2 }),
            controlFlow: new ControlFlowObfuscator({ seed }),
            vmObfuscator: new VMObfuscator({ seed, target: this.config.target }),
            
            // VM
            vmCompiler: new VMCompiler({ seed }),
            vmShuffler: new VMShuffler({ seed }),
            vmTemplate: new VMTemplate({ seed, target: this.config.target }),
            
            // Security
            integrityChecker: new IntegrityChecker({ seed }),
            environmentChecker: new EnvironmentChecker({ seed, target: this.config.target }),
            watermarkGenerator: new WatermarkGenerator({ seed }),
            
            // Output
            outputGenerator: new OutputGenerator({ seed, target: this.config.target }),
            minifier: new Minifier(),
            serializer: new Serializer({ seed, luraphStyle: true })
        };

        // Configure platform
        this._configurePlatform();

        // Initialize keys
        this.modules.keyGenerator.initSession();

        // Reset stats
        this.stats = {
            inputSize: 0,
            outputSize: 0,
            stringsEncrypted: 0,
            constantsEncrypted: 0,
            variablesRenamed: 0,
            junkInjected: 0,
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
        this.init(options);
        
        this.stats.inputSize = Buffer.byteLength(code, 'utf-8');
        
        logger.obfuscate(`Starting obfuscation...`);
        logger.obfuscate(`Target: ${this.config.target}`);
        logger.obfuscate(`Features: ${this._getEnabledFeatures().join(', ')}`);

        try {
            let result = code;

            // ═══════════════════════════════════════════════════════════
            // PHASE 1: Parse & Analyze
            // ═══════════════════════════════════════════════════════════
            logger.debugLog('Phase 1: Parsing code...');
            const parseResult = this.modules.parser.analyze(result);
            
            if (!parseResult.success) {
                logger.warn('Parse failed, using regex-based obfuscation');
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 2: Variable Renaming
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.variableRenaming) {
                logger.debugLog('Phase 2: Renaming variables...');
                result = this.modules.renamer.rename(result);
                this.stats.variablesRenamed = this.modules.renamer.getStats().renamed;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 3: String Encryption
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.stringEncryption) {
                logger.debugLog('Phase 3: Encrypting strings...');
                result = this._encryptStrings(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 4: Constant Encryption
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.constantEncryption) {
                logger.debugLog('Phase 4: Encrypting constants...');
                result = this._encryptConstants(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 5: Control Flow
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.controlFlow) {
                logger.debugLog('Phase 5: Obfuscating control flow...');
                result = this.modules.controlFlow.obfuscate(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 6: Junk Code
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.junkCode) {
                logger.debugLog('Phase 6: Injecting junk code...');
                result = this.modules.junkGenerator.inject(result);
                this.stats.junkInjected = this.modules.junkGenerator.getStats().injected;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 7: Security Features
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.environmentCheck) {
                logger.debugLog('Phase 7a: Adding environment checks...');
                const envCode = this.modules.environmentChecker.generate();
                result = envCode + result;
            }

            if (this.config.features.integrityCheck) {
                logger.debugLog('Phase 7b: Adding integrity checks...');
                const integrityResult = this.modules.integrityChecker.generate(result);
                result = integrityResult.wrappedCode;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 8: VM Obfuscation
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.vmObfuscation) {
                logger.debugLog('Phase 8: Applying VM obfuscation...');
                const vmResult = this.modules.vmObfuscator.obfuscate(result);
                if (vmResult.success) {
                    result = vmResult.code;
                }
            } else {
                // Simple wrapper
                result = this.modules.outputGenerator.generate(result, {
                    watermark: false,
                    minify: false,
                    wrapInVM: false
                });
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 9: Watermark
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.watermark) {
                logger.debugLog('Phase 9: Adding watermark...');
                result = this.modules.watermarkGenerator.apply(result, 'top');
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 10: Minify
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.minify) {
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
                index: match.index
            });
        }

        for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i];
            if (m.content.length === 0) continue;
            
            try {
                const encrypted = this.modules.stringEncryptor.encrypt(m.content);
                result = result.slice(0, m.index) + encrypted + result.slice(m.index + m.original.length);
                this.stats.stringsEncrypted++;
            } catch (e) {
                // Skip on error
            }
        }

        return result;
    }

    /**
     * Encrypt constants in code
     */
    _encryptConstants(code) {
        let result = code;

        result = result.replace(/\b(\d+)\b/g, (match, num) => {
            const n = parseInt(num);
            if (n >= 0 && n <= 100000 && this.modules.random.bool(0.7)) {
                this.stats.constantsEncrypted++;
                return this.modules.constantEncryptor.encryptNumber(n);
            }
            return match;
        });

        result = result.replace(/\btrue\b/g, () => {
            if (this.modules.random.bool(0.8)) {
                this.stats.constantsEncrypted++;
                return this.modules.constantEncryptor.encryptBoolean(true);
            }
            return 'true';
        });

        result = result.replace(/\bfalse\b/g, () => {
            if (this.modules.random.bool(0.8)) {
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
        const opens = (code.match(/\b(function|do|if|while|for)\b/g) || []).length;
        const closes = (code.match(/\bend\b/g) || []).length;

        if (Math.abs(opens - closes) > 3) {
            errors.push(`Unbalanced blocks: ${opens} openers, ${closes} 'end' statements`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Get features
     */
    static getFeatures() {
        return {
            vmObfuscation: { name: 'VM Obfuscation', emoji: '🔀', description: 'Convert to VM bytecode' },
            stringEncryption: { name: 'String Encryption', emoji: '🔐', description: 'Encrypt all strings' },
            controlFlow: { name: 'Control Flow', emoji: '🌀', description: 'Flatten control flow' },
            junkCode: { name: 'Junk Code', emoji: '🗑️', description: 'Inject dead code' },
            variableRenaming: { name: 'Variable Renaming', emoji: '📝', description: 'Rename variables' },
            constantEncryption: { name: 'Constant Encryption', emoji: '🔢', description: 'Obfuscate numbers' },
            integrityCheck: { name: 'Integrity Check', emoji: '✅', description: 'Detect tampering' },
            environmentCheck: { name: 'Environment Check', emoji: '🛡️', description: 'Anti-debug' },
            watermark: { name: 'Watermark', emoji: '💧', description: 'Add watermark' },
            minify: { name: 'Minify', emoji: '📦', description: 'Compress output' }
        };
    }
}

// Singleton
const obfuscator = new Obfuscator();

module.exports = {
    obfuscate: (code, options) => obfuscator.obfuscate(code, options),
    validateCode: (code) => obfuscator.validateCode(code),
    getFeatures: () => Obfuscator.getFeatures(),
    Obfuscator,
    modules: {
        LuaParser, StringEncryptor, ConstantEncryptor, KeyGenerator,
        Renamer, JunkGenerator, ControlFlowObfuscator, VMObfuscator,
        VMCompiler, VMShuffler, VMTemplate, OpcodeManager,
        IntegrityChecker, EnvironmentChecker, WatermarkGenerator,
        OutputGenerator, Minifier, Serializer
    }
};
