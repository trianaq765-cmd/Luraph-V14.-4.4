/**
 * LuaShield - VM Template Generator
 * Generate Luraph-style VM wrapper dengan proper integration
 */

const Random = require('../../utils/random');
const KeyGenerator = require('../encryption/keys');
const StringEncryptor = require('../encryption/strings');

class VMTemplate {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.keyGen = new KeyGenerator(options.seed);
        this.stringEncryptor = new StringEncryptor({ seed: options.seed });
        this.target = options.target || 'roblox';
        
        // VM variable names
        this.vars = {};
        
        // Platform config
        this.platformConfig = this._getPlatformConfig();
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
        const table = this.keyGen.generateKeyTable(this.random.int(8, 16));
        const entries = Object.entries(table)
            .map(([k, v]) => `${k}=${this.random.formatNumber(v)}`)
            .join(',');
        return `{${entries}}`;
    }

    /**
     * Generate utility functions table
     */
    _generateUtilTable() {
        const v = this.vars;
        
        const entries = [
            `${v.bxor}=bit32.bxor`,
            `${v.band}=bit32.band`,
            `${v.bor}=bit32.bor`,
            `${v.bnot}=bit32.bnot`,
            `${v.sub}=string.sub`,
            `${v.byte}=string.byte`,
            `${v.char}=string.char`,
            `${v.concat}=table.concat`
        ];

        // Shuffle
        const shuffled = this.random.shuffle(entries);
        return `{${shuffled.join(',')}}`;
    }

    /**
     * Generate complete VM wrapper
     */
    generate(code, options = {}) {
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
        wrapper += `local ${v.bxor}=bit32.bxor;`;
        wrapper += `local ${v.band}=bit32.band;`;
        wrapper += `local ${v.bor}=bit32.bor;`;
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
        const v = this.vars;

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
        entries.push(`${this.random.generateName(2)}=bit32.bnot`);
        entries.push(`${this.random.generateName(1)}=bit32.bor`);
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
                const funcNames = [this.random.generateName(2), this.random.generateName(2)];
                const indices = [
                    this.random.formatNumber(this.random.int(1000, 9999)),
                    this.random.formatNumber(this.random.int(10000, 99999))
                ];
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
        const v = this.vars;
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
        this.random.resetNames();
        this.keyGen.reset();
        this.vars = {};
    }
}

module.exports = VMTemplate;
