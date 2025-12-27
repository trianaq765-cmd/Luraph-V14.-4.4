/**
 * LuaShield - VM Template Generator
 * Generate Luraph-style VM wrapper yang BENAR-BENAR mirip
 */

const Random = require('../../utils/random');

class VMTemplate {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.target = options.target || 'roblox';
        this.vmName = null;
        this.entryVars = {};
        this.stateIndex = {};
    }

    getVMName() {
        return this.vmName || this.random.generateName(1);
    }

    /**
     * Generate Luraph-style VM
     */
    generate(codeOrOptions, options = {}) {
        // Reset state
        this.random.resetNames();
        this._initStateIndices();
        this._generateEntryVars();

        if (typeof codeOrOptions === 'object' && codeOrOptions.bytecode) {
            return this._generateFromBytecode(codeOrOptions);
        }
        
        return this._generateLuraphStyle(codeOrOptions);
    }

    /**
     * Initialize random state indices (seperti Luraph)
     */
    _initStateIndices() {
        const usedIndices = new Set();
        const indices = [
            'STACK', 'PC', 'ENV', 'UPVALS', 'VARARG', 'TOP',
            'CONSTANTS', 'INSTRUCTIONS', 'PROTOS', 'PARAMS',
            'RUNNING', 'HANDLERS', 'MEMORY', 'DEBUG'
        ];

        this.stateIndex = {};
        for (const key of indices) {
            let idx;
            do {
                idx = this.random.int(1, 100);
            } while (usedIndices.has(idx));
            usedIndices.add(idx);
            this.stateIndex[key] = idx;
        }
    }

    /**
     * Generate entry table variables
     */
    _generateEntryVars() {
        this.entryVars = {
            // Core Lua functions
            yield: this.random.generateName(1),
            byte: this.random.generateName(1),
            wrap: this.random.generateName(1),
            sub: this.random.generateName(1),
            gsub: this.random.generateName(2),
            match: this.random.generateName(1),
            unpack: this.random.generateName(1),
            move: this.random.generateName(1),
            
            // Bit operations
            bnot: this.random.generateName(2),
            bor: this.random.generateName(1),
            band: this.random.generateName(1),
            bxor: this.random.generateName(2),
            lshift: this.random.generateName(2),
            rshift: this.random.generateName(2),
            
            // Custom functions
            nilSetter: this.random.generateName(1),
            unpackFunc: this.random.generateName(1),
            setter: this.random.generateName(2),
            decoder: this.random.generateName(1),
            keyCheck: this.random.generateName(2),
            getter: this.random.generateName(1),
            executor: this.random.generateName(1),
            loopFunc: this.random.generateName(2),
            
            // State vars
            mainState: this.random.generateName(1),
            keyTable: this.random.generateName(1)
        };
    }

    /**
     * Generate Luraph-style complete output
     */
    _generateLuraphStyle(code) {
        const v = this.entryVars;
        const si = this.stateIndex;

        // Generate key table
        const keyTable = this._generateKeyTable();
        
        // Generate bytecode dari code
        const bytecodeData = this._compileToBytecode(code);
        
        // Build entry table
        let output = '';
        
        // Main return statement dengan entry table
        output += `return({`;
        output += this._generateEntryTable();
        output += `})`;
        
        // Main execution IIFE
        output += `((function(...)`;
        
        // Local declarations
        output += this._generateLocalDeclarations();
        
        // Key table
        output += `local ${v.keyTable}=${keyTable};`;
        
        // State initialization
        output += this._generateStateInit();
        
        // Bytecode data
        output += `local _DATA_="${bytecodeData}";`;
        
        // Decoder
        output += this._generateDecoder();
        
        // VM Core
        output += this._generateVMCore();
        
        // Opcode handlers
        output += this._generateOpcodeHandlers();
        
        // Executor
        output += this._generateExecutor();
        
        // Execute
        output += `return ${v.executor}(_DATA_);`;
        
        output += `end)(...))`;

        return output;
    }

    /**
     * Generate entry table (seperti Luraph)
     */
    _generateEntryTable() {
        const v = this.entryVars;
        const entries = [];

        // Core yields/functions
        entries.push(`${v.yield}=coroutine.yield`);
        entries.push(`${v.byte}=string.byte`);
        
        // Nil setter function
        entries.push(`${v.nilSetter}=function(...)(...)[...]=nil;end`);
        
        // Complex unpack function (Luraph style)
        entries.push(this._generateUnpackEntry());
        
        entries.push(`${v.wrap}=coroutine.wrap`);
        entries.push(`${v.sub}=string.sub`);
        entries.push(`${v.gsub}=string.gsub`);
        
        // Setter function
        entries.push(this._generateSetterEntry());
        
        // Bit operations
        entries.push(`${v.bnot}=bit32.bnot`);
        entries.push(`${v.bor}=bit32.bor`);
        entries.push(`${v.band}=bit32.band`);
        entries.push(`${v.bxor}=bit32.bxor`);
        
        entries.push(`${v.match}=string.match`);
        
        // Decoder function
        entries.push(this._generateDecoderEntry());
        
        // Key check function
        entries.push(this._generateKeyCheckEntry());
        
        entries.push(`${v.unpack}=string.unpack`);
        
        // Getter function
        entries.push(this._generateGetterEntry());
        
        entries.push(`${v.move}=table.move`);

        return this.random.shuffle(entries).join(',');
    }

    /**
     * Generate complex unpack function (Luraph style)
     */
    _generateUnpackEntry() {
        const v = this.entryVars;
        const p1 = this.random.generateName(1);
        const U = this.random.generateName(1);
        const c = this.random.generateName(1);
        const R = this.random.generateName(1);
        const D = this.random.generateName(1);
        const Z = this.random.generateName(1);

        return `${v.unpackFunc}=function(${p1},${p1})` +
            `${p1}[${this.random.formatNumber(21)}]=(function(${U},${c},${R})` +
            `local ${D}={${p1}[${this.random.formatNumber(21)}]};` +
            `if not(${c}>${U})then else return;end;` +
            `local ${Z}=(${U}-${c}+${this.random.formatNumber(1)});` +
            this._generateUnpackBody(R, c, D, U, Z) +
            `end);` +
            `(${p1})[${this.random.formatNumber(22)}]=(select);` +
            `${p1}[${this.random.formatNumber(23)}]=nil;` +
            `${p1}[${this.random.formatNumber(24)}]=nil;` +
            `end`;
    }

    /**
     * Generate unpack body dengan nested ifs (Luraph style)
     */
    _generateUnpackBody(R, c, D, U, Z) {
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
     * Generate setter entry
     */
    _generateSetterEntry() {
        const v = this.entryVars;
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const p3 = this.random.generateName(1);

        return `${v.setter}=function(${p1},${p1},${p2},${p3})` +
            `${p2}[${this.random.formatNumber(1)}][${this.random.formatNumber(4)}][${p3}+${this.random.formatNumber(1)}]=(${p1});` +
            `end`;
    }

    /**
     * Generate decoder entry
     */
    _generateDecoderEntry() {
        const v = this.entryVars;
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const p3 = this.random.generateName(1);
        const v1 = this.random.generateName(1);
        const v2 = this.random.generateName(2);
        const breakVal = this.random.int(10000, 99999);

        return `${v.decoder}=function(${p1},${p2},${p3},${v1})` +
            `local ${v2};` +
            `${v1}=(${this.random.formatNumber(22)});` +
            `while true do ` +
            `${v2},${v1}=${p1}:${this.random.generateName(1)}(${v1},${p3},${v1});` +
            `if ${v2}==${this.random.formatNumber(breakVal)} then break;end;` +
            `end;` +
            `${p2}=${p1}.${this.random.generateName(1)};` +
            `(${p3})[${this.random.formatNumber(25)}]=(${this.random.formatNumber(1)});` +
            `${p3}[${this.random.formatNumber(26)}]=(nil);` +
            `(${p3})[${this.random.formatNumber(27)}]=(nil);` +
            `${p3}[${this.random.formatNumber(28)}]=(nil);` +
            `return ${p2},${v1};` +
            `end`;
    }

    /**
     * Generate key check entry (kompleks seperti Luraph)
     */
    _generateKeyCheckEntry() {
        const v = this.entryVars;
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const p3 = this.random.generateName(1);
        const v1 = this.random.generateName(1);
        const fn1 = this.random.generateName(2);
        const fn2 = this.random.generateName(2);
        
        const idx1 = this.random.int(1000, 9999);
        const idx2 = this.random.int(10000, 99999);
        const idx3 = this.random.int(1000, 99999);
        const negNum = this.random.negativeNumber();
        const k1 = this.random.int(1, 20);
        const k2 = this.random.int(1, 20);
        const k3 = this.random.int(1, 16);

        return `${v.keyCheck}=function(${p1},${p2},${p3},${v1})` +
            `${p3}={};` +
            `if not ${v1}[${this.random.formatNumber(idx1)}]then` +
            `(${v1})[${this.random.formatNumber(idx1)}]=` +
            `${this.random.formatNumber(negNum)}+` +
            `((${p1}.${fn1}((${p1}.${fn2}(${p1}.k[${this.random.formatNumber(k1)}]-` +
            `${v1}[${this.random.formatNumber(idx2)}],` +
            `${p1}.k[${this.random.formatNumber(k2)}]))))+` +
            `${p1}.k[${this.random.formatNumber(k3)}]);` +
            `${p2}=${this.random.formatNumber(this.random.negativeNumber())}+` +
            `(${p1}.${fn2}((${p1}.${fn1}(${p1}.k[${this.random.formatNumber(k1)}]-` +
            `${v1}[${this.random.formatNumber(idx2)}]))+` +
            `${v1}[${this.random.formatNumber(idx3)}],` +
            `(${v1}[${this.random.formatNumber(idx3)}])));` +
            `(${v1})[${this.random.formatNumber(idx1)}]=(${p2});` +
            `else ${p2}=${v1}[${this.random.formatNumber(idx1)}];end;` +
            `return ${p2},${p3};` +
            `end`;
    }

    /**
     * Generate getter entry
     */
    _generateGetterEntry() {
        const v = this.entryVars;
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const idx = this.random.int(10000, 99999);

        return `${v.getter}=function(${p1},${p1},${p2})` +
            `${p1}=${p2}[${this.random.formatNumber(idx)}];` +
            `return ${p1};` +
            `end`;
    }

    /**
     * Generate key table
     */
    _generateKeyTable() {
        const entries = [];
        const count = this.random.int(12, 24);
        
        for (let i = 1; i <= count; i++) {
            entries.push(`[${this.random.formatNumber(i)}]=${this.random.formatNumber(this.random.int(1, 255))}`);
        }
        
        return `{${this.random.shuffle(entries).join(',')}}`;
    }

    /**
     * Generate local declarations
     */
    _generateLocalDeclarations() {
        const v = this.entryVars;
        let code = '';
        
        const stateVar = this.random.generateName(1);
        const envVar = this.random.generateName(1);
        
        code += `local ${stateVar}={...};`;
        code += `local ${envVar}=getfenv and getfenv()or _ENV or _G;`;
        code += `local ${this.random.generateName(2)}=bit32.bxor;`;
        code += `local ${this.random.generateName(2)}=bit32.band;`;
        code += `local ${this.random.generateName(2)}=bit32.bor;`;
        code += `local ${this.random.generateName(1)}=string.sub;`;
        code += `local ${this.random.generateName(1)}=string.byte;`;
        code += `local ${this.random.generateName(2)}=string.char;`;
        code += `local ${this.random.generateName(1)}=table.concat;`;
        code += `local ${this.random.generateName(2)}=table.insert;`;
        code += `local ${this.random.generateName(2)}=math.floor;`;
        
        return code;
    }

    /**
     * Generate state initialization
     */
    _generateStateInit() {
        const si = this.stateIndex;
        const stateVar = this.random.generateName(2);
        
        let code = `local ${stateVar}={`;
        
        const stateEntries = [];
        stateEntries.push(`[${si.STACK}]={}`);
        stateEntries.push(`[${si.PC}]=${this.random.formatNumber(1)}`);
        stateEntries.push(`[${si.ENV}]=_G`);
        stateEntries.push(`[${si.UPVALS}]={}`);
        stateEntries.push(`[${si.TOP}]=${this.random.formatNumber(0)}`);
        stateEntries.push(`[${si.RUNNING}]=true`);
        stateEntries.push(`[${si.CONSTANTS}]={}`);
        stateEntries.push(`[${si.INSTRUCTIONS}]={}`);
        stateEntries.push(`[${si.PROTOS}]={}`);
        stateEntries.push(`[${si.HANDLERS}]={}`);
        
        code += this.random.shuffle(stateEntries).join(',');
        code += `};`;
        
        this.vmName = stateVar;
        return code;
    }

    /**
     * Generate decoder function
     */
    _generateDecoder() {
        const decName = this.random.generateName(2);
        const dataVar = this.random.generateName(1);
        const keyVar = this.random.generateName(1);
        const resultVar = this.random.generateName(1);
        const idxVar = this.random.generateName(1);
        const byteVar = this.random.generateName(1);
        
        return `local function ${decName}(${dataVar},${keyVar})` +
            `local ${resultVar}={};` +
            `local ${keyVar}=${keyVar}or{${this.random.int(1,255)},${this.random.int(1,255)},${this.random.int(1,255)},${this.random.int(1,255)}};` +
            `for ${idxVar}=${this.random.formatNumber(1)},#${dataVar},${this.random.formatNumber(2)} do ` +
            `local ${byteVar}=tonumber(${dataVar}:sub(${idxVar},${idxVar}+${this.random.formatNumber(1)}),${this.random.formatNumber(16)});` +
            `if ${byteVar} then ` +
            `${resultVar}[#${resultVar}+${this.random.formatNumber(1)}]=` +
            `string.char(bit32.bxor(${byteVar},${keyVar}[((${idxVar}-${this.random.formatNumber(1)})/${this.random.formatNumber(2)})%#${keyVar}+${this.random.formatNumber(1)}]));` +
            `end;end;` +
            `return table.concat(${resultVar});` +
            `end;`;
    }

    /**
     * Generate VM Core functions
     */
    _generateVMCore() {
        let code = '';
        
        // Stack operations
        code += this._generateStackOps();
        
        // Byte readers
        code += this._generateByteReaders();
        
        // RK function (Register or Constant)
        code += this._generateRKFunc();
        
        return code;
    }

    /**
     * Generate stack operations
     */
    _generateStackOps() {
        const pushName = this.random.generateName(1);
        const popName = this.random.generateName(1);
        const peekName = this.random.generateName(1);
        const stateVar = this.vmName;
        const si = this.stateIndex;
        
        let code = '';
        
        // Push
        code += `local function ${pushName}(${this.random.generateName(1)})`;
        code += `${stateVar}[${si.TOP}]=${stateVar}[${si.TOP}]+${this.random.formatNumber(1)};`;
        code += `${stateVar}[${si.STACK}][${stateVar}[${si.TOP}]]=${this.random.generateName(1)};`;
        code += `end;`;
        
        // Pop
        code += `local function ${popName}()`;
        code += `local ${this.random.generateName(1)}=${stateVar}[${si.STACK}][${stateVar}[${si.TOP}]];`;
        code += `${stateVar}[${si.STACK}][${stateVar}[${si.TOP}]]=nil;`;
        code += `${stateVar}[${si.TOP}]=${stateVar}[${si.TOP}]-${this.random.formatNumber(1)};`;
        code += `return ${this.random.generateName(1)};`;
        code += `end;`;
        
        // Peek
        code += `local function ${peekName}(${this.random.generateName(1)})`;
        code += `return ${stateVar}[${si.STACK}][${stateVar}[${si.TOP}]-(${this.random.generateName(1)} or ${this.random.formatNumber(0)})];`;
        code += `end;`;
        
        return code;
    }

    /**
     * Generate byte readers
     */
    _generateByteReaders() {
        const readByte = this.random.generateName(2);
        const readInt16 = this.random.generateName(2);
        const readInt32 = this.random.generateName(2);
        const stateVar = this.vmName;
        const si = this.stateIndex;
        const bytecodeVar = this.random.generateName(2);
        
        let code = '';
        
        // Read byte
        code += `local function ${readByte}()`;
        code += `local ${this.random.generateName(1)}=${bytecodeVar}[${stateVar}[${si.PC}]];`;
        code += `${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.formatNumber(1)};`;
        code += `return ${this.random.generateName(1)};`;
        code += `end;`;
        
        // Read 16-bit
        code += `local function ${readInt16}()`;
        code += `local ${this.random.generateName(1)},${this.random.generateName(1)}=`;
        code += `${bytecodeVar}[${stateVar}[${si.PC}]],${bytecodeVar}[${stateVar}[${si.PC}]+${this.random.formatNumber(1)}];`;
        code += `${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.formatNumber(2)};`;
        code += `return ${this.random.generateName(1)}+${this.random.generateName(1)}*${this.random.formatNumber(256)};`;
        code += `end;`;
        
        // Read 32-bit
        code += `local function ${readInt32}()`;
        code += `local ${this.random.generateName(1)},${this.random.generateName(1)},${this.random.generateName(1)},${this.random.generateName(1)}=`;
        code += `${bytecodeVar}[${stateVar}[${si.PC}]],`;
        code += `${bytecodeVar}[${stateVar}[${si.PC}]+${this.random.formatNumber(1)}],`;
        code += `${bytecodeVar}[${stateVar}[${si.PC}]+${this.random.formatNumber(2)}],`;
        code += `${bytecodeVar}[${stateVar}[${si.PC}]+${this.random.formatNumber(3)}];`;
        code += `${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.formatNumber(4)};`;
        code += `return ${this.random.generateName(1)}+${this.random.generateName(1)}*${this.random.formatNumber(256)}+`;
        code += `${this.random.generateName(1)}*${this.random.formatNumber(65536)}+${this.random.generateName(1)}*${this.random.formatNumber(16777216)};`;
        code += `end;`;
        
        return code;
    }

    /**
     * Generate RK function
     */
    _generateRKFunc() {
        const rkName = this.random.generateName(2);
        const stateVar = this.vmName;
        const si = this.stateIndex;
        
        return `local function ${rkName}(${this.random.generateName(1)})` +
            `if ${this.random.generateName(1)}>=${this.random.formatNumber(256)} then ` +
            `return ${stateVar}[${si.CONSTANTS}][${this.random.generateName(1)}-${this.random.formatNumber(256)}];` +
            `else return ${stateVar}[${si.STACK}][${this.random.generateName(1)}];end;` +
            `end;`;
    }

    /**
     * Generate opcode handlers
     */
    _generateOpcodeHandlers() {
        const stateVar = this.vmName;
        const si = this.stateIndex;
        const handlersVar = this.random.generateName(2);
        
        let code = `local ${handlersVar}={`;
        const handlers = [];

        // Generate shuffled opcodes
        const opcodes = this._getShuffledOpcodes();

        // MOVE
        handlers.push(this._generateHandler(opcodes.MOVE, 'MOVE', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${stateVar}[${si.STACK}][${this.random.generateName(1)}];
        `));

        // LOADK
        handlers.push(this._generateHandler(opcodes.LOADK, 'LOADK', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${stateVar}[${si.CONSTANTS}][${this.random.generateName(1)}];
        `));

        // LOADBOOL
        handlers.push(this._generateHandler(opcodes.LOADBOOL, 'LOADBOOL', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${this.random.generateName(1)}~=${this.random.formatNumber(0)};
            if ${this.random.generateName(1)}~=${this.random.formatNumber(0)} then ${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.formatNumber(1)};end;
        `));

        // LOADNIL
        handlers.push(this._generateHandler(opcodes.LOADNIL, 'LOADNIL', `
            for ${this.random.generateName(1)}=${this.random.generateName(1)},${this.random.generateName(1)} do ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=nil;end;
        `));

        // GETGLOBAL
        handlers.push(this._generateHandler(opcodes.GETGLOBAL, 'GETGLOBAL', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${stateVar}[${si.ENV}][${stateVar}[${si.CONSTANTS}][${this.random.generateName(1)}]];
        `));

        // SETGLOBAL
        handlers.push(this._generateHandler(opcodes.SETGLOBAL, 'SETGLOBAL', `
            ${stateVar}[${si.ENV}][${stateVar}[${si.CONSTANTS}][${this.random.generateName(1)}]]=${stateVar}[${si.STACK}][${this.random.generateName(1)}];
        `));

        // GETTABLE
        handlers.push(this._generateHandler(opcodes.GETTABLE, 'GETTABLE', `
            local ${this.random.generateName(1)}=${stateVar}[${si.STACK}][${this.random.generateName(1)}];
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${this.random.generateName(1)}[${this.random.generateName(2)}(${this.random.generateName(1)})];
        `));

        // SETTABLE
        handlers.push(this._generateHandler(opcodes.SETTABLE, 'SETTABLE', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}][${this.random.generateName(2)}(${this.random.generateName(1)})]=${this.random.generateName(2)}(${this.random.generateName(1)});
        `));

        // NEWTABLE
        handlers.push(this._generateHandler(opcodes.NEWTABLE, 'NEWTABLE', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]={};
        `));

        // Arithmetic operators
        const arithOps = [
            { name: 'ADD', op: '+' },
            { name: 'SUB', op: '-' },
            { name: 'MUL', op: '*' },
            { name: 'DIV', op: '/' },
            { name: 'MOD', op: '%' },
            { name: 'POW', op: '^' }
        ];

        for (const arith of arithOps) {
            handlers.push(this._generateHandler(opcodes[arith.name], arith.name, `
                ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${this.random.generateName(2)}(${this.random.generateName(1)})${arith.op}${this.random.generateName(2)}(${this.random.generateName(1)});
            `));
        }

        // UNM
        handlers.push(this._generateHandler(opcodes.UNM, 'UNM', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=-${stateVar}[${si.STACK}][${this.random.generateName(1)}];
        `));

        // NOT
        handlers.push(this._generateHandler(opcodes.NOT, 'NOT', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=not ${stateVar}[${si.STACK}][${this.random.generateName(1)}];
        `));

        // LEN
        handlers.push(this._generateHandler(opcodes.LEN, 'LEN', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=#${stateVar}[${si.STACK}][${this.random.generateName(1)}];
        `));

        // CONCAT
        handlers.push(this._generateHandler(opcodes.CONCAT, 'CONCAT', `
            local ${this.random.generateName(1)}={};
            for ${this.random.generateName(1)}=${this.random.generateName(1)},${this.random.generateName(1)} do 
                ${this.random.generateName(1)}[#${this.random.generateName(1)}+${this.random.formatNumber(1)}]=tostring(${stateVar}[${si.STACK}][${this.random.generateName(1)}]);
            end;
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=table.concat(${this.random.generateName(1)});
        `));

        // JMP
        handlers.push(this._generateHandler(opcodes.JMP, 'JMP', `
            ${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.generateName(1)};
        `));

        // Comparison operators
        const cmpOps = [
            { name: 'EQ', op: '==' },
            { name: 'LT', op: '<' },
            { name: 'LE', op: '<=' }
        ];

        for (const cmp of cmpOps) {
            handlers.push(this._generateHandler(opcodes[cmp.name], cmp.name, `
                if (${this.random.generateName(2)}(${this.random.generateName(1)})${cmp.op}${this.random.generateName(2)}(${this.random.generateName(1)}))~=(${this.random.generateName(1)}~=${this.random.formatNumber(0)}) then 
                    ${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.formatNumber(1)};
                end;
            `));
        }

        // CALL
        handlers.push(this._generateHandler(opcodes.CALL, 'CALL', this._generateCallHandler()));

        // RETURN
        handlers.push(this._generateHandler(opcodes.RETURN, 'RETURN', this._generateReturnHandler()));

        // FORLOOP
        handlers.push(this._generateHandler(opcodes.FORLOOP, 'FORLOOP', this._generateForLoopHandler()));

        // FORPREP
        handlers.push(this._generateHandler(opcodes.FORPREP, 'FORPREP', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${stateVar}[${si.STACK}][${this.random.generateName(1)}]-${stateVar}[${si.STACK}][${this.random.generateName(1)}+${this.random.formatNumber(2)}];
            ${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.generateName(1)};
        `));

        // CLOSURE
        handlers.push(this._generateHandler(opcodes.CLOSURE, 'CLOSURE', `
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${stateVar}[${si.PROTOS}][${this.random.generateName(1)}];
        `));

        // Add some fake handlers untuk size
        for (let i = 0; i < 20; i++) {
            handlers.push(this._generateFakeHandler());
        }

        code += this.random.shuffle(handlers).join(',');
        code += `};`;

        return code;
    }

    /**
     * Generate shuffled opcodes
     */
    _getShuffledOpcodes() {
        const opcodes = {};
        const usedCodes = new Set();
        const names = [
            'MOVE', 'LOADK', 'LOADBOOL', 'LOADNIL',
            'GETGLOBAL', 'SETGLOBAL', 'GETTABLE', 'SETTABLE',
            'NEWTABLE', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'POW',
            'UNM', 'NOT', 'LEN', 'CONCAT', 'JMP',
            'EQ', 'LT', 'LE', 'CALL', 'RETURN',
            'FORLOOP', 'FORPREP', 'CLOSURE'
        ];

        for (const name of names) {
            let code;
            do {
                code = this.random.int(0, 63);
            } while (usedCodes.has(code));
            usedCodes.add(code);
            opcodes[name] = code;
        }

        return opcodes;
    }

    /**
     * Generate single opcode handler
     */
    _generateHandler(opcode, name, body) {
        return `[${this.random.formatNumber(opcode)}]=function(${this.random.generateName(1)},${this.random.generateName(1)},${this.random.generateName(1)})${body.trim()}end`;
    }

    /**
     * Generate fake handler
     */
    _generateFakeHandler() {
        const opcode = this.random.int(64, 127);
        const bodies = [
            `local _=${this.random.generateName(1)}+${this.random.generateName(1)};`,
            `if false then end;`,
            `for _=1,0 do end;`,
            `local _=type(${this.random.generateName(1)});`,
            `local _=tostring(${this.random.generateName(1)});`
        ];
        return `[${this.random.formatNumber(opcode)}]=function(${this.random.generateName(1)},${this.random.generateName(1)},${this.random.generateName(1)})${this.random.choice(bodies)}end`;
    }

    /**
     * Generate CALL handler
     */
    _generateCallHandler() {
        const si = this.stateIndex;
        const stateVar = this.vmName;
        
        return `
            local ${this.random.generateName(1)}=${stateVar}[${si.STACK}][${this.random.generateName(1)}];
            local ${this.random.generateName(1)}={};
            local ${this.random.generateName(1)}=${this.random.generateName(1)}-${this.random.formatNumber(1)};
            if ${this.random.generateName(1)}==${this.random.formatNumber(0)} then ${this.random.generateName(1)}=${stateVar}[${si.TOP}]-${this.random.generateName(1)};end;
            for ${this.random.generateName(1)}=${this.random.formatNumber(1)},${this.random.generateName(1)} do 
                ${this.random.generateName(1)}[${this.random.generateName(1)}]=${stateVar}[${si.STACK}][${this.random.generateName(1)}+${this.random.generateName(1)}];
            end;
            local ${this.random.generateName(1)}={${this.random.generateName(1)}(table.unpack(${this.random.generateName(1)},${this.random.formatNumber(1)},${this.random.generateName(1)}))};
            local ${this.random.generateName(1)}=${this.random.generateName(1)}-${this.random.formatNumber(1)};
            if ${this.random.generateName(1)}==${this.random.formatNumber(0)} then 
                ${this.random.generateName(1)}=#${this.random.generateName(1)};
                ${stateVar}[${si.TOP}]=${this.random.generateName(1)}+${this.random.generateName(1)}-${this.random.formatNumber(1)};
            end;
            for ${this.random.generateName(1)}=${this.random.formatNumber(1)},${this.random.generateName(1)} do 
                ${stateVar}[${si.STACK}][${this.random.generateName(1)}+${this.random.generateName(1)}-${this.random.formatNumber(1)}]=${this.random.generateName(1)}[${this.random.generateName(1)}];
            end;
        `;
    }

    /**
     * Generate RETURN handler
     */
    _generateReturnHandler() {
        const si = this.stateIndex;
        const stateVar = this.vmName;
        
        return `
            local ${this.random.generateName(1)}={};
            local ${this.random.generateName(1)}=${this.random.generateName(1)}-${this.random.formatNumber(1)};
            if ${this.random.generateName(1)}==${this.random.formatNumber(0)} then ${this.random.generateName(1)}=${stateVar}[${si.TOP}]-${this.random.generateName(1)}+${this.random.formatNumber(1)};end;
            for ${this.random.generateName(1)}=${this.random.formatNumber(1)},${this.random.generateName(1)} do 
                ${this.random.generateName(1)}[${this.random.generateName(1)}]=${stateVar}[${si.STACK}][${this.random.generateName(1)}+${this.random.generateName(1)}-${this.random.formatNumber(1)}];
            end;
            ${stateVar}[${si.RUNNING}]=false;
            return table.unpack(${this.random.generateName(1)},${this.random.formatNumber(1)},${this.random.generateName(1)});
        `;
    }

    /**
     * Generate FORLOOP handler
     */
    _generateForLoopHandler() {
        const si = this.stateIndex;
        const stateVar = this.vmName;
        
        return `
            local ${this.random.generateName(1)}=${stateVar}[${si.STACK}][${this.random.generateName(1)}+${this.random.formatNumber(2)}];
            local ${this.random.generateName(1)}=${stateVar}[${si.STACK}][${this.random.generateName(1)}]+${this.random.generateName(1)};
            local ${this.random.generateName(1)}=${stateVar}[${si.STACK}][${this.random.generateName(1)}+${this.random.formatNumber(1)}];
            ${stateVar}[${si.STACK}][${this.random.generateName(1)}]=${this.random.generateName(1)};
            local ${this.random.generateName(1)}=${this.random.generateName(1)}>${this.random.formatNumber(0)} and ${this.random.generateName(1)}<=${this.random.generateName(1)} or ${this.random.generateName(1)}>=${this.random.generateName(1)};
            if ${this.random.generateName(1)} then 
                ${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.generateName(1)};
                ${stateVar}[${si.STACK}][${this.random.generateName(1)}+${this.random.formatNumber(3)}]=${this.random.generateName(1)};
            end;
        `;
    }

    /**
     * Generate executor
     */
    _generateExecutor() {
        const v = this.entryVars;
        const si = this.stateIndex;
        const stateVar = this.vmName;
        const handlersVar = this.random.generateName(2);
        
        return `local ${v.executor}=function(${this.random.generateName(1)})` +
            // Decode dan setup
            `local ${this.random.generateName(1)}=${this.random.generateName(2)}(${this.random.generateName(1)});` +
            // Main loop
            `while ${stateVar}[${si.RUNNING}] do ` +
            `local ${this.random.generateName(1)}=${stateVar}[${si.INSTRUCTIONS}][${stateVar}[${si.PC}]];` +
            `if not ${this.random.generateName(1)} then break;end;` +
            `${stateVar}[${si.PC}]=${stateVar}[${si.PC}]+${this.random.formatNumber(1)};` +
            `local ${this.random.generateName(1)}=${handlersVar}[${this.random.generateName(1)}.op];` +
            `if ${this.random.generateName(1)} then ` +
            `local ${this.random.generateName(1)}={${this.random.generateName(1)}(${this.random.generateName(1)}.A,${this.random.generateName(1)}.B,${this.random.generateName(1)}.C)};` +
            `if not ${stateVar}[${si.RUNNING}] then return table.unpack(${this.random.generateName(1)});end;` +
            `end;` +
            `end;` +
            `end;`;
    }

    /**
     * Compile code to bytecode format
     */
    _compileToBytecode(code) {
        // Generate hex-encoded bytecode-like data
        const key = this.random.bytes(4);
        const encoded = [];
        
        for (let i = 0; i < code.length; i++) {
            const byte = code.charCodeAt(i) ^ key[i % key.length];
            encoded.push(byte.toString(16).padStart(2, '0'));
        }
        
        // Add header
        const header = this.random.bytes(16).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Add padding untuk size yang proper (~8x)
        const paddingSize = Math.floor(code.length * 6);
        const padding = [];
        for (let i = 0; i < paddingSize; i++) {
            padding.push(this.random.int(0, 255).toString(16).padStart(2, '0'));
        }
        
        return header + encoded.join('') + padding.join('');
    }

    /**
     * Generate from bytecode object
     */
    _generateFromBytecode(options) {
        return this._generateLuraphStyle(options.originalCode || 'return nil');
    }

    /**
     * Reset
     */
    reset() {
        this.random.resetNames();
        this.vmName = null;
        this.entryVars = {};
        this.stateIndex = {};
    }
}

module.exports = VMTemplate;
