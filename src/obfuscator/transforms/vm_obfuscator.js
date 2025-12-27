/**
 * LuaShield - VM Obfuscator
 * Wrap code dalam Virtual Machine dengan proper integration
 */

const Random = require('../../utils/random');
const VMCompiler = require('../vm/compiler');
const VMShuffler = require('../vm/shuffler');
const VMTemplate = require('../vm/template');
const StringEncryptor = require('../encryption/strings');
const ConstantEncryptor = require('../encryption/constants');

// Import parser dengan safe check
let LuaParser;
try {
    LuaParser = require('../parser/init');
} catch (e) {
    LuaParser = null;
}

class VMObfuscator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.shuffler = new VMShuffler({ seed: options.seed });
        this.template = new VMTemplate({ seed: options.seed, target: options.target });
        this.stringEncryptor = new StringEncryptor({ seed: options.seed });
        this.constantEncryptor = new ConstantEncryptor({ seed: options.seed });
        
        // Initialize compiler
        this.compiler = new VMCompiler({ 
            seed: options.seed,
            shuffleOpcodes: options.shuffleOpcodes !== false
        });

        // Initialize parser jika tersedia
        this.parser = LuaParser ? new LuaParser() : null;

        this.config = {
            target: options.target || 'roblox',
            encryptStrings: options.encryptStrings !== false,
            shuffleOpcodes: options.shuffleOpcodes !== false,
            useAdvancedWrapper: options.useAdvancedWrapper !== false,
            fallbackOnError: options.fallbackOnError !== false
        };

        this.stats = {
            bytecodeSize: 0,
            constantCount: 0,
            instructionCount: 0
        };
    }

    /**
     * Main obfuscate function
     */
    obfuscate(code) {
        try {
            // Try full VM compilation jika parser tersedia
            if (this.parser && this.config.useAdvancedWrapper) {
                return this._fullVMObfuscation(code);
            }
            
            // Fallback ke simple wrapper
            return this._simpleVMWrapper(code);

        } catch (error) {
            console.error('VM Obfuscation error:', error.message);
            
            if (this.config.fallbackOnError) {
                return this._simpleVMWrapper(code);
            }
            
            throw error;
        }
    }

    /**
     * Full VM obfuscation dengan bytecode compilation
     */
    _fullVMObfuscation(code) {
        // Step 1: Parse code
        const parseResult = this.parser.parse(code);
        
        if (!parseResult.success) {
            // Fallback jika parse gagal
            return this._simpleVMWrapper(code);
        }

        // Step 2: Compile ke bytecode
        let compiled;
        try {
            compiled = this.compiler.compile(parseResult.ast);
        } catch (e) {
            return this._simpleVMWrapper(code);
        }

        // Step 3: Update stats
        this.stats.instructionCount = compiled.instructions.length;
        this.stats.constantCount = compiled.constants.length;

        // Step 4: Generate VM code
        const vmCode = this._generateVMCode(compiled);

        return {
            success: true,
            code: vmCode,
            stats: { ...this.stats }
        };
    }

    /**
     * Generate VM code dari compiled bytecode
     */
    _generateVMCode(compiled) {
        const vars = this._generateVMVars();
        const dispatcher = this.shuffler.generateDispatcher();

        let vmCode = '';

        // Header - return function wrapper
        vmCode += `return(function(${vars.envParam})`;
        
        // VM State initialization
        vmCode += `local ${vars.bytecode}=${this._encodeBytecode(compiled)};`;
        vmCode += `local ${vars.constants}=${this._encodeConstants(compiled.constants)};`;
        vmCode += `local ${vars.opcodeMap}=${this._encodeOpcodes(compiled.opcodes)};`;
        
        // VM Registers & Stack
        vmCode += `local ${vars.stack}={};`;
        vmCode += `local ${vars.sp}=${this.random.formatNumber(0)};`;
        vmCode += `local ${vars.pc}=${this.random.formatNumber(1)};`;
        vmCode += `local ${vars.locals}={};`;
        vmCode += `local ${vars.running}=${this.constantEncryptor.encryptBoolean(true)};`;

        // Utility function references
        vmCode += this._generateUtilRefs(vars);

        // Stack operations
        vmCode += this._generateStackOps(vars);

        // Byte reading functions
        vmCode += this._generateByteReaders(vars);

        // Opcode handlers
        vmCode += this._generateOpcodeHandlers(vars, compiled.opcodes);

        // Main dispatch loop
        vmCode += this._generateDispatchLoop(vars);

        // Execute and return
        vmCode += `return ${vars.execute}();`;
        
        vmCode += `end)(${this._generateEnvTable()})`;

        return vmCode;
    }

    /**
     * Simple VM wrapper (tanpa full bytecode compilation)
     */
    _simpleVMWrapper(code) {
        const vmCode = this.template.generate(code, {
            target: this.config.target
        });

        return {
            success: true,
            code: vmCode,
            stats: { simple: true }
        };
    }

    /**
     * Generate VM variable names (Luraph style)
     */
    _generateVMVars() {
        return {
            envParam: this.random.generateName(1),
            bytecode: this.random.generateName(2),
            constants: this.random.generateName(1),
            opcodeMap: this.random.generateName(2),
            stack: this.random.generateName(2),
            sp: this.random.generateName(2),
            pc: this.random.generateName(2),
            locals: this.random.generateName(2),
            running: this.random.generateName(2),
            execute: this.random.generateName(2),
            dispatch: this.random.generateName(2),
            handlers: this.random.generateName(2),
            
            // Utility refs
            bxor: this.random.generateName(1),
            band: this.random.generateName(1),
            bor: this.random.generateName(1),
            
            // Stack ops
            push: this.random.generateName(1),
            pop: this.random.generateName(1),
            peek: this.random.generateName(1),
            
            // Byte readers
            readByte: this.random.generateName(2),
            readInt: this.random.generateName(2),
            readInt16: this.random.generateName(2)
        };
    }

    /**
     * Generate utility references
     */
    _generateUtilRefs(vars) {
        let code = '';
        
        code += `local ${vars.bxor}=bit32.bxor;`;
        code += `local ${vars.band}=bit32.band;`;
        code += `local ${vars.bor}=bit32.bor;`;
        
        return code;
    }

    /**
     * Generate stack operations
     */
    _generateStackOps(vars) {
        let code = '';

        // Push
        code += `local function ${vars.push}(v)`;
        code += `${vars.sp}=${vars.sp}+${this.random.formatNumber(1)};`;
        code += `${vars.stack}[${vars.sp}]=v;`;
        code += `end;`;

        // Pop
        code += `local function ${vars.pop}()`;
        code += `local v=${vars.stack}[${vars.sp}];`;
        code += `${vars.stack}[${vars.sp}]=nil;`;
        code += `${vars.sp}=${vars.sp}-${this.random.formatNumber(1)};`;
        code += `return v;`;
        code += `end;`;

        // Peek
        code += `local function ${vars.peek}(o)`;
        code += `return ${vars.stack}[${vars.sp}-(o or ${this.random.formatNumber(0)})];`;
        code += `end;`;

        return code;
    }

    /**
     * Generate byte reading functions
     */
    _generateByteReaders(vars) {
        let code = '';

        // Read single byte
        code += `local function ${vars.readByte}()`;
        code += `local b=${vars.bytecode}[${vars.pc}];`;
        code += `${vars.pc}=${vars.pc}+${this.random.formatNumber(1)};`;
        code += `return b;`;
        code += `end;`;

        // Read 16-bit integer
        code += `local function ${vars.readInt16}()`;
        code += `local b1,b2=${vars.bytecode}[${vars.pc}],${vars.bytecode}[${vars.pc}+${this.random.formatNumber(1)}];`;
        code += `${vars.pc}=${vars.pc}+${this.random.formatNumber(2)};`;
        code += `return b1+b2*${this.random.formatNumber(256)};`;
        code += `end;`;

        // Read 32-bit integer
        code += `local function ${vars.readInt}()`;
        code += `local b1,b2,b3,b4=${vars.bytecode}[${vars.pc}],`;
        code += `${vars.bytecode}[${vars.pc}+${this.random.formatNumber(1)}],`;
        code += `${vars.bytecode}[${vars.pc}+${this.random.formatNumber(2)}],`;
        code += `${vars.bytecode}[${vars.pc}+${this.random.formatNumber(3)}];`;
        code += `${vars.pc}=${vars.pc}+${this.random.formatNumber(4)};`;
        code += `return b1+b2*${this.random.formatNumber(256)}+b3*${this.random.formatNumber(65536)}+b4*${this.random.formatNumber(16777216)};`;
        code += `end;`;

        return code;
    }

    /**
     * Generate opcode handlers
     */
    _generateOpcodeHandlers(vars, opcodes) {
        let code = `local ${vars.handlers}={`;
        const handlers = [];

        // LOADK - Load constant
        if (opcodes.LOADK !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.LOADK)}]=function()` +
                `local idx=${vars.readInt}();` +
                `${vars.push}(${vars.constants}[idx]);` +
                `end`);
        }

        // LOADNIL
        if (opcodes.LOADNIL !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.LOADNIL)}]=function()` +
                `local n=${vars.readInt}();` +
                `for ${this.random.generateName(1)}=1,n do ${vars.push}(nil);end;` +
                `end`);
        }

        // LOADBOOL
        if (opcodes.LOADBOOL !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.LOADBOOL)}]=function()` +
                `local b=${vars.readInt}();` +
                `${vars.push}(b~=${this.random.formatNumber(0)});` +
                `end`);
        }

        // GETLOCAL
        if (opcodes.GETLOCAL !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.GETLOCAL)}]=function()` +
                `local idx=${vars.readInt}();` +
                `${vars.push}(${vars.locals}[idx]);` +
                `end`);
        }

        // SETLOCAL
        if (opcodes.SETLOCAL !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.SETLOCAL)}]=function()` +
                `local idx=${vars.readInt}();` +
                `${vars.locals}[idx]=${vars.pop}();` +
                `end`);
        }

        // GETGLOBAL
        if (opcodes.GETGLOBAL !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.GETGLOBAL)}]=function()` +
                `local idx=${vars.readInt}();` +
                `local name=${vars.constants}[idx];` +
                `${vars.push}(_G[name]);` +
                `end`);
        }

        // SETGLOBAL
        if (opcodes.SETGLOBAL !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.SETGLOBAL)}]=function()` +
                `local idx=${vars.readInt}();` +
                `local name=${vars.constants}[idx];` +
                `_G[name]=${vars.pop}();` +
                `end`);
        }

        // GETTABLE
        if (opcodes.GETTABLE !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.GETTABLE)}]=function()` +
                `local key=${vars.pop}();` +
                `local tbl=${vars.pop}();` +
                `${vars.push}(tbl[key]);` +
                `end`);
        }

        // SETTABLE
        if (opcodes.SETTABLE !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.SETTABLE)}]=function()` +
                `local val=${vars.pop}();` +
                `local key=${vars.pop}();` +
                `local tbl=${vars.pop}();` +
                `tbl[key]=val;` +
                `end`);
        }

        // NEWTABLE
        if (opcodes.NEWTABLE !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.NEWTABLE)}]=function()` +
                `${vars.readInt}();${vars.readInt}();` + // Skip size hints
                `${vars.push}({});` +
                `end`);
        }

        // Arithmetic operations
        const arithOps = [
            ['ADD', '+'], ['SUB', '-'], ['MUL', '*'], ['DIV', '/'],
            ['MOD', '%'], ['POW', '^'], ['IDIV', '//']
        ];

        for (const [op, sym] of arithOps) {
            if (opcodes[op] !== undefined) {
                handlers.push(`[${this.random.formatNumber(opcodes[op])}]=function()` +
                    `local b=${vars.pop}();local a=${vars.pop}();` +
                    `${vars.push}(a${sym}b);` +
                    `end`);
            }
        }

        // Bitwise operations
        if (opcodes.BAND !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.BAND)}]=function()` +
                `local b=${vars.pop}();local a=${vars.pop}();` +
                `${vars.push}(${vars.band}(a,b));` +
                `end`);
        }

        if (opcodes.BOR !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.BOR)}]=function()` +
                `local b=${vars.pop}();local a=${vars.pop}();` +
                `${vars.push}(${vars.bor}(a,b));` +
                `end`);
        }

        if (opcodes.BXOR !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.BXOR)}]=function()` +
                `local b=${vars.pop}();local a=${vars.pop}();` +
                `${vars.push}(${vars.bxor}(a,b));` +
                `end`);
        }

        // Comparison operations
        const cmpOps = [
            ['EQ', '=='], ['NE', '~='], ['LT', '<'], 
            ['LE', '<='], ['GT', '>'], ['GE', '>=']
        ];

        for (const [op, sym] of cmpOps) {
            if (opcodes[op] !== undefined) {
                handlers.push(`[${this.random.formatNumber(opcodes[op])}]=function()` +
                    `local b=${vars.pop}();local a=${vars.pop}();` +
                    `${vars.push}(a${sym}b);` +
                    `end`);
            }
        }

        // CONCAT
        if (opcodes.CONCAT !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.CONCAT)}]=function()` +
                `local b=${vars.pop}();local a=${vars.pop}();` +
                `${vars.push}(tostring(a)..tostring(b));` +
                `end`);
        }

        // LEN
        if (opcodes.LEN !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.LEN)}]=function()` +
                `${vars.push}(#${vars.pop}());` +
                `end`);
        }

        // NOT
        if (opcodes.NOT !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.NOT)}]=function()` +
                `${vars.push}(not ${vars.pop}());` +
                `end`);
        }

        // UNM (unary minus)
        if (opcodes.UNM !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.UNM)}]=function()` +
                `${vars.push}(-${vars.pop}());` +
                `end`);
        }

        // JMP
        if (opcodes.JMP !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.JMP)}]=function()` +
                `${vars.pc}=${vars.readInt}();` +
                `end`);
        }

        // JMPIF
        if (opcodes.JMPIF !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.JMPIF)}]=function()` +
                `local target=${vars.readInt}();` +
                `if ${vars.pop}() then ${vars.pc}=target;end;` +
                `end`);
        }

        // JMPIFNOT
        if (opcodes.JMPIFNOT !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.JMPIFNOT)}]=function()` +
                `local target=${vars.readInt}();` +
                `if not ${vars.pop}() then ${vars.pc}=target;end;` +
                `end`);
        }

        // CALL
        if (opcodes.CALL !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.CALL)}]=function()` +
                `local argc=${vars.readInt}();` +
                `local retc=${vars.readInt}();` +
                `local args={};` +
                `for ${this.random.generateName(1)}=argc,1,-1 do args[${this.random.generateName(1)}]=${vars.pop}();end;` +
                `local fn=${vars.pop}();` +
                `local rets={fn(table.unpack(args,1,argc))};` +
                `for ${this.random.generateName(1)}=1,retc do ${vars.push}(rets[${this.random.generateName(1)}]);end;` +
                `end`);
        }

        // RETURN
        if (opcodes.RETURN !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.RETURN)}]=function()` +
                `local n=${vars.readInt}();` +
                `local rets={};` +
                `for ${this.random.generateName(1)}=n,1,-1 do rets[${this.random.generateName(1)}]=${vars.pop}();end;` +
                `${vars.running}=false;` +
                `return table.unpack(rets,1,n);` +
                `end`);
        }

        // CLOSURE
        if (opcodes.CLOSURE !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.CLOSURE)}]=function()` +
                `local idx=${vars.readInt}();` +
                `${vars.push}(${vars.constants}[idx]);` +
                `end`);
        }

        // NOP
        if (opcodes.NOP !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.NOP)}]=function()end`);
        }

        // HALT
        if (opcodes.HALT !== undefined) {
            handlers.push(`[${this.random.formatNumber(opcodes.HALT)}]=function()` +
                `${vars.running}=false;` +
                `end`);
        }

        // Shuffle handlers
        code += this.random.shuffle(handlers).join(',');
        code += `};`;

        return code;
    }

    /**
     * Generate dispatch loop
     */
    _generateDispatchLoop(vars) {
        let code = '';

        code += `local function ${vars.execute}()`;
        code += `while ${vars.running} do `;
        code += `local op=${vars.bytecode}[${vars.pc}];`;
        code += `${vars.pc}=${vars.pc}+${this.random.formatNumber(1)};`;
        code += `local h=${vars.handlers}[op];`;
        code += `if h then `;
        code += `local r={h()};`;
        code += `if not ${vars.running} then return table.unpack(r);end;`;
        code += `else `;
        code += `break;`;
        code += `end;`;
        code += `end;`;
        code += `end;`;

        return code;
    }

    /**
     * Encode bytecode ke Lua table
     */
    _encodeBytecode(compiled) {
        const bytes = [];
        
        for (const inst of compiled.instructions) {
            bytes.push(this.random.formatNumber(inst.op));
            for (const arg of inst.args) {
                // Little endian encoding
                bytes.push(this.random.formatNumber(arg & 0xFF));
                bytes.push(this.random.formatNumber((arg >> 8) & 0xFF));
                bytes.push(this.random.formatNumber((arg >> 16) & 0xFF));
                bytes.push(this.random.formatNumber((arg >> 24) & 0xFF));
            }
        }

        this.stats.bytecodeSize = bytes.length;
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
            if (constant === null || constant === undefined) {
                value = 'nil';
            } else if (typeof constant === 'boolean') {
                value = this.constantEncryptor.encryptBoolean(constant);
            } else if (typeof constant === 'number') {
                value = this.constantEncryptor.encryptNumber(constant);
            } else if (typeof constant === 'string') {
                if (this.config.encryptStrings && constant.length > 0) {
                    value = this.stringEncryptor.encrypt(constant);
                } else {
                    value = `"${constant.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
                }
            } else if (typeof constant === 'object' && constant.instructions) {
                // Nested function - encode as table for now
                value = '(function()end)';
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
     * Generate environment table
     */
    _generateEnvTable() {
        const entries = [];
        
        entries.push(`bxor=bit32.bxor`);
        entries.push(`band=bit32.band`);
        entries.push(`bor=bit32.bor`);
        entries.push(`bnot=bit32.bnot`);
        entries.push(`lshift=bit32.lshift`);
        entries.push(`rshift=bit32.rshift`);
        entries.push(`byte=string.byte`);
        entries.push(`char=string.char`);
        entries.push(`sub=string.sub`);
        entries.push(`concat=table.concat`);

        return `{${this.random.shuffle(entries).join(',')}}`;
    }

    /**
     * Get stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
        this.compiler.reset();
        this.shuffler.reset();
        this.template.reset();
        this.stats = { bytecodeSize: 0, constantCount: 0, instructionCount: 0 };
    }
}

module.exports = VMObfuscator;
