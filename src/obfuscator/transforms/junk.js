/**
 * LuaShield - Junk Code Generator
 * Inject dead code, fake branches, dan opaque predicates
 */

const Random = require('../../utils/random');
const ConstantEncryptor = require('../encryption/constants');

class JunkGenerator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.constantEncryptor = new ConstantEncryptor({ seed: options.seed });
        
        this.config = {
            density: options.density || 0.25,
            maxPerBlock: options.maxPerBlock || 3,
            types: options.types || ['deadVar', 'deadBranch', 'mathIdentity', 'emptyLoop', 'fakeCall']
        };

        this.stats = {
            injected: 0,
            byType: {}
        };
    }

    /**
     * Generate single junk code snippet
     */
    generate(type = null) {
        type = type || this.random.choice(this.config.types);
        
        let code;
        switch (type) {
            case 'deadVar':
                code = this._deadVariable();
                break;
            case 'deadBranch':
                code = this._deadBranch();
                break;
            case 'mathIdentity':
                code = this._mathIdentity();
                break;
            case 'emptyLoop':
                code = this._emptyLoop();
                break;
            case 'fakeCall':
                code = this._fakeCall();
                break;
            case 'multiVar':
                code = this._multiVariable();
                break;
            case 'nestedIf':
                code = this._nestedIf();
                break;
            default:
                code = this._deadVariable();
        }

        this.stats.injected++;
        this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;

        return code;
    }

    /**
     * Dead variable declaration
     */
    _deadVariable() {
        const varName = this.random.generateName();
        const valueType = this.random.choice(['number', 'string', 'table', 'bool', 'nil']);
        
        let value;
        switch (valueType) {
            case 'number':
                value = this.random.formatNumber(this.random.largeNumber());
                break;
            case 'string':
                const strLen = this.random.int(3, 10);
                const chars = [];
                for (let i = 0; i < strLen; i++) {
                    chars.push(`\\${this.random.int(65, 122)}`);
                }
                value = `"${chars.join('')}"`;
                break;
            case 'table':
                value = `{${this.random.formatNumber(this.random.int(1, 100))},${this.random.formatNumber(this.random.int(1, 100))}}`;
                break;
            case 'bool':
                value = this.constantEncryptor.encryptBoolean(this.random.bool());
                break;
            case 'nil':
                value = this.constantEncryptor.encryptNil();
                break;
        }

        return `local ${varName}=${value};`;
    }

    /**
     * Dead branch (never executed)
     */
    _deadBranch() {
        const predicate = this.constantEncryptor.generateOpaquePredicate(false);
        const varName = this.random.generateName();
        const value = this.random.formatNumber(this.random.largeNumber());
        
        const body = this.random.choice([
            `local ${varName}=${value};`,
            `${varName}=${value};${varName}=nil;`,
            `do local ${varName}=${value};end;`,
            `repeat local ${varName}=${value};until ${this.constantEncryptor.encryptBoolean(true)};`
        ]);

        return `if ${predicate} then ${body}end;`;
    }

    /**
     * Math identity (a = a + 0, a = a * 1, etc)
     */
    _mathIdentity() {
        const varName = this.random.generateName();
        const initialValue = this.random.formatNumber(this.random.int(1, 1000));
        
        const identity = this.random.choice([
            `${varName}=${varName}+${this.random.formatNumber(0)};`,
            `${varName}=${varName}*${this.random.formatNumber(1)};`,
            `${varName}=${varName}-${this.random.formatNumber(0)};`,
            `${varName}=bit32.bxor(${varName},${this.random.formatNumber(0)});`,
            `${varName}=bit32.bor(${varName},${this.random.formatNumber(0)});`,
            `${varName}=${varName}^${this.random.formatNumber(1)};`
        ]);

        return `local ${varName}=${initialValue};${identity}`;
    }

    /**
     * Empty loop
     */
    _emptyLoop() {
        const varName = this.random.generateName();
        const style = this.random.int(1, 4);
        
        if (style === 1) {
            // for loop dengan 0 iterations
            return `for ${varName}=${this.random.formatNumber(1)},${this.random.formatNumber(0)} do end;`;
        } else if (style === 2) {
            // while false
            return `while ${this.constantEncryptor.generateOpaquePredicate(false)} do local ${varName}=${this.random.formatNumber(0)};end;`;
        } else if (style === 3) {
            // repeat until true
            const innerVar = this.random.generateName();
            return `repeat local ${innerVar}=${this.random.formatNumber(this.random.int(1, 100))};until ${this.constantEncryptor.encryptBoolean(true)};`;
        } else {
            // Empty do block
            return `do end;`;
        }
    }

    /**
     * Fake function call (ke function yang tidak ada side effect)
     */
    _fakeCall() {
        const style = this.random.int(1, 5);
        
        if (style === 1) {
            const varName = this.random.generateName();
            return `local ${varName}=type(${this.random.formatNumber(this.random.int(1, 100))});`;
        } else if (style === 2) {
            const varName = this.random.generateName();
            return `local ${varName}=tostring(${this.random.formatNumber(this.random.largeNumber())});`;
        } else if (style === 3) {
            const varName = this.random.generateName();
            return `local ${varName}=#"${this.random.key(5)}";`;
        } else if (style === 4) {
            const varName = this.random.generateName();
            return `local ${varName}=select(${this.random.formatNumber(1)},${this.random.formatNumber(this.random.int(1, 100))});`;
        } else {
            const varName = this.random.generateName();
            return `local ${varName}=(function()return ${this.random.formatNumber(this.random.int(1, 100))};end)();`;
        }
    }

    /**
     * Multiple variable declaration
     */
    _multiVariable() {
        const count = this.random.int(2, 4);
        const vars = [];
        const values = [];

        for (let i = 0; i < count; i++) {
            vars.push(this.random.generateName());
            values.push(this.random.formatNumber(this.random.int(1, 10000)));
        }

        return `local ${vars.join(',')}=${values.join(',')};`;
    }

    /**
     * Nested if dengan opaque predicates
     */
    _nestedIf() {
        const v1 = this.random.generateName();
        const v2 = this.random.generateName();
        const val1 = this.random.formatNumber(this.random.int(1, 100));
        const val2 = this.random.formatNumber(this.random.int(1, 100));
        
        const pred1 = this.constantEncryptor.generateOpaquePredicate(true);
        const pred2 = this.constantEncryptor.generateOpaquePredicate(false);

        return `if ${pred1} then local ${v1}=${val1};if ${pred2} then local ${v2}=${val2};end;end;`;
    }

    /**
     * Inject junk code ke dalam code
     */
    inject(code, density = null) {
        density = density || this.config.density;
        
        const lines = code.split('\n');
        const result = [];
        let injectedInBlock = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Reset counter setiap block baru
            if (line.match(/\b(function|do|then|else)\b/) && !line.match(/\bend\b/)) {
                injectedInBlock = 0;
            }

            // Inject sebelum line dengan probability tertentu
            if (this.random.bool(density) && injectedInBlock < this.config.maxPerBlock && line.length > 0) {
                const junk = this.generate();
                result.push(junk);
                injectedInBlock++;
            }

            result.push(lines[i]);

            // Inject setelah line dengan probability lebih rendah
            if (this.random.bool(density * 0.5) && injectedInBlock < this.config.maxPerBlock) {
                const junk = this.generate();
                result.push(junk);
                injectedInBlock++;
            }
        }

        return result.join('\n');
    }

    /**
     * Generate multiple junk codes
     */
    generateBatch(count) {
        const junks = [];
        for (let i = 0; i < count; i++) {
            junks.push(this.generate());
        }
        return junks;
    }

    /**
     * Get stats
     */
    getStats() {
        return this.stats;
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
        this.stats = { injected: 0, byType: {} };
    }
}

module.exports = JunkGenerator;
