/**
 * LuaShield - Output Generator
 * Generate final obfuscated code dengan Luraph-style format
 */

const Random = require('../../utils/random');
const Config = require('../config');
const VMTemplate = require('../vm/template');
const Minifier = require('./minifier');

class OutputGenerator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.vmTemplate = new VMTemplate({ seed: options.seed, target: options.target });
        this.minifier = new Minifier(options.minify || {});
        
        this.config = {
            target: options.target || 'roblox',
            addWatermark: options.watermark !== false,
            minify: options.minify !== false,
            wrapInVM: options.vmObfuscation !== false,
            style: options.style || 'luraph'
        };
    }

    /**
     * Generate final output
     */
    generate(code, options = {}) {
        const mergedOptions = { ...this.config, ...options };
        let result = code;

        // Step 1: Wrap dalam VM jika enabled
        if (mergedOptions.wrapInVM) {
            result = this._wrapInVM(result, mergedOptions);
        }

        // Step 2: Generate header/wrapper style Luraph
        result = this._generateLuraphStyle(result, mergedOptions);

        // Step 3: Add watermark
        if (mergedOptions.addWatermark) {
            result = this._addWatermark(result);
        }

        // Step 4: Minify jika enabled
        if (mergedOptions.minify) {
            result = this.minifier.minify(result);
        }

        return result;
    }

    /**
     * Wrap code dalam VM
     */
    _wrapInVM(code, options) {
        return this.vmTemplate.generate(code, options);
    }

    /**
     * Generate Luraph-style output
     */
    _generateLuraphStyle(code, options) {
        // Generate entry table dengan functions dan values
        const entryTable = this._generateEntryTable();
        
        // Variable names untuk wrapper
        const vars = {
            entry: this.random.generateName(1),
            env: this.random.generateName(1),
            data: this.random.generateName(2),
            result: this.random.generateName(2)
        };

        // Build final structure
        let output = `return(function(${vars.entry})`;
        
        // Entry table declarations
        output += `local ${vars.env}=${vars.entry};`;
        output += `local ${vars.data}={`;
        output += entryTable;
        output += `};`;
        
        // Main execution
        output += `local ${vars.result}=(function()`;
        output += code;
        output += `;end)();`;
        
        output += `return ${vars.result};`;
        output += `end)(${this._generateInitializer()})`;

        return output;
    }

    /**
     * Generate entry table dengan random functions/values
     */
    _generateEntryTable() {
        const entries = [];
        const count = this.random.int(8, 16);

        for (let i = 0; i < count; i++) {
            const entry = this._generateRandomEntry();
            entries.push(entry);
        }

        return entries.join(',');
    }

    /**
     * Generate random entry untuk table
     */
    _generateRandomEntry() {
        const name = this.random.generateName(this.random.int(1, 2));
        const type = this.random.choice([
            'coroutine_func',
            'string_func', 
            'bit_func',
            'inline_func',
            'number',
            'table_func'
        ]);

        let value;
        switch (type) {
            case 'coroutine_func':
                value = `coroutine.${this.random.choice(['yield', 'wrap', 'create', 'resume'])}`;
                break;
            
            case 'string_func':
                value = `string.${this.random.choice(['byte', 'sub', 'char', 'gsub', 'match', 'rep', 'len'])}`;
                break;
            
            case 'bit_func':
                value = `bit32.${this.random.choice(['bxor', 'band', 'bor', 'bnot', 'lshift', 'rshift'])}`;
                break;
            
            case 'inline_func':
                value = this._generateInlineFunction();
                break;
            
            case 'number':
                value = this.random.formatNumber(this.random.largeNumber());
                break;
            
            case 'table_func':
                value = `table.${this.random.choice(['concat', 'insert', 'remove', 'sort'])}`;
                break;
        }

        return `${name}=${value}`;
    }

    /**
     * Generate inline function (Luraph style)
     */
    _generateInlineFunction() {
        const style = this.random.int(1, 6);
        const p1 = this.random.generateName(1);
        const p2 = this.random.generateName(1);
        const v1 = this.random.generateName(1);

        switch (style) {
            case 1:
                return `function(...)(...)[...]=nil;end`;
            
            case 2:
                return `function(${p1},${p1})${p1}[${this.random.formatNumber(this.random.int(1, 50))}]=(function(${v1})return ${v1};end);end`;
            
            case 3:
                return `function(${p1})return ${p1}[${this.random.formatNumber(1)}];end`;
            
            case 4:
                const n1 = this.random.formatNumber(this.random.int(1, 32));
                const n2 = this.random.formatNumber(this.random.int(1, 32));
                return `function(${p1},${p2})return ${p1}[${n1}][${n2}](${p2});end`;
            
            case 5:
                return `function(${p1},${p1},${p2})${p1}[${this.random.formatNumber(1)}]=(${p2});end`;
            
            case 6:
                const idx = this.random.formatNumber(this.random.int(1000, 9999));
                return `function(${p1})if not ${p1}[${idx}]then ${p1}[${idx}]={}end;return ${p1}[${idx}];end`;
        }
    }

    /**
     * Generate initializer untuk entry function
     */
    _generateInitializer() {
        const entries = [];
        
        // Add common utilities
        const utils = [
            { name: 'bxor', value: 'bit32.bxor' },
            { name: 'band', value: 'bit32.band' },
            { name: 'bor', value: 'bit32.bor' },
            { name: 'sub', value: 'string.sub' },
            { name: 'byte', value: 'string.byte' },
            { name: 'char', value: 'string.char' }
        ];

        for (const util of utils) {
            const name = this.random.generateName(1);
            entries.push(`${name}=${util.value}`);
        }

        // Add some random values
        for (let i = 0; i < this.random.int(3, 6); i++) {
            const name = this.random.generateName(this.random.int(1, 2));
            const value = this.random.formatNumber(this.random.largeNumber());
            entries.push(`${name}=${value}`);
        }

        // Shuffle entries
        const shuffled = this.random.shuffle(entries);

        return `{${shuffled.join(',')}}`;
    }

    /**
     * Add watermark comment
     */
    _addWatermark(code) {
        const watermark = Config.WATERMARK_TEXT.replace('%VERSION%', Config.VERSION);
        return `--[[\n\t${watermark}\n]]\n\n${code}`;
    }

    /**
     * Generate complete Luraph-style output
     * Ini menghasilkan output yang mirip dengan contoh yang diberikan user
     */
    generateAdvanced(code, options = {}) {
        const vars = this._generateAdvancedVars();
        
        let output = '';

        // Watermark
        if (options.watermark !== false) {
            output += `--[[\n\t${Config.WATERMARK_TEXT.replace('%VERSION%', Config.VERSION)}\n]]\n\n`;
        }

        // Main return statement
        output += `return({`;
        output += this._generateAdvancedEntryTable(vars);
        output += `})(`;
        output += this._generateAdvancedInitCall(code, vars);
        output += `)`;

        return output;
    }

    _generateAdvancedVars() {
        return {
            d: this.random.generateName(1),
            Q: this.random.generateName(1),
            R: this.random.generateName(1),
            g: this.random.generateName(1),
            K: this.random.generateName(1),
            U: this.random.generateName(1),
            c: this.random.generateName(1),
            Z: this.random.generateName(1),
            FU: this.random.generateName(2),
            JU: this.random.generateName(2),
            hU: this.random.generateName(2),
            Wy: this.random.generateName(2),
            UU: this.random.generateName(2),
            _y: this.random.generateName(2),
            t: this.random.generateName(1),
            X: this.random.generateName(1),
            W: this.random.generateName(1),
            q: this.random.generateName(1),
            e: this.random.generateName(1),
            o: this.random.generateName(1),
            a: this.random.generateName(1),
            I: this.random.generateName(1)
        };
    }

    _generateAdvancedEntryTable(vars) {
        const entries = [];

        // Core utility functions
        entries.push(`${vars.d}=coroutine.yield`);
        entries.push(`${vars.Q}=string.byte`);
        entries.push(`${vars.R}=function(...)(...)[...]=nil;end`);
        
        // Complex function g
        entries.push(`${vars.g}=function(${vars.K},${vars.K})` +
            `${vars.K}[${this.random.formatNumber(21)}]=(function(${vars.U},${vars.c},${vars.R})` +
            `local ${vars.d}={${vars.K}[${this.random.formatNumber(21)}]};` +
            `if not(${vars.c}>${vars.U})then else return;end;` +
            `local ${vars.Z}=(${vars.U}-${vars.c}+${this.random.formatNumber(1)});` +
            this._generateUnpackLogic(vars) +
            `end);` +
            `(${vars.K})[${this.random.formatNumber(22)}]=(select);` +
            `${vars.K}[${this.random.formatNumber(23)}]=nil;` +
            `${vars.K}[${this.random.formatNumber(24)}]=nil;` +
            `end`);

        entries.push(`${vars.e}=coroutine.wrap`);
        entries.push(`${vars.t}=string.sub`);
        entries.push(`${vars.UU}=string.gsub`);

        // More complex functions
        entries.push(`${vars.Wy}=function(${vars.K},${vars.K},${vars.U},${vars.c})` +
            `${vars.U}[${this.random.formatNumber(1)}][${this.random.formatNumber(4)}][${vars.c}+${this.random.formatNumber(1)}]=(${vars.K});` +
            `end`);

        entries.push(`${vars.JU}=bit32.bnot`);
        entries.push(`${vars.q}=bit32.bor`);
        entries.push(`${vars.X}=string.match`);

        // Complex function W
        entries.push(`${vars.W}=function(${vars.K},${vars.U},${vars.c},${vars.R},${vars.d})` +
            `local ${vars.Z};` +
            `${vars.d}=(${this.random.formatNumber(22)});` +
            `while true do ` +
            `${vars.Z},${vars.d}=${vars.K}:${vars.X}(${vars.R},${vars.c},${vars.d});` +
            `if ${vars.Z}==${this.random.formatNumber(21977)} then break;end;` +
            `end;` +
            `${vars.U}=${vars.K}.A;` +
            `(${vars.c})[${this.random.formatNumber(25)}]=(${this.random.formatNumber(1)});` +
            `${vars.c}[${this.random.formatNumber(26)}]=(nil);` +
            `(${vars.c})[${this.random.formatNumber(27)}]=(nil);` +
            `${vars.c}[${this.random.formatNumber(28)}]=(nil);` +
            `return ${vars.U},${vars.d};` +
            `end`);

        // More functions
        entries.push(`${vars._y}=function(${vars.K},${vars.K},${vars.U},${vars.c},${vars.R},${vars.d},${vars.Z})` +
            `${vars.K}=${vars.d}[${this.random.formatNumber(1)}][${this.random.formatNumber(12)}](${vars.U});` +
            `${vars.R}=${vars.d}[${this.random.formatNumber(1)}][${this.random.formatNumber(12)}](${vars.U});` +
            `${vars.Z}=${vars.d}[${this.random.formatNumber(1)}][${this.random.formatNumber(12)}](${vars.U});` +
            `${vars.c}=${vars.d}[${this.random.formatNumber(1)}][${this.random.formatNumber(12)}](${vars.U});` +
            `return ${vars.R},${vars.Z},${vars.c},${vars.K};` +
            `end`);

        // FU function with complex expression
        entries.push(`${vars.FU}=function(${vars.K},${vars.U},${vars.c},${vars.R})` +
            `${vars.c}={};` +
            `if not ${vars.R}[${this.random.formatNumber(2554)}]then` +
            `(${vars.R})[${this.random.formatNumber(4369)}]=${this.random.formatNumber(-6732786790)}+` +
            `((${vars.K}.${vars.JU}((${vars.K}.${vars.hU || 'DU'}(${vars.K}.k[${this.random.formatNumber(this.random.int(1, 20))}]-` +
            `${vars.R}[${this.random.formatNumber(7056)}],${vars.K}.k[${this.random.formatNumber(this.random.int(1, 20))}]))))+${vars.K}.k[${this.random.formatNumber(8)}]);` +
            `${vars.U}=${this.random.formatNumber(-3485327622)}+(${vars.K}.${vars.hU || 'hU'}((${vars.K}.${vars.JU}(${vars.K}.k[${this.random.formatNumber(2)}]-` +
            `${vars.R}[${this.random.formatNumber(27804)}]))+${vars.R}[${this.random.formatNumber(10313)}],(${vars.R}[${this.random.formatNumber(7947)}])));` +
            `(${vars.R})[${this.random.formatNumber(2554)}]=(${vars.U});` +
            `else ${vars.U}=${vars.R}[${this.random.formatNumber(2554)}];end;` +
            `return ${vars.U},${vars.c};` +
            `end`);

        entries.push(`${vars.I}=string.unpack`);
        
        entries.push(`${vars.o}=function(${vars.K},${vars.K},${vars.U})` +
            `${vars.K}=${vars.U}[${this.random.formatNumber(27804)}];` +
            `return ${vars.K};` +
            `end`);

        entries.push(`${vars.a}=table.move`);

        return entries.join(',');
    }

    _generateUnpackLogic(vars) {
        let logic = '';
        
        logic += `if ${vars.Z}>=${this.random.formatNumber(8)} then `;
        logic += `return ${vars.R}[${vars.c}],${vars.R}[${vars.c}+${this.random.formatNumber(1)}],`;
        logic += `${vars.R}[${vars.c}+${this.random.formatNumber(2)}],${vars.R}[${vars.c}+${this.random.formatNumber(3)}],`;
        logic += `${vars.R}[${vars.c}+${this.random.formatNumber(4)}],${vars.R}[${vars.c}+${this.random.formatNumber(5)}],`;
        logic += `${vars.R}[${vars.c}+${this.random.formatNumber(6)}],${vars.R}[${vars.c}+${this.random.formatNumber(7)}],`;
        logic += `${vars.d}[${this.random.formatNumber(1)}](${vars.U},${vars.c}+${this.random.formatNumber(8)},${vars.R});`;
        
        logic += `else if ${vars.Z}>=${this.random.formatNumber(7)} then `;
        logic += `return ${vars.R}[${vars.c}],${vars.R}[${vars.c}+${this.random.formatNumber(1)}],`;
        logic += `${vars.R}[${vars.c}+${this.random.formatNumber(2)}],${vars.R}[${vars.c}+${this.random.formatNumber(3)}],`;
        logic += `${vars.R}[${vars.c}+${this.random.formatNumber(4)}],${vars.R}[${vars.c}+${this.random.formatNumber(5)}],`;
        logic += `${vars.R}[${vars.c}+${this.random.formatNumber(6)}],`;
        logic += `${vars.d}[${this.random.formatNumber(1)}](${vars.U},${vars.c}+${this.random.formatNumber(7)},${vars.R});`;
        
        // Continue pattern for smaller sizes...
        logic += `elseif ${vars.Z}>=${this.random.formatNumber(2)} then `;
        logic += `return ${vars.R}[${vars.c}],${vars.R}[${vars.c}+${this.random.formatNumber(1)}],`;
        logic += `${vars.d}[${this.random.formatNumber(1)}](${vars.U},${vars.c}+${this.random.formatNumber(2)},${vars.R});`;
        
        logic += `else return ${vars.R}[${vars.c}],${vars.d}[${this.random.formatNumber(1)}](${vars.U},${vars.c}+${this.random.formatNumber(1)},${vars.R});`;
        logic += `end;end;`;

        return logic;
    }

    _generateAdvancedInitCall(code, vars) {
        // Wrap code dalam complex initializer
        const wrappedCode = code.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        
        return `(function()${wrappedCode}end)()`;
    }

    /**
     * Reset
     */
    reset() {
        this.random.resetNames();
        this.vmTemplate.reset();
    }
}

module.exports = OutputGenerator;
