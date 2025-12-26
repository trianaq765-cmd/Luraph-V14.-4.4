/**
 * LuaShield - Control Flow Obfuscation
 * Flatten control flow dengan state machine
 */

const Random = require('../../utils/random');
const ConstantEncryptor = require('../encryption/constants');

class ControlFlowObfuscator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.constantEncryptor = new ConstantEncryptor({ seed: options.seed });
        
        this.config = {
            maxDepth: options.maxDepth || 3,
            flattenLoops: options.flattenLoops !== false,
            opaquePredicates: options.opaquePredicates !== false,
            bogusJumps: options.bogusJumps !== false,
            stateVarCount: options.stateVarCount || { min: 2, max: 4 }
        };

        this.stats = {
            flattened: 0,
            predicatesAdded: 0,
            bogusJumpsAdded: 0
        };
    }

    /**
     * Main obfuscation entry
     */
    obfuscate(code) {
        let result = code;

        // Step 1: Add opaque predicates ke conditionals
        if (this.config.opaquePredicates) {
            result = this._addOpaquePredicates(result);
        }

        // Step 2: Flatten control flow dengan state machine
        result = this._flattenControlFlow(result);

        // Step 3: Add bogus jumps
        if (this.config.bogusJumps) {
            result = this._addBogusJumps(result);
        }

        return result;
    }

    /**
     * Flatten control flow dengan state machine
     */
    _flattenControlFlow(code) {
        const stateVar = this.random.generateName(2);
        const loopVar = this.random.generateName(1);
        
        // Generate state values
        const states = {
            initial: this.random.int(1000, 9999),
            execute: this.random.int(10000, 99999),
            final: this.random.int(100000, 999999)
        };

        // Format state numbers
        const initialState = this.random.formatNumber(states.initial);
        const executeState = this.random.formatNumber(states.execute);
        const finalState = this.random.formatNumber(states.final);

        // Generate wrapped code
        const wrapped = `local ${stateVar}=${initialState};` +
            `while true do ` +
            `if ${stateVar}==${initialState} then ` +
            `${stateVar}=${executeState};` +
            `elseif ${stateVar}==${executeState} then ` +
            `${code};` +
            `${stateVar}=${finalState};` +
            `elseif ${stateVar}==${finalState} then ` +
            `break;` +
            `end;` +
            `end;`;

        this.stats.flattened++;
        return wrapped;
    }

    /**
     * Add opaque predicates ke if statements
     */
    _addOpaquePredicates(code) {
        let result = code;
        
        // Pattern untuk if statements
        const ifRegex = /\bif\s+(.+?)\s+then\b/g;
        
        result = result.replace(ifRegex, (match, condition) => {
            // Skip jika sudah kompleks
            if (condition.length > 50) return match;
            
            const opaque = this.constantEncryptor.generateOpaquePredicate(true);
            this.stats.predicatesAdded++;
            
            // Random style untuk menambahkan opaque predicate
            const style = this.random.int(1, 3);
            
            if (style === 1) {
                return `if (${opaque})and(${condition}) then`;
            } else if (style === 2) {
                return `if (${condition})and(${opaque}) then`;
            } else {
                return `if ((${opaque})and(${condition})) then`;
            }
        });

        return result;
    }

    /**
     * Add bogus jumps (fake gotos via state machine)
     */
    _addBogusJumps(code) {
        const lines = code.split('\n');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            result.push(lines[i]);
            
            // Random chance untuk menambah bogus jump
            if (this.random.bool(0.1)) {
                const bogus = this._generateBogusJump();
                result.push(bogus);
                this.stats.bogusJumpsAdded++;
            }
        }

        return result.join('\n');
    }

    /**
     * Generate single bogus jump
     */
    _generateBogusJump() {
        const style = this.random.int(1, 4);
        const predicate = this.constantEncryptor.generateOpaquePredicate(false);
        const varName = this.random.generateName();
        const value = this.random.formatNumber(this.random.int(1, 1000));

        if (style === 1) {
            return `if ${predicate} then ${varName}=${value};end;`;
        } else if (style === 2) {
            return `while ${predicate} do break;end;`;
        } else if (style === 3) {
            const target = this.random.formatNumber(this.random.int(100, 999));
            return `if ${predicate} then local ${varName}=${target};end;`;
        } else {
            return `do if ${predicate} then local ${varName}=${value};end;end;`;
        }
    }

    /**
     * Wrap code block dalam state machine yang lebih kompleks
     */
    wrapInComplexStateMachine(code, blockCount = null) {
        blockCount = blockCount || this.random.int(3, 6);
        
        const stateVar = this.random.generateName(2);
        const counterVar = this.random.generateName(1);
        
        // Generate unique state values
        const stateValues = [];
        for (let i = 0; i < blockCount + 2; i++) {
            stateValues.push(this.random.int(1000, 999999));
        }

        const initialState = this.random.formatNumber(stateValues[0]);
        const codeState = this.random.formatNumber(stateValues[1]);
        const finalState = this.random.formatNumber(stateValues[stateValues.length - 1]);

        // Build state machine
        let machine = `local ${stateVar}=${initialState};`;
        machine += `local ${counterVar}=${this.random.formatNumber(0)};`;
        machine += `while true do `;
        
        // Initial state
        machine += `if ${stateVar}==${initialState} then `;
        machine += `${stateVar}=${codeState};`;

        // Bogus states
        for (let i = 2; i < stateValues.length - 1; i++) {
            const state = this.random.formatNumber(stateValues[i]);
            const nextState = this.random.formatNumber(stateValues[i + 1]);
            const dummyVar = this.random.generateName();
            const dummyVal = this.random.formatNumber(this.random.int(1, 100));
            
            machine += `elseif ${stateVar}==${state} then `;
            machine += `local ${dummyVar}=${dummyVal};${stateVar}=${nextState};`;
        }

        // Code execution state
        machine += `elseif ${stateVar}==${codeState} then `;
        machine += `${code};${stateVar}=${finalState};`;

        // Final state
        machine += `elseif ${stateVar}==${finalState} then `;
        machine += `break;`;

        machine += `end;end;`;

        return machine;
    }

    /**
     * Obfuscate while loop
     */
    obfuscateWhileLoop(condition, body) {
        const stateVar = this.random.generateName(2);
        const checkState = this.random.formatNumber(this.random.int(1000, 9999));
        const bodyState = this.random.formatNumber(this.random.int(10000, 99999));
        const exitState = this.random.formatNumber(this.random.int(100000, 999999));

        return `local ${stateVar}=${checkState};` +
            `while true do ` +
            `if ${stateVar}==${checkState} then ` +
            `if ${condition} then ${stateVar}=${bodyState};else ${stateVar}=${exitState};end;` +
            `elseif ${stateVar}==${bodyState} then ` +
            `${body};${stateVar}=${checkState};` +
            `elseif ${stateVar}==${exitState} then ` +
            `break;` +
            `end;end;`;
    }

    /**
     * Obfuscate for loop
     */
    obfuscateForLoop(varName, startVal, endVal, body) {
        const stateVar = this.random.generateName(2);
        const counterVar = this.random.generateName(1);
        
        const initState = this.random.formatNumber(this.random.int(1000, 9999));
        const checkState = this.random.formatNumber(this.random.int(10000, 99999));
        const bodyState = this.random.formatNumber(this.random.int(100000, 999999));
        const incState = this.random.formatNumber(this.random.int(1000000, 9999999));
        const exitState = this.random.formatNumber(this.random.int(10000000, 99999999));

        return `local ${stateVar}=${initState};local ${counterVar};` +
            `while true do ` +
            `if ${stateVar}==${initState} then ` +
            `${counterVar}=${startVal};${stateVar}=${checkState};` +
            `elseif ${stateVar}==${checkState} then ` +
            `if ${counterVar}<=${endVal} then ${stateVar}=${bodyState};else ${stateVar}=${exitState};end;` +
            `elseif ${stateVar}==${bodyState} then ` +
            `local ${varName}=${counterVar};${body};${stateVar}=${incState};` +
            `elseif ${stateVar}==${incState} then ` +
            `${counterVar}=${counterVar}+${this.random.formatNumber(1)};${stateVar}=${checkState};` +
            `elseif ${stateVar}==${exitState} then ` +
            `break;` +
            `end;end;`;
    }

    /**
     * Get stats
     */
    getStats() {
        return this.stats;
    }

    /**
     * Reset
     */
    reset() {
        this.random.resetNames();
        this.stats = { flattened: 0, predicatesAdded: 0, bogusJumpsAdded: 0 };
    }
}

module.exports = ControlFlowObfuscator;
