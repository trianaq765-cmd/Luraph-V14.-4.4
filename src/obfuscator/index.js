/**
 * LuaShield - Main Obfuscator Entry Point
 * FINAL VERSION - Luraph Style, Delta Executor Compatible
 */

const Config = require('./config');
const Random = require('../utils/random');
const { logger } = require('../utils/logger');

// Safe imports
let Helpers;
try { Helpers = require('../utils/helpers'); } catch(e) { Helpers = null; }

let LuaParser;
try { LuaParser = require('./parser/init'); } catch(e) { LuaParser = null; }

// Encryption
let StringEncryptor, ConstantEncryptor, KeyGenerator;
try { StringEncryptor = require('./encryption/strings'); } catch(e) { StringEncryptor = null; }
try { ConstantEncryptor = require('./encryption/constants'); } catch(e) { ConstantEncryptor = null; }
try { KeyGenerator = require('./encryption/keys'); } catch(e) { KeyGenerator = null; }

// Transforms
let Renamer, JunkGenerator, ControlFlowObfuscator;
try { Renamer = require('./transforms/renamer'); } catch(e) { Renamer = null; }
try { JunkGenerator = require('./transforms/junk'); } catch(e) { JunkGenerator = null; }
try { ControlFlowObfuscator = require('./transforms/controlflow'); } catch(e) { ControlFlowObfuscator = null; }

// VM (Core)
const VMObfuscator = require('./transforms/vm_obfuscator');
const BytecodeGenerator = require('./vm/bytecode');
const VMTemplate = require('./vm/template');

// VM Optional
let VMCompiler, VMShuffler, OpcodeManager;
try { VMCompiler = require('./vm/compiler'); } catch(e) { VMCompiler = null; }
try { VMShuffler = require('./vm/shuffler'); } catch(e) { VMShuffler = null; }
try { 
    const opcodes = require('./vm/opcodes'); 
    OpcodeManager = opcodes.OpcodeManager; 
} catch(e) { OpcodeManager = null; }

// Security
let IntegrityChecker, EnvironmentChecker, WatermarkGenerator;
try { IntegrityChecker = require('./security/integrity'); } catch(e) { IntegrityChecker = null; }
try { EnvironmentChecker = require('./security/environment'); } catch(e) { EnvironmentChecker = null; }
try { WatermarkGenerator = require('./security/watermark'); } catch(e) { WatermarkGenerator = null; }

// Output
let OutputGenerator, Serializer;
try { OutputGenerator = require('./output/generator'); } catch(e) { OutputGenerator = null; }
try { Serializer = require('./output/serializer'); } catch(e) { Serializer = null; }

