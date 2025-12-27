/**
 * LuaShield - VM Obfuscator
 * Wrap code dalam Virtual Machine
 */

const Random = require('../../utils/random');
const VMCompiler = require('../vm/compiler');
const VMShuffler = require('../vm/shuffler');
const VMTemplate = require('../vm/template');
const LuaParser = require('../parser/init');
const StringEncryptor = require('../encryption/strings');

class VMObfuscator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.compiler = new VMCompiler({ seed: options.seed });
        this.shuffler = new VMShuffler({ seed: options.seed });
        this.template = new VMTemplate({ seed: options.seed, target: options.target });
        this.stringEncryptor = new StringEncryptor({ seed: options.seed });
        this.parser = new LuaParser();

        this.config = {
            target: options.target || 'roblox',
            encryptStrings: options.encryptStrings !== false,
            shuffleOpcodes: options.shuffleOpcodes !== false,
            inlineVM: options.inlineVM !== false,
            complexDispatch: options.complexDispatch || false
        };
    }

    /**
     * Obfuscate code dengan VM
     */
    obfuscate(code) {
        try {
            // Step 1: Parse code
            const parseResult = this.parser.parse(code);
            
            if (!parseResult.success) {
                // Fallback ke simple wrapper jika parse gagal
                return this.simpleFallback(code);
            }

            // Step 2: Compile ke bytecode
            const compiled = this.compiler.compile(parseResult.ast);

            // Step 3: Generate VM wrapper
            const vmCode = this.generateVM(compiled);

            return {
                success: true,
                code: vmCode,
                stats: compiled.stats
            };

        } catch (error) {
            // Fallback jika ada error
            return this.simpleFallback(code);
        }
    }

    /**
     * Generate VM wrapper code
     */
    generateVM(compiled) {
        const vars = this._generateVMVars();
        const dispatcher = this.shuffler.generateDispatcher();

        let vmCode = '';

        // Header
        vmCode += `return(function(${vars.envParam})`;
        
        // VM State
        vmCode += `local ${vars.bytecode}=${this._encodeBytecode(compiled)};`;
        vmCode += `local ${vars.constants}=${this._encodeConstants(compiled.constants)};`;
        vmCode += `local ${vars.opcodes}=${this._encodeOpcodes(compiled.opcodes)};`;
        
        // VM Registers & Stack
        vmCode += `local ${vars.stack}={};`;
        vmCode += `local ${vars.sp}=${this.random.formatNumber(0)};`;
        vmCode += `local ${vars.pc}=${this.random.formatNumber(1)};`;
        vmCode += `local ${vars.locals}={};`;

        // Utility functions
        vmCode += this._generateUtilFunctions(vars);

        // Opcode handlers
        vmCode += this._generateOpcodeHandlers(vars, compiled.opcodes);

        // Main dispatch loop
        vmCode += this._generateDispatchLoop(vars, dispatcher);

        // Execute
        vmCode += `${vars.execute}();`;
        
        vmCode += `end)(${this._generateEnvTable()})`;

        return vmCode;
    }

    /**
     * Generate VM variable names
     */
    _generateVMVars() {
        return {
            envParam: this.random.generateName(1),
            bytecode: this.random.generateName(2),
            constants: this.random.generateName(1),
            opcodes: this.random.generateName(2),
            stack: this.random.generateName(2),
            sp: this.random.generateName(2),
            pc: this.random.generateName(2),
            locals: this.random.generateName(2),
            execute: this.random.generateName(2),
            dispatch: this.random.generateName(2),
            fetch: this.random.generateName(2),
            decode: this.random.generateName(1),
            handlers: this.random.generateName(2),
            push: this.random.generateName(1),
            pop: this.random.generateName(1),
            peek: this.random.generateName(1),
            readByte: this.random.generateName(2),
            readInt: this.random.generateName(2)
        };
    }

    /**
     * Encode bytecode ke Lua table
     */
    _encodeBytecode(compiled) {
        const bytes = [];
        
        for (const inst of compiled.instructions) {
            bytes.push(this.random.formatNumber(inst.op));
            for (const arg of inst.args) {
                // Encode as 4 bytes
                bytes.push(this.random.formatNumber(arg & 0xFF));
                bytes.push(this.random.formatNumber((arg >> 8) & 0xFF));
                bytes.push(this.random.formatNumber((arg >> 16) & 0xFF));
                bytes.push(this.random.formatNumber((arg >> 24) & 0xFF));
            }
        }

        return `{${bytes.join(',')}}`;
    }

    /**
     * Encode constants
     */
    _encodeConstants(constants) {
        const entries = [];

        for (let i = 0; i < constants.length; i++) {
            const constant = constants[i];
            const key = this.random.formatNumber(i);
            
            let value;
            if (constant === null) {
                value = 'nil';
            } else if (typeof constant === 'boolean') {
                value = constant ? 'true' : 'false';
            } else if (typeof constant === 'number') {
                value = this.random.formatNumber(constant);
            } else if (typeof constant === 'string') {
                if (this.config.encryptStrings) {
                    value = this.stringEncryptor.encrypt(constant);
                } else {
                    value = `"${constant.replace(/"/g, '\\"')}"`;
                }
            } else if (typeof constant === 'object' && constant.instructions) {
                // Nested function
                value = this._encodeBytecode(constant);
            } else {
                value = 'nil';
            }

            entries.push(`[${key}]=${value}`);
        }

        return `{${this.random.shuffle(entries).join(',')}}`;
    }

    /**
     * Encode opcodes mapping
     */
    _encodeOpcodes(opcodes) {
        const entries = [];

        for (const [name, code] of Object.entries(opcodes)) {
            entries.push(`[${this.random.formatNumber(code)}]="${name}"`);
        }

        return `{${this.random.shuffle(entries).join(',')}}`;
    }

    /**
     * Generate utility functions
     */
    _generateUtilFunctions(vars) {
        let code = '';

        // Push function
        code += `local function ${vars.push}(${vars.stack},${vars.sp},v)`;
        code += `${vars.sp}=${vars.sp}+${this.random.formatNumber(1)};`;
        code += `${vars.stack}[${vars.sp}]=v;`;
        code += `return ${vars.sp};`;
        code += `end;`;

        // Pop function
        code += `local function ${vars.pop}(${vars.stack},${vars.sp})`;
        code += `local v=${vars.stack}[${vars.sp}];`;
        code += `${vars.stack}[${vars.sp}]=nil;`;
        code += `return v,${vars.sp}-${this.random.formatNumber(1)};`;
        code += `end;`;

        // Read byte
        code += `local function ${vars.readByte}(${vars.bytecode},${vars.pc})`;
        code += `local b=${vars.bytecode}[${vars.pc}];`;
        code += `return b,${vars.pc}+${this.random.formatNumber(1)};`;
        code += `end;`;

        // Read int (4 bytes little endian)
        code += `local function ${vars.readInt}(${vars.bytecode},${vars.pc})`;
        code += `local b1,b2,b3,b4=${vars.bytecode}[${vars.pc}],`;
        code += `${vars.bytecode}[${vars.pc}+${this.random.formatNumber(1)}],`;
        code += `${vars.bytecode}[${vars.pc}+${this.random.formatNumber(2)}],`;
        code += `${vars.bytecode}[${vars.pc}+${this.random.formatNumber(3)}];`;
        code += `return b1+b2*${this.random.formatNumber(256)}+b3*${this.random.formatNumber(65536)}+b4*${this.random.formatNumber(16777216)},`;
        code += `${vars.pc}+${this.random.formatNumber(4)};`;
        code += `end;`;

        return code;
    }

    /**
     * Generate opcode handlers
     */
    _generateOpcodeHandlers(vars, opcodes) {
        let code = `local ${vars.handlers}={`;
        const handlers = [];

        // LOADK
        handlers.push(`[${this.random.formatNumber(opcodes.LOADK)}]=function(${vars.pc})` +
            `local idx;idx,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `${vars.sp}=${vars.push}(${vars.stack},${vars.sp},${vars.constants}[idx]);` +
            `return ${vars.pc};end`);

        // LOADNIL
        handlers.push(`[${this.random.formatNumber(opcodes.LOADNIL)}]=function(${vars.pc})` +
            `local n;n,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `for i=1,n do ${vars.sp}=${vars.push}(${vars.stack},${vars.sp},nil);end;` +
            `return ${vars.pc};end`);

        // LOADBOOL
        handlers.push(`[${this.random.formatNumber(opcodes.LOADBOOL)}]=function(${vars.pc})` +
            `local b;b,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `${vars.sp}=${vars.push}(${vars.stack},${vars.sp},b~=${this.random.formatNumber(0)});` +
            `return ${vars.pc};end`);

        // GETLOCAL
        handlers.push(`[${this.random.formatNumber(opcodes.GETLOCAL)}]=function(${vars.pc})` +
            `local idx;idx,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `${vars.sp}=${vars.push}(${vars.stack},${vars.sp},${vars.locals}[idx]);` +
            `return ${vars.pc};end`);

        // SETLOCAL
        handlers.push(`[${this.random.formatNumber(opcodes.SETLOCAL)}]=function(${vars.pc})` +
            `local idx;idx,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `local v;v,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
            `${vars.locals}[idx]=v;` +
            `return ${vars.pc};end`);

        // GETGLOBAL
        handlers.push(`[${this.random.formatNumber(opcodes.GETGLOBAL)}]=function(${vars.pc})` +
            `local idx;idx,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `local name=${vars.constants}[idx];` +
            `${vars.sp}=${vars.push}(${vars.stack},${vars.sp},_G[name]);` +
            `return ${vars.pc};end`);

        // SETGLOBAL
        handlers.push(`[${this.random.formatNumber(opcodes.SETGLOBAL)}]=function(${vars.pc})` +
            `local idx;idx,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `local name=${vars.constants}[idx];` +
            `local v;v,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
            `_G[name]=v;` +
            `return ${vars.pc};end`);

        // ADD, SUB, MUL, DIV
        const binaryOps = [
            ['ADD', '+'], ['SUB', '-'], ['MUL', '*'], ['DIV', '/'],
            ['MOD', '%'], ['POW', '^']
        ];

        for (const [op, sym] of binaryOps) {
            if (opcodes[op]) {
                handlers.push(`[${this.random.formatNumber(opcodes[op])}]=function(${vars.pc})` +
                    `local b;b,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
                    `local a;a,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
                    `${vars.sp}=${vars.push}(${vars.stack},${vars.sp},a${sym}b);` +
                    `return ${vars.pc};end`);
            }
        }

        // CONCAT
        handlers.push(`[${this.random.formatNumber(opcodes.CONCAT)}]=function(${vars.pc})` +
            `local b;b,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
            `local a;a,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
            `${vars.sp}=${vars.push}(${vars.stack},${vars.sp},tostring(a)..tostring(b));` +
            `return ${vars.pc};end`);

        // CALL
        handlers.push(`[${this.random.formatNumber(opcodes.CALL)}]=function(${vars.pc})` +
            `local argc;argc,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `local retc;retc,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `local args={};for i=argc,1,-1 do local v;v,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});args[i]=v;end;` +
            `local fn;fn,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
            `local results={fn(table.unpack(args))};` +
            `for i=1,retc do ${vars.sp}=${vars.push}(${vars.stack},${vars.sp},results[i]);end;` +
            `return ${vars.pc};end`);

        // RETURN
        handlers.push(`[${this.random.formatNumber(opcodes.RETURN)}]=function(${vars.pc})` +
            `local n;n,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `local results={};for i=n,1,-1 do local v;v,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});results[i]=v;end;` +
            `return nil,results;end`);

        // JMP
        handlers.push(`[${this.random.formatNumber(opcodes.JMP)}]=function(${vars.pc})` +
            `local target;target,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `return target;end`);

        // JMPIFNOT
        handlers.push(`[${this.random.formatNumber(opcodes.JMPIFNOT)}]=function(${vars.pc})` +
            `local target;target,${vars.pc}=${vars.readInt}(${vars.bytecode},${vars.pc});` +
            `local cond;cond,${vars.sp}=${vars.pop}(${vars.stack},${vars.sp});` +
            `if not cond then return target;end;` +
            `return ${vars.pc};end`);

        // NOP
        handlers.push(`[${this.random.formatNumber(opcodes.NOP)}]=function(${vars.pc})` +
            `return ${vars.pc};end`);

        // HALT
        handlers.push(`[${this.random.formatNumber(opcodes.HALT)}]=function(${vars.pc})` +
            `return nil;end`);

        code += this.random.shuffle(handlers).join(',');
        code += `};`;

        return code;
    }

    /**
     * Generate main dispatch loop
     */
    _generateDispatchLoop(vars, dispatcher) {
        let code = '';

        code += `local function ${vars.execute}()`;
        code += `while ${vars.pc} do `;
        code += `local op;op,${vars.pc}=${vars.readByte}(${vars.bytecode},${vars.pc});`;
        code += `local handler=${vars.handlers}[op];`;
        code += `if handler then `;
        code += `local newPc,results=${vars.pc};`;
        code += `newPc,results=handler(${vars.pc});`;
        code += `if results then return table.unpack(results);end;`;
        code += `${vars.pc}=newPc;`;
        code += `else break;end;`;
        code += `end;`;
        code += `end;`;

        return code;
    }

    /**
     * Generate environment table
     */
    _generateEnvTable() {
        const entries = [];
        
        entries.push(`bxor=bit32.bxor`);
        entries.push(`band=bit32.band`);
        entries.push(`bor=bit32.bor`);
        entries.push(`sub=string.sub`);
        entries.push(`byte=string.byte`);
        entries.push(`char=string.char`);

        return `{${this.random.shuffle(entries).join(',')}}`;
    }

    /**
     * Simple fallback wrapper (jika VM compilation gagal)
     */
    simpleFallback(code) {
        return {
            success: true,
            code: this.template.generate(code),
            stats: { fallback: true }
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
        this.compiler.reset();
    }
}

module.exports = VMObfuscator;
