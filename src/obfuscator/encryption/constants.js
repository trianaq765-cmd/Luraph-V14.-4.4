/**
 * LuaShield - Constant Encryption
 * Obfuscate numbers, booleans, dan nil values
 */

const Random = require('../../utils/random');

class ConstantEncryptor {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.contextVar = options.contextVar || this.random.generateName(1);
    }

    /**
     * Encrypt number dengan berbagai method
     */
    encryptNumber(num) {
        const method = this.random.choice(['xor', 'add', 'sub', 'mul_add', 'nested', 'bitwise', 'direct']);
        
        switch (method) {
            case 'xor':
                return this._encryptXor(num);
            case 'add':
                return this._encryptAdd(num);
            case 'sub':
                return this._encryptSub(num);
            case 'mul_add':
                return this._encryptMulAdd(num);
            case 'nested':
                return this._encryptNested(num);
            case 'bitwise':
                return this._encryptBitwise(num);
            case 'direct':
            default:
                return this.random.formatNumber(num);
        }
    }

    _encryptXor(num) {
        const key = this.random.int(100000, 9999999);
        const encrypted = num ^ key;
        return `bit32.bxor(${this.random.formatNumber(encrypted)},${this.random.formatNumber(key)})`;
    }

    _encryptAdd(num) {
        const a = this.random.int(-999999, 999999);
        const b = num - a;
        return `(${this.random.formatNumber(a)}+${this.random.formatNumber(b)})`;
    }

    _encryptSub(num) {
        const b = this.random.int(-999999, 999999);
        const a = num + b;
        return `(${this.random.formatNumber(a)}-${this.random.formatNumber(b)})`;
    }

    _encryptMulAdd(num) {
        const a = this.random.int(2, 100);
        const c = ((num % a) + a) % a; // Ensure positive
        const b = Math.floor((num - c) / a);
        return `(${this.random.formatNumber(a)}*${this.random.formatNumber(b)}+${this.random.formatNumber(c)})`;
    }

    _encryptNested(num) {
        const c = this.random.int(1, 10000);
        const target = num - c;
        const b = this.random.int(10000, 99999);
        const a = target ^ b;
        return `(bit32.bxor(${this.random.formatNumber(a)},${this.random.formatNumber(b)})+${this.random.formatNumber(c)})`;
    }

    _encryptBitwise(num) {
        const ops = ['band', 'bor', 'bxor'];
        const op = this.random.choice(ops);
        
        if (op === 'band') {
            // a AND 0xFFFFFFFF = a
            return `bit32.band(${this.random.formatNumber(num)},${this.random.formatNumber(0xFFFFFFFF)})`;
        } else if (op === 'bor') {
            // a OR 0 = a
            return `bit32.bor(${this.random.formatNumber(num)},${this.random.formatNumber(0)})`;
        } else {
            // a XOR 0 = a
            return `bit32.bxor(${this.random.formatNumber(num)},${this.random.formatNumber(0)})`;
        }
    }

    /**
     * Encrypt boolean
     */
    encryptBoolean(value) {
        const methods = value ? [
            // True expressions
            () => `(not not(${this.random.formatNumber(1)}))`,
            () => {
                const n = this.random.int(100, 999);
                return `(${this.random.formatNumber(n)}==${this.random.formatNumber(n)})`;
            },
            () => `(#''<${this.random.formatNumber(1)})`,
            () => `(not(nil))`,
            () => `(not(not(${this.random.formatNumber(this.random.int(1, 100))})))`,
            () => {
                const n = this.random.int(1, 100);
                return `(${this.random.formatNumber(n)}>${this.random.formatNumber(0)})`;
            },
            () => `((function()return not(nil)end)())`,
            () => `(type('')=='string')`
        ] : [
            // False expressions
            () => `(not(${this.random.formatNumber(1)}))`,
            () => {
                const a = this.random.int(100, 999);
                const b = this.random.int(1000, 9999);
                return `(${this.random.formatNumber(a)}==${this.random.formatNumber(b)})`;
            },
            () => `(#''>${this.random.formatNumber(0)})`,
            () => `(not(not(nil)))`,
            () => {
                const n = this.random.int(1, 100);
                return `(${this.random.formatNumber(n)}<${this.random.formatNumber(0)})`;
            },
            () => `((function()return not(${this.random.formatNumber(1)})end)())`,
            () => `(type('')=='number')`
        ];

        return this.random.choice(methods)();
    }

    /**
     * Encrypt nil
     */
    encryptNil() {
        const methods = [
            () => `({})[${this.random.formatNumber(1)}]`,
            () => `nil`,
            () => `((function()end)())`,
            () => `(({[${this.random.formatNumber(0)}]=${this.random.formatNumber(1)}})[${this.random.formatNumber(1)}])`,
            () => `(select(${this.random.formatNumber(2)},nil))`,
            () => {
                const varName = this.random.generateName(1);
                return `((function()local ${varName};return ${varName};end)())`;
            }
        ];

        return this.random.choice(methods)();
    }

    /**
     * Generate complex constant expression (Luraph style)
     * Contoh: (R)[4369]=-6732786790+((K.jU((K.DU(K.k[0B1_1]-R[7056]...
     */
    generateComplexExpression(targetValue) {
        const varName1 = this.random.generateName(1);
        const varName2 = this.random.generateName(1);
        const funcName1 = this.random.generateName(2);
        const funcName2 = this.random.generateName(2);
        
        const idx1 = this.random.formatNumber(this.random.int(1000, 9999));
        const idx2 = this.random.formatNumber(this.random.int(1000, 9999));
        const idx3 = this.random.formatNumber(this.random.int(1, 20));
        const idx4 = this.random.formatNumber(this.random.int(1, 20));
        
        // Generate expression that equals targetValue
        const base = this.random.largeNumber();
        const offset = targetValue - base;
        
        const baseFormatted = offset < 0 
            ? this.random.formatNumber(Math.abs(offset))
            : this.random.formatNumber(offset);
        
        const sign = offset < 0 ? '-' : '+';
        
        return `${this.random.formatNumber(base)}${sign}((${varName1}.${funcName1}((${varName1}.${funcName2}(${varName1}.k[${idx3}]-${varName2}[${idx1}],${varName1}.k[${idx4}]))))+${varName1}.k[${this.random.formatNumber(this.random.int(1, 16))}])`;
    }

    /**
     * Create constant table dengan lookups
     */
    createConstantTable(constants) {
        const tableVar = this.random.generateName(2);
        const entries = [];
        const lookupMap = {};
        
        for (let i = 0; i < constants.length; i++) {
            const constant = constants[i];
            const keyIndex = this.random.formatNumber(this.random.int(1000, 9999));
            
            let encrypted;
            if (typeof constant === 'number') {
                encrypted = this.encryptNumber(constant);
            } else if (typeof constant === 'boolean') {
                encrypted = this.encryptBoolean(constant);
            } else if (constant === null || constant === undefined) {
                encrypted = this.encryptNil();
            } else {
                encrypted = this.random.formatNumber(constant);
            }
            
            entries.push(`[${keyIndex}]=${encrypted}`);
            lookupMap[i] = keyIndex;
        }
        
        const shuffled = this.random.shuffle(entries);
        
        return {
            declaration: `local ${tableVar}={${shuffled.join(',')}};`,
            variable: tableVar,
            lookupMap
        };
    }

    /**
     * Generate opaque predicate (selalu true atau false)
     */
    generateOpaquePredicate(value = true) {
        if (value) {
            const methods = [
                () => {
                    const n = this.random.int(10, 99);
                    return `(${this.random.formatNumber(n * n)}==${this.random.formatNumber(n)}*${this.random.formatNumber(n)})`;
                },
                () => {
                    const n = this.random.int(1, 100);
                    return `(${this.random.formatNumber(n + n)}==${this.random.formatNumber(2)}*${this.random.formatNumber(n)})`;
                },
                () => `(bit32.band(${this.random.formatNumber(this.random.int(1, 1000))},${this.random.formatNumber(0)})~=${this.random.formatNumber(1)})`,
                () => `(type({})=='table')`
            ];
            return this.random.choice(methods)();
        } else {
            const methods = [
                () => {
                    const n = this.random.int(10, 99);
                    const m = n + this.random.int(1, 10);
                    return `(${this.random.formatNumber(n)}==${this.random.formatNumber(m)})`;
                },
                () => `(type({})=='string')`,
                () => `(${this.random.formatNumber(1)}>${this.random.formatNumber(2)})`
            ];
            return this.random.choice(methods)();
        }
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
    }
}

module.exports = ConstantEncryptor;
