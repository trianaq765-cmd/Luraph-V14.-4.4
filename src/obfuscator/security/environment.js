/**
 * LuaShield - Environment Check
 * Anti-debug dan environment validation
 */

const Random = require('../../utils/random');
const ConstantEncryptor = require('../encryption/constants');

class EnvironmentChecker {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.constantEncryptor = new ConstantEncryptor({ seed: options.seed });
        
        this.config = {
            target: options.target || 'roblox',
            checks: options.checks || ['debug', 'environment', 'hooks'],
            failAction: options.failAction || 'error',
            silent: options.silent || false
        };
    }

    /**
     * Generate all environment checks
     */
    generate() {
        let code = '';

        // Anti-debug checks
        if (this.config.checks.includes('debug')) {
            code += this._generateDebugCheck();
        }

        // Environment validation
        if (this.config.checks.includes('environment')) {
            code += this._generateEnvCheck();
        }

        // Hook detection
        if (this.config.checks.includes('hooks')) {
            code += this._generateHookCheck();
        }

        // Platform-specific checks
        if (this.config.target === 'roblox') {
            code += this._generateRobloxChecks();
        }

        // Global tampering check
        code += this._generateGlobalCheck();

        return code;
    }

    /**
     * Generate anti-debug check
     */
    _generateDebugCheck() {
        const vars = {
            debugCheck: this.random.generateName(2),
            result: this.random.generateName(1),
            safe: this.random.generateName(2)
        };

        let code = '';

        code += `local ${vars.debugCheck}=(function()`;
        
        // Check debug library
        code += `local ${vars.result}=${this.constantEncryptor.encryptBoolean(true)};`;
        
        if (this.config.target !== 'roblox') {
            // Standard Lua debug checks
            code += `if debug then `;
            code += `if debug.getinfo then `;
            
            // Check if getinfo is hooked
            code += `local info=debug.getinfo(${this.random.formatNumber(1)});`;
            code += `if info and info.what=='C' then `;
            code += `${vars.result}=${this.constantEncryptor.encryptBoolean(false)};`;
            code += `end;`;
            
            code += `end;`;
            code += `if debug.sethook then `;
            code += `${vars.result}=${this.constantEncryptor.encryptBoolean(false)};`;
            code += `end;`;
            code += `end;`;
        }

        // Check for common debugger globals
        const debugGlobals = ['__DEBUG__', '__DEBUGGER__', 'DEBUG_MODE', '__breakpoint'];
        for (const global of debugGlobals) {
            code += `if _G["${global}"] then `;
            code += `${vars.result}=${this.constantEncryptor.encryptBoolean(false)};`;
            code += `end;`;
        }

        code += `return ${vars.result};`;
        code += `end);`;

        // Execute check
        code += `local ${vars.safe}=${vars.debugCheck}();`;
        code += `if not ${vars.safe} then `;
        code += this._generateFailCode();
        code += `end;`;

        return code;
    }

    /**
     * Generate environment validation
     */
    _generateEnvCheck() {
        const vars = {
            envCheck: this.random.generateName(2),
            valid: this.random.generateName(1)
        };

        let code = '';

        code += `local ${vars.envCheck}=(function()`;

        // Check essential functions exist
        const essentials = ['type', 'tostring', 'tonumber', 'pairs', 'ipairs', 'select'];
        
        for (const func of essentials) {
            code += `if type(${func})~='function' then return ${this.constantEncryptor.encryptBoolean(false)};end;`;
        }

        // Check string library
        code += `if type(string)~='table' or type(string.byte)~='function' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        // Check table library
        code += `if type(table)~='table' or type(table.concat)~='function' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        // Check math library
        code += `if type(math)~='table' or type(math.floor)~='function' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        // Verify bit32/bit exists
        code += `if not bit32 and not bit then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        code += `return ${this.constantEncryptor.encryptBoolean(true)};`;
        code += `end);`;

        code += `local ${vars.valid}=${vars.envCheck}();`;
        code += `if not ${vars.valid} then `;
        code += this._generateFailCode();
        code += `end;`;

        return code;
    }

    /**
     * Generate hook detection
     */
    _generateHookCheck() {
        const vars = {
            hookCheck: this.random.generateName(2),
            original: this.random.generateName(2),
            test: this.random.generateName(1)
        };

        let code = '';

        code += `local ${vars.hookCheck}=(function()`;

        // Test tostring for hooks
        code += `local ${vars.original}=tostring;`;
        code += `local ${vars.test}=${vars.original}(${this.random.formatNumber(12345)});`;
        code += `if ${vars.test}~="${12345}" then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        // Test type function
        code += `if type(type)~='function' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        // Test that type returns correct values
        code += `if type(${this.random.formatNumber(1)})~='number' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        code += `if type('')~='string' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        code += `if type({})~='table' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        code += `return ${this.constantEncryptor.encryptBoolean(true)};`;
        code += `end);`;

        code += `if not ${vars.hookCheck}() then `;
        code += this._generateFailCode();
        code += `end;`;

        return code;
    }

    /**
     * Generate Roblox-specific checks
     */
    _generateRobloxChecks() {
        const vars = {
            robloxCheck: this.random.generateName(2),
            isRoblox: this.random.generateName(2)
        };

        let code = '';

        code += `local ${vars.robloxCheck}=(function()`;

        // Check for Roblox globals
        code += `if not game then return ${this.constantEncryptor.encryptBoolean(true)};end;`;
        code += `if type(game)~='userdata' then `;
        code += `return ${this.constantEncryptor.encryptBoolean(false)};`;
        code += `end;`;

        // Check for executor detection (optional, depends on use case)
        // code += `if getgenv or getrenv then return false;end;`;

        code += `return ${this.constantEncryptor.encryptBoolean(true)};`;
        code += `end);`;

        code += `local ${vars.isRoblox}=${vars.robloxCheck}();`;

        return code;
    }

    /**
     * Generate global tampering check
     */
    _generateGlobalCheck() {
        const vars = {
            globalCheck: this.random.generateName(2),
            pristine: this.random.generateName(2)
        };

        let code = '';

        // Store references to critical functions
        code += `local ${vars.pristine}={`;
        code += `type=type,`;
        code += `tostring=tostring,`;
        code += `tonumber=tonumber,`;
        code += `pairs=pairs,`;
        code += `ipairs=ipairs,`;
        code += `select=select,`;
        code += `error=error,`;
        code += `pcall=pcall`;
        code += `};`;

        // Periodic check function
        code += `local ${vars.globalCheck}=(function()`;
        code += `if ${vars.pristine}.type~=type then return ${this.constantEncryptor.encryptBoolean(false)};end;`;
        code += `if ${vars.pristine}.tostring~=tostring then return ${this.constantEncryptor.encryptBoolean(false)};end;`;
        code += `return ${this.constantEncryptor.encryptBoolean(true)};`;
        code += `end);`;

        return code;
    }

    /**
     * Generate fail code based on config
     */
    _generateFailCode() {
        if (this.config.silent) {
            return `return nil;`;
        }

        const action = this.config.failAction;

        if (action === 'error') {
            const messages = [
                'Environment check failed',
                'Invalid execution environment',
                'Security check failed',
                'Unauthorized environment'
            ];
            return `error("${this.random.choice(messages)}");`;
        } else if (action === 'crash') {
            return `while ${this.constantEncryptor.encryptBoolean(true)} do end;`;
        } else if (action === 'return') {
            return `return;`;
        }

        return `error("Security error");`;
    }

    /**
     * Generate executor detection (for Roblox)
     */
    generateExecutorDetection() {
        const vars = {
            executor: this.random.generateName(2),
            detected: this.random.generateName(2)
        };

        let code = '';

        code += `local ${vars.executor}=(function()`;
        code += `local ${vars.detected}=nil;`;

        // Common executor globals
        const executorGlobals = [
            { name: 'syn', executor: 'Synapse' },
            { name: 'KRNL_LOADED', executor: 'Krnl' },
            { name: 'fluxus', executor: 'Fluxus' },
            { name: 'Sentinel', executor: 'Sentinel' },
            { name: 'OXYGEN_LOADED', executor: 'Oxygen' }
        ];

        for (const { name, executor } of executorGlobals) {
            code += `if ${name} then ${vars.detected}="${executor}";end;`;
        }

        code += `return ${vars.detected};`;
        code += `end);`;

        return code;
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
    }
}

module.exports = EnvironmentChecker;