const Minifier = require('./output/minifier');

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
            seed: seed,
            vmComplexity: options.vmComplexity || 'medium',
            multiLayerVM: options.multiLayerVM || false,
            vmLayers: options.vmLayers || 2,
            luraphStyle: options.luraphStyle !== false,
            deltaCompatible: options.deltaCompatible !== false
        };

        // Initialize modules
        try {
            this.modules = {
                random: new Random(seed),
                
                // Parser
                parser: LuaParser ? new LuaParser() : null,
                
                // Encryption
                stringEncryptor: StringEncryptor ? new StringEncryptor({ seed }) : null,
                constantEncryptor: ConstantEncryptor ? new ConstantEncryptor({ seed }) : null,
                keyGenerator: KeyGenerator ? new KeyGenerator(seed) : null,
                
                // Transforms
                renamer: Renamer ? new Renamer({ seed }) : null,
                junkGenerator: JunkGenerator ? new JunkGenerator({ seed, density: 0.15 }) : null,
                controlFlow: ControlFlowObfuscator ? new ControlFlowObfuscator({ seed }) : null,
                
                // VM Core
                vmObfuscator: new VMObfuscator({ 
                    seed,
                    target: this.config.target,
                    enabled: this.config.features.vmObfuscation,
                    complexity: this.config.vmComplexity,
                    multiLayer: this.config.multiLayerVM,
                    layers: this.config.vmLayers,
                    antiTamper: this.config.features.integrityCheck,
                    antiDebug: this.config.features.environmentCheck,
                    encryptStrings: this.config.features.stringEncryption,
                    luraphStyle: this.config.luraphStyle
                }),
                bytecodeGenerator: new BytecodeGenerator({ 
                    seed,
                    compressionLevel: this._getCompressionLevel(),
                    targetRatio: 8
                }),
                vmTemplate: new VMTemplate({ 
                    seed, 
                    target: this.config.target 
                }),
                
                // VM Optional
                vmCompiler: VMCompiler ? new VMCompiler({ seed }) : null,
                vmShuffler: VMShuffler ? new VMShuffler({ seed }) : null,
                opcodeManager: OpcodeManager ? new OpcodeManager(seed) : null,
                
                // Security
                integrityChecker: IntegrityChecker ? new IntegrityChecker({ seed }) : null,
                environmentChecker: EnvironmentChecker ? new EnvironmentChecker({ seed, target: this.config.target }) : null,
                watermarkGenerator: WatermarkGenerator ? new WatermarkGenerator({ seed }) : null,
                
                // Output
                outputGenerator: OutputGenerator ? new OutputGenerator({ seed, target: this.config.target }) : null,
                minifier: new Minifier({ preserveWatermark: true }),
                serializer: Serializer ? new Serializer({ seed, luraphStyle: true }) : null
            };
        } catch (error) {
            console.error('Failed to initialize modules:', error.message);
            throw error;
        }

        // Configure platform
        this._configurePlatform();

        // Initialize keys
        if (this.modules.keyGenerator && this.modules.keyGenerator.initSession) {
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
            vmInstructions: 0,
            vmConstants: 0,
            processingTime: 0,
            ratio: 0,
            startTime: Date.now()
        };

        this.initialized = true;
        return this;
    }

    /**
     * Get compression level
     */
    _getCompressionLevel() {
        const levels = { 'low': 1, 'medium': 3, 'high': 5, 'extreme': 7 };
        return levels[this.config.vmComplexity] || 3;
    }

    /**
     * Configure platform
     */
    _configurePlatform() {
        if (!Config || !Config.PlatformSettings) return;
        
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
        this.init(options);
        
        this.stats.inputSize = Buffer.byteLength(code, 'utf-8');
        
        if (logger && logger.obfuscate) {
            logger.obfuscate(`Starting obfuscation...`);
            logger.obfuscate(`Target: ${this.config.target}`);
            logger.obfuscate(`VM Complexity: ${this.config.vmComplexity}`);
            logger.obfuscate(`Luraph Style: ${this.config.luraphStyle}`);
            logger.obfuscate(`Features: ${this._getEnabledFeatures().join(', ')}`);
        }

        try {
            let result = code;

            // ═══════════════════════════════════════════════════════════
            // PHASE 1: Parse & Analyze
            // ═══════════════════════════════════════════════════════════
            let analysis = null;
            if (this.modules.parser) {
                try {
                    const parseResult = this.modules.parser.analyze(result);
                    if (parseResult && parseResult.success) {
                        analysis = parseResult.analysis;
                    }
                } catch (e) { /* Skip */ }
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 2: Variable Renaming
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.variableRenaming && this.modules.renamer) {
                result = this.modules.renamer.rename(result);
                const stats = this.modules.renamer.getStats ? this.modules.renamer.getStats() : {};
                this.stats.variablesRenamed = stats.renamed || 0;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 3: String Encryption
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.stringEncryption && this.modules.stringEncryptor) {
                result = this._encryptStrings(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 4: Constant Encryption
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.constantEncryption && this.modules.constantEncryptor) {
                result = this._encryptConstants(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 5: Control Flow
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.controlFlow && this.modules.controlFlow) {
                result = this.modules.controlFlow.obfuscate(result);
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 6: Junk Code
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.junkCode && this.modules.junkGenerator) {
                result = this.modules.junkGenerator.inject(result);
                const stats = this.modules.junkGenerator.getStats ? this.modules.junkGenerator.getStats() : {};
                this.stats.junkInjected = stats.injected || 0;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 7: Security Features
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.environmentCheck && this.modules.environmentChecker) {
                const envCode = this.modules.environmentChecker.generate();
                if (envCode) result = envCode + '\n' + result;
            }

            if (this.config.features.integrityCheck && this.modules.integrityChecker) {
                const intResult = this.modules.integrityChecker.generate(result);
                if (intResult && intResult.wrappedCode) result = intResult.wrappedCode;
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 8: VM Obfuscation (CORE - Luraph Style)
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.vmObfuscation && this.modules.vmObfuscator) {
                try {
                    // Generate bytecode untuk stats
                    if (this.modules.bytecodeGenerator) {
                        const bytecode = this.modules.bytecodeGenerator.generate(result);
                        this.stats.vmInstructions = bytecode.instructions ? bytecode.instructions.length : 0;
                        this.stats.vmConstants = bytecode.constants ? bytecode.constants.length : 0;
                    }

                    // Transform dengan VM Obfuscator (Luraph style)
                    const vmResult = this.modules.vmObfuscator.obfuscate(result);
                    
                    if (vmResult && vmResult.success && vmResult.code) {
                        result = vmResult.code;
                    } else {
                        // Fallback
                        result = this.modules.vmObfuscator.transform(result, { analysis });
                    }
                } catch (vmError) {
                    console.error('VM obfuscation error:', vmError.message);
                    result = this._fallbackWrapper(result);
                }
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 9: Watermark
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.watermark && this.modules.watermarkGenerator) {
                result = this.modules.watermarkGenerator.apply(result, 'top');
            }

            // ═══════════════════════════════════════════════════════════
            // PHASE 10: Minify
            // ═══════════════════════════════════════════════════════════
            if (this.config.features.minify && this.modules.minifier) {
                result = this.modules.minifier.minify(result);
            }

            // Calculate stats
            this.stats.outputSize = Buffer.byteLength(result, 'utf-8');
            this.stats.endTime = Date.now();
            this.stats.processingTime = this.stats.endTime - this.stats.startTime;
            this.stats.ratio = Math.round((this.stats.outputSize / this.stats.inputSize) * 100) / 100;

            if (logger && logger.obfuscate) {
                logger.obfuscate(`Completed in ${this.stats.processingTime}ms`);
                logger.obfuscate(`Size: ${this.stats.inputSize}b → ${this.stats.outputSize}b (${this.stats.ratio}x)`);
                logger.obfuscate(`VM: ${this.stats.vmInstructions} instructions, ${this.stats.vmConstants} constants`);
            }

            return {
                success: true,
                code: result,
                stats: { ...this.stats }
            };

        } catch (error) {
            console.error('Obfuscation failed:', error.message);
            throw error;
        }
    }

    /**
     * Fallback wrapper (Delta compatible)
     */
    _fallbackWrapper(code) {
        const r = this.modules.random;
        const wrapVar = r.generateName(2);
        const envVar = r.generateName(1);
        const funcVar = r.generateName(2);

        return `return(function(...)` +
            `local ${envVar}=getfenv and getfenv()or _ENV or _G;` +
            `local ${funcVar}=function()${code}end;` +
            `return(setfenv and setfenv(${funcVar},${envVar})or ${funcVar})();` +
            `end)(...)`;
    }

    /**
     * Encrypt strings
     */
    _encryptStrings(code) {
        if (!this.modules.stringEncryptor) return code;

        let result = code;
        const regex = /(["'])(?:(?!\1|\\).|\\.)*\1/g;
        const matches = [];
        let match;

        while ((match = regex.exec(code)) !== null) {
            matches.push({
                original: match[0],
                content: match[0].slice(1, -1),
                index: match.index,
                quote: match[1]
            });
        }

        for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i];
            if (m.content.length < 2) continue;
            if (m.content.includes('\\x') || m.content.includes('\\u')) continue;

            try {
                let unescaped = m.content
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'")
                    .replace(/\\\\/g, '\\');

                const encrypted = this.modules.stringEncryptor.encrypt(unescaped);
                if (encrypted) {
                    result = result.slice(0, m.index) + encrypted + result.slice(m.index + m.original.length);
                    this.stats.stringsEncrypted++;
                }
            } catch (e) { /* Skip */ }
        }

        return result;
    }

    /**
     * Encrypt constants
     */
    _encryptConstants(code) {
        if (!this.modules.constantEncryptor) return code;

        let result = code;
        const r = this.modules.random;

        // Numbers
        result = result.replace(/(?<![a-zA-Z_\d.])(\d+)(?![a-zA-Z_\d.])/g, (match, num) => {
            const n = parseInt(num);
            if (n >= 0 && n <= 100000 && r.bool(0.6)) {
                this.stats.constantsEncrypted++;
                return this.modules.constantEncryptor.encryptNumber(n);
            }
            return match;
        });

        // Booleans
        result = result.replace(/\btrue\b/g, () => {
            if (r.bool(0.7)) {
                this.stats.constantsEncrypted++;
                return this.modules.constantEncryptor.encryptBoolean(true);
            }
            return 'true';
        });

        result = result.replace(/\bfalse\b/g, () => {
            if (r.bool(0.7)) {
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
        const opens = (code.match(/\b(function|do|if|while|for|repeat)\b/g) || []).length;
        const closes = (code.match(/\b(end|until)\b/g) || []).length;

        if (Math.abs(opens - closes) > 3) {
            errors.push(`Unbalanced blocks: ${opens} openers, ${closes} closers`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Get features info
     */
    static getFeatures() {
        return {
            vmObfuscation: { name: 'VM Obfuscation', emoji: '🔀', description: 'Luraph-style VM bytecode protection' },
            stringEncryption: { name: 'String Encryption', emoji: '🔐', description: 'XOR encrypted strings' },
            controlFlow: { name: 'Control Flow', emoji: '🌀', description: 'Control flow flattening' },
            junkCode: { name: 'Junk Code', emoji: '🗑️', description: 'Dead code injection' },
            variableRenaming: { name: 'Variable Renaming', emoji: '📝', description: 'Luraph-style naming' },
            constantEncryption: { name: 'Constant Encryption', emoji: '🔢', description: 'Number/boolean obfuscation' },
            integrityCheck: { name: 'Integrity Check', emoji: '✅', description: 'Anti-tamper protection' },
            environmentCheck: { name: 'Environment Check', emoji: '🛡️', description: 'Anti-debug checks' },
            watermark: { name: 'Watermark', emoji: '💧', description: 'Custom watermark' },
            minify: { name: 'Minify', emoji: '📦', description: 'Code minification' }
        };
    }

    /**
     * Get stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset
     */
    reset() {
        const modules = this.modules;
        if (modules.random && modules.random.resetNames) modules.random.resetNames();
        if (modules.renamer && modules.renamer.reset) modules.renamer.reset();
        if (modules.junkGenerator && modules.junkGenerator.reset) modules.junkGenerator.reset();
        if (modules.controlFlow && modules.controlFlow.reset) modules.controlFlow.reset();
        if (modules.vmObfuscator && modules.vmObfuscator.reset) modules.vmObfuscator.reset();
        if (modules.stringEncryptor && modules.stringEncryptor.reset) modules.stringEncryptor.reset();
        if (modules.keyGenerator && modules.keyGenerator.reset) modules.keyGenerator.reset();
        if (modules.bytecodeGenerator && modules.bytecodeGenerator.reset) modules.bytecodeGenerator.reset();
        if (modules.vmTemplate && modules.vmTemplate.reset) modules.vmTemplate.reset();
        
        this.stats = {};
        this.initialized = false;
    }
}

// Singleton
const instance = new Obfuscator();

module.exports = {
    obfuscate: async (code, options) => instance.obfuscate(code, options),
    validateCode: (code) => { instance.init({}); return instance.validateCode(code); },
    getFeatures: () => Obfuscator.getFeatures(),
    Obfuscator,
    modules: {
        LuaParser, StringEncryptor, ConstantEncryptor, KeyGenerator,
        Renamer, JunkGenerator, ControlFlowObfuscator, VMObfuscator,
        BytecodeGenerator, VMTemplate, VMCompiler, VMShuffler, OpcodeManager,
        IntegrityChecker, EnvironmentChecker, WatermarkGenerator,
        OutputGenerator, Minifier, Serializer
    }
};
