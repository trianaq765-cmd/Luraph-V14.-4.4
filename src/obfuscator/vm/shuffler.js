/**
 * LuaShield - VM Shuffler
 * Shuffle dan randomize VM components
 */

const Random = require('../../utils/random');
const { OpcodeManager } = require('./opcodes');

class VMShuffler {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.opcodeManager = new OpcodeManager(options.seed);
    }

    /**
     * Shuffle semua VM components
     */
    shuffleAll() {
        return {
            opcodes: this.shuffleOpcodes(),
            registers: this.shuffleRegisters(),
            handlers: this.shuffleHandlers(),
            constants: this.shuffleConstantPool(),
            instructions: this.getInstructionOrder()
        };
    }

    /**
     * Shuffle opcodes
     */
    shuffleOpcodes() {
        this.opcodeManager.shuffle();
        return this.opcodeManager.getAll();
    }

    /**
     * Shuffle virtual registers
     */
    shuffleRegisters() {
        const baseRegisters = [
            'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7',
            'PC', 'SP', 'FP', 'ACC', 'TMP'
        ];

        const shuffled = {};
        const indices = this.random.shuffle([...Array(baseRegisters.length).keys()]);

        baseRegisters.forEach((reg, i) => {
            shuffled[reg] = {
                index: indices[i],
                name: this.random.generateName(this.random.int(1, 2))
            };
        });

        return shuffled;
    }

    /**
     * Generate shuffled opcode handlers
     */
    shuffleHandlers() {
        const handlers = [];
        const opcodes = this.opcodeManager.getAll();

        for (const [name, code] of Object.entries(opcodes)) {
            handlers.push({
                opcode: code,
                name: name,
                handlerName: this.random.generateName(2),
                index: this.random.int(0, 1000)
            });
        }

        // Sort by random index untuk shuffle order
        handlers.sort((a, b) => a.index - b.index);

        return handlers;
    }

    /**
     * Shuffle constant pool indices
     */
    shuffleConstantPool() {
        return {
            stringOffset: this.random.int(100, 999),
            numberOffset: this.random.int(1000, 9999),
            functionOffset: this.random.int(10000, 99999),
            tableOffset: this.random.int(100000, 999999)
        };
    }

    /**
     * Generate random instruction execution order
     */
    getInstructionOrder() {
        const order = ['fetch', 'decode', 'execute', 'store'];
        return this.random.shuffle(order);
    }

    /**
     * Generate VM dispatcher structure
     */
    generateDispatcher() {
        const stateVar = this.random.generateName(2);
        const opcodeVar = this.random.generateName(1);
        const pcVar = this.random.generateName(2);
        
        const dispatchType = this.random.choice([
            'switch',
            'table',
            'computed',
            'threaded'
        ]);

        return {
            type: dispatchType,
            vars: {
                state: stateVar,
                opcode: opcodeVar,
                pc: pcVar,
                stack: this.random.generateName(2),
                locals: this.random.generateName(2),
                constants: this.random.generateName(1)
            }
        };
    }

    /**
     * Generate obfuscated handler untuk opcode
     */
    generateHandler(opcode, handlerName) {
        const paramNames = [
            this.random.generateName(1),
            this.random.generateName(1),
            this.random.generateName(1)
        ];

        return {
            name: handlerName,
            params: paramNames,
            opcodeCheck: this.random.formatNumber(opcode)
        };
    }

    /**
     * Generate decode table
     */
    generateDecodeTable() {
        const opcodes = this.opcodeManager.getAll();
        const table = {};

        for (const [name, code] of Object.entries(opcodes)) {
            const entry = {
                handler: this.random.generateName(2),
                args: this.opcodeManager.getOpcodeInfo(name).args,
                stack: this.opcodeManager.getOpcodeInfo(name).stack
            };
            
            table[this.random.formatNumber(code)] = entry;
        }

        return table;
    }

    /**
     * Get shuffled opcode manager
     */
    getOpcodeManager() {
        return this.opcodeManager;
    }

    /**
     * Reset
     */
    reset() {
        this.random.resetNames();
        this.opcodeManager.reset();
    }
}

module.exports = VMShuffler;
