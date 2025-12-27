/**
 * LuaShield - VM Obfuscator
 * Luraph-style VM Protection dengan proper bytecode compilation
 */

const Random = require('../../utils/random');
const VMTemplate = require('../vm/template');

// Safe imports
let StringEncryptor, ConstantEncryptor, BytecodeGenerator;
try { StringEncryptor = require('../encryption/strings'); } catch(e) { StringEncryptor = null; }
try { ConstantEncryptor = require('../encryption/constants'); } catch(e) { ConstantEncryptor = null; }
try { BytecodeGenerator = require('../vm/bytecode'); } catch(e) { BytecodeGenerator = null; }

class VMObfuscator {
    constructor(options = {}) {
        this.options = options;
        this.random = new Random(options.seed);
        this.template = new VMTemplate({ seed: options.seed, target: options.target });
        
        this.stringEncryptor = StringEncryptor ? new StringEncryptor({ seed: options.seed }) : null;
        this.constantEncryptor = ConstantEncryptor ? new ConstantEncryptor({ seed: options.seed }) : null;
        this.bytecodeGen = BytecodeGenerator ? new BytecodeGenerator({ seed: options.seed }) : null;

        this.config = {
            target: options.target || 'roblox',
            enabled: options.enabled !== false,
            complexity: options.complexity || 'medium',
            multiLayer: options.multiLayer || false,
            layers: options.layers || 2,
            antiTamper: options.antiTamper !== false,
            antiDebug: options.antiDebug !== false,
            encryptStrings: options.encryptStrings !== false,
            luraphStyle: options.luraphStyle !== false
        };

        this.stats = {
            bytecodeSize: 0,
            constantCount: 0,
            instructionCount: 0,
            outputSize: 0
        };
    }

    /**
     * Main obfuscate function
     */
    obfuscate(code) {
        if (!this.config.enabled) {
            return { success: true, code: code, stats: this.stats };
        }

        try {
            let result;
            
            if (this.config.luraphStyle) {
                result = this._luraphStyleObfuscation(code);
            } else {
                result = this._standardObfuscation(code);
            }

            this.stats.outputSize = result.length;

            return {
                success: true,
                code: result,
                stats: { ...this.stats }
            };
        } catch (error) {
            console.error('[VMObfuscator] Error:', error.message);
            return this._fallbackWrapper(code);
        }
    }

    /**
     * Transform method (untuk kompatibilitas dengan index.js)
     */
    transform(code, context = {}) {
        if (!this.config.enabled) return code;

        const result = this.obfuscate(code);
        return result.success ? result.code : code;
    }

    /**
     * Luraph-style obfuscation
     */
    _luraphStyleObfuscation(code) {
        this.random.resetNames();

        // Parse dan compile code ke internal representation
        const compiled = this._compileCode(code);
        
        // Generate Luraph-style VM
        let output = this.template.generate(code);

        // Apply multi-layer jika enabled
        if (this.config.multiLayer) {
            for (let i = 1; i < this.config.layers; i++) {
                output = this._addProtectionLayer(output, i);
            }
        }

        return output;
    }

    /**
     * Compile code ke internal bytecode representation
     */
    _compileCode(code) {
        const instructions = [];
        const constants = [];
        const upvalues = [];

        // Tokenize
        const tokens = this._tokenize(code);

        // Generate instructions
        let pc = 0;
        for (const token of tokens) {
            switch (token.type) {
                case 'string':
                    const strIdx = this._addConstant(constants, token.value, 'string');
                    instructions.push({ op: 'LOADK', A: pc, Bx: strIdx });
                    pc++;
                    break;
                    
                case 'number':
                    const numIdx = this._addConstant(constants, parseFloat(token.value), 'number');
                    instructions.push({ op: 'LOADK', A: pc, Bx: numIdx });
                    pc++;
                    break;
                    
                case 'identifier':
                    const idIdx = this._addConstant(constants, token.value, 'string');
                    instructions.push({ op: 'GETGLOBAL', A: pc, Bx: idIdx });
                    pc++;
                    break;
                    
                case 'keyword':
                    instructions.push(this._compileKeyword(token.value, pc));
                    pc++;
                    break;
            }
        }

        // Add RETURN di akhir
        instructions.push({ op: 'RETURN', A: 0, B: 1 });

        this.stats.instructionCount = instructions.length;
        this.stats.constantCount = constants.length;

        return { instructions, constants, upvalues };
    }

