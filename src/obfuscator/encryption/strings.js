/**
 * LuaShield - String Encryption
 * Multiple encryption methods untuk string obfuscation
 */

const Random = require('../../utils/random');
const Helpers = require('../../utils/helpers');
const KeyGenerator = require('./keys');

class StringEncryptor {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.keyGen = new KeyGenerator(options.seed);
        this.config = {
            method: options.method || 'auto',
            keyLength: options.keyLength || { min: 8, max: 24 }
        };
        
        // Context variable names untuk output
        this.contextVar = options.contextVar || this.random.generateName(1);
    }

    /**
     * Main encrypt function
     */
    encrypt(str, method = null) {
        method = method || this.config.method;
        
        if (method === 'auto') {
            // Pilih method berdasarkan string length dan content
            if (str.length <= 3) {
                method = 'escape';
            } else if (str.length <= 10) {
                method = this.random.choice(['escape', 'bytes', 'xor']);
            } else {
                method = this.random.choice(['xor', 'bytes', 'split']);
            }
        }

        switch (method) {
            case 'xor':
                return this.encryptXor(str);
            case 'bytes':
                return this.encryptBytes(str);
            case 'escape':
                return this.encryptEscape(str);
            case 'split':
                return this.encryptSplit(str);
            default:
                return this.encryptXor(str);
        }
    }

    /**
     * XOR Encryption dengan key
     */
    encryptXor(str) {
        const keyLength = this.random.int(this.config.keyLength.min, this.config.keyLength.max);
        const key = this.keyGen.generateXorKey(keyLength);
        const bytes = Helpers.stringToBytes(str);
        
        // XOR each byte
        const encrypted = [];
        for (let i = 0; i < bytes.length; i++) {
            encrypted.push(bytes[i] ^ key[i % key.length]);
        }
        
        // Generate decoder function
        return this._generateXorDecoder(encrypted, key);
    }

    _generateXorDecoder(encrypted, key) {
        // Variable names (Luraph style)
        const funcVar = this.random.generateName(1);
        const dataVar = this.random.generateName(1);
        const keyVar = this.random.generateName(1);
        const resultVar = this.random.generateName(2);
        const indexVar = this.random.generateName(1);
        
        // Format encrypted bytes
        const encryptedParts = encrypted.map(b => this.random.formatNumber(b));
        
        // Format key bytes
        const keyParts = key.map(b => this.random.formatNumber(b));
        
        // Pilih style decoder
        const style = this.random.int(1, 3);
        
        if (style === 1) {
            // Style 1: Inline function
            return `(function(${dataVar})local ${keyVar}={${keyParts.join(',')}};local ${resultVar}='';for ${indexVar}=1,#${dataVar} do ${resultVar}=${resultVar}..string.char(bit32.bxor(${dataVar}[${indexVar}],${keyVar}[((${indexVar}-1)%#${keyVar})+1]));end;return ${resultVar};end)({${encryptedParts.join(',')}})`;
        } else if (style === 2) {
            // Style 2: Using table.concat
            const charVar = this.random.generateName(1);
            return `(function(${dataVar},${keyVar})local ${resultVar}={};for ${indexVar}=0X1,#${dataVar} do ${resultVar}[${indexVar}]=string.char(bit32.bxor(${dataVar}[${indexVar}],${keyVar}[((${indexVar}-0B1)%#${keyVar})+0X1]));end;return table.concat(${resultVar});end)({${encryptedParts.join(',')}},{${keyParts.join(',')}})`;
        } else {
            // Style 3: Complex with nested calls
            const subVar = this.random.generateName(2);
            const byteVar = this.random.generateName(1);
            return `(function(${dataVar})local ${keyVar}={${keyParts.join(',')}};local ${resultVar}='';local ${subVar}=string.char;local ${byteVar}=bit32.bxor;for ${indexVar}=0B1,#${dataVar} do ${resultVar}=${resultVar}..${subVar}(${byteVar}(${dataVar}[${indexVar}],${keyVar}[((${indexVar}-0X1)%#${keyVar})+0B1]));end;return ${resultVar};end)({${encryptedParts.join(',')}})`;
        }
    }

    /**
     * Byte Array Encoding
     */
    encryptBytes(str) {
        const bytes = Helpers.stringToBytes(str);
        const byteParts = bytes.map(b => this.random.formatNumber(b));
        
        const tableVar = this.random.generateName(1);
        const resultVar = this.random.generateName(2);
        const indexVar = this.random.generateName(1);
        
        const style = this.random.int(1, 2);
        
        if (style === 1) {
            return `(function(${tableVar})local ${resultVar}='';for ${indexVar}=0X1,#${tableVar} do ${resultVar}=${resultVar}..string.char(${tableVar}[${indexVar}]);end;return ${resultVar};end)({${byteParts.join(',')}})`;
        } else {
            const charVar = this.random.generateName(1);
            return `(function(${tableVar})local ${charVar}=string.char;local ${resultVar}={};for ${indexVar}=0B1,#${tableVar} do ${resultVar}[${indexVar}]=${charVar}(${tableVar}[${indexVar}]);end;return table.concat(${resultVar});end)({${byteParts.join(',')}})`;
        }
    }

    /**
     * Escape Sequence Encoding
     */
    encryptEscape(str) {
        const result = [];
        
        for (let i = 0; i < str.length; i++) {
            const byte = str.charCodeAt(i);
            const format = this.random.int(1, 4);
            
            if (format === 1) {
                // Decimal escape: \123
                result.push(`\\${byte}`);
            } else if (format === 2) {
                // Hex escape uppercase: \x7B
                result.push(`\\x${byte.toString(16).toUpperCase().padStart(2, '0')}`);
            } else if (format === 3) {
                // Hex escape lowercase: \x7b
                result.push(`\\x${byte.toString(16).padStart(2, '0')}`);
            } else {
                // Keep printable ASCII as-is sometimes
                if (byte >= 32 && byte <= 126 && byte !== 34 && byte !== 92 && this.random.bool(0.3)) {
                    result.push(str[i]);
                } else {
                    result.push(`\\${byte}`);
                }
            }
        }
        
        return `"${result.join('')}"`;
    }

    /**
     * Split & Concatenate
     */
    encryptSplit(str) {
        if (str.length <= 3) {
            return this.encryptEscape(str);
        }
        
        const parts = [];
        let pos = 0;
        
        while (pos < str.length) {
            const chunkSize = this.random.int(1, Math.min(5, str.length - pos));
            const chunk = str.substring(pos, pos + chunkSize);
            
            // Encrypt each chunk dengan method berbeda
            const method = this.random.choice(['escape', 'bytes']);
            if (method === 'escape') {
                parts.push(this.encryptEscape(chunk));
            } else {
                parts.push(this.encryptBytes(chunk));
            }
            
            pos += chunkSize;
        }
        
        if (parts.length === 1) {
            return parts[0];
        }
        
        // Join dengan various concat styles
        const style = this.random.int(1, 2);
        
        if (style === 1) {
            return `(${parts.join('..')})`;
        } else {
            // Using table.concat
            const tableVar = this.random.generateName(1);
            return `(function()local ${tableVar}={${parts.join(',')}};return table.concat(${tableVar});end)()`;
        }
    }

    /**
     * Batch encrypt multiple strings
     */
    encryptAll(strings) {
        const results = [];
        
        for (const str of strings) {
            results.push({
                original: str,
                encrypted: this.encrypt(str)
            });
        }
        
        return results;
    }

    /**
     * Create string table dengan lookup
     */
    createStringTable(strings) {
        const tableVar = this.random.generateName(2);
        const entries = [];
        const lookupMap = {};
        
        for (let i = 0; i < strings.length; i++) {
            const keyName = this.random.generateName(this.random.int(1, 2));
            const encrypted = this.encrypt(strings[i]);
            
            entries.push(`[${this.random.formatNumber(i + 1)}]=${encrypted}`);
            lookupMap[strings[i]] = { index: i + 1, key: keyName };
        }
        
        // Shuffle entries
        const shuffled = this.random.shuffle(entries);
        
        return {
            declaration: `local ${tableVar}={${shuffled.join(',')}};`,
            variable: tableVar,
            lookupMap
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
        this.keyGen.reset();
    }
}

module.exports = StringEncryptor;
