/**
 * LuaShield - Bytecode Generator
 * Generate proper bytecode untuk VM yang lebih besar
 */

const Random = require('../../utils/random');

class BytecodeGenerator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.instructions = [];
        this.constants = [];
        this.upvalues = [];
        this.prototypes = [];
        this.debugInfo = [];
        
        this.config = {
            addPadding: true,
            encryptConstants: true,
            shuffleInstructions: true,
            addFakeInstructions: true,
            compressionLevel: options.compressionLevel || 3
        };
    }

    /**
     * Generate bytecode dari Lua code
     */
    generate(code) {
        this.reset();

        // Parse code ke tokens sederhana
        const tokens = this._tokenize(code);

        // Generate instructions
        this._generateInstructions(tokens);

        // Add fake instructions untuk size
        if (this.config.addFakeInstructions) {
            this._addFakeInstructions();
        }

        // Add padding
        if (this.config.addPadding) {
            this._addPadding();
        }

        // Shuffle
        if (this.config.shuffleInstructions) {
            this._shuffleNonCritical();
        }

        return {
            header: this._generateHeader(),
            instructions: this.instructions,
            constants: this.constants,
            upvalues: this.upvalues,
            prototypes: this.prototypes,
            debugInfo: this.debugInfo,
            size: this._calculateSize()
        };
    }

    reset() {
        this.instructions = [];
        this.constants = [];
        this.upvalues = [];
        this.prototypes = [];
        this.debugInfo = [];
    }

    _tokenize(code) {
        const tokens = [];
        let pos = 0;
        
        while (pos < code.length) {
            // Skip whitespace
            while (pos < code.length && /\s/.test(code[pos])) pos++;
            if (pos >= code.length) break;

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
                pos++; // Skip closing quote
                tokens.push({ type: 'string', value: str });
                continue;
            }

            // Number
            if (/[0-9]/.test(code[pos]) || (code[pos] === '.' && /[0-9]/.test(code[pos + 1]))) {
                let num = '';
                if (code[pos] === '0' && (code[pos + 1] === 'x' || code[pos + 1] === 'X')) {
                    num = code[pos] + code[pos + 1];
                    pos += 2;
                    while (pos < code.length && /[0-9a-fA-F]/.test(code[pos])) {
                        num += code[pos];
                        pos++;
                    }
                } else if (code[pos] === '0' && (code[pos + 1] === 'b' || code[pos + 1] === 'B')) {
                    num = code[pos] + code[pos + 1];
                    pos += 2;
                    while (pos < code.length && /[01_]/.test(code[pos])) {
                        num += code[pos];
                        pos++;
                    }
                } else {
                    while (pos < code.length && /[0-9.eE+-]/.test(code[pos])) {
                        num += code[pos];
                        pos++;
                    }
                }
                tokens.push({ type: 'number', value: num });
                continue;
            }

            // Identifier/Keyword
            if (/[a-zA-Z_]/.test(code[pos])) {
                let id = '';
                while (pos < code.length && /[a-zA-Z0-9_]/.test(code[pos])) {
                    id += code[pos];
                    pos++;
                }
                const keywords = ['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 
                    'for', 'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 
                    'repeat', 'return', 'then', 'true', 'until', 'while'];
                tokens.push({ 
                    type: keywords.includes(id) ? 'keyword' : 'identifier', 
                    value: id 
                });
                continue;
            }

            // Operators
            const ops = ['...', '..', '==', '~=', '<=', '>=', '::', '//', '<<', '>>'];
            let matched = false;
            for (const op of ops) {
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

    _generateInstructions(tokens) {
        let instructionId = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            switch (token.type) {
                case 'string':
                    const strIdx = this._addConstant(token.value, 'string');
                    this.instructions.push({
                        id: instructionId++,
                        opcode: 0x01, // LOADK
                        A: this.random.int(0, 255),
                        Bx: strIdx,
                        line: i
                    });
                    break;

                case 'number':
                    const numIdx = this._addConstant(this._parseNumber(token.value), 'number');
                    this.instructions.push({
                        id: instructionId++,
                        opcode: 0x01, // LOADK
                        A: this.random.int(0, 255),
                        Bx: numIdx,
                        line: i
                    });
                    break;

                case 'keyword':
                    this.instructions.push({
                        id: instructionId++,
                        opcode: this._getKeywordOpcode(token.value),
                        A: this.random.int(0, 255),
                        B: this.random.int(0, 255),
                        C: this.random.int(0, 255),
                        line: i
                    });
                    break;

                case 'identifier':
                    const idIdx = this._addConstant(token.value, 'identifier');
                    this.instructions.push({
                        id: instructionId++,
                        opcode: 0x05, // GETGLOBAL
                        A: this.random.int(0, 255),
                        Bx: idIdx,
                        line: i
                    });
                    break;

                case 'operator':
                    if (token.value.length > 0) {
                        this.instructions.push({
                            id: instructionId++,
                            opcode: this._getOperatorOpcode(token.value),
                            A: this.random.int(0, 255),
                            B: this.random.int(0, 255),
                            C: this.random.int(0, 255),
                            line: i
                        });
                    }
                    break;
            }
        }
    }

    _addConstant(value, type) {
        const existing = this.constants.findIndex(c => c.value === value && c.type === type);
        if (existing >= 0) return existing;

        const idx = this.constants.length;
        this.constants.push({
            index: idx,
            type: type,
            value: value,
            encrypted: this.config.encryptConstants ? this._encryptConstant(value) : null
        });
        return idx;
    }

    _encryptConstant(value) {
        if (typeof value === 'string') {
            const key = this.random.bytes(this.random.int(4, 16));
            const encrypted = [];
            for (let i = 0; i < value.length; i++) {
                encrypted.push(value.charCodeAt(i) ^ key[i % key.length]);
            }
            return { method: 'xor', key, data: encrypted };
        } else if (typeof value === 'number') {
            const key = this.random.int(10000, 99999999);
            return { method: 'xor', key, data: Math.floor(value) ^ key };
        }
        return null;
    }

    _parseNumber(str) {
        str = str.replace(/_/g, '');
        if (str.startsWith('0x') || str.startsWith('0X')) return parseInt(str, 16);
        if (str.startsWith('0b') || str.startsWith('0B')) return parseInt(str.slice(2), 2);
        return parseFloat(str);
    }

    _getKeywordOpcode(keyword) {
        const opcodes = {
            'local': 0x02, 'function': 0x03, 'return': 0x1E, 'if': 0x16,
            'then': 0x17, 'else': 0x18, 'elseif': 0x19, 'end': 0x1A,
            'for': 0x1F, 'while': 0x20, 'do': 0x21, 'repeat': 0x22,
            'until': 0x23, 'break': 0x24, 'and': 0x0D, 'or': 0x0E,
            'not': 0x13, 'true': 0x03, 'false': 0x03, 'nil': 0x03,
            'in': 0x25, 'goto': 0x26
        };
        return opcodes[keyword] || 0x00;
    }

    _getOperatorOpcode(op) {
        const opcodes = {
            '+': 0x0C, '-': 0x0D, '*': 0x0E, '/': 0x0F, '%': 0x10,
            '^': 0x11, '#': 0x14, '..': 0x15, '==': 0x17, '~=': 0x18,
            '<': 0x19, '<=': 0x1A, '>': 0x1B, '>=': 0x1C,
            '(': 0x30, ')': 0x31, '{': 0x32, '}': 0x33, '[': 0x34, ']': 0x35,
            '=': 0x08, ',': 0x36, ';': 0x37, ':': 0x38, '.': 0x39
        };
        return opcodes[op] || 0x00;
    }

    _addFakeInstructions() {
        const fakeCount = Math.floor(this.instructions.length * 2.5); // 250% more

        for (let i = 0; i < fakeCount; i++) {
            const fakeInst = {
                id: this.instructions.length + i,
                opcode: this.random.int(0x00, 0x3F),
                A: this.random.int(0, 255),
                B: this.random.int(0, 255),
                C: this.random.int(0, 255),
                Bx: this.random.int(0, 65535),
                sBx: this.random.int(-32768, 32767),
                isFake: true,
                line: -1
            };
            
            // Insert di posisi random
            const pos = this.random.int(0, this.instructions.length);
            this.instructions.splice(pos, 0, fakeInst);
        }
    }

    _addPadding() {
        // Add padding ke constants
        const paddingCount = this.random.int(50, 150);
        for (let i = 0; i < paddingCount; i++) {
            const paddingType = this.random.choice(['string', 'number', 'identifier']);
            let value;
            
            if (paddingType === 'string') {
                value = this.random.key(this.random.int(5, 30));
            } else if (paddingType === 'number') {
                value = this.random.largeNumber();
            } else {
                value = this.random.generateName(this.random.int(2, 5));
            }
            
            this._addConstant(value, paddingType);
        }

        // Add debug info padding
        for (let i = 0; i < this.random.int(20, 50); i++) {
            this.debugInfo.push({
                line: this.random.int(1, 1000),
                column: this.random.int(1, 100),
                name: this.random.generateName(this.random.int(1, 4))
            });
        }
    }

    _shuffleNonCritical() {
        // Shuffle fake instructions only
        const fakes = this.instructions.filter(i => i.isFake);
        const shuffled = this.random.shuffle(fakes);
        
        let fakeIdx = 0;
        for (let i = 0; i < this.instructions.length; i++) {
            if (this.instructions[i].isFake) {
                this.instructions[i] = shuffled[fakeIdx++];
            }
        }
    }

    _generateHeader() {
        return {
            signature: [0x1B, 0x4C, 0x75, 0x61], // \x1bLua
            version: 0x51,
            format: 0x00,
            endianness: 0x01,
            intSize: 0x04,
            sizeT: 0x04,
            instructionSize: 0x04,
            numberSize: 0x08,
            integralFlag: 0x00,
            timestamp: Date.now(),
            checksum: this.random.int(0, 0xFFFFFFFF)
        };
    }

    _calculateSize() {
        let size = 0;
        
        // Header
        size += 12;
        
        // Instructions (4 bytes each)
        size += this.instructions.length * 4;
        
        // Constants
        for (const c of this.constants) {
            size += 1; // type
            if (c.type === 'string') {
                size += 4 + c.value.length; // length + data
            } else if (c.type === 'number') {
                size += 8;
            } else {
                size += 4 + (c.value?.length || 0);
            }
        }
        
        // Upvalues
        size += this.upvalues.length * 2;
        
        // Debug info
        size += this.debugInfo.length * 8;
        
        return size;
    }
}

module.exports = BytecodeGenerator;
