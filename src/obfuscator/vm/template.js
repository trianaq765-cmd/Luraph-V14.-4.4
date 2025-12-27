/**
 * LuaShield - VM Template Generator
 * Generate Luraph-style VM wrapper dengan proper integration
 * FINAL VERSION - Merged dengan BytecodeGenerator integration
 */

const Random = require('../../utils/random');

// Safe imports
let KeyGenerator, StringEncryptor;
try {
    KeyGenerator = require('../encryption/keys');
} catch (e) {
    KeyGenerator = null;
}
try {
    StringEncryptor = require('../encryption/strings');
} catch (e) {
    StringEncryptor = null;
}

class VMTemplate {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.keyGen = KeyGenerator ? new KeyGenerator(options.seed) : null;
        this.stringEncryptor = StringEncryptor ? new StringEncryptor({ seed: options.seed }) : null;
        this.target = options.target || 'roblox';
        
        // VM variable names
        this.vars = {};
        
        // VM Name untuk external reference
        this.vmName = this.random.generateName(4);
        
        // Opcode mapping untuk bytecode integration
        this.opcodeMap = new Map();
        this.handlerNames = new Map();
        
        // Platform config
        this.platformConfig = this._getPlatformConfig();
        
        // State variables (untuk bytecode integration)
        this.stateVars = {};
        this.handlersVar = null;
        this.decoderName = null;
        this.executorName = null;
        
