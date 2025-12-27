/**
 * LuaShield - VM Compiler
 * Compile Lua AST ke VM bytecode
 */

const Random = require('../../utils/random');
const { OpcodeManager, BaseOpcodes } = require('./opcodes');
const VMShuffler = require('./shuffler');
const Nodes = require('../parser/nodes');

class VMCompiler {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.shuffler = new VMShuffler({ seed: options.seed });
        this.opcodeManager = this.shuffler.getOpcodeManager();
        
        // Shuffle opcodes jika enabled
        if (options.shuffleOpcodes !== false) {
            this.opcodeManager.shuffle();
        }

        // Compilation state
        this.constants = [];
        this.constantMap = new Map();
        this.instructions = [];
        this.locals = [];
        this.scopeStack = [];
        this.loopStack = [];
        this.labelMap = new Map();
        
        // Stats
        this.stats = {
            instructions: 0,
            constants: 0,
            locals: 0,
            functions: 0
        };
    }

    /**
     * Compile AST ke bytecode
     */
    compile(ast) {
        this.reset();

        // Compile chunk
        if (ast.type === Nodes.Types.CHUNK) {
            this.compileBlock(ast.body);
        } else {
            this.compileNode(ast);
        }

        // Add final return jika belum ada
        if (this.instructions.length === 0 || 
            this.instructions[this.instructions.length - 1].op !== this.opcodeManager.get('RETURN')) {
            this.emit('RETURN', 0);
        }

        return {
            instructions: this.instructions,
            constants: this.constants,
            opcodes: this.opcodeManager.getAll(),
            stats: this.stats
        };
    }

    /**
     * Reset compiler state
     */
    reset() {
        this.constants = [];
        this.constantMap.clear();
        this.instructions = [];
        this.locals = [];
        this.scopeStack = [];
        this.loopStack = [];
        this.labelMap.clear();
        this.stats = { instructions: 0, constants: 0, locals: 0, functions: 0 };
    }

    // ═══════════════════════════════════════════════════════════
    // INSTRUCTION EMISSION
    // ═══════════════════════════════════════════════════════════

    emit(opcode, ...args) {
        const op = typeof opcode === 'string' ? this.opcodeManager.get(opcode) : opcode;
        
        const instruction = {
            op: op,
            args: args,
            index: this.instructions.length,
            line: this.currentLine || 0
        };

        this.instructions.push(instruction);
        this.stats.instructions++;

        return instruction.index;
    }

    /**
     * Emit dengan placeholder untuk jump target
     */
    emitJump(opcode) {
        return this.emit(opcode, 0); // Placeholder
    }

    /**
     * Patch jump target
     */
    patchJump(instructionIndex, target = null) {
        target = target !== null ? target : this.instructions.length;
        this.instructions[instructionIndex].args[0] = target;
    }

    /**
     * Get current instruction index
     */
    currentIndex() {
        return this.instructions.length;
    }

    // ═══════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════

    addConstant(value) {
        const key = this._constantKey(value);
        
        if (this.constantMap.has(key)) {
            return this.constantMap.get(key);
        }

        const index = this.constants.length;
        this.constants.push(value);
        this.constantMap.set(key, index);
        this.stats.constants++;

        return index;
    }

    _constantKey(value) {
        if (value === null) return 'nil';
        if (typeof value === 'boolean') return `bool:${value}`;
        if (typeof value === 'number') return `num:${value}`;
        if (typeof value === 'string') return `str:${value}`;
        return `obj:${JSON.stringify(value)}`;
    }

    // ═══════════════════════════════════════════════════════════
    // LOCALS & SCOPES
    // ═══════════════════════════════════════════════════════════

    enterScope() {
        this.scopeStack.push(this.locals.length);
    }

    exitScope() {
        const previousLength = this.scopeStack.pop();
        const removed = this.locals.length - previousLength;
        this.locals.length = previousLength;
        return removed;
    }

    declareLocal(name) {
        const index = this.locals.length;
        this.locals.push({ name, index, depth: this.scopeStack.length });
        this.stats.locals++;
        return index;
    }

    resolveLocal(name) {
        for (let i = this.locals.length - 1; i >= 0; i--) {
            if (this.locals[i].name === name) {
                return this.locals[i].index;
            }
        }
        return -1; // Not found (global)
    }

    // ═══════════════════════════════════════════════════════════
    // LOOP HANDLING
    // ═══════════════════════════════════════════════════════════

    enterLoop(startIndex) {
        this.loopStack.push({
            start: startIndex,
            breaks: []
        });
    }

    exitLoop() {
        const loop = this.loopStack.pop();
        
        // Patch all break statements
        for (const breakIndex of loop.breaks) {
            this.patchJump(breakIndex);
        }

        return loop;
    }

    emitBreak() {
        if (this.loopStack.length === 0) {
            throw new Error('Break statement outside of loop');
        }
        
        const jumpIndex = this.emitJump('JMP');
        this.loopStack[this.loopStack.length - 1].breaks.push(jumpIndex);
    }

    // ═══════════════════════════════════════════════════════════
    // NODE COMPILATION
    // ═══════════════════════════════════════════════════════════

    compileNode(node) {
        if (!node) return;

        this.currentLine = node.line;

        switch (node.type) {
            // Statements
            case Nodes.Types.LOCAL_STATEMENT:
                return this.compileLocalStatement(node);
            case Nodes.Types.ASSIGNMENT_STATEMENT:
                return this.compileAssignment(node);
            case Nodes.Types.CALL_STATEMENT:
                return this.compileCallStatement(node);
            case Nodes.Types.FUNCTION_DECLARATION:
                return this.compileFunctionDeclaration(node);
            case Nodes.Types.IF_STATEMENT:
                return this.compileIfStatement(node);
            case Nodes.Types.WHILE_STATEMENT:
                return this.compileWhileStatement(node);
            case Nodes.Types.DO_STATEMENT:
                return this.compileDoStatement(node);
            case Nodes.Types.REPEAT_STATEMENT:
                return this.compileRepeatStatement(node);
            case Nodes.Types.FOR_NUMERIC_STATEMENT:
                return this.compileForNumeric(node);
            case Nodes.Types.FOR_GENERIC_STATEMENT:
                return this.compileForGeneric(node);
            case Nodes.Types.RETURN_STATEMENT:
                return this.compileReturn(node);
            case Nodes.Types.BREAK_STATEMENT:
                return this.emitBreak();

            // Expressions
            case Nodes.Types.IDENTIFIER:
                return this.compileIdentifier(node);
            case Nodes.Types.NUMERIC_LITERAL:
                return this.compileNumericLiteral(node);
            case Nodes.Types.STRING_LITERAL:
                return this.compileStringLiteral(node);
            case Nodes.Types.BOOLEAN_LITERAL:
                return this.compileBooleanLiteral(node);
            case Nodes.Types.NIL_LITERAL:
                return this.emit('LOADNIL', 1);
            case Nodes.Types.VARARG_LITERAL:
                return this.emit('VARARG', 0);
            case Nodes.Types.FUNCTION_EXPRESSION:
                return this.compileFunctionExpression(node);
            case Nodes.Types.TABLE_CONSTRUCTOR:
                return this.compileTableConstructor(node);
            case Nodes.Types.BINARY_EXPRESSION:
                return this.compileBinaryExpression(node);
            case Nodes.Types.UNARY_EXPRESSION:
                return this.compileUnaryExpression(node);
            case Nodes.Types.LOGICAL_EXPRESSION:
                return this.compileLogicalExpression(node);
            case Nodes.Types.MEMBER_EXPRESSION:
                return this.compileMemberExpression(node);
            case Nodes.Types.INDEX_EXPRESSION:
                return this.compileIndexExpression(node);
            case Nodes.Types.CALL_EXPRESSION:
                return this.compileCallExpression(node);

            default:
                console.warn(`Unknown node type: ${node.type}`);
        }
    }

    compileBlock(statements) {
        for (const stmt of statements) {
            this.compileNode(stmt);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STATEMENT COMPILATION
    // ═══════════════════════════════════════════════════════════

    compileLocalStatement(node) {
        const varCount = node.variables.length;
        const initCount = node.init?.length || 0;

        // Compile initializers
        for (let i = 0; i < initCount; i++) {
            this.compileNode(node.init[i]);
        }

        // Fill missing with nil
        for (let i = initCount; i < varCount; i++) {
            this.emit('LOADNIL', 1);
        }

        // Declare locals (in reverse order due to stack)
        for (let i = varCount - 1; i >= 0; i--) {
            const localIndex = this.declareLocal(node.variables[i].name);
            this.emit('SETLOCAL', localIndex);
        }
    }

    compileAssignment(node) {
        const varCount = node.variables.length;
        const initCount = node.init.length;

        // Compile all values first
        for (let i = 0; i < initCount; i++) {
            this.compileNode(node.init[i]);
        }

        // Fill missing with nil
        for (let i = initCount; i < varCount; i++) {
            this.emit('LOADNIL', 1);
        }

        // Assign to variables (in reverse order)
        for (let i = varCount - 1; i >= 0; i--) {
            this.compileAssignmentTarget(node.variables[i]);
        }
    }

    compileAssignmentTarget(target) {
        if (target.type === Nodes.Types.IDENTIFIER) {
            const localIndex = this.resolveLocal(target.name);
            if (localIndex >= 0) {
                this.emit('SETLOCAL', localIndex);
            } else {
                const nameIndex = this.addConstant(target.name);
                this.emit('SETGLOBAL', nameIndex);
            }
        } else if (target.type === Nodes.Types.MEMBER_EXPRESSION) {
            this.compileNode(target.base);
            const nameIndex = this.addConstant(target.identifier.name);
            this.emit('SETFIELD', nameIndex);
        } else if (target.type === Nodes.Types.INDEX_EXPRESSION) {
            this.compileNode(target.base);
            this.compileNode(target.index);
            this.emit('SETTABLE');
        }
    }

    compileCallStatement(node) {
        this.compileNode(node.expression);
        this.emit('POP'); // Discard return value
    }

    compileFunctionDeclaration(node) {
        this.stats.functions++;

        // Compile function body sebagai closure
        const funcCompiler = new VMCompiler({ seed: this.random.seed });
        
        // Add parameters as locals
        funcCompiler.enterScope();
        for (const param of node.parameters) {
            if (param.type === Nodes.Types.IDENTIFIER) {
                funcCompiler.declareLocal(param.name);
            }
        }

        // Compile body
        funcCompiler.compileBlock(node.body);
        
        const funcData = {
            instructions: funcCompiler.instructions,
            constants: funcCompiler.constants,
            numParams: node.parameters.length,
            isVararg: node.parameters.some(p => p.type === Nodes.Types.VARARG_LITERAL)
        };

        const funcIndex = this.addConstant(funcData);
        this.emit('CLOSURE', funcIndex);

        // Store function
        if (node.identifier) {
            if (node.isLocal) {
                const localIndex = this.declareLocal(node.identifier.name);
                this.emit('SETLOCAL', localIndex);
            } else {
                this.compileAssignmentTarget(node.identifier);
            }
        }
    }

    compileFunctionExpression(node) {
        this.stats.functions++;

        const funcCompiler = new VMCompiler({ seed: this.random.seed });
        
        funcCompiler.enterScope();
        for (const param of node.parameters) {
            if (param.type === Nodes.Types.IDENTIFIER) {
                funcCompiler.declareLocal(param.name);
            }
        }

        funcCompiler.compileBlock(node.body);

        const funcData = {
            instructions: funcCompiler.instructions,
            constants: funcCompiler.constants,
            numParams: node.parameters.length,
            isVararg: node.parameters.some(p => p.type === Nodes.Types.VARARG_LITERAL)
        };

        const funcIndex = this.addConstant(funcData);
        this.emit('CLOSURE', funcIndex);
    }

    // ═══════════════════════════════════════════════════════════
    // CONTROL FLOW COMPILATION
    // ═══════════════════════════════════════════════════════════

    compileIfStatement(node) {
        const endJumps = [];

        for (let i = 0; i < node.clauses.length; i++) {
            const clause = node.clauses[i];

            if (clause.type === Nodes.Types.IF_CLAUSE || 
                clause.type === Nodes.Types.ELSEIF_CLAUSE) {
                
                // Compile condition
                this.compileNode(clause.condition);
                
                // Jump to next clause if false
                const jumpToNext = this.emitJump('JMPIFNOT');

                // Compile body
                this.enterScope();
                this.compileBlock(clause.body);
                this.exitScope();

                // Jump to end after body
                if (i < node.clauses.length - 1) {
                    endJumps.push(this.emitJump('JMP'));
                }

                // Patch jump to next clause
                this.patchJump(jumpToNext);

            } else if (clause.type === Nodes.Types.ELSE_CLAUSE) {
                this.enterScope();
                this.compileBlock(clause.body);
                this.exitScope();
            }
        }

        // Patch all end jumps
        for (const jump of endJumps) {
            this.patchJump(jump);
        }
    }

    compileWhileStatement(node) {
        const loopStart = this.currentIndex();
        this.enterLoop(loopStart);

        // Compile condition
        this.compileNode(node.condition);
        const exitJump = this.emitJump('JMPIFNOT');

        // Compile body
        this.enterScope();
        this.compileBlock(node.body);
        this.exitScope();

        // Jump back to start
        this.emit('JMP', loopStart);

        // Patch exit jump
        this.patchJump(exitJump);
        this.exitLoop();
    }

    compileDoStatement(node) {
        this.enterScope();
        this.compileBlock(node.body);
        this.exitScope();
    }

    compileRepeatStatement(node) {
        const loopStart = this.currentIndex();
        this.enterLoop(loopStart);

        // Compile body
        this.enterScope();
        this.compileBlock(node.body);

        // Compile condition
        this.compileNode(node.condition);
        this.exitScope();

        // Jump back if condition is false
        this.emit('JMPIFNOT', loopStart);

        this.exitLoop();
    }

    compileForNumeric(node) {
        this.enterScope();

        // Compile loop parameters
        this.compileNode(node.start);
        this.compileNode(node.end);
        if (node.step) {
            this.compileNode(node.step);
        } else {
            const oneIndex = this.addConstant(1);
            this.emit('LOADK', oneIndex);
        }

        // Declare loop variable
        const loopVar = this.declareLocal(node.variable.name);

        // FORPREP
        const prepIndex = this.emit('FORPREP', loopVar, 0);
        const loopStart = this.currentIndex();
        this.enterLoop(loopStart);

        // Compile body
        this.compileBlock(node.body);

        // FORLOOP
        this.emit('FORLOOP', loopVar, loopStart);

        // Patch FORPREP
        this.instructions[prepIndex].args[1] = this.currentIndex();

        this.exitLoop();
        this.exitScope();
    }

    compileForGeneric(node) {
        this.enterScope();

        // Compile iterators
        for (const iter of node.iterators) {
            this.compileNode(iter);
        }

        // Declare loop variables
        for (const variable of node.variables) {
            this.declareLocal(variable.name);
        }

        const loopStart = this.currentIndex();
        this.enterLoop(loopStart);

        // TFORLOOP
        this.emit('TFORLOOP', node.variables.length);
        const exitJump = this.emitJump('JMPIFNOT');

        // Compile body
        this.compileBlock(node.body);

        // Jump back
        this.emit('JMP', loopStart);

        // Patch exit
        this.patchJump(exitJump);

        this.exitLoop();
        this.exitScope();
    }

    compileReturn(node) {
        const argCount = node.arguments?.length || 0;

        for (const arg of node.arguments || []) {
            this.compileNode(arg);
        }

        this.emit('RETURN', argCount);
    }

    // ═══════════════════════════════════════════════════════════
    // EXPRESSION COMPILATION
    // ═══════════════════════════════════════════════════════════

    compileIdentifier(node) {
        const localIndex = this.resolveLocal(node.name);
        
        if (localIndex >= 0) {
            this.emit('GETLOCAL', localIndex);
        } else {
            const nameIndex = this.addConstant(node.name);
            this.emit('GETGLOBAL', nameIndex);
        }
    }

    compileNumericLiteral(node) {
        const constIndex = this.addConstant(node.value);
        this.emit('LOADK', constIndex);
    }

    compileStringLiteral(node) {
        const constIndex = this.addConstant(node.value);
        this.emit('LOADK', constIndex);
    }

    compileBooleanLiteral(node) {
        this.emit('LOADBOOL', node.value ? 1 : 0, 0);
    }

    compileTableConstructor(node) {
        // Estimate array and hash parts
        let arraySize = 0;
        let hashSize = 0;

        for (const field of node.fields || []) {
            if (field.type === Nodes.Types.TABLE_VALUE) {
                arraySize++;
            } else {
                hashSize++;
            }
        }

        this.emit('NEWTABLE', arraySize, hashSize);

        let arrayIndex = 1;
        for (const field of node.fields || []) {
            this.emit('DUP'); // Duplicate table reference

            if (field.type === Nodes.Types.TABLE_VALUE) {
                // Array part
                const idxConst = this.addConstant(arrayIndex++);
                this.emit('LOADK', idxConst);
                this.compileNode(field.value);
                this.emit('SETTABLE');
            } else if (field.type === Nodes.Types.TABLE_KEY_STRING) {
                // Hash part with string key
                const keyConst = this.addConstant(field.key.name);
                this.compileNode(field.value);
                this.emit('SETFIELD', keyConst);
            } else if (field.type === Nodes.Types.TABLE_KEY) {
                // Hash part with computed key
                this.compileNode(field.key);
                this.compileNode(field.value);
                this.emit('SETTABLE');
            }
        }
    }

    compileBinaryExpression(node) {
        this.compileNode(node.left);
        this.compileNode(node.right);

        const opMap = {
            '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV',
            '%': 'MOD', '^': 'POW', '//': 'IDIV',
            '&': 'BAND', '|': 'BOR', '~': 'BXOR',
            '<<': 'SHL', '>>': 'SHR',
            '..': 'CONCAT',
            '==': 'EQ', '~=': 'NE',
            '<': 'LT', '<=': 'LE', '>': 'GT', '>=': 'GE'
        };

        const opcode = opMap[node.operator];
        if (opcode) {
            this.emit(opcode);
        } else {
            throw new Error(`Unknown binary operator: ${node.operator}`);
        }
    }

    compileUnaryExpression(node) {
        this.compileNode(node.argument);

        const opMap = {
            '-': 'UNM',
            'not': 'NOT',
            '#': 'LEN',
            '~': 'BNOT'
        };

        const opcode = opMap[node.operator];
        if (opcode) {
            this.emit(opcode);
        } else {
            throw new Error(`Unknown unary operator: ${node.operator}`);
        }
    }

    compileLogicalExpression(node) {
        this.compileNode(node.left);

        if (node.operator === 'and') {
            const jumpFalse = this.emitJump('JMPIFNOT');
            this.emit('POP');
            this.compileNode(node.right);
            this.patchJump(jumpFalse);
        } else if (node.operator === 'or') {
            const jumpTrue = this.emitJump('JMPIF');
            this.emit('POP');
            this.compileNode(node.right);
            this.patchJump(jumpTrue);
        }
    }

    compileMemberExpression(node) {
        this.compileNode(node.base);
        const nameIndex = this.addConstant(node.identifier.name);
        this.emit('GETFIELD', nameIndex);
    }

    compileIndexExpression(node) {
        this.compileNode(node.base);
        this.compileNode(node.index);
        this.emit('GETTABLE');
    }

    compileCallExpression(node) {
        // Compile base (function)
        this.compileNode(node.base);

        // Compile arguments
        for (const arg of node.arguments || []) {
            this.compileNode(arg);
        }

        this.emit('CALL', node.arguments?.length || 0, 1); // 1 return value
    }

    // ═══════════════════════════════════════════════════════════
    // BYTECODE GENERATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate bytecode dari compiled instructions
     */
    generateBytecode() {
        const bytecode = [];

        for (const inst of this.instructions) {
            bytecode.push(...this.opcodeManager.encodeInstruction(inst));
        }

        return new Uint8Array(bytecode);
    }

    /**
     * Get compilation result
     */
    getResult() {
        return {
            instructions: this.instructions,
            constants: this.constants,
            bytecode: this.generateBytecode(),
            opcodes: this.opcodeManager.getAll(),
            stats: this.stats
        };
    }
}

module.exports = VMCompiler;
