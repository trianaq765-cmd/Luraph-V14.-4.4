/**
 * LuaShield - Obfuscator Configuration
 * Central configuration untuk semua obfuscation settings
 */

const Config = {
    // ═══════════════════════════════════════════════════════════
    // GENERAL
    // ═══════════════════════════════════════════════════════════
    VERSION: '1.0.0',
    WATERMARK_TEXT: 'This file was protected using LuaShield Obfuscator v%VERSION% [https://luashield.dev]',
    
    // ═══════════════════════════════════════════════════════════
    // TARGET PLATFORMS
    // ═══════════════════════════════════════════════════════════
    Targets: {
        ROBLOX: 'roblox',
        LOADSTRING: 'loadstring',
        STANDARD: 'standard'
    },

    // Platform-specific settings
    PlatformSettings: {
        roblox: {
            useBit32: true,
            useGetfenv: false,  // Not available in Roblox
            useLoadstring: false,
            useDebug: false,
            globals: ['game', 'workspace', 'script', 'Instance', 'Vector3', 'CFrame', 'Color3', 'UDim2', 'Enum', 'task', 'wait', 'spawn', 'delay'],
            executorCompat: true
        },
        loadstring: {
            useBit32: true,
            useGetfenv: true,
            useLoadstring: true,
            useDebug: false,
            globals: [],
            executorCompat: false
        },
        standard: {
            useBit32: true,
            useGetfenv: true,
            useLoadstring: true,
            useDebug: true,
            globals: [],
            executorCompat: false
        }
    },

    // ═══════════════════════════════════════════════════════════
    // VARIABLE NAMING (Luraph Style)
    // ═══════════════════════════════════════════════════════════
    Naming: {
        // Short names seperti Luraph: d, Q, R, g, K, U, c, Z
        shortNames: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        
        // Two-char patterns: FU, JU, Wy, UU, hU, jU, _y
        twoCharPatterns: ['UU', 'Ul', 'lU', '_l', 'l_', 'll', 'UL'],
        
        // Min/max length
        minLength: 1,
        maxLength: 3,
        
        // Probability untuk underscore prefix
        underscoreProbability: 0.15
    },

    // ═══════════════════════════════════════════════════════════
    // NUMBER ENCODING (Luraph Style)
    // ═══════════════════════════════════════════════════════════
    NumberEncoding: {
        styles: [
            { name: 'decimal', weight: 15 },      // 123
            { name: 'hexUpper', weight: 20 },     // 0X7B
            { name: 'hexLower', weight: 15 },     // 0x7b
            { name: 'binary', weight: 15 },       // 0B1111011
            { name: 'binaryUnderscore', weight: 20 }, // 0B111_1011
            { name: 'hexUnderscore', weight: 15 }  // 0X7_B
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // STRING ENCRYPTION
    // ═══════════════════════════════════════════════════════════
    StringEncryption: {
        methods: ['xor', 'bytes', 'escape', 'split'],
        defaultMethod: 'xor',
        keyLength: { min: 8, max: 32 },
        splitChunkSize: { min: 1, max: 5 }
    },

    // ═══════════════════════════════════════════════════════════
    // CONSTANT ENCRYPTION
    // ═══════════════════════════════════════════════════════════
    ConstantEncryption: {
        methods: ['xor', 'add', 'mul_add', 'nested', 'direct'],
        encryptBooleans: true,
        encryptNil: true,
        minNumber: -999999999,
        maxNumber: 999999999
    },

    // ═══════════════════════════════════════════════════════════
    // CONTROL FLOW
    // ═══════════════════════════════════════════════════════════
    ControlFlow: {
        maxDepth: 5,
        opaquePredicates: true,
        bogusJumps: true,
        flattenLoops: true,
        stateVariables: { min: 2, max: 5 }
    },

    // ═══════════════════════════════════════════════════════════
    // JUNK CODE
    // ═══════════════════════════════════════════════════════════
    JunkCode: {
        density: 0.3,  // 30% junk ratio
        types: ['deadBranch', 'unusedVar', 'fakeCall', 'mathIdentity'],
        maxPerBlock: 3
    },

    // ═══════════════════════════════════════════════════════════
    // VM OBFUSCATION
    // ═══════════════════════════════════════════════════════════
    VM: {
        shuffleOpcodes: true,
        inlineDecoder: true,
        multipleVMs: false,
        opcodeCount: 50
    },

    // ═══════════════════════════════════════════════════════════
    // SECURITY
    // ═══════════════════════════════════════════════════════════
    Security: {
        integrityCheckInterval: 1000,
        environmentChecks: ['debug', 'getfenv', 'setfenv', 'loadstring'],
        antiTamperStrength: 'medium'
    },

    // ═══════════════════════════════════════════════════════════
    // OUTPUT
    // ═══════════════════════════════════════════════════════════
    Output: {
        minify: true,
        singleLine: false,
        removeComments: true,
        addWatermark: true
    }
};

module.exports = Config;
