/**
 * LuaShield - VM Template Generator
 * Generate Luraph-style VM wrapper
 */

const Random = require('../../utils/random');
const KeyGenerator = require('../encryption/keys');

class VMTemplate {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.keyGen = new KeyGenerator(options.seed);
        this.target = options.target || 'roblox';
        
        // VM variable names (akan di-generate random)
        this.vars = {};
    }

    /**
     * Generate semua variable names untuk VM
     */
    _generateVarNames() {
        this.vars = {
            // Main function params
            mainParam: this.random.generateName(1),
            envTable: this.random.generateName(1),
            dataTable: this.random.generateName(1),
            
            // Core functions
            wrapFunc: this.random.generateName(2),
            execFunc: this.random.generateName(2),
            decodeFunc: this.random.generateName(2),
            
            // Utility refs
            bxor: this.random.generateName(1),
            band: this.random.generateName(1),
            bor: this.random.generateName(1),
            sub: this.random.generateName(1),
            byte: this.random.generateName(1),
            char: this.random.generateName(2),
            
            // Loop/temp vars
            idx: this.random.generateName(1),
            val: this.random.generateName(1),
            tmp: this.random.generateName(1),
            result: this.random.generateName(2),
            
            // State vars
            state: this.random.generateName(2),
            counter: this.random.generateName(1),
            
            // Table refs
            keyTable: this.random.generateName(1),
            strTable: this.random.generateName(2),
            constTable: this.random.generateName(2)
        };
        
        return this.vars;
    }

    /**
     * Generate key table untuk VM
     */
    _generateKeyTable() {
        const table = this.keyGen.generateKeyTable(this.random.int(6, 12));
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
            `${v.sub}=string.sub`,
            `${v.byte}=string.byte`,
            `${v.char}=string.char`
        ];

        // Add platform-specific utils
        if (this.target === 'roblox') {
            entries.push(`${this.random.generateName(1)}=type`);
            entries.push(`${this.random.generateName(1)}=select`);
        }

        // Shuffle entries
        const shuffled = this.random.shuffle(entries);
        return `{${shuffled.join(',')}}`;
    }

    /**
     * Generate unpack/select helper
     */
    _generateUnpackHelper() {
        const v = this.vars;
        const funcName = this.random.generateName(1);
        const paramK = this.random.generateName(1);
        const paramU = this.random.generateName(1);
        const paramC = this.random.generateName(1);
        const paramR = this.random.generateName(1);
        const localD = this.random.generateName(1);
        const localZ = this.random.generateName(1);

        return `${funcName}=function(${paramK},${paramK})` +
            `${paramK}[${this.random.formatNumber(21)}]=(function(${paramU},${paramC},${paramR})` +
            `local ${localD}={${paramK}[${this.random.formatNumber(21)}]};` +
            `if not(${paramC}>${paramU})then else return;end;` +
            `local ${localZ}=(${paramU}-${paramC}+${this.random.formatNumber(1)});` +
            `if ${localZ}>=${this.random.formatNumber(8)} then ` +
            `return ${paramR}[${paramC}],${paramR}[${paramC}+${this.random.formatNumber(1)}],` +
            `${paramR}[${paramC}+${this.random.formatNumber(2)}],${paramR}[${paramC}+${this.random.formatNumber(3)}],` +
            `${paramR}[${paramC}+${this.random.formatNumber(4)}],${paramR}[${paramC}+${this.random.formatNumber(5)}],` +
            `${paramR}[${paramC}+${this.random.formatNumber(6)}],${paramR}[${paramC}+${this.random.formatNumber(7)}],` +
            `${localD}[${this.random.formatNumber(1)}](${paramU},${paramC}+${this.random.formatNumber(8)},${paramR});` +
            `else ` +
            this._generateUnpackElseBranch(paramR, paramC, localD, localZ, paramU) +
            `end;end);` +
            `(${paramK})[${this.random.formatNumber(22)}]=(select);` +
            `${paramK}[${this.random.formatNumber(23)}]=nil;` +
            `${paramK}[${this.random.formatNumber(24)}]=nil;` +
            `end`;
    }

    _generateUnpackElseBranch(paramR, paramC, localD, localZ, paramU) {
        const cases = [];
        
        for (let i = 7; i >= 1; i--) {
            const returns = [];
            for (let j = 0; j < i; j++) {
                returns.push(`${paramR}[${paramC}+${this.random.formatNumber(j)}]`);
            }
            returns.push(`${localD}[${this.random.formatNumber(1)}](${paramU},${paramC}+${this.random.formatNumber(i)},${paramR})`);
            
            cases.push(
                `if ${localZ}>=${this.random.formatNumber(i)} then ` +
                `return ${returns.join(',')};`
            );
        }
        
        // Final else for single element
        cases.push(
            `return ${paramR}[${paramC}],${localD}[${this.random.formatNumber(1)}](${paramU},${paramC}+${this.random.formatNumber(1)},${paramR});`
        );

        return cases.join('else');
    }

    /**
     * Generate complete VM wrapper
     */
    generate(code, options = {}) {
        this._generateVarNames();
        const v = this.vars;

        // Generate components
        const keyTable = this._generateKeyTable();
        const utilTable = this._generateUtilTable();
        
        // Build wrapper
        let wrapper = '';

        // Main return wrapper
        wrapper += `return(function(${v.mainParam})`;
        
        // Local declarations
        wrapper += `local ${v.envTable},${v.dataTable},${v.result}={},{},nil;`;
        
        // Utility references
        wrapper += `local ${v.wrapFunc}=coroutine.wrap;`;
        wrapper += `local ${v.bxor}=bit32.bxor;`;
        wrapper += `local ${v.band}=bit32.band;`;
        wrapper += `local ${v.sub}=string.sub;`;
        wrapper += `local ${v.byte}=string.byte;`;
        wrapper += `local ${v.char}=string.char;`;
        
        // Key table
        wrapper += `local ${v.keyTable}=${keyTable};`;

        // Add some complex helper functions (Luraph style)
        wrapper += this._generateHelperFunctions();

        // Execute the code
        wrapper += `local ${v.execFunc}=(function()`;
        wrapper += code;
        wrapper += `;end);`;
        
        wrapper += `return ${v.execFunc}();`;
        wrapper += `end)({...})`;

        return wrapper;
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
        helpers += `${decResult}=${decResult}..${v.char}(${v.bxor}(${decParam}[${decIdx}],${decKey}[(${decIdx}-${this.random.formatNumber(1)})%#${decKey}+${this.random.formatNumber(1)}]));`;
        helpers += `end;`;
        helpers += `return ${decResult};`;
        helpers += `end;`;

        // Add more complex functions
        helpers += this._generateComplexHelper1();
        helpers += this._generateComplexHelper2();

        return helpers;
    }

    _generateComplexHelper1() {
        const funcName = this.random.generateName(2);
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const p3 = this.random.generateName(1);
        const v1 = this.random.generateName(1);
        
        const n1 = this.random.formatNumber(this.random.int(1, 16));
        const n2 = this.random.formatNumber(this.random.int(1000, 9999));

        return `local ${funcName}=function(${p1},${p2},${p3})` +
            `local ${v1}=${p1}[${n1}][${this.random.formatNumber(12)}](${p2});` +
            `return ${v1};` +
            `end;`;
    }

    _generateComplexHelper2() {
        const funcName = this.random.generateName(2);
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const v1 = this.random.generateName(2);
        const v2 = this.random.generateName(1);

        return `local ${funcName}=function(${p1},${p1},${p2})` +
            `${p1}[${this.random.formatNumber(this.random.int(1, 10))}]=${p2};` +
            `return ${p1};` +
            `end;`;
    }

    /**
     * Generate Luraph-style output header
     */
    generateHeader() {
        const entries = [];
        
        // Generate random function entries
        const funcCount = this.random.int(8, 15);
        for (let i = 0; i < funcCount; i++) {
            const name = this.random.generateName(this.random.int(1, 2));
            const valueType = this.random.choice(['coroutine', 'string', 'function', 'table']);
            
            let value;
            if (valueType === 'coroutine') {
                value = `coroutine.${this.random.choice(['yield', 'wrap', 'create'])}`;
            } else if (valueType === 'string') {
                value = `string.${this.random.choice(['byte', 'sub', 'char', 'gsub', 'match'])}`;
            } else if (valueType === 'function') {
                const fParam = this.random.generateName(1);
                value = `function(...)(...)[...]=nil;end`;
            } else {
                value = `{}`;
            }
            
            entries.push(`${name}=${value}`);
        }

        return `return({${entries.join(',')}})`;
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
