/**
 * LuaShield - Advanced Random Generator
 * Generates Luraph-style professional names & numbers
 */

class Random {
    constructor(seed = null) {
        this.seed = seed || Date.now();
        this.usedNames = new Set();
        
        // Character sets untuk name generation
        this.charsLower = 'abcdefghijklmnopqrstuvwxyz';
        this.charsUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.charsAll = this.charsLower + this.charsUpper;
    }

    /**
     * Basic Random
     */
    float() {
        // Simple PRNG untuk consistency
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    int(min, max) {
        return Math.floor(this.float() * (max - min + 1)) + min;
    }

    bool(probability = 0.5) {
        return this.float() < probability;
    }

    choice(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[this.int(0, arr.length - 1)];
    }

    weightedChoice(options, weights) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = this.float() * totalWeight;
        
        for (let i = 0; i < options.length; i++) {
            random -= weights[i];
            if (random <= 0) return options[i];
        }
        return options[options.length - 1];
    }

    shuffle(arr) {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.int(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * 🎯 LURAPH STYLE NAME GENERATION
     * Contoh: d, Q, R, g, K, U, c, Z, FU, JU, _y, Wy, UU, hU, jU
     */
    generateName(length = null) {
        length = length || this.int(1, 3);
        let name = '';
        let attempts = 0;

        do {
            if (length === 1) {
                // Single char: a-z, A-Z
                name = this.choice(this.charsAll.split(''));
            } 
            else if (length === 2) {
                // Two chars dengan pattern variatif
                const pattern = this.choice([
                    'UU', // FU, JU, UU
                    'Ul', // Wy, Ky
                    'lU', // hU, jU
                    '_l', // _y, _a
                    'l_', // a_, b_
                    'll', // ab, cd
                    'UL'  // AB (rare)
                ]);
                
                name = this._generateByPattern(pattern);
            }
            else {
                // 3+ chars
                const firstType = this.choice(['_', 'l', 'U']);
                if (firstType === '_') {
                    name = '_';
                } else if (firstType === 'l') {
                    name = this.choice(this.charsLower.split(''));
                } else {
                    name = this.choice(this.charsUpper.split(''));
                }

                for (let i = 1; i < length; i++) {
                    const charType = this.bool(0.6) ? 'U' : 'l';
                    if (charType === 'U') {
                        name += this.choice(this.charsUpper.split(''));
                    } else {
                        name += this.choice(this.charsLower.split(''));
                    }
                }
            }
            attempts++;
        } while (this.usedNames.has(name) && attempts < 1000);

        // Jika masih duplikat, tambah suffix
        while (this.usedNames.has(name)) {
            name += this.choice(this.charsAll.split(''));
        }

        this.usedNames.add(name);
        return name;
    }

    _generateByPattern(pattern) {
        let result = '';
        for (const char of pattern) {
            if (char === 'U') {
                result += this.choice(this.charsUpper.split(''));
            } else if (char === 'l') {
                result += this.choice(this.charsLower.split(''));
            } else if (char === 'L') {
                result += this.choice(this.charsUpper.split(''));
            } else if (char === '_') {
                result += '_';
            }
        }
        return result;
    }

    generateUniqueName() {
        return this.generateName(this.int(1, 3));
    }

    generateNameBatch(count) {
        const names = [];
        for (let i = 0; i < count; i++) {
            names.push(this.generateName());
        }
        return names;
    }

    resetNames() {
        this.usedNames.clear();
    }

    /**
     * 🎯 LURAPH STYLE NUMBER FORMATTING
     * Contoh: 0X1, 0B10101, 0b10_0, 0X7_B, 0x009fA__
     */
    formatNumber(num) {
        const formats = [
            // Decimal biasa (15%)
            (n) => String(n),
            
            // Hex uppercase: 0X7B (20%)
            (n) => `0X${n.toString(16).toUpperCase()}`,
            
            // Hex lowercase: 0x7b (15%)
            (n) => `0x${n.toString(16)}`,
            
            // Binary: 0B1111011 (15%)
            (n) => `0B${n.toString(2)}`,
            
            // Binary dengan underscore: 0B111_1011 (20%)
            (n) => {
                let bin = n.toString(2);
                if (bin.length > 4) {
                    const pos = this.int(2, bin.length - 2);
                    bin = bin.slice(0, pos) + '_' + bin.slice(pos);
                }
                return `0B${bin}`;
            },
            
            // Hex dengan underscore: 0X7_B, 0x00_9fA__ (15%)
            (n) => {
                let hex = n.toString(16).toUpperCase();
                if (hex.length > 2 && this.bool(0.5)) {
                    const pos = this.int(1, hex.length - 1);
                    hex = hex.slice(0, pos) + '_' + hex.slice(pos);
                }
                if (this.bool(0.3)) {
                    hex += '_';
                    if (this.bool(0.3)) hex += '_';
                }
                return `0X${hex}`;
            }
        ];

        const weights = [15, 20, 15, 15, 20, 15];
        const format = this.weightedChoice(formats, weights);
        
        return format(Math.abs(Math.floor(num)));
    }

    /**
     * Random Bytes & Keys
     */
    bytes(length) {
        const result = [];
        for (let i = 0; i < length; i++) {
            result.push(this.int(0, 255));
        }
        return result;
    }

    key(length = null) {
        length = length || this.int(8, 32);
        const chars = this.charsAll + '0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += this.choice(chars.split(''));
        }
        return result;
    }

    largeNumber() {
        return this.int(1000000, 9999999999);
    }

    negativeNumber() {
        return -this.largeNumber();
    }

    /**
     * Complex Expression untuk obfuscated numbers
     * Contoh: (K.jU((K.DU(K.k[0B1_1]-R[7056],K.k[0B0010]))))+K.k[8]
     */
    generateComplexExpression(targetValue, contextVar = 'K') {
        const v1 = this.generateName(1);
        const v2 = this.generateName(2);
        const ops = ['bxor', 'band', 'bor'];
        
        const n1 = this.formatNumber(this.int(1, 32));
        const n2 = this.formatNumber(this.largeNumber());
        const n3 = this.formatNumber(this.int(1, 16));
        
        return `(${contextVar}.${this.choice(ops)}((${contextVar}.${this.choice(ops)}(${contextVar}.k[${n1}]-${v1}[${n2}],${contextVar}.k[${n3}]))))+${contextVar}.k[${this.formatNumber(this.int(1, 16))}]`;
    }
}

module.exports = Random;
