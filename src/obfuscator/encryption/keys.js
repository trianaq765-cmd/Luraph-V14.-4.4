/**
 * LuaShield - Key Generation & Management
 * Generates encryption keys untuk string/constant encryption
 */

const Random = require('../../utils/random');

class KeyGenerator {
    constructor(seed = null) {
        this.random = new Random(seed);
        this.masterKey = null;
        this.keyCache = new Map();
    }

    /**
     * Initialize master key untuk session
     */
    initSession() {
        this.masterKey = {
            primary: this.random.largeNumber(),
            secondary: this.random.largeNumber(),
            salt: this.random.bytes(16),
            iv: this.random.bytes(8),
            rounds: this.random.int(3, 7)
        };
        this.keyCache.clear();
        return this.masterKey;
    }

    /**
     * Generate XOR key dengan panjang tertentu
     */
    generateXorKey(length = null) {
        length = length || this.random.int(8, 32);
        return this.random.bytes(length);
    }

    /**
     * Generate numeric keys untuk constant encryption
     */
    generateNumericKeys(count = 4) {
        const keys = [];
        for (let i = 0; i < count; i++) {
            keys.push({
                value: this.random.largeNumber(),
                negative: this.random.bool(0.4)
            });
        }
        return keys;
    }

    /**
     * Generate key table dengan nama random (Luraph style)
     * Output: { jU: 12345, hU: 67890, ... }
     */
    generateKeyTable(count = null) {
        count = count || this.random.int(5, 12);
        const table = {};
        
        for (let i = 0; i < count; i++) {
            const keyName = this.random.generateName(2);
            let value = this.random.largeNumber();
            
            if (this.random.bool(0.3)) {
                value = -value;
            }
            
            table[keyName] = value;
        }
        
        return table;
    }

    /**
     * Derive key dari master key
     */
    deriveKey(index, length = 16) {
        const cacheKey = `${index}_${length}`;
        
        if (this.keyCache.has(cacheKey)) {
            return this.keyCache.get(cacheKey);
        }

        if (!this.masterKey) {
            this.initSession();
        }

        const derived = [];
        for (let i = 0; i < length; i++) {
            const saltByte = this.masterKey.salt[i % this.masterKey.salt.length];
            const ivByte = this.masterKey.iv[i % this.masterKey.iv.length];
            
            let value = (this.masterKey.primary + index * saltByte + i * ivByte) >>> 0;
            value = value % 256;
            derived.push(value);
        }

        this.keyCache.set(cacheKey, derived);
        return derived;
    }

    /**
     * Generate embedded key expression untuk output code
     * Contoh: {0X1F,0B10101,0x3A,0B1_1010}
     */
    generateEmbeddedKeyArray(key) {
        const parts = [];
        for (const byte of key) {
            parts.push(this.random.formatNumber(byte));
        }
        return `{${parts.join(',')}}`;
    }

    /**
     * Generate complex key expression (Luraph style)
     * Contoh: (K.jU((K.DU(K.k[0B1_1]-R[7056],K.k[0B0010]))))+K.k[8]
     */
    generateComplexKeyExpression(contextVar = 'K') {
        const ops = ['bxor', 'band', 'bor'];
        const op1 = this.random.choice(ops);
        const op2 = this.random.choice(ops);
        
        const funcName1 = this.random.generateName(2);
        const funcName2 = this.random.generateName(2);
        const varName = this.random.generateName(1);
        
        const n1 = this.random.formatNumber(this.random.int(1, 32));
        const n2 = this.random.formatNumber(this.random.largeNumber());
        const n3 = this.random.formatNumber(this.random.int(1, 16));
        const n4 = this.random.formatNumber(this.random.int(1, 16));
        
        return `(${contextVar}.${funcName1}((${contextVar}.${funcName2}(${contextVar}.k[${n1}]-${varName}[${n2}],${contextVar}.k[${n3}]))))+${contextVar}.k[${n4}]`;
    }

    /**
     * Generate lookup table untuk key storage
     */
    generateKeyLookupTable(keys) {
        const entries = [];
        const indexMap = {};
        
        for (let i = 0; i < keys.length; i++) {
            const keyName = this.random.generateName(this.random.int(1, 3));
            const encodedValue = this.random.formatNumber(keys[i]);
            
            entries.push({
                key: keyName,
                value: encodedValue,
                originalIndex: i
            });
            
            indexMap[i] = keyName;
        }
        
        // Shuffle entries untuk hide order
        const shuffled = this.random.shuffle(entries);
        
        return { entries: shuffled, indexMap };
    }

    /**
     * Reset generator
     */
    reset() {
        this.masterKey = null;
        this.keyCache.clear();
        this.random.resetNames();
    }
}

module.exports = KeyGenerator;