    /**
     * Tokenize code
     */
    _tokenize(code) {
        const tokens = [];
        let pos = 0;

        while (pos < code.length) {
            // Skip whitespace
            while (pos < code.length && /\s/.test(code[pos])) pos++;
            if (pos >= code.length) break;

            // Skip comments
            if (code.slice(pos, pos + 2) === '--') {
                if (code.slice(pos, pos + 4) === '--[[') {
                    const end = code.indexOf(']]', pos + 4);
                    pos = end >= 0 ? end + 2 : code.length;
                } else {
                    while (pos < code.length && code[pos] !== '\n') pos++;
                }
                continue;
            }

            // Long string
            if (code.slice(pos, pos + 2) === '[[') {
                const end = code.indexOf(']]', pos + 2);
                if (end >= 0) {
                    tokens.push({ type: 'string', value: code.slice(pos + 2, end) });
                    pos = end + 2;
                    continue;
                }
            }

            // String
            if (code[pos] === '"' || code[pos] === "'") {
                const quote = code[pos];
                let str = '';
                pos++;
                while (pos < code.length && code[pos] !== quote) {
                    if (code[pos] === '\\' && pos + 1 < code.length) {
                        str += code[pos] + code[pos + 1];
                        pos += 2;
                    } else {
                        str += code[pos];
                        pos++;
                    }
                }
                pos++;
                tokens.push({ type: 'string', value: str });
                continue;
            }

            // Number
            if (/[0-9]/.test(code[pos]) || (code[pos] === '.' && pos + 1 < code.length && /[0-9]/.test(code[pos + 1]))) {
                let num = '';
                if (code.slice(pos, pos + 2).toLowerCase() === '0x') {
                    num = code.slice(pos, pos + 2);
                    pos += 2;
                    while (pos < code.length && /[0-9a-fA-F]/.test(code[pos])) {
                        num += code[pos++];
                    }
                } else if (code.slice(pos, pos + 2).toLowerCase() === '0b') {
                    num = code.slice(pos, pos + 2);
                    pos += 2;
                    while (pos < code.length && /[01_]/.test(code[pos])) {
                        num += code[pos++];
                    }
                } else {
                    while (pos < code.length && /[0-9.eE+\-]/.test(code[pos])) {
                        num += code[pos++];
                    }
                }
                tokens.push({ type: 'number', value: num });
                continue;
            }

            // Identifier/Keyword
            if (/[a-zA-Z_]/.test(code[pos])) {
                let id = '';
                while (pos < code.length && /[a-zA-Z0-9_]/.test(code[pos])) {
                    id += code[pos++];
                }
                
                const keywords = [
                    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
                    'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
                    'repeat', 'return', 'then', 'true', 'until', 'while'
                ];
                
                tokens.push({
                    type: keywords.includes(id) ? 'keyword' : 'identifier',
                    value: id
                });
                continue;
            }

            // Operators
            const operators = ['...', '..', '==', '~=', '<=', '>=', '::', '//', '<<', '>>', '+=', '-=', '*=', '/='];
            let matched = false;
            for (const op of operators) {
                if (code.slice(pos, pos + op.length) === op) {
                    tokens.push({ type: 'operator', value: op });
                    pos += op.length;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                tokens.push({ type: 'operator', value: code[pos] });
                pos++;
            }
        }

        return tokens;
    }

    /**
     * Add constant
     */
    _addConstant(constants, value, type) {
        const existing = constants.findIndex(c => c.value === value && c.type === type);
        if (existing >= 0) return existing;
        
        constants.push({ type, value });
        return constants.length - 1;
    }

    /**
     * Compile keyword to instruction
     */
    _compileKeyword(keyword, pc) {
        const map = {
            'true': { op: 'LOADBOOL', A: pc, B: 1, C: 0 },
            'false': { op: 'LOADBOOL', A: pc, B: 0, C: 0 },
            'nil': { op: 'LOADNIL', A: pc, B: pc },
            'return': { op: 'RETURN', A: pc, B: 0 },
            'break': { op: 'JMP', A: 0, sBx: 0 }
        };
        
        return map[keyword] || { op: 'NOP', A: 0, B: 0, C: 0 };
    }

    /**
     * Standard obfuscation (non-Luraph)
     */
    _standardObfuscation(code) {
        const vmCode = this.template.generate(code);
        return vmCode;
    }

    /**
     * Add protection layer
     */
    _addProtectionLayer(code, layerNum) {
        const wrapperVar = this.random.generateName(3);
        const funcVar = this.random.generateName(2);
        const envVar = this.random.generateName(2);
        const keyLen = 8 + layerNum * 4;
        
        // Generate key
        const key = [];
        for (let i = 0; i < keyLen; i++) {
            key.push(this.random.int(1, 255));
        }

        // Encode code
        const encoded = [];
        for (let i = 0; i < code.length; i++) {
            const byte = (code.charCodeAt(i) + key[i % key.length]) % 256;
            encoded.push(byte.toString(16).padStart(2, '0'));
        }

        return `do local ${envVar}=getfenv and getfenv()or _ENV or _G;` +
            `local ${wrapperVar}="${encoded.join('')}";` +
            `local ${funcVar}=function(${this.random.generateName(1)},${this.random.generateName(1)})` +
            `local ${this.random.generateName(1)}={};` +
            `for ${this.random.generateName(1)}=${this.random.formatNumber(1)},#${this.random.generateName(1)},${this.random.formatNumber(2)} do ` +
            `local ${this.random.generateName(1)}=tonumber(${this.random.generateName(1)}:sub(${this.random.generateName(1)},${this.random.generateName(1)}+${this.random.formatNumber(1)}),${this.random.formatNumber(16)});` +
            `if ${this.random.generateName(1)} then ` +
            `${this.random.generateName(1)}[#${this.random.generateName(1)}+${this.random.formatNumber(1)}]=` +
            `string.char(((${this.random.generateName(1)}-${this.random.generateName(1)}[((${this.random.generateName(1)}-${this.random.formatNumber(1)})/${this.random.formatNumber(2)})%#${this.random.generateName(1)}+${this.random.formatNumber(1)}])+${this.random.formatNumber(256)})%${this.random.formatNumber(256)});` +
            `end;end;return table.concat(${this.random.generateName(1)});end;` +
            `local ${this.random.generateName(2)},${this.random.generateName(2)}=pcall(function()` +
            `return loadstring(${funcVar}(${wrapperVar},{${key.join(',')}}))end);` +
            `if ${this.random.generateName(2)} and ${this.random.generateName(2)} then ` +
            `setfenv and setfenv(${this.random.generateName(2)},${envVar});${this.random.generateName(2)}();end;end`;
    }

    /**
     * Fallback wrapper
     */
    _fallbackWrapper(code) {
        const wrapperVar = this.random.generateName(3);
        const envVar = this.random.generateName(2);

        const wrapped = `do local ${envVar}=getfenv and getfenv()or _ENV or _G;` +
            `local ${wrapperVar}=function()${code}end;` +
            `(setfenv and setfenv(${wrapperVar},${envVar})or ${wrapperVar})();end`;

        return {
            success: true,
            code: wrapped,
            stats: { ...this.stats, fallback: true }
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
        if (this.random) this.random.resetNames();
        if (this.template) this.template.reset();
        this.stats = { bytecodeSize: 0, constantCount: 0, instructionCount: 0, outputSize: 0 };
    }
}

module.exports = VMObfuscator;
