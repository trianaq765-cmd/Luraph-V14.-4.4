/**
 * LuaShield - Bytecode Generator
 * Generate proper bytecode dengan size ratio ~8x (seperti Luraph)
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
        this.lineInfo = [];
        
        this.config = {
            addPadding: true,
            encryptConstants: true,
            shuffleInstructions: true,
            addFakeInstructions: true,
            compressionLevel: options.compressionLevel || 3,
            targetRatio: options.targetRatio || 8 // Target 8x size
        };

        this.opcodeMap = this._generateOpcodeMap();
    }

    /**
     * Generate shuffled opcode map
     */
    _generateOpcodeMap() {
        const opcodes = [
            'MOVE', 'LOADK', 'LOADKX', 'LOADBOOL', 'LOADNIL',
            'GETUPVAL', 'GETTABUP', 'GETTABLE', 'SETTABUP', 'SETUPVAL',
            'SETTABLE', 'NEWTABLE', 'SELF', 'ADD', 'SUB', 'MUL', 'MOD',
            'POW', 'DIV', 'IDIV', 'BAND', 'BOR', 'BXOR', 'SHL', 'SHR',
            'UNM', 'BNOT', 'NOT', 'LEN', 'CONCAT', 'JMP', 'EQ', 'LT',
            'LE', 'TEST', 'TESTSET', 'CALL', 'TAILCALL', 'RETURN',
            'FORLOOP', 'FORPREP', 'TFORCALL', 'TFORLOOP', 'SETLIST',
            'CLOSURE', 'VARARG', 'EXTRAARG'
        ];

        const map = {};
        const used = new Set();

        for (const op of opcodes) {
            let code;
            do {
                code = this.random.int(0, 127);
            } while (used.has(code));
            used.add(code);
            map[op] = code;
        }

        return map;
    }

    /**
     * Generate bytecode dari Lua code
     */
    generate(code) {
        this.reset();

        // Parse code ke tokens
        const tokens = this._tokenize(code);

        // Generate real instructions
        this._generateInstructions(tokens);

        // Generate fake instructions untuk padding (multiplier untuk size)
        if (this.config.addFakeInstructions) {
            this._addFakeInstructions();
        }

        // Add extra padding
        if (this.config.addPadding) {
            this._addPadding(code.length);
        }

        // Shuffle non-critical
        if (this.config.shuffleInstructions) {
            this._shuffleNonCritical();
        }

        // Serialize ke format yang proper
        const serialized = this._serialize();

        return {
            header: this._generateHeader(),
            instructions: this.instructions,
            constants: this.constants,
            upvalues: this.upvalues,
            prototypes: this.prototypes,
            debugInfo: this.debugInfo,
            lineInfo: this.lineInfo,
            opcodeMap: this.opcodeMap,
            serialized: serialized,
            size: serialized.length,
            originalSize: code.length,
            ratio: Math.round(serialized.length / code.length * 10) / 10
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.instructions = [];
        this.constants = [];
        this.upvalues = [];
        this.prototypes = [];
        this.debugInfo = [];
        this.lineInfo = [];
    }

    /**
     * Tokenize code
     */
    _tokenize(code) {
        const tokens = [];
        let pos = 0;
        let line = 1;

        while (pos < code.length) {
            // Track line numbers
            if (code[pos] === '\n') {
                line++;
                pos++;
                continue;
            }

            // Skip whitespace
            if (/\s/.test(code[pos])) {
                pos++;
                continue;
            }

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

            // Long string [[...]]
            if (code.slice(pos, pos + 2) === '[[') {
                const end = code.indexOf(']]', pos + 2);
                if (end >= 0) {
                    tokens.push({ type: 'string', value: code.slice(pos + 2, end), line });
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
                tokens.push({ type: 'string', value: str, line });
                continue;
            }

            // Number
            if (/[0-9]/.test(code[pos]) || (code[pos] === '.' && /[0-9]/.test(code[pos + 1] || ''))) {
                let num = '';
                
                // Hex
                if (code.slice(pos, pos + 2).toLowerCase() === '0x') {
                    num = code.slice(pos, pos + 2);
                    pos += 2;
                    while (pos < code.length && /[0-9a-fA-F_]/.test(code[pos])) {
                        num += code[pos++];
                    }
                }
                // Binary
                else if (code.slice(pos, pos + 2).toLowerCase() === '0b') {
                    num = code.slice(pos, pos + 2);
                    pos += 2;
                    while (pos < code.length && /[01_]/.test(code[pos])) {
                        num += code[pos++];
                    }
                }
                // Decimal/Float
                else {
                    while (pos < code.length && /[0-9.eE+\-]/.test(code[pos])) {
                        num += code[pos++];
                    }
                }
                tokens.push({ type: 'number', value: num, line });
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
                    value: id,
                    line
                });
                continue;
            }

            // Multi-char operators
            const multiOps = ['...', '..', '==', '~=', '<=', '>=', '::', '//', '<<', '>>', '+=', '-='];
            let matched = false;
            for (const op of multiOps) {
                if (code.slice(pos, pos + op.length) === op) {
                    tokens.push({ type: 'operator', value: op, line });
                    pos += op.length;
                    matched = true;
                    break;
                }
            }
            
            if (!matched) {
                tokens.push({ type: 'operator', value: code[pos], line });
                pos++;
            }
        }

        return tokens;
    }

    /**
     * Generate instructions dari tokens
     */
    _generateInstructions(tokens) {
        let instructionId = 0;
        let currentReg = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const line = token.line || 1;

            switch (token.type) {
                case 'string':
                    const strIdx = this._addConstant(token.value, 'string');
                    this.instructions.push({
                        id: instructionId++,
                        opcode: this.opcodeMap.LOADK,
                        A: currentReg++,
                        Bx: strIdx,
                        line: line,
                        isFake: false
                    });
                    this.lineInfo.push(line);
                    break;

                case 'number':
                    const numVal = this._parseNumber(token.value);
                    const numIdx = this._addConstant(numVal, 'number');
                    this.instructions.push({
                        id: instructionId++,
                        opcode: this.opcodeMap.LOADK,
                        A: currentReg++,
                        Bx: numIdx,
                        line: line,
                        isFake: false
                    });
                    this.lineInfo.push(line);
                    break;

                case 'keyword':
                    this.instructions.push({
                        id: instructionId++,
                        opcode: this._getKeywordOpcode(token.value),
                        A: currentReg,
                        B: this.random.int(0, 255),
                        C: this.random.int(0, 255),
                        line: line,
                        isFake: false
                    });
                    this.lineInfo.push(line);
                    break;

                case 'identifier':
                    const idIdx = this._addConstant(token.value, 'string');
                    this.instructions.push({
                        id: instructionId++,
                        opcode: this.opcodeMap.GETTABUP || this.random.int(0, 63),
                        A: currentReg++,
                        B: 0,
                        C: idIdx + 256,
                        line: line,
                        isFake: false
                    });
                    this.lineInfo.push(line);
                    break;

                case 'operator':
                    if (token.value.length > 0 && !/[\s\n\r]/.test(token.value)) {
                        this.instructions.push({
                            id: instructionId++,
                            opcode: this._getOperatorOpcode(token.value),
                            A: this.random.int(0, 255),
                            B: this.random.int(0, 511),
                            C: this.random.int(0, 511),
                            line: line,
                            isFake: false
                        });
                        this.lineInfo.push(line);
                    }
                    break;
            }
        }

        // Add RETURN instruction
        this.instructions.push({
            id: instructionId++,
            opcode: this.opcodeMap.RETURN,
            A: 0,
            B: 1,
            C: 0,
            line: tokens.length > 0 ? tokens[tokens.length - 1].line : 1,
            isFake: false
        });
    }

    /**
     * Add constant
     */
    _addConstant(value, type) {
        // Check for existing
        const existing = this.constants.findIndex(c => c.value === value && c.type === type);
        if (existing >= 0) return existing;

        const idx = this.constants.length;
        
        let encrypted = null;
        if (this.config.encryptConstants) {
            encrypted = this._encryptConstant(value, type);
        }

        this.constants.push({
            index: idx,
            type: type,
            value: value,
            encrypted: encrypted
        });

        return idx;
    }

    /**
     * Encrypt constant
     */
    _encryptConstant(value, type) {
        if (type === 'string') {
            const key = this.random.bytes(this.random.int(4, 16));
            const encrypted = [];
            const str = String(value);
            for (let i = 0; i < str.length; i++) {
                encrypted.push(str.charCodeAt(i) ^ key[i % key.length]);
            }
            return { method: 'xor', key: key, data: encrypted };
        } else if (type === 'number') {
            const key = this.random.int(1000, 999999);
            return { method: 'xor', key: key, data: Math.floor(value) ^ key };
        }
        return null;
    }

    /**
     * Parse number string to value
     */
    _parseNumber(str) {
        str = str.replace(/_/g, '');
        if (str.toLowerCase().startsWith('0x')) {
            return parseInt(str, 16);
        } else if (str.toLowerCase().startsWith('0b')) {
            return parseInt(str.slice(2), 2);
        }
        return parseFloat(str);
    }

    /**
     * Get opcode for keyword
     */
    _getKeywordOpcode(keyword) {
        const map = {
            'local': this.opcodeMap.MOVE,
            'function': this.opcodeMap.CLOSURE,
            'return': this.opcodeMap.RETURN,
            'if': this.opcodeMap.TEST,
            'then': this.opcodeMap.JMP,
            'else': this.opcodeMap.JMP,
            'elseif': this.opcodeMap.TEST,
            'end': this.opcodeMap.JMP,
            'for': this.opcodeMap.FORPREP,
            'while': this.opcodeMap.TEST,
            'do': this.opcodeMap.JMP,
            'repeat': this.opcodeMap.JMP,
            'until': this.opcodeMap.TEST,
            'break': this.opcodeMap.JMP,
            'and': this.opcodeMap.TESTSET,
            'or': this.opcodeMap.TESTSET,
            'not': this.opcodeMap.NOT,
            'true': this.opcodeMap.LOADBOOL,
            'false': this.opcodeMap.LOADBOOL,
            'nil': this.opcodeMap.LOADNIL,
            'in': this.opcodeMap.TFORCALL,
            'goto': this.opcodeMap.JMP
        };
        return map[keyword] || this.opcodeMap.MOVE;
    }

    /**
     * Get opcode for operator
     */
    _getOperatorOpcode(op) {
        const map = {
            '+': this.opcodeMap.ADD,
            '-': this.opcodeMap.SUB,
            '*': this.opcodeMap.MUL,
            '/': this.opcodeMap.DIV,
            '%': this.opcodeMap.MOD,
            '^': this.opcodeMap.POW,
            '//': this.opcodeMap.IDIV,
            '&': this.opcodeMap.BAND,
            '|': this.opcodeMap.BOR,
            '~': this.opcodeMap.BXOR,
            '<<': this.opcodeMap.SHL,
            '>>': this.opcodeMap.SHR,
            '#': this.opcodeMap.LEN,
            '..': this.opcodeMap.CONCAT,
            '==': this.opcodeMap.EQ,
            '~=': this.opcodeMap.EQ,
            '<': this.opcodeMap.LT,
            '<=': this.opcodeMap.LE,
            '>': this.opcodeMap.LT,
            '>=': this.opcodeMap.LE,
            '(': this.opcodeMap.CALL,
            ')': this.opcodeMap.RETURN,
            '{': this.opcodeMap.NEWTABLE,
            '}': this.opcodeMap.SETLIST,
            '[': this.opcodeMap.GETTABLE,
            ']': this.opcodeMap.SETTABLE,
            '=': this.opcodeMap.MOVE,
            ',': this.opcodeMap.MOVE,
            ';': this.opcodeMap.JMP,
            ':': this.opcodeMap.SELF,
            '.': this.opcodeMap.GETTABLE
        };
        return map[op] || this.opcodeMap.MOVE;
    }

    /**
     * Add fake instructions untuk proper size ratio
     */
    _addFakeInstructions() {
        // Target: ~7x lebih banyak fake instructions
        const realCount = this.instructions.length;
        const fakeCount = Math.floor(realCount * this.config.targetRatio);

        for (let i = 0; i < fakeCount; i++) {
            const fakeInst = this._generateFakeInstruction(this.instructions.length + i);
            
            // Insert di posisi random
            const pos = this.random.int(0, this.instructions.length);
            this.instructions.splice(pos, 0, fakeInst);
        }
    }

    /**
     * Generate single fake instruction
     */
    _generateFakeInstruction(id) {
        const opcodes = Object.values(this.opcodeMap);
        
        return {
            id: id,
            opcode: this.random.choice(opcodes),
            A: this.random.int(0, 255),
            B: this.random.int(0, 511),
            C: this.random.int(0, 511),
            Bx: this.random.int(0, 131071),
            sBx: this.random.int(-65536, 65535),
            Ax: this.random.int(0, 67108863),
            line: this.random.int(1, 1000),
            isFake: true
        };
    }

    /**
     * Add padding untuk size
     */
    _addPadding(originalSize) {
        // Add padding constants
        const paddingConstCount = Math.floor(originalSize / 10);
        for (let i = 0; i < paddingConstCount; i++) {
            const types = ['string', 'number', 'string', 'number', 'string'];
            const type = this.random.choice(types);
            
            let value;
            if (type === 'string') {
                value = this.random.key(this.random.int(8, 64));
            } else {
                value = this.random.largeNumber();
            }
            
            this._addConstant(value, type);
        }

        // Add debug info
        const debugCount = Math.floor(originalSize / 20);
        for (let i = 0; i < debugCount; i++) {
            this.debugInfo.push({
                name: this.random.generateName(this.random.int(1, 4)),
                startpc: this.random.int(0, this.instructions.length),
                endpc: this.random.int(0, this.instructions.length),
                line: this.random.int(1, 500)
            });
        }

        // Add upvalues
        const upvalCount = this.random.int(5, 20);
        for (let i = 0; i < upvalCount; i++) {
            this.upvalues.push({
                name: this.random.generateName(this.random.int(1, 3)),
                instack: this.random.bool() ? 1 : 0,
                idx: this.random.int(0, 255)
            });
        }

        // Add prototypes (nested functions)
        const protoCount = this.random.int(2, 8);
        for (let i = 0; i < protoCount; i++) {
            this.prototypes.push({
                id: i,
                numparams: this.random.int(0, 10),
                is_vararg: this.random.bool() ? 1 : 0,
                maxstacksize: this.random.int(2, 50),
                instructions: this._generateFakePrototype(),
                constants: this._generateFakeConstants()
            });
        }
    }

    /**
     * Generate fake prototype instructions
     */
    _generateFakePrototype() {
        const count = this.random.int(10, 50);
        const instructions = [];
        for (let i = 0; i < count; i++) {
            instructions.push(this._generateFakeInstruction(i));
        }
        return instructions;
    }

    /**
     * Generate fake constants
     */
    _generateFakeConstants() {
        const count = this.random.int(5, 20);
        const constants = [];
        for (let i = 0; i < count; i++) {
            const type = this.random.choice(['string', 'number', 'boolean']);
            let value;
            if (type === 'string') {
                value = this.random.key(this.random.int(4, 32));
            } else if (type === 'number') {
                value = this.random.int(-999999, 999999);
            } else {
                value = this.random.bool();
            }
            constants.push({ type, value });
        }
        return constants;
    }

    /**
     * Shuffle non-critical (fake) instructions
     */
    _shuffleNonCritical() {
        const fakes = this.instructions.filter(i => i.isFake);
        const shuffled = this.random.shuffle(fakes);
        
        let fakeIdx = 0;
        for (let i = 0; i < this.instructions.length; i++) {
            if (this.instructions[i].isFake && fakeIdx < shuffled.length) {
                this.instructions[i] = shuffled[fakeIdx++];
            }
        }
    }

    /**
     * Generate header
     */
    _generateHeader() {
        return {
            signature: [0x1B, 0x4C, 0x75, 0x61], // \x1bLua
            version: this.random.choice([0x51, 0x52, 0x53]),
            format: 0x00,
            endianness: 0x01,
            intSize: 0x04,
            sizeT: this.random.choice([0x04, 0x08]),
            instructionSize: 0x04,
            numberSize: 0x08,
            integralFlag: 0x00,
            luacData: this.random.bytes(6),
            timestamp: Date.now(),
            checksum: this.random.int(0, 0xFFFFFFFF),
            sizeUpvalues: this.upvalues.length
        };
    }

    /**
     * Serialize ke binary-like string
     */
    _serialize() {
        const parts = [];

        // Header (32 bytes)
        const header = this._generateHeader();
        parts.push(this._encodeHeader(header));

        // Constants
        parts.push(this._encodeConstants());

        // Instructions
        parts.push(this._encodeInstructions());

        // Upvalues
        parts.push(this._encodeUpvalues());

        // Prototypes
        parts.push(this._encodePrototypes());

        // Debug info
        parts.push(this._encodeDebugInfo());

        // Line info
        parts.push(this._encodeLineInfo());

        // Extra padding untuk proper ratio
        const currentSize = parts.join('').length;
        const targetSize = this.instructions.filter(i => !i.isFake).length * this.config.targetRatio * 50;
        
        if (currentSize < targetSize) {
            parts.push(this._generateExtraPadding(targetSize - currentSize));
        }

        return parts.join('');
    }

    /**
     * Encode header
     */
    _encodeHeader(header) {
        let result = '';
        result += header.signature.map(b => b.toString(16).padStart(2, '0')).join('');
        result += header.version.toString(16).padStart(2, '0');
        result += header.format.toString(16).padStart(2, '0');
        result += header.endianness.toString(16).padStart(2, '0');
        result += header.intSize.toString(16).padStart(2, '0');
        result += header.sizeT.toString(16).padStart(2, '0');
        result += header.instructionSize.toString(16).padStart(2, '0');
        result += header.numberSize.toString(16).padStart(2, '0');
        result += header.integralFlag.toString(16).padStart(2, '0');
        result += header.luacData.map(b => b.toString(16).padStart(2, '0')).join('');
        result += header.timestamp.toString(16).padStart(16, '0');
        result += header.checksum.toString(16).padStart(8, '0');
        return result;
    }

    /**
     * Encode constants
     */
    _encodeConstants() {
        let result = '';
        
        // Size
        result += this.constants.length.toString(16).padStart(8, '0');
        
        for (const c of this.constants) {
            // Type byte
            const typeMap = { 'nil': 0, 'boolean': 1, 'number': 3, 'string': 4 };
            result += (typeMap[c.type] || 4).toString(16).padStart(2, '0');
            
            if (c.type === 'string') {
                const str = String(c.value);
                result += str.length.toString(16).padStart(8, '0');
                for (let i = 0; i < str.length; i++) {
                    result += str.charCodeAt(i).toString(16).padStart(2, '0');
                }
            } else if (c.type === 'number') {
                result += this._encodeNumber(c.value);
            } else if (c.type === 'boolean') {
                result += c.value ? '01' : '00';
            }
            
            // Encrypted data jika ada
            if (c.encrypted) {
                result += this._encodeEncrypted(c.encrypted);
            }
        }
        
        return result;
    }

    /**
     * Encode number as hex
     */
    _encodeNumber(num) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, num, true);
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += view.getUint8(i).toString(16).padStart(2, '0');
        }
        return result;
    }

    /**
     * Encode encrypted data
     */
    _encodeEncrypted(encrypted) {
        let result = '';
        if (encrypted.key) {
            result += encrypted.key.length.toString(16).padStart(2, '0');
            for (const b of encrypted.key) {
                result += b.toString(16).padStart(2, '0');
            }
        }
        if (encrypted.data) {
            if (Array.isArray(encrypted.data)) {
                result += encrypted.data.length.toString(16).padStart(4, '0');
                for (const b of encrypted.data) {
                    result += b.toString(16).padStart(2, '0');
                }
            } else {
                result += encrypted.data.toString(16).padStart(8, '0');
            }
        }
        return result;
    }

    /**
     * Encode instructions
     */
    _encodeInstructions() {
        let result = '';
        
        // Size
        result += this.instructions.length.toString(16).padStart(8, '0');
        
        for (const inst of this.instructions) {
            // Pack instruction (4 bytes)
            const packed = this._packInstruction(inst);
            result += packed.toString(16).padStart(8, '0');
        }
        
        return result;
    }

    /**
     * Pack instruction ke 32-bit integer
     */
    _packInstruction(inst) {
        // Lua 5.1 format: iABC, iABx, iAsBx
        let packed = inst.opcode & 0x3F; // 6 bits
        packed |= ((inst.A || 0) & 0xFF) << 6; // 8 bits
        
        if (inst.Bx !== undefined) {
            packed |= ((inst.Bx || 0) & 0x3FFFF) << 14; // 18 bits
        } else {
            packed |= ((inst.C || 0) & 0x1FF) << 14; // 9 bits
            packed |= ((inst.B || 0) & 0x1FF) << 23; // 9 bits
        }
        
        return packed >>> 0;
    }

    /**
     * Encode upvalues
     */
    _encodeUpvalues() {
        let result = '';
        result += this.upvalues.length.toString(16).padStart(4, '0');
        
        for (const uv of this.upvalues) {
            result += (uv.instack || 0).toString(16).padStart(2, '0');
            result += (uv.idx || 0).toString(16).padStart(2, '0');
            if (uv.name) {
                result += uv.name.length.toString(16).padStart(2, '0');
                for (let i = 0; i < uv.name.length; i++) {
                    result += uv.name.charCodeAt(i).toString(16).padStart(2, '0');
                }
            }
        }
        
        return result;
    }

    /**
     * Encode prototypes
     */
    _encodePrototypes() {
        let result = '';
        result += this.prototypes.length.toString(16).padStart(4, '0');
        
        for (const proto of this.prototypes) {
            result += (proto.numparams || 0).toString(16).padStart(2, '0');
            result += (proto.is_vararg || 0).toString(16).padStart(2, '0');
            result += (proto.maxstacksize || 0).toString(16).padStart(2, '0');
            
            // Nested instructions
            if (proto.instructions) {
                result += proto.instructions.length.toString(16).padStart(8, '0');
                for (const inst of proto.instructions) {
                    const packed = this._packInstruction(inst);
                    result += packed.toString(16).padStart(8, '0');
                }
            }
            
            // Nested constants
            if (proto.constants) {
                result += proto.constants.length.toString(16).padStart(4, '0');
                for (const c of proto.constants) {
                    result += (c.type === 'number' ? 3 : 4).toString(16).padStart(2, '0');
                    if (c.type === 'number') {
                        result += this._encodeNumber(c.value);
                    } else {
                        const str = String(c.value);
                        result += str.length.toString(16).padStart(4, '0');
                        for (let i = 0; i < str.length; i++) {
                            result += str.charCodeAt(i).toString(16).padStart(2, '0');
                        }
                    }
                }
            }
        }
        
        return result;
    }

    /**
     * Encode debug info
     */
    _encodeDebugInfo() {
        let result = '';
        result += this.debugInfo.length.toString(16).padStart(4, '0');
        
        for (const dbg of this.debugInfo) {
            if (dbg.name) {
                result += dbg.name.length.toString(16).padStart(2, '0');
                for (let i = 0; i < dbg.name.length; i++) {
                    result += dbg.name.charCodeAt(i).toString(16).padStart(2, '0');
                }
            }
            result += (dbg.startpc || 0).toString(16).padStart(4, '0');
            result += (dbg.endpc || 0).toString(16).padStart(4, '0');
        }
        
        return result;
    }

    /**
     * Encode line info
     */
    _encodeLineInfo() {
        let result = '';
        result += this.lineInfo.length.toString(16).padStart(4, '0');
        
        for (const line of this.lineInfo) {
            result += (line || 0).toString(16).padStart(4, '0');
        }
        
        return result;
    }

    /**
     * Generate extra padding
     */
    _generateExtraPadding(size) {
        let result = '';
        for (let i = 0; i < size; i++) {
            result += this.random.int(0, 15).toString(16);
        }
        return result;
    }
}

module.exports = BytecodeGenerator;
