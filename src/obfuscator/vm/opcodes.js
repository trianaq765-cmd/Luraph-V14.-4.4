/**
 * LuaShield - VM Opcodes
 * Definisi opcodes untuk Virtual Machine
 */

const Random = require('../../utils/random');

// ═══════════════════════════════════════════════════════════
// OPCODE DEFINITIONS
// ═══════════════════════════════════════════════════════════
const BaseOpcodes = {
    // Stack Operations
    PUSH: 0x01,
    POP: 0x02,
    DUP: 0x03,
    SWAP: 0x04,
    
    // Load/Store
    LOADK: 0x10,      // Load constant
    LOADNIL: 0x11,    // Load nil
    LOADBOOL: 0x12,   // Load boolean
    LOADINT: 0x13,    // Load integer
    
    GETLOCAL: 0x20,   // Get local variable
    SETLOCAL: 0x21,   // Set local variable
    GETGLOBAL: 0x22,  // Get global variable
    SETGLOBAL: 0x23,  // Set global variable
    GETUPVAL: 0x24,   // Get upvalue
    SETUPVAL: 0x25,   // Set upvalue
    
    // Table Operations
    NEWTABLE: 0x30,   // Create new table
    GETTABLE: 0x31,   // Get table value
    SETTABLE: 0x32,   // Set table value
    GETFIELD: 0x33,   // Get table field by name
    SETFIELD: 0x34,   // Set table field by name
    
    // Arithmetic
    ADD: 0x40,
    SUB: 0x41,
    MUL: 0x42,
    DIV: 0x43,
    MOD: 0x44,
    POW: 0x45,
    IDIV: 0x46,       // Integer division
    UNM: 0x47,        // Unary minus
    
    // Bitwise
    BAND: 0x50,
    BOR: 0x51,
    BXOR: 0x52,
    BNOT: 0x53,
    SHL: 0x54,
    SHR: 0x55,
    
    // Comparison
    EQ: 0x60,
    NE: 0x61,
    LT: 0x62,
    LE: 0x63,
    GT: 0x64,
    GE: 0x65,
    
    // Logical
    NOT: 0x70,
    AND: 0x71,
    OR: 0x72,
    
    // String
    CONCAT: 0x80,
    LEN: 0x81,
    
    // Control Flow
    JMP: 0x90,        // Unconditional jump
    JMPIF: 0x91,      // Jump if true
    JMPIFNOT: 0x92,   // Jump if false
    JMPEQ: 0x93,      // Jump if equal
    JMPNE: 0x94,      // Jump if not equal
    JMPLT: 0x95,      // Jump if less than
    JMPLE: 0x96,      // Jump if less or equal
    
    // Function
    CALL: 0xA0,       // Call function
    TAILCALL: 0xA1,   // Tail call
    RETURN: 0xA2,     // Return from function
    CLOSURE: 0xA3,    // Create closure
    VARARG: 0xA4,     // Handle vararg
    
    // Loop
    FORPREP: 0xB0,    // Prepare numeric for
    FORLOOP: 0xB1,    // Numeric for loop
    TFORLOOP: 0xB2,   // Generic for loop
    
    // Misc
    NOP: 0xF0,        // No operation
    HALT: 0xFF        // Stop execution
};

// ═══════════════════════════════════════════════════════════
// OPCODE MANAGER
// ═══════════════════════════════════════════════════════════
class OpcodeManager {
    constructor(seed = null) {
        this.random = new Random(seed);
        this.opcodes = { ...BaseOpcodes };
        this.reverseMap = {};
        this.shuffled = false;
        
        this._buildReverseMap();
    }

    /**
     * Build reverse lookup map
     */
    _buildReverseMap() {
        this.reverseMap = {};
        for (const [name, code] of Object.entries(this.opcodes)) {
            this.reverseMap[code] = name;
        }
    }

    /**
     * Shuffle opcodes untuk obfuscation
     */
    shuffle() {
        const names = Object.keys(this.opcodes);
        const codes = Object.values(this.opcodes);
        
        // Fisher-Yates shuffle
        const shuffledCodes = [...codes];
        for (let i = shuffledCodes.length - 1; i > 0; i--) {
            const j = this.random.int(0, i);
            [shuffledCodes[i], shuffledCodes[j]] = [shuffledCodes[j], shuffledCodes[i]];
        }

        // Rebuild opcodes dengan shuffled values
        const newOpcodes = {};
        for (let i = 0; i < names.length; i++) {
            newOpcodes[names[i]] = shuffledCodes[i];
        }

        this.opcodes = newOpcodes;
        this._buildReverseMap();
        this.shuffled = true;

        return this;
    }

