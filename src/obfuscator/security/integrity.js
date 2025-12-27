/**
 * LuaShield - Integrity Check
 * Anti-tamper dan code integrity verification
 */

const Random = require('../../utils/random');
const ConstantEncryptor = require('../encryption/constants');

class IntegrityChecker {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.constantEncryptor = new ConstantEncryptor({ seed: options.seed });
        
        this.config = {
            checkInterval: options.checkInterval || 1000,
            hashAlgorithm: options.hashAlgorithm || 'simple',
            failAction: options.failAction || 'error'
        };
    }

    /**
     * Generate integrity check code
     */
    generate(code) {
        const hash = this._calculateHash(code);
        const checkCode = this._generateCheckCode(hash);
        
        return {
            wrappedCode: checkCode + code,
            hash: hash
        };
    }

    /**
     * Calculate simple hash dari code
     */
    _calculateHash(code) {
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Generate check code
     */
    _generateCheckCode(hash) {
        const vars = {
            hashVar: this.random.generateName(2),
            checkFunc: this.random.generateName(2),
            resultVar: this.random.generateName(1),
            errorFunc: this.random.generateName(2),
            validFlag: this.random.generateName(2)
        };

        const encodedHash = this.random.formatNumber(hash);
        const opaquePredicate = this.constantEncryptor.generateOpaquePredicate(true);

        let code = '';

        // Hash storage dengan obfuscation
        code += `local ${vars.hashVar}=${this._obfuscateHash(hash)};`;

        // Integrity check function
        code += `local ${vars.checkFunc}=(function()`;
        code += `local ${vars.resultVar}=${vars.hashVar};`;
        
        // Multiple verification layers
        code += `if not(${opaquePredicate})then `;
        code += `${vars.resultVar}=${this.random.formatNumber(0)};`;
        code += `end;`;
        
        // Check dengan opaque predicate
        code += `if ${vars.resultVar}~=${encodedHash} and ${this.constantEncryptor.generateOpaquePredicate(false)} then `;
        code += this._generateFailAction(vars);
        code += `end;`;
        
        code += `return ${this.constantEncryptor.encryptBoolean(true)};`;
        code += `end);`;

        // Execute check
        code += `local ${vars.validFlag}=${vars.checkFunc}();`;

        // Additional runtime check
        code += this._generateRuntimeCheck(vars);

        return code;
    }

    /**
     * Obfuscate hash value
     */
    _obfuscateHash(hash) {
        const method = this.random.int(1, 4);

        if (method === 1) {
            // XOR obfuscation
            const key = this.random.int(10000, 99999);
            const encrypted = hash ^ key;
            return `bit32.bxor(${this.random.formatNumber(encrypted)},${this.random.formatNumber(key)})`;
        } else if (method === 2) {
            // Addition obfuscation
            const a = this.random.int(-999999, 999999);
            const b = hash - a;
            return `(${this.random.formatNumber(a)}+${this.random.formatNumber(b)})`;
        } else if (method === 3) {
            // Multiplication + addition
            const factor = this.random.int(2, 50);
            const remainder = hash % factor;
            const quotient = Math.floor((hash - remainder) / factor);
            return `(${this.random.formatNumber(factor)}*${this.random.formatNumber(quotient)}+${this.random.formatNumber(remainder)})`;
        } else {
            // Nested XOR
            const key1 = this.random.int(10000, 99999);
            const key2 = this.random.int(10000, 99999);
            const encrypted = (hash ^ key1) ^ key2;
            return `bit32.bxor(bit32.bxor(${this.random.formatNumber(encrypted)},${this.random.formatNumber(key1)}),${this.random.formatNumber(key2)})`;
        }
    }

    /**
     * Generate fail action code
     */
    _generateFailAction(vars) {
        const action = this.config.failAction;
        
        if (action === 'error') {
            const errorMessages = [
                'Integrity check failed',
                'Code has been modified',
                'Tampering detected',
                'Security violation'
            ];
            const msg = this.random.choice(errorMessages);
            return `error("${msg}");`;
        } else if (action === 'crash') {
            return `while true do end;`;
        } else if (action === 'silent') {
            return `return nil;`;
        } else {
            return `error("Security error");`;
        }
    }

    /**
     * Generate runtime integrity check
     */
    _generateRuntimeCheck(vars) {
        const checkVar = this.random.generateName(2);
        const timerVar = this.random.generateName(2);
        
        let code = '';

        // Periodic check (untuk Roblox bisa pakai task.spawn)
        code += `local ${checkVar}=(function()`;
        code += `if not ${vars.validFlag} then `;
        code += `return;`;
        code += `end;`;
        code += `end);`;

        // Self-verification
        code += `if type(${vars.checkFunc})~='function' then `;
        code += `error('Integrity compromised');`;
        code += `end;`;

        return code;
    }

    /**
     * Generate function integrity wrapper
     */
    wrapFunction(funcCode, funcName) {
        const vars = {
            original: this.random.generateName(2),
            wrapper: this.random.generateName(2),
            checksum: this.random.generateName(2)
        };

        const hash = this._calculateHash(funcCode);

        let code = '';
        code += `local ${vars.original}=${funcCode};`;
        code += `local ${vars.checksum}=${this._obfuscateHash(hash)};`;
        code += `local ${vars.wrapper}=function(...)`;
        code += `if type(${vars.original})~='function' then error('Function tampered');end;`;
        code += `return ${vars.original}(...);`;
        code += `end;`;

        return code + `local ${funcName}=${vars.wrapper};`;
    }

    /**
     * Generate self-check code block
     */
    generateSelfCheck() {
        const vars = {
            selfCheck: this.random.generateName(2),
            marker: this.random.generateName(1)
        };

        const marker = this.random.largeNumber();

        let code = '';
        code += `local ${vars.marker}=${this.random.formatNumber(marker)};`;
        code += `local ${vars.selfCheck}=(function()`;
        code += `local m=${vars.marker};`;
        code += `if m~=${this.random.formatNumber(marker)} then `;
        code += `while ${this.constantEncryptor.encryptBoolean(true)} do end;`;
        code += `end;`;
        code += `return m;`;
        code += `end);`;
        code += `${vars.selfCheck}();`;

        return code;
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
    }
}

module.exports = IntegrityChecker;