        // Initialize opcodes untuk bytecode integration
        this._initOpcodes();
    }

    /**
     * Get VM name untuk external reference
     */
    getVMName() {
        return this.vmName;
    }

    /**
     * Initialize random opcode mapping (untuk bytecode integration)
     */
    _initOpcodes() {
        const baseOpcodes = [
            'MOVE', 'LOADK', 'LOADBOOL', 'LOADNIL', 'GETUPVAL',
            'GETGLOBAL', 'GETTABLE', 'SETGLOBAL', 'SETUPVAL', 'SETTABLE',
            'NEWTABLE', 'SELF', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'POW',
            'UNM', 'NOT', 'LEN', 'CONCAT', 'JMP', 'EQ', 'LT', 'LE',
            'TEST', 'TESTSET', 'CALL', 'TAILCALL', 'RETURN',
            'FORLOOP', 'FORPREP', 'TFORLOOP', 'SETLIST', 'CLOSE',
            'CLOSURE', 'VARARG'
        ];

        const usedCodes = new Set();
        for (const op of baseOpcodes) {
            let code;
            do {
                code = this.random.int(0x10, 0xFF);
            } while (usedCodes.has(code));
            
            usedCodes.add(code);
            this.opcodeMap.set(op, code);
            this.handlerNames.set(op, this.random.generateName(2));
        }
    }

    /**
     * Get platform-specific configuration
     */
    _getPlatformConfig() {
        const configs = {
            roblox: {
                useBit32: true,
                useGetfenv: false,
                useDebug: false,
                globals: ['game', 'workspace', 'script', 'task', 'wait']
            },
            loadstring: {
                useBit32: true,
                useGetfenv: true,
                useDebug: false,
                globals: []
            },
            standard: {
                useBit32: true,
                useGetfenv: true,
                useDebug: true,
                globals: []
            }
        };
        return configs[this.target] || configs.roblox;
    }

    /**
     * Generate semua variable names untuk VM
     */
    _generateVarNames() {
        this.vars = {
            // Main params
            mainParam: this.random.generateName(1),
            envTable: this.random.generateName(1),
            dataTable: this.random.generateName(1),
            
            // Core functions
            wrapFunc: this.random.generateName(2),
            execFunc: this.random.generateName(2),
            decodeFunc: this.random.generateName(2),
            unpackFunc: this.random.generateName(1),
            
            // Utility refs
            bxor: this.random.generateName(1),
            band: this.random.generateName(1),
            bor: this.random.generateName(1),
            bnot: this.random.generateName(2),
            lshift: this.random.generateName(2),
            rshift: this.random.generateName(2),
            sub: this.random.generateName(1),
            byte: this.random.generateName(1),
            char: this.random.generateName(2),
            concat: this.random.generateName(1),
            
            // State vars
            stack: this.random.generateName(2),
            locals: this.random.generateName(2),
            pc: this.random.generateName(2),
            sp: this.random.generateName(2),
            
            // Loop vars
            idx: this.random.generateName(1),
            val: this.random.generateName(1),
            tmp: this.random.generateName(1),
            result: this.random.generateName(2),
            
            // Key table
            keyTable: this.random.generateName(1),
            constTable: this.random.generateName(2),
            strTable: this.random.generateName(2)
        };
        
        return this.vars;
    }

    /**
     * Generate key table untuk VM
     */
    _generateKeyTable() {
        if (this.keyGen) {
            const table = this.keyGen.generateKeyTable(this.random.int(8, 16));
            const entries = Object.entries(table)
                .map(([k, v]) => `${k}=${this.random.formatNumber(v)}`)
                .join(',');
            return `{${entries}}`;
        }
        
        // Fallback jika KeyGenerator tidak tersedia
        const entries = [];
        for (let i = 1; i <= this.random.int(8, 16); i++) {
            entries.push(`[${i}]=${this.random.formatNumber(this.random.int(1, 255))}`);
        }
        return `{${entries.join(',')}}`;
    }

    /**
     * Generate utility functions table
     */
    _generateUtilTable() {
        const v = this.vars;
        
        const entries = [
            `${v.bxor}=bit32 and bit32.bxor or function(a,b)return a~b end`,
            `${v.band}=bit32 and bit32.band or function(a,b)return a&b end`,
            `${v.bor}=bit32 and bit32.bor or function(a,b)return a|b end`,
            `${v.bnot}=bit32 and bit32.bnot or function(a)return~a end`,
            `${v.sub}=string.sub`,
            `${v.byte}=string.byte`,
            `${v.char}=string.char`,
            `${v.concat}=table.concat`
        ];

        const shuffled = this.random.shuffle(entries);
        return `{${shuffled.join(',')}}`;
    }

    /**
     * Main generate function - handles both simple wrapper and bytecode-based VM
     */
    generate(codeOrOptions, options = {}) {
        // Check if first param is bytecode options object
        if (typeof codeOrOptions === 'object' && codeOrOptions.bytecode) {
            return this._generateFromBytecode(codeOrOptions);
        }
        
        // Otherwise treat as simple code wrapper
        return this._generateSimpleWrapper(codeOrOptions, options);
    }

    /**
     * Generate VM dari bytecode (untuk integrasi dengan vm_obfuscator.js baru)
     */
    _generateFromBytecode(options) {
        const {
            bytecode,
            fakeOps = 25,
            handlers = 30,
            registers = 64,
            antiTamper = true,
            antiDebug = true
        } = options;

        const parts = [];

        // VM State variables
        parts.push(this._generateState(registers));

        // Decoder
        parts.push(this._generateDecoder());

        // Opcode handlers
        parts.push(this._generateHandlers(handlers, fakeOps));

        // Main execution loop
        parts.push(this._generateExecutor());

        // VM Object
        parts.push(this._generateVMObject());

        return parts.join('\n\n');
    }

    /**
     * Generate VM state (untuk bytecode integration)
     */
    _generateState(registerCount) {
        const stateVar = this.random.generateName(2);
        const regVar = this.random.generateName(2);
        const stackVar = this.random.generateName(2);
        const pcVar = this.random.generateName(2);
        const constVar = this.random.generateName(2);
        const upvalVar = this.random.generateName(2);

        this.stateVars = { stateVar, regVar, stackVar, pcVar, constVar, upvalVar };

        return `
    -- VM State
    local ${stateVar} = {}
    ${stateVar}.${regVar} = {}
    ${stateVar}.${stackVar} = {}
    ${stateVar}.${pcVar} = 1
    ${stateVar}.${constVar} = {}
    ${stateVar}.${upvalVar} = {}
    ${stateVar}.top = 0
    
    for i = 0, ${registerCount} do
        ${stateVar}.${regVar}[i] = nil
    end
`;
    }

    /**
     * Generate decoder function (untuk bytecode integration)
     */
    _generateDecoder() {
        const decodeFn = this.random.generateName(3);
        const inputVar = this.random.generateName(2);
        const keyVar = this.random.generateName(2);
        const resultVar = this.random.generateName(2);

        this.decoderName = decodeFn;

        return `
    -- Decoder
    local ${decodeFn} = function(${inputVar})
        if type(${inputVar}) ~= "string" then return nil end
        
        local ${keyVar} = {}
        local ${resultVar} = {}
        
        -- Extract key (first 32 hex chars = 16 bytes)
        for i = 1, 32, 2 do
            local b = tonumber(${inputVar}:sub(i, i+1), 16)
            if b then ${keyVar}[#${keyVar}+1] = b end
        end
        
        -- Decode rest
        local data = ${inputVar}:sub(33)
        for i = 1, #data, 2 do
            local b = tonumber(data:sub(i, i+1), 16)
            if b then
                local ki = ((i-1)/2) % #${keyVar} + 1
                ${resultVar}[#${resultVar}+1] = string.char(b ~ ${keyVar}[ki])
            end
        end
        
        local str = table.concat(${resultVar})
        
        -- Parse JSON-like structure
        local ok, parsed = pcall(function()
            return ${this._generateSimpleParser()}(str)
        end)
        
        return ok and parsed or nil
    end
`;
    }

    /**
     * Generate simple JSON parser
     */
    _generateSimpleParser() {
        return `function(s)
            local pos = 1
            local function skip_ws()
                while pos <= #s and s:sub(pos,pos):match("%s") do pos = pos + 1 end
            end
            local function parse_value()
                skip_ws()
                local c = s:sub(pos,pos)
                if c == '"' then
                    pos = pos + 1
                    local start = pos
                    while pos <= #s and s:sub(pos,pos) ~= '"' do
                        if s:sub(pos,pos) == '\\\\' then pos = pos + 2
                        else pos = pos + 1 end
                    end
                    local str = s:sub(start, pos-1)
                    pos = pos + 1
                    return str:gsub('\\\\(.)', function(x) 
                        if x == 'n' then return '\\n'
                        elseif x == 't' then return '\\t'
                        else return x end
                    end)
                elseif c == '{' then
                    pos = pos + 1
                    local obj = {}
                    skip_ws()
                    if s:sub(pos,pos) == '}' then pos = pos + 1 return obj end
                    while true do
                        skip_ws()
                        if s:sub(pos,pos) ~= '"' then break end
                        pos = pos + 1
                        local ks = pos
                        while s:sub(pos,pos) ~= '"' do pos = pos + 1 end
                        local key = s:sub(ks, pos-1)
                        pos = pos + 1
                        skip_ws()
                        if s:sub(pos,pos) == ':' then pos = pos + 1 end
                        obj[key] = parse_value()
                        skip_ws()
                        if s:sub(pos,pos) == ',' then pos = pos + 1
                        elseif s:sub(pos,pos) == '}' then pos = pos + 1 break
                        else break end
                    end
                    return obj
                elseif c == '[' then
                    pos = pos + 1
                    local arr = {}
                    skip_ws()
                    if s:sub(pos,pos) == ']' then pos = pos + 1 return arr end
                    while true do
                        arr[#arr+1] = parse_value()
                        skip_ws()
                        if s:sub(pos,pos) == ',' then pos = pos + 1
                        elseif s:sub(pos,pos) == ']' then pos = pos + 1 break
                        else break end
                    end
                    return arr
                elseif c:match("[%d%-]") then
                    local start = pos
                    while pos <= #s and s:sub(pos,pos):match("[%d%.eE%+%-]") do pos = pos + 1 end
                    return tonumber(s:sub(start, pos-1))
                elseif s:sub(pos,pos+3) == "true" then
                    pos = pos + 4 return true
                elseif s:sub(pos,pos+4) == "false" then
                    pos = pos + 5 return false
                elseif s:sub(pos,pos+3) == "null" or s:sub(pos,pos+2) == "nil" then
                    pos = pos + (s:sub(pos,pos+3) == "null" and 4 or 3) return nil
                end
                return nil
            end
            return parse_value()
        end`;
    }

    /**
     * Generate opcode handlers (untuk bytecode integration)
     */
    _generateHandlers(handlerCount, fakeOps) {
        const handlersVar = this.random.generateName(2);
        this.handlersVar = handlersVar;

        const parts = [`    -- Opcode Handlers\n    local ${handlersVar} = {}`];

        // Real handlers
        const realHandlers = this._generateRealHandlers(handlersVar);
        parts.push(realHandlers);

        // Fake handlers
        const fakeHandlers = this._generateFakeHandlers(handlersVar, fakeOps);
        parts.push(fakeHandlers);

        return parts.join('\n');
    }

    /**
     * Generate real opcode handlers (untuk bytecode integration)
     */
    _generateRealHandlers(handlersVar) {
        const { stateVar, regVar, stackVar, pcVar, constVar } = this.stateVars;
        const handlers = [];

        // MOVE
        const moveOp = this.opcodeMap.get('MOVE');
        handlers.push(`
    ${handlersVar}[${moveOp}] = function(inst, state, env)
        state.${regVar}[inst.a] = state.${regVar}[inst.b]
    end`);

        // LOADK
        const loadkOp = this.opcodeMap.get('LOADK');
        handlers.push(`
    ${handlersVar}[${loadkOp}] = function(inst, state, env)
        local k = state.${constVar}[inst.x]
        state.${regVar}[inst.a] = k and k.v or nil
    end`);

        // LOADBOOL
        const loadboolOp = this.opcodeMap.get('LOADBOOL');
        handlers.push(`
    ${handlersVar}[${loadboolOp}] = function(inst, state, env)
        state.${regVar}[inst.a] = inst.b ~= 0
        if inst.c ~= 0 then state.${pcVar} = state.${pcVar} + 1 end
    end`);

        // LOADNIL
        const loadnilOp = this.opcodeMap.get('LOADNIL');
        handlers.push(`
    ${handlersVar}[${loadnilOp}] = function(inst, state, env)
        for i = inst.a, inst.b do
            state.${regVar}[i] = nil
        end
    end`);

        // GETGLOBAL
        const getglobalOp = this.opcodeMap.get('GETGLOBAL');
        handlers.push(`
    ${handlersVar}[${getglobalOp}] = function(inst, state, env)
        local k = state.${constVar}[inst.x]
        if k then
            state.${regVar}[inst.a] = env[k.v]
        end
    end`);

        // SETGLOBAL
        const setglobalOp = this.opcodeMap.get('SETGLOBAL');
        handlers.push(`
    ${handlersVar}[${setglobalOp}] = function(inst, state, env)
        local k = state.${constVar}[inst.x]
        if k then
            env[k.v] = state.${regVar}[inst.a]
        end
    end`);

        // GETTABLE
        const gettableOp = this.opcodeMap.get('GETTABLE');
        handlers.push(`
    ${handlersVar}[${gettableOp}] = function(inst, state, env)
        local t = state.${regVar}[inst.b]
        local k = inst.c > 255 and state.${constVar}[inst.c - 256] or state.${regVar}[inst.c]
        if t and type(t) == "table" then
            state.${regVar}[inst.a] = t[k and k.v or k]
        end
    end`);

        // SETTABLE
        const settableOp = this.opcodeMap.get('SETTABLE');
        handlers.push(`
    ${handlersVar}[${settableOp}] = function(inst, state, env)
        local t = state.${regVar}[inst.a]
        local k = inst.b > 255 and state.${constVar}[inst.b - 256] or state.${regVar}[inst.b]
        local v = inst.c > 255 and state.${constVar}[inst.c - 256] or state.${regVar}[inst.c]
        if t and type(t) == "table" then
            t[k and k.v or k] = v and v.v or v
        end
    end`);

        // NEWTABLE
        const newtableOp = this.opcodeMap.get('NEWTABLE');
        handlers.push(`
    ${handlersVar}[${newtableOp}] = function(inst, state, env)
        state.${regVar}[inst.a] = {}
    end`);

        // Arithmetic operations
        const arithmeticOps = [
            { name: 'ADD', op: '+' },
            { name: 'SUB', op: '-' },
            { name: 'MUL', op: '*' },
            { name: 'DIV', op: '/' },
            { name: 'MOD', op: '%' },
            { name: 'POW', op: '^' }
        ];

        for (const arith of arithmeticOps) {
            const opcode = this.opcodeMap.get(arith.name);
            handlers.push(`
    ${handlersVar}[${opcode}] = function(inst, state, env)
        local b = inst.b > 255 and state.${constVar}[inst.b - 256] or state.${regVar}[inst.b]
        local c = inst.c > 255 and state.${constVar}[inst.c - 256] or state.${regVar}[inst.c]
        local vb = type(b) == "table" and b.v or b
        local vc = type(c) == "table" and c.v or c
        if type(vb) == "number" and type(vc) == "number" then
            state.${regVar}[inst.a] = vb ${arith.op} vc
        end
    end`);
        }

        // UNM (unary minus)
        const unmOp = this.opcodeMap.get('UNM');
        handlers.push(`
    ${handlersVar}[${unmOp}] = function(inst, state, env)
        local v = state.${regVar}[inst.b]
        state.${regVar}[inst.a] = type(v) == "number" and -v or nil
    end`);

        // NOT
        const notOp = this.opcodeMap.get('NOT');
        handlers.push(`
    ${handlersVar}[${notOp}] = function(inst, state, env)
        state.${regVar}[inst.a] = not state.${regVar}[inst.b]
    end`);

        // LEN
        const lenOp = this.opcodeMap.get('LEN');
        handlers.push(`
    ${handlersVar}[${lenOp}] = function(inst, state, env)
        local v = state.${regVar}[inst.b]
        state.${regVar}[inst.a] = (type(v) == "string" or type(v) == "table") and #v or 0
    end`);

        // CONCAT
        const concatOp = this.opcodeMap.get('CONCAT');
        handlers.push(`
    ${handlersVar}[${concatOp}] = function(inst, state, env)
        local parts = {}
        for i = inst.b, inst.c do
            parts[#parts+1] = tostring(state.${regVar}[i] or "")
        end
        state.${regVar}[inst.a] = table.concat(parts)
    end`);

        // JMP
        const jmpOp = this.opcodeMap.get('JMP');
        handlers.push(`
    ${handlersVar}[${jmpOp}] = function(inst, state, env)
        state.${pcVar} = state.${pcVar} + inst.s
    end`);

        // Comparison operations
        const cmpOps = [
            { name: 'EQ', cmp: '==' },
            { name: 'LT', cmp: '<' },
            { name: 'LE', cmp: '<=' }
        ];

        for (const cmp of cmpOps) {
            const opcode = this.opcodeMap.get(cmp.name);
            handlers.push(`
    ${handlersVar}[${opcode}] = function(inst, state, env)
        local b = inst.b > 255 and state.${constVar}[inst.b - 256] or state.${regVar}[inst.b]
        local c = inst.c > 255 and state.${constVar}[inst.c - 256] or state.${regVar}[inst.c]
        local vb = type(b) == "table" and b.v or b
        local vc = type(c) == "table" and c.v or c
        local result = vb ${cmp.cmp} vc
        if result ~= (inst.a ~= 0) then
            state.${pcVar} = state.${pcVar} + 1
        end
    end`);
        }

        // TEST
        const testOp = this.opcodeMap.get('TEST');
        handlers.push(`
    ${handlersVar}[${testOp}] = function(inst, state, env)
        local v = state.${regVar}[inst.a]
        if (not not v) ~= (inst.c ~= 0) then
            state.${pcVar} = state.${pcVar} + 1
        end
    end`);

        // CALL
        const callOp = this.opcodeMap.get('CALL');
        handlers.push(`
    ${handlersVar}[${callOp}] = function(inst, state, env)
        local func = state.${regVar}[inst.a]
        if type(func) ~= "function" then return end
        
        local args = {}
        local nargs = inst.b - 1
        if inst.b == 0 then nargs = state.top - inst.a end
        
        for i = 1, nargs do
            args[i] = state.${regVar}[inst.a + i]
        end
        
        local results = {pcall(func, unpack(args))}
        if not results[1] then return end
        table.remove(results, 1)
        
        local nresults = inst.c - 1
        if inst.c == 0 then
            nresults = #results
            state.top = inst.a + nresults - 1
        end
        
        for i = 1, nresults do
            state.${regVar}[inst.a + i - 1] = results[i]
        end
    end`);

        // RETURN
        const returnOp = this.opcodeMap.get('RETURN');
        handlers.push(`
    ${handlersVar}[${returnOp}] = function(inst, state, env)
        local results = {}
        local n = inst.b - 1
        if inst.b == 0 then n = state.top - inst.a + 1 end
        
        for i = 1, n do
            results[i] = state.${regVar}[inst.a + i - 1]
        end
        
        state.returned = results
        state.done = true
    end`);

        // FORPREP
        const forprepOp = this.opcodeMap.get('FORPREP');
        handlers.push(`
    ${handlersVar}[${forprepOp}] = function(inst, state, env)
        state.${regVar}[inst.a] = state.${regVar}[inst.a] - state.${regVar}[inst.a + 2]
        state.${pcVar} = state.${pcVar} + inst.s
    end`);

        // FORLOOP
        const forloopOp = this.opcodeMap.get('FORLOOP');
        handlers.push(`
    ${handlersVar}[${forloopOp}] = function(inst, state, env)
        local step = state.${regVar}[inst.a + 2]
        local idx = state.${regVar}[inst.a] + step
        local limit = state.${regVar}[inst.a + 1]
        
        state.${regVar}[inst.a] = idx
        
        local continue_loop = step > 0 and idx <= limit or step <= 0 and idx >= limit
        if continue_loop then
            state.${pcVar} = state.${pcVar} + inst.s
            state.${regVar}[inst.a + 3] = idx
        end
    end`);

        // CLOSURE
        const closureOp = this.opcodeMap.get('CLOSURE');
        handlers.push(`
    ${handlersVar}[${closureOp}] = function(inst, state, env)
        state.${regVar}[inst.a] = function(...) return ... end
    end`);

        return handlers.join('\n');
    }

    /**
     * Generate fake handlers untuk obfuscation
     */
    _generateFakeHandlers(handlersVar, count) {
        const handlers = [];
        const usedOps = new Set([...this.opcodeMap.values()]);

        for (let i = 0; i < count; i++) {
            let opcode;
            do {
                opcode = this.random.int(0x10, 0xFF);
            } while (usedOps.has(opcode));
            usedOps.add(opcode);

            const fakeBody = this._generateFakeHandlerBody();
            handlers.push(`
    ${handlersVar}[${opcode}] = function(inst, state, env)
        ${fakeBody}
    end`);
        }

        return handlers.join('\n');
    }

    /**
     * Generate fake handler body
     */
    _generateFakeHandlerBody() {
        const bodies = [
            `local _ = inst.a + inst.b`,
            `if inst.a > 128 then return end`,
            `local t = type(inst)`,
            `for i = 1, 0 do end`,
            `local x = inst.a ~ inst.b`,
            `if false then state.pc = 0 end`,
            `local _ = tostring(inst.a):len()`,
            `if inst.c == -1 then return nil end`
        ];

        return this.random.choice(bodies);
    }

    /**
     * Generate main executor
     */
    _generateExecutor() {
        const { stateVar, regVar, stackVar, pcVar, constVar } = this.stateVars;
        const execFn = this.random.generateName(3);
        this.executorName = execFn;

        return `
    -- Executor
    local ${execFn} = function(bytecode, env, state)
        if not bytecode or not bytecode.i then return nil end
        
        -- Load constants
        if bytecode.c then
            for i, c in ipairs(bytecode.c) do
                state.${constVar}[i-1] = c
            end
        end
        
        local instructions = bytecode.i
        local maxPC = #instructions
        
        state.${pcVar} = 1
        state.done = false
        state.returned = nil
        
        local iterations = 0
        local maxIterations = 1000000
        
        while state.${pcVar} <= maxPC and not state.done and iterations < maxIterations do
            iterations = iterations + 1
            
            local inst = instructions[state.${pcVar}]
            if not inst then break end
            
            -- Skip fake instructions
            if inst.f == 1 then
                state.${pcVar} = state.${pcVar} + 1
            else
                local handler = ${this.handlersVar}[inst.o]
                if handler then
                    local ok, err = pcall(handler, inst, state, env)
                end
                state.${pcVar} = state.${pcVar} + 1
            end
        end
        
        return state.returned and unpack(state.returned) or nil
    end
`;
    }

    /**
     * Generate VM object
     */
    _generateVMObject() {
        const { stateVar, regVar, stackVar, pcVar, constVar, upvalVar } = this.stateVars;

        return `
    -- VM Object
    local ${this.vmName} = {}
    ${this.vmName}.version = "${this.random.hex(8)}"
    ${this.vmName}.state = ${stateVar}
    
    ${this.vmName}.execute = function(self, data, env)
        env = env or getfenv and getfenv() or _ENV or _G
        
        -- Decode data
        local bytecode = ${this.decoderName}(data)
        if not bytecode then
            return nil
        end
        
        -- Reset state
        for i = 0, 256 do
            self.state.${regVar}[i] = nil
        end
        self.state.${stackVar} = {}
        self.state.${pcVar} = 1
        self.state.top = 0
        
        -- Execute
        return ${this.executorName}(bytecode, env, self.state)
    end
    
    ${this.vmName}.reset = function(self)
        self.state.${pcVar} = 1
        self.state.done = false
        self.state.returned = nil
    end
`;
    }

    /**
     * Generate simple wrapper (original method dari file asli)
     */
    _generateSimpleWrapper(code, options = {}) {
        this._generateVarNames();
        const v = this.vars;

        // Generate components
        const keyTable = this._generateKeyTable();
        
        // Build wrapper
        let wrapper = '';

        // Start return function
        wrapper += `return(function(${v.mainParam})`;
        
        // Local declarations dengan Luraph-style formatting
        wrapper += `local ${v.envTable},${v.dataTable},${v.result}={},{},nil;`;
        
        // Bit operations
        wrapper += `local ${v.wrapFunc}=coroutine.wrap;`;
        wrapper += `local ${v.bxor}=bit32 and bit32.bxor or function(a,b)return a~b end;`;
        wrapper += `local ${v.band}=bit32 and bit32.band or function(a,b)return a&b end;`;
        wrapper += `local ${v.bor}=bit32 and bit32.bor or function(a,b)return a|b end;`;
        wrapper += `local ${v.sub}=string.sub;`;
        wrapper += `local ${v.byte}=string.byte;`;
        wrapper += `local ${v.char}=string.char;`;
        
        // Key table
        wrapper += `local ${v.keyTable}=${keyTable};`;

        // Helper functions (Luraph style)
        wrapper += this._generateHelperFunctions();

        // Unpack helper (complex Luraph-style)
        wrapper += this._generateUnpackHelper();

        // Main execution
        wrapper += `local ${v.execFunc}=(function()`;
        wrapper += code;
        wrapper += `;end);`;
        
        // Return result
        wrapper += `return ${v.execFunc}();`;
        wrapper += `end)({...})`;

        return wrapper;
    }

    /**
     * Generate advanced wrapper dengan entry table (seperti contoh Luraph)
     */
    generateAdvanced(code, options = {}) {
        this._generateVarNames();
        
        // Generate entry table entries
        const entries = this._generateEntryTableEntries();
        
        let output = '';

        // Main return dengan entry table
        output += `return({${entries.join(',')}})`;
        
        // Main execution call
        output += `((function()${code}end)())`;

        return output;
    }

    /**
     * Generate entry table entries (Luraph style)
     */
    _generateEntryTableEntries() {
        const entries = [];

        // Core utilities
        entries.push(`${this.random.generateName(1)}=coroutine.yield`);
        entries.push(`${this.random.generateName(1)}=string.byte`);
        
        // Function entries
        entries.push(this._generateFunctionEntry('nilSetter'));
        entries.push(this._generateFunctionEntry('unpack'));
        entries.push(`${this.random.generateName(1)}=coroutine.wrap`);
        entries.push(`${this.random.generateName(1)}=string.sub`);
        entries.push(`${this.random.generateName(2)}=string.gsub`);
        entries.push(this._generateFunctionEntry('setter'));
        entries.push(`${this.random.generateName(2)}=bit32 and bit32.bnot or function(a)return~a end`);
        entries.push(`${this.random.generateName(1)}=bit32 and bit32.bor or function(a,b)return a|b end`);
        entries.push(`${this.random.generateName(1)}=string.match`);
        entries.push(this._generateFunctionEntry('decoder'));
        entries.push(this._generateFunctionEntry('keyCheck'));
        entries.push(`${this.random.generateName(1)}=string.unpack`);
        entries.push(this._generateFunctionEntry('getter'));
        entries.push(`${this.random.generateName(1)}=table.move`);

        return this.random.shuffle(entries);
    }

    /**
     * Generate specific function entry
     */
    _generateFunctionEntry(type) {
        const name = this.random.generateName(this.random.int(1, 2));
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const p3 = this.random.generateName(1);
        const v1 = this.random.generateName(1);
        const v2 = this.random.generateName(2);

        switch (type) {
            case 'nilSetter':
                return `${name}=function(...)(...)[...]=nil;end`;
            
            case 'unpack':
                return `${name}=function(${p1},${p1})` +
                    `${p1}[${this.random.formatNumber(21)}]=(function(${v1},${p2},${p3})` +
                    `local ${v2}={${p1}[${this.random.formatNumber(21)}]};` +
                    `if not(${p2}>${v1})then else return;end;` +
                    `local ${this.random.generateName(1)}=(${v1}-${p2}+${this.random.formatNumber(1)});` +
                    this._generateUnpackBody(p3, p2, v2, v1) +
                    `end);` +
                    `(${p1})[${this.random.formatNumber(22)}]=(select);` +
                    `${p1}[${this.random.formatNumber(23)}]=nil;` +
                    `${p1}[${this.random.formatNumber(24)}]=nil;` +
                    `end`;
            
            case 'setter':
                return `${name}=function(${p1},${p1},${p2},${p3})` +
                    `${p2}[${this.random.formatNumber(1)}][${this.random.formatNumber(4)}][${p3}+${this.random.formatNumber(1)}]=(${p1});` +
                    `end`;
            
            case 'decoder':
                return `${name}=function(${p1},${p2},${p3},${v1})` +
                    `local ${v2};` +
                    `${v1}=(${this.random.formatNumber(22)});` +
                    `while true do ` +
                    `${v2},${v1}=${p1}:${this.random.generateName(1)}(${v1},${p3},${v1});` +
                    `if ${v2}==${this.random.formatNumber(this.random.int(10000, 99999))} then break;end;` +
                    `end;` +
                    `${p2}=${p1}.${this.random.generateName(1)};` +
                    `(${p3})[${this.random.formatNumber(25)}]=(${this.random.formatNumber(1)});` +
                    `${p3}[${this.random.formatNumber(26)}]=(nil);` +
                    `(${p3})[${this.random.formatNumber(27)}]=(nil);` +
                    `${p3}[${this.random.formatNumber(28)}]=(nil);` +
                    `return ${p2},${v1};` +
                    `end`;
            
            case 'keyCheck':
                const fn1 = this.random.generateName(2);
                const fn2 = this.random.generateName(2);
                return `${name}=function(${p1},${p2},${p3},${v1})` +
                    `${p3}={};` +
                    `if not ${v1}[${this.random.formatNumber(this.random.int(1000, 9999))}]then` +
                    `(${v1})[${this.random.formatNumber(this.random.int(1000, 9999))}]=` +
                    `${this.random.formatNumber(this.random.negativeNumber())}+` +
                    `((${p1}.${fn1}((${p1}.${fn2}(${p1}.k[${this.random.formatNumber(this.random.int(1, 20))}]-` +
                    `${v1}[${this.random.formatNumber(this.random.int(1000, 99999))}],` +
                    `${p1}.k[${this.random.formatNumber(this.random.int(1, 20))}]))))+` +
                    `${p1}.k[${this.random.formatNumber(this.random.int(1, 16))}]);` +
                    `${p2}=${this.random.formatNumber(this.random.negativeNumber())}+` +
                    `(${p1}.${fn2}((${p1}.${fn1}(${p1}.k[${this.random.formatNumber(this.random.int(1, 20))}]-` +
                    `${v1}[${this.random.formatNumber(this.random.int(10000, 99999))}]))+` +
                    `${v1}[${this.random.formatNumber(this.random.int(1000, 99999))}],` +
                    `(${v1}[${this.random.formatNumber(this.random.int(1000, 99999))}])));` +
                    `(${v1})[${this.random.formatNumber(this.random.int(1000, 9999))}]=(${p2});` +
                    `else ${p2}=${v1}[${this.random.formatNumber(this.random.int(1000, 9999))}];end;` +
                    `return ${p2},${p3};` +
                    `end`;
            
            case 'getter':
                return `${name}=function(${p1},${p1},${p2})` +
                    `${p1}=${p2}[${this.random.formatNumber(this.random.int(10000, 99999))}];` +
                    `return ${p1};` +
                    `end`;
            
            default:
                return `${name}=function()end`;
        }
    }

    /**
     * Generate unpack body (Luraph-style nested ifs)
     */
    _generateUnpackBody(R, c, D, U) {
        const Z = this.random.generateName(1);
        let body = '';

        body += `if ${Z}>=${this.random.formatNumber(8)} then `;
        body += `return ${R}[${c}],${R}[${c}+${this.random.formatNumber(1)}],`;
        body += `${R}[${c}+${this.random.formatNumber(2)}],${R}[${c}+${this.random.formatNumber(3)}],`;
        body += `${R}[${c}+${this.random.formatNumber(4)}],${R}[${c}+${this.random.formatNumber(5)}],`;
        body += `${R}[${c}+${this.random.formatNumber(6)}],${R}[${c}+${this.random.formatNumber(7)}],`;
        body += `${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(8)},${R});`;
        
        body += `else if ${Z}>=${this.random.formatNumber(7)} then `;
        body += `return ${R}[${c}],${R}[${c}+${this.random.formatNumber(1)}],`;
        body += `${R}[${c}+${this.random.formatNumber(2)}],${R}[${c}+${this.random.formatNumber(3)}],`;
        body += `${R}[${c}+${this.random.formatNumber(4)}],${R}[${c}+${this.random.formatNumber(5)}],`;
        body += `${R}[${c}+${this.random.formatNumber(6)}],`;
        body += `${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(7)},${R});`;
        
        body += `elseif ${Z}>=${this.random.formatNumber(6)} then `;
        body += `return ${R}[${c}],${R}[${c}+${this.random.formatNumber(1)}],`;
        body += `${R}[${c}+${this.random.formatNumber(2)}],${R}[${c}+${this.random.formatNumber(3)}],`;
        body += `${R}[${c}+${this.random.formatNumber(4)}],${R}[${c}+${this.random.formatNumber(5)}],`;
        body += `${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(6)},${R});`;
        
        body += `else if ${Z}>=${this.random.formatNumber(5)} then `;
        body += `return ${R}[${c}],${R}[${c}+${this.random.formatNumber(1)}],`;
        body += `${R}[${c}+${this.random.formatNumber(2)}],${R}[${c}+${this.random.formatNumber(3)}],`;
        body += `${R}[${c}+${this.random.formatNumber(4)}],`;
        body += `${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(5)},${R});`;
        
        body += `elseif ${Z}>=${this.random.formatNumber(4)} then `;
        body += `return ${R}[${c}],${R}[${c}+${this.random.formatNumber(1)}],`;
        body += `${R}[${c}+${this.random.formatNumber(2)}],${R}[${c}+${this.random.formatNumber(3)}],`;
        body += `${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(4)},${R});`;
        
        body += `elseif ${Z}>=${this.random.formatNumber(3)} then `;
        body += `return ${R}[${c}],${R}[${c}+${this.random.formatNumber(1)}],`;
        body += `${R}[${c}+${this.random.formatNumber(2)}],`;
        body += `${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(3)},${R});`;
        
        body += `else if not(${Z}>=${this.random.formatNumber(2)})then `;
        body += `return ${R}[${c}],${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(1)},${R});`;
        
        body += `else return ${R}[${c}],${R}[${c}+${this.random.formatNumber(1)}],`;
        body += `${D}[${this.random.formatNumber(1)}](${U},${c}+${this.random.formatNumber(2)},${R});`;
        
        body += `end;end;end;end;end;`;

        return body;
    }

    /**
     * Generate helper functions
     */
    _generateHelperFunctions() {
        const v = this.vars;
        let helpers = '';

        // Decoder function
        const decParam = this.random.generateName(1);
        const decKey = this.random.generateName(1);
        const decResult = this.random.generateName(2);
        const decIdx = this.random.generateName(1);

        helpers += `local function ${v.decodeFunc}(${decParam},${decKey})`;
        helpers += `local ${decResult}='';`;
        helpers += `for ${decIdx}=${this.random.formatNumber(1)},#${decParam} do `;
        helpers += `${decResult}=${decResult}..${v.char}(${v.bxor}(${decParam}[${decIdx}],`;
        helpers += `${decKey}[((${decIdx}-${this.random.formatNumber(1)})%#${decKey})+${this.random.formatNumber(1)}]));`;
        helpers += `end;`;
        helpers += `return ${decResult};`;
        helpers += `end;`;

        return helpers;
    }

    /**
     * Generate unpack helper (simplified)
     */
    _generateUnpackHelper() {
        const funcName = this.random.generateName(1);
        const tblParam = this.random.generateName(1);
        const startParam = this.random.generateName(1);
        const endParam = this.random.generateName(1);
        
        let code = '';
        code += `local ${funcName}=function(${tblParam},${startParam},${endParam})`;
        code += `${startParam}=${startParam} or ${this.random.formatNumber(1)};`;
        code += `${endParam}=${endParam} or #${tblParam};`;
        code += `return table.unpack(${tblParam},${startParam},${endParam});`;
        code += `end;`;
        
        return code;
    }

    /**
     * Reset
     */
    reset() {
        if (this.random && this.random.resetNames) {
            this.random.resetNames();
        }
        if (this.keyGen && this.keyGen.reset) {
            this.keyGen.reset();
        }
        
        this.vars = {};
        this.stateVars = {};
        this.handlersVar = null;
        this.decoderName = null;
        this.executorName = null;
        
        // Regenerate VM name dan opcodes
        this.vmName = this.random.generateName(4);
        this._initOpcodes();
    }
}

module.exports = VMTemplate;
