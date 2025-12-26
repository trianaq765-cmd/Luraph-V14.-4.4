/**
 * LuaShield - Helper Utilities
 * Terintegrasi dengan semua modul obfuscator
 */

class Helpers {
    /**
     * String Utilities
     */
    static trim(str) {
        return str.replace(/^\s+|\s+$/g, '');
    }

    static split(str, delimiter) {
        return str.split(delimiter).filter(s => s.length > 0);
    }

    static padLeft(str, len, char = ' ') {
        return char.repeat(Math.max(0, len - str.length)) + str;
    }

    static padRight(str, len, char = ' ') {
        return str + char.repeat(Math.max(0, len - str.length));
    }

    static escapeString(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    /**
     * Table/Object Utilities
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    static merge(base, override) {
        const result = this.deepClone(base);
        for (const key in override) {
            if (override.hasOwnProperty(key)) {
                if (typeof override[key] === 'object' && !Array.isArray(override[key]) && result[key]) {
                    result[key] = this.merge(result[key], override[key]);
                } else {
                    result[key] = override[key];
                }
            }
        }
        return result;
    }

    /**
     * Byte Utilities - Untuk encryption
     */
    static stringToBytes(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }

    static bytesToString(bytes) {
        return String.fromCharCode(...bytes);
    }

    static xorBytes(a, b) {
        const result = [];
        const len = Math.max(a.length, b.length);
        for (let i = 0; i < len; i++) {
            const byteA = a[i % a.length] || 0;
            const byteB = b[i % b.length] || 0;
            result.push(byteA ^ byteB);
        }
        return result;
    }

    static bytesToInt(b1, b2, b3, b4) {
        return b1 + b2 * 256 + b3 * 65536 + b4 * 16777216;
    }

    static intToBytes(int) {
        return [
            int & 0xFF,
            (int >> 8) & 0xFF,
            (int >> 16) & 0xFF,
            (int >> 24) & 0xFF
        ];
    }

    /**
     * Validation - Untuk parser
     */
    static isValidIdentifier(str) {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
    }

    static isReservedKeyword(str) {
        const keywords = [
            'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
            'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
            'return', 'then', 'true', 'until', 'while', 'goto'
        ];
        return keywords.includes(str);
    }

    /**
     * Lua Code Utilities
     */
    static wrapInFunction(code, args = '...') {
        return `(function(${args})${code}end)`;
    }

    static wrapInReturn(code) {
        return `return ${code}`;
    }

    static createTableAccess(tableName, key) {
        if (typeof key === 'number') {
            return `${tableName}[${key}]`;
        }
        if (this.isValidIdentifier(key) && !this.isReservedKeyword(key)) {
            return `${tableName}.${key}`;
        }
        return `${tableName}["${this.escapeString(key)}"]`;
    }

    /**
     * Chunk splitting untuk large code
     */
    static chunkArray(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    static chunkString(str, size) {
        const chunks = [];
        for (let i = 0; i < str.length; i += size) {
            chunks.push(str.substring(i, i + size));
        }
        return chunks;
    }
}

module.exports = Helpers;