    /**
     * Get opcode value by name
     */
    get(name) {
        return this.opcodes[name];
    }

    /**
     * Get opcode name by value
     */
    getName(code) {
        return this.reverseMap[code];
    }

    /**
     * Get all opcodes
     */
    getAll() {
        return { ...this.opcodes };
    }

    /**
     * Generate opcode table untuk VM (Luraph style)
     */
    generateOpcodeTable() {
        const entries = [];
        
        for (const [name, code] of Object.entries(this.opcodes)) {
            const varName = this.random.generateName(this.random.int(1, 2));
            entries.push({
                name: varName,
                originalName: name,
                code: this.random.formatNumber(code)
            });
        }

        return this.random.shuffle(entries);
    }

    /**
     * Generate decode function
     */
    generateDecoder(tableVar = 'op') {
        const funcName = this.random.generateName(2);
        const paramName = this.random.generateName(1);
        
        const cases = [];
        for (const [name, code] of Object.entries(this.opcodes)) {
            cases.push({
                code: this.random.formatNumber(code),
                action: name.toLowerCase()
            });
        }

        return {
            funcName,
            paramName,
            cases: this.random.shuffle(cases)
        };
    }

    /**
     * Create instruction
     */
    createInstruction(opcode, ...args) {
        return {
            op: typeof opcode === 'string' ? this.get(opcode) : opcode,
            args: args,
            line: 0
        };
    }

    /**
     * Encode instruction ke bytes
     */
    encodeInstruction(instruction) {
        const bytes = [instruction.op];
        
        for (const arg of instruction.args) {
            if (typeof arg === 'number') {
                // Encode as 4 bytes (little endian)
                bytes.push(arg & 0xFF);
                bytes.push((arg >> 8) & 0xFF);
                bytes.push((arg >> 16) & 0xFF);
                bytes.push((arg >> 24) & 0xFF);
            }
        }

        return bytes;
    }

    /**
     * Get opcode info
     */
    getOpcodeInfo(opcode) {
        const name = typeof opcode === 'number' ? this.getName(opcode) : opcode;
        
        const info = {
            PUSH: { args: 1, stack: 1, desc: 'Push value onto stack' },
            POP: { args: 0, stack: -1, desc: 'Pop value from stack' },
            DUP: { args: 0, stack: 1, desc: 'Duplicate top of stack' },
            LOADK: { args: 1, stack: 1, desc: 'Load constant' },
            LOADNIL: { args: 1, stack: 1, desc: 'Load nil values' },
            LOADBOOL: { args: 2, stack: 1, desc: 'Load boolean' },
            GETLOCAL: { args: 1, stack: 1, desc: 'Get local variable' },
            SETLOCAL: { args: 1, stack: -1, desc: 'Set local variable' },
            GETGLOBAL: { args: 1, stack: 1, desc: 'Get global variable' },
            SETGLOBAL: { args: 1, stack: -1, desc: 'Set global variable' },
            NEWTABLE: { args: 2, stack: 1, desc: 'Create new table' },
            GETTABLE: { args: 0, stack: -1, desc: 'Get table value' },
            SETTABLE: { args: 0, stack: -3, desc: 'Set table value' },
            ADD: { args: 0, stack: -1, desc: 'Addition' },
            SUB: { args: 0, stack: -1, desc: 'Subtraction' },
            MUL: { args: 0, stack: -1, desc: 'Multiplication' },
            DIV: { args: 0, stack: -1, desc: 'Division' },
            CALL: { args: 2, stack: 'variable', desc: 'Call function' },
            RETURN: { args: 1, stack: 'variable', desc: 'Return' },
            JMP: { args: 1, stack: 0, desc: 'Unconditional jump' },
            JMPIF: { args: 1, stack: -1, desc: 'Jump if true' },
            JMPIFNOT: { args: 1, stack: -1, desc: 'Jump if false' }
        };

        return info[name] || { args: 0, stack: 0, desc: 'Unknown opcode' };
    }

    /**
     * Reset ke original opcodes
     */
    reset() {
        this.opcodes = { ...BaseOpcodes };
        this._buildReverseMap();
        this.shuffled = false;
    }
}

module.exports = {
    BaseOpcodes,
    OpcodeManager
};
