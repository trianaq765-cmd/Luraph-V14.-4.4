/**
 * LuaShield - VM Obfuscator
 * Wrap code dalam Virtual Machine dengan proper integration
 * FINAL VERSION - Merged dengan BytecodeGenerator & VMTemplate baru
 */

const Random = require('../../utils/random');
const StringEncryptor = require('../encryption/strings');
const ConstantEncryptor = require('../encryption/constants');

// Import VM modules dengan safe check
let VMCompiler, VMShuffler, VMTemplate, BytecodeGenerator;

try {
    VMCompiler = require('../vm/compiler');
} catch (e) {
    VMCompiler = null;
}

try {
    VMShuffler = require('../vm/shuffler');
} catch (e) {
    VMShuffler = null;
}

try {
    VMTemplate = require('../vm/template');
} catch (e) {
    VMTemplate = null;
}

try {
    BytecodeGenerator = require('../vm/bytecode');
} catch (e) {
    BytecodeGenerator = null;
}

// Import parser dengan safe check
let LuaParser;
try {
    LuaParser = require('../parser/init');
} catch (e) {
    LuaParser = null;
}

class VMObfuscator {
    constructor(options = {}) {
        this.options = options;
        this.random = new Random(options.seed);
        this.stringEncryptor = new StringEncryptor({ seed: options.seed });
        this.constantEncryptor = new ConstantEncryptor({ seed: options.seed });
        
        // Initialize shuffler jika tersedia
        this.shuffler = VMShuffler ? new VMShuffler({ seed: options.seed }) : null;
        
        // Initialize template jika tersedia
        this.template = VMTemplate ? new VMTemplate({ 
            seed: options.seed, 
            target: options.target 
        }) : null;
        
        // Initialize bytecode generator jika tersedia
        this.bytecodeGen = BytecodeGenerator ? new BytecodeGenerator({
            seed: options.seed,
            compressionLevel: options.compressionLevel || 3
        }) : null;

        // Initialize compiler jika tersedia
        this.compiler = VMCompiler ? new VMCompiler({ 
            seed: options.seed,
            shuffleOpcodes: options.shuffleOpcodes !== false
        }) : null;

        // Initialize parser jika tersedia
        this.parser = LuaParser ? new LuaParser() : null;

        this.config = {
            target: options.target || 'roblox',
            encryptStrings: options.encryptStrings !== false,
            shuffleOpcodes: options.shuffleOpcodes !== false,
            useAdvancedWrapper: options.useAdvancedWrapper !== false,
            fallbackOnError: options.fallbackOnError !== false,
            
            // Config baru untuk integrasi
            enabled: options.enabled !== false,
            complexity: options.complexity || 'medium',
            multiLayer: options.multiLayer || false,
            layers: options.layers || 2,
            antiTamper: options.antiTamper !== false,
            antiDebug: options.antiDebug !== false,
            obfuscateVM: options.obfuscateVM !== false
        };

        this.complexitySettings = {
            low: { fakeOps: 10, handlers: 15, registers: 32 },
            medium: { fakeOps: 25, handlers: 30, registers: 64 },
            high: { fakeOps: 50, handlers: 50, registers: 128 },
            extreme: { fakeOps: 100, handlers: 80, registers: 256 }
        };

        this.stats = {
            bytecodeSize: 0,
            constantCount: 0,
            instructionCount: 0,
            transformations: 0,
            vmSize: 0,
            layers: 0
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
            // Try full VM compilation jika parser dan compiler tersedia
            if (this.parser && this.compiler && this.config.useAdvancedWrapper) {
                return this._fullVMObfuscation(code);
            }
            
            // Try new template-based approach jika tersedia
            if (this.template && this.bytecodeGen) {
                return this._templateBasedObfuscation(code);
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
     * Transform method (alias untuk kompatibilitas dengan index.js)
     */
    transform(code, context = {}) {
        if (!this.config.enabled) return code;

        try {
            const result = this.obfuscate(code);
            
            if (result.success) {
                // Apply multi-layer jika diaktifkan
                let finalCode = result.code;
                
                if (this.config.multiLayer) {
                    for (let i = 1; i < this.config.layers; i++) {
                        finalCode = this._addLayer(finalCode, i);
                        this.stats.layers++;
                    }
                }
                
                this.stats.transformations++;
                return finalCode;
            }
            
            return code;
        } catch (error) {
            console.error('[VMObfuscator] Transform error:', error.message);
            return code;
        }
    }

    /**
     * Template-based obfuscation (menggunakan bytecode.js dan template.js baru)
     */
    _templateBasedObfuscation(code) {
        const settings = this.complexitySettings[this.config.complexity] || 
                        this.complexitySettings.medium;

        // Generate bytecode
        const bytecode = this.bytecodeGen.generate(code);
        this.stats.bytecodeSize = bytecode.size || 0;
        this.stats.instructionCount = bytecode.instructions.length;
        this.stats.constantCount = bytecode.constants.length;

        // Generate VM dengan template
        const vmCode = this.template.generate({
            bytecode: bytecode,
            fakeOps: settings.fakeOps,
            handlers: settings.handlers,
            registers: settings.registers,
            antiTamper: this.config.antiTamper,
            antiDebug: this.config.antiDebug
        });

        this.stats.vmSize = vmCode.length;

        // Wrap dengan loader
        const wrappedCode = this._wrapWithLoader(vmCode, bytecode);

        return {
            success: true,
            code: wrappedCode,
            stats: { ...this.stats }
        };
    }

    /**
     * Wrap VM dengan loader code
     */
    _wrapWithLoader(vmCode, bytecode) {
        const loaderVar = this.random.generateName(3);
        const envVar = this.random.generateName(3);
        const dataVar = this.random.generateName(3);
        const runVar = this.random.generateName(3);
        const checkVar = this.random.generateName(3);
        const vmName = this.template ? this.template.getVMName() : this.random.generateName(4);

        // Serialize bytecode
        const serialized = this._serializeBytecode(bytecode);

        // Anti-tamper check
        const antiTamper = this.config.antiTamper ? this._generateAntiTamper(checkVar) : '';

        // Anti-debug check
        const antiDebug = this.config.antiDebug ? this._generateAntiDebug() : '';

        return `
do
    ${antiDebug}
    ${antiTamper}
    
    local ${envVar} = getfenv and getfenv() or _ENV or _G
    local ${dataVar} = "${serialized}"
    
    ${vmCode}
    
    local ${runVar} = function()
        local ${loaderVar} = ${vmName}
        if ${loaderVar} and type(${loaderVar}) == "table" and ${loaderVar}.execute then
            return ${loaderVar}:execute(${dataVar}, ${envVar})
        end
    end
    
    ${this.config.antiTamper ? `if ${checkVar}() then` : ''}
        ${runVar}()
    ${this.config.antiTamper ? `end` : ''}
end
`.trim();
    }

    /**
     * Serialize bytecode ke string
     */
    _serializeBytecode(bytecode) {
        const data = {
            h: bytecode.header,
            i: bytecode.instructions.map(inst => ({
                o: inst.opcode,
                a: inst.A,
                b: inst.B,
                c: inst.C,
                x: inst.Bx,
                s: inst.sBx,
                f: inst.isFake ? 1 : 0
            })),
            c: bytecode.constants.map(c => ({
                t: c.type ? c.type.charAt(0) : 's',
                v: c.value,
                e: c.encrypted
            })),
            u: bytecode.upvalues,
            p: bytecode.prototypes,
            d: bytecode.debugInfo
        };

        const json = JSON.stringify(data);
        return this._encode(json);
    }

    /**
     * Custom encoding
     */
    _encode(str) {
        const key = this.random.bytes(16);
        const encoded = [];
        
        for (let i = 0; i < str.length; i++) {
            const byte = str.charCodeAt(i) ^ key[i % key.length];
            encoded.push(byte.toString(16).padStart(2, '0'));
        }
        
        const keyHex = key.map(b => b.toString(16).padStart(2, '0')).join('');
        return keyHex + encoded.join('');
    }

    /**
     * Generate anti-tamper code
     */
    _generateAntiTamper(checkVar) {
        const hashVar = this.random.generateName(2);
        const valVar = this.random.generateName(2);
        
        return `
    local ${checkVar} = function()
        local ${hashVar} = 0
        local ${valVar} = tostring({}):sub(8)
        for i = 1, #${valVar} do
            ${hashVar} = (${hashVar} * 31 + string.byte(${valVar}, i)) % 2147483647
        end
        return ${hashVar} > 0
    end
`;
    }

    /**
     * Generate anti-debug code
     */
    _generateAntiDebug() {
        const checkFuncs = [
            `if rawget(_G, "debug") then local d = rawget(_G, "debug") if d.sethook then d.sethook(function() end) end end`,
            `if jit then pcall(function() jit.off() end) end`,
        ];

        return checkFuncs.join('\n    ');
    }

    /**
     * Add additional protection layer
     */
    _addLayer(code, layerNum) {
        const wrapperVar = this.random.generateName(3);
        const funcVar = this.random.generateName(3);
        const envVar = this.random.generateName(2);

        const encoded = this._encodeLayer(code, layerNum);

        return `
do
    local ${envVar} = getfenv and getfenv() or _ENV or _G
    local ${wrapperVar} = "${encoded.data}"
    local ${funcVar} = function(s, k)
        local r = {}
        for i = 1, #s, 2 do
            local b = tonumber(s:sub(i, i+1), 16)
            if b then
                r[#r+1] = string.char(((b - k[((i-1)/2) % #k + 1]) + 256) % 256)
            end
        end
        return table.concat(r)
    end
    local ok, result = pcall(function()
        return loadstring(${funcVar}(${wrapperVar}, {${encoded.key.join(',')}}))
    end)
    if ok and result then
        setfenv and setfenv(result, ${envVar})
        result()
    end
end
`.trim();
    }

    /**
     * Encode layer data
     */
    _encodeLayer(code, layerNum) {
        const keyLen = 8 + layerNum * 4;
        const key = [];
        for (let i = 0; i < keyLen; i++) {
            key.push(this.random.int(1, 255));
        }

        const encoded = [];
        for (let i = 0; i < code.length; i++) {
            const byte = (code.charCodeAt(i) + key[i % key.length]) % 256;
            encoded.push(byte.toString(16).padStart(2, '0'));
        }

        return { data: encoded.join(''), key };
    }

    /**
     * Full VM obfuscation dengan bytecode compilation (original method)
     */
    _fullVMObfuscation(code) {
        // Step 1: Parse code
        const parseResult = this.parser.parse(code);
        
        if (!parseResult.success) {
            // Fallback jika parse gagal
            if (this.template && this.bytecodeGen) {
                return this._templateBasedObfuscation(code);
            }
            return this._simpleVMWrapper(code);
        }

        // Step 2: Compile ke bytecode
        let compiled;
        try {
            compiled = this.compiler.compile(parseResult.ast);
        } catch (e) {
            if (this.template && this.bytecodeGen) {
                return this._templateBasedObfuscation(code);
            }
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
     * Generate VM code dari compiled bytecode (original method)
     */
    _generateVMCode(compiled) {
        const vars = this._generateVMVars();

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
        // Gunakan template jika tersedia
        if (this.template) {
            const wrappedCode = this.template.generate(code, {
                target: this.config.target
            });

            return {
                success: true,
                code: wrappedCode,
                stats: { simple: true }
            };
        }

        // Fallback ke wrapper sederhana
        const wrapperVar = this.random.generateName(3);
        const funcVar = this.random.generateName(3);
        const envVar = this.random.generateName(2);

        const wrappedCode = `
do
    local ${envVar} = getfenv and getfenv() or _ENV or _G
    local ${wrapperVar} = function()
        ${code}
    end
    local ${funcVar} = setfenv and setfenv(${wrapperVar}, ${envVar}) or ${wrapperVar}
    ${funcVar}()
end
`.trim();

        return {
            success: true,
            code: wrappedCode,
            stats: { simple: true, fallback: true }
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
        
        code += `local ${vars.bxor}=bit32 and bit32.bxor or function(a,b)return a~b end;`;
        code += `local ${vars.band}=bit32 and bit32.band or function(a,b)return a&b end;`;
        code += `local ${vars.bor}=bit32 and bit32.bor or function(a,b)return a|b end;`;
        
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
                `${vars.readInt}();${vars.readInt}();` +
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
        
        entries.push(`bxor=bit32 and bit32.bxor or function(a,b)return a~b end`);
        entries.push(`band=bit32 and bit32.band or function(a,b)return a&b end`);
        entries.push(`bor=bit32 and bit32.bor or function(a,b)return a|b end`);
        entries.push(`bnot=bit32 and bit32.bnot or function(a)return~a end`);
        entries.push(`lshift=bit32 and bit32.lshift or function(a,b)return a<<b end`);
        entries.push(`rshift=bit32 and bit32.rshift or function(a,b)return a>>b end`);
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
        return { 
            ...this.stats,
            enabled: this.config.enabled,
            complexity: this.config.complexity,
            multiLayer: this.config.multiLayer,
            layers: this.config.layers,
            antiTamper: this.config.antiTamper,
            antiDebug: this.config.antiDebug
        };
    }

    /**
     * Reset state
     */
    reset() {
        // Reset random name generator
        if (this.random && this.random.resetNames) {
            this.random.resetNames();
        }

        // Reset compiler jika tersedia
        if (this.compiler && this.compiler.reset) {
            this.compiler.reset();
        }

        // Reset shuffler jika tersedia
        if (this.shuffler && this.shuffler.reset) {
            this.shuffler.reset();
        }

        // Reset template jika tersedia
        if (this.template && this.template.reset) {
            this.template.reset();
        } else if (VMTemplate) {
            // Reinitialize template
            this.template = new VMTemplate({
                seed: this.options.seed || Date.now(),
                target: this.config.target
            });
        }

        // Reset bytecode generator jika tersedia
        if (this.bytecodeGen && this.bytecodeGen.reset) {
            this.bytecodeGen.reset();
        }

        // Reset stats
        this.stats = { 
            bytecodeSize: 0, 
            constantCount: 0, 
            instructionCount: 0,
            transformations: 0,
            vmSize: 0,
            layers: 0
        };
    }

    /**
     * Update config
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Set complexity level
     */
    setComplexity(level) {
        if (this.complexitySettings[level]) {
            this.config.complexity = level;
        }
    }

    /**
     * Enable/disable multi-layer
     */
    setMultiLayer(enabled, layers = 2) {
        this.config.multiLayer = enabled;
        this.config.layers = layers;
    }
}

module.exports = VMObfuscator;
