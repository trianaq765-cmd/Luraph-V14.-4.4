/**
 * LuaShield - VM Template Generator
 * Generate custom VM untuk setiap obfuscation
 */

const Random = require('../../utils/random');

class VMTemplate {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.vmName = this.random.generateName(4);
        this.opcodeMap = new Map();
        this.handlerNames = new Map();
        
        this._initOpcodes();
    }

    /**
     * Initialize random opcode mapping
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

        // Generate random opcode values
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
     * Get VM name
     */
    getVMName() {
        return this.vmName;
    }

    /**
     * Generate complete VM code
     */
    generate(options = {}) {
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
     * Generate VM state
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
     * Generate decoder function
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
            -- Simple JSON parser for our format
            return ${this._generateSimpleParser()}(str)
        end)
        
        return ok and parsed or nil
    end
`;
    }

    /**
     * Generate simple parser function body
     */
    _generateSimpleParser() {
        const parserFn = this.random.generateName(3);
        
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
     * Generate opcode handlers
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
     * Generate real opcode handlers
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
        -- Simplified closure handling
        state.${regVar}[inst.a] = function(...) return ... end
    end`);

        return handlers.join('\n');
    }

    /**
     * Generate fake handlers untuk obfuscation
     */
    _generateFakeHandlers(handlersVar, count) {
        const { stateVar, regVar } = this.stateVars;
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
        const { stateVar, regVar, stackVar, pcVar, constVar, upvalVar } = this.stateVars;
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
                    if not ok then
                        -- Silent fail
                    end
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
}

module.exports = VMTemplate;
