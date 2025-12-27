/**
 * LuaShield - Parser Module Entry
 * Unified Lua Parser untuk obfuscation
 */

const Lexer = require('./lexer');
const ParserCore = require('./parser');
const Nodes = require('./nodes');

class LuaParser {
    constructor(options = {}) {
        this.options = {
            comments: options.comments || false,
            locations: options.locations || true,
            ranges: options.ranges || false,
            ...options
        };
        
        this.lexer = new Lexer();
        this.parserCore = new ParserCore(this.lexer);
        this.lastError = null;
    }

    /**
     * Parse Lua source code ke AST
     */
    parse(source) {
        try {
            this.lastError = null;
            
            // Tokenize
            const tokens = this.lexer.tokenize(source);
            
            // Parse ke AST
            const ast = this.parserCore.parse(tokens);
            
            return {
                success: true,
                ast: ast,
                tokens: tokens,
                error: null
            };
        } catch (error) {
            this.lastError = error;
            return {
                success: false,
                ast: null,
                tokens: [],
                error: error.message,
                line: error.line || 0,
                column: error.column || 0
            };
        }
    }

    /**
     * Parse dan extract informasi penting
     */
    analyze(source) {
        const result = this.parse(source);
        
        if (!result.success) {
            return {
                success: false,
                error: result.error,
                ast: null,
                analysis: null
            };
        }

        const analysis = {
            functions: [],
            variables: [],
            strings: [],
            numbers: [],
            tables: [],
            calls: [],
            loops: [],
            conditions: [],
            globals: new Set(),
            locals: new Set()
        };

        try {
            this._walkAST(result.ast, analysis);
        } catch (e) {
            // Continue even if walk fails
        }

        return {
            success: true,
            ast: result.ast,
            tokens: result.tokens,
            analysis: {
                ...analysis,
                globals: Array.from(analysis.globals),
                locals: Array.from(analysis.locals)
            }
        };
    }

    /**
     * Quick validation tanpa full parse
     */
    validate(source) {
        const result = this.parse(source);
        return {
            valid: result.success,
            error: result.error
        };
    }

    /**
     * Extract strings dari source (tanpa full parse)
     */
    extractStrings(source) {
        const strings = [];
        const regex = /(["'])(?:(?!\1|\\).|\\.)*\1/g;
        let match;
        
        while ((match = regex.exec(source)) !== null) {
            strings.push({
                value: match[0].slice(1, -1),
                raw: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        return strings;
    }

    /**
     * Extract identifiers dari source (tanpa full parse)
     */
    extractIdentifiers(source) {
        const identifiers = new Set();
        
        // Remove strings dan comments
        const clean = source
            .replace(/--\[\[[\s\S]*?\]\]/g, '')
            .replace(/--[^\n]*/g, '')
            .replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, '""');
        
        const regex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        let match;
        
        while ((match = regex.exec(clean)) !== null) {
            if (!this._isKeyword(match[1])) {
                identifiers.add(match[1]);
            }
        }
        
        return Array.from(identifiers);
    }

    /**
     * Check if string is Lua keyword
     */
    _isKeyword(str) {
        const keywords = new Set([
            'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
            'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
            'repeat', 'return', 'then', 'true', 'until', 'while'
        ]);
        return keywords.has(str);
    }

    /**
     * Walk AST dan extract informasi
     */
    _walkAST(node, analysis, scope = { depth: 0, parent: null }) {
        if (!node) return;

        const nodeType = node.type;

        switch (nodeType) {
            case Nodes.Types.FUNCTION_DECLARATION:
            case Nodes.Types.FUNCTION_EXPRESSION:
                analysis.functions.push({
                    name: node.identifier?.name || '<anonymous>',
                    params: node.parameters?.map(p => p.name) || [],
                    line: node.line || 0,
                    scope: scope.depth,
                    isLocal: node.isLocal || false
                });
                break;

            case Nodes.Types.LOCAL_STATEMENT:
                if (node.variables) {
                    node.variables.forEach(v => {
                        if (v.name) {
                            analysis.locals.add(v.name);
                            analysis.variables.push({
                                name: v.name,
                                type: 'local',
                                line: node.line || 0,
                                scope: scope.depth
                            });
                        }
                    });
                }
                break;

            case Nodes.Types.ASSIGNMENT_STATEMENT:
                if (node.variables) {
                    node.variables.forEach(v => {
                        if (v.type === Nodes.Types.IDENTIFIER && v.name) {
                            if (!analysis.locals.has(v.name)) {
                                analysis.globals.add(v.name);
                            }
                            analysis.variables.push({
                                name: v.name,
                                type: 'assignment',
                                line: node.line || 0,
                                scope: scope.depth
                            });
                        }
                    });
                }
                break;

            case Nodes.Types.STRING_LITERAL:
                analysis.strings.push({
                    value: node.value,
                    raw: node.raw,
                    line: node.line || 0
                });
                break;

            case Nodes.Types.NUMERIC_LITERAL:
                analysis.numbers.push({
                    value: node.value,
                    raw: node.raw,
                    line: node.line || 0
                });
                break;

            case Nodes.Types.TABLE_CONSTRUCTOR:
                analysis.tables.push({
                    fields: node.fields?.length || 0,
                    line: node.line || 0
                });
                break;

            case Nodes.Types.CALL_EXPRESSION:
            case Nodes.Types.CALL_STATEMENT:
                analysis.calls.push({
                    callee: this._getCalleeName(node.base || node.expression?.base),
                    args: node.arguments?.length || 0,
                    line: node.line || 0
                });
                break;

            case Nodes.Types.FOR_NUMERIC_STATEMENT:
            case Nodes.Types.FOR_GENERIC_STATEMENT:
            case Nodes.Types.WHILE_STATEMENT:
            case Nodes.Types.REPEAT_STATEMENT:
                analysis.loops.push({
                    type: nodeType,
                    line: node.line || 0
                });
                break;

            case Nodes.Types.IF_STATEMENT:
                analysis.conditions.push({
                    clauses: node.clauses?.length || 1,
                    line: node.line || 0
                });
                break;
        }

        // Recursively walk children
        this._walkChildren(node, analysis, scope);
    }

    /**
     * Walk child nodes
     */
    _walkChildren(node, analysis, scope) {
        if (!node || typeof node !== 'object') return;

        const childProps = [
            'body', 'block', 'expression', 'expressions',
            'arguments', 'parameters', 'variables', 'init',
            'condition', 'clauses', 'fields', 'base',
            'index', 'identifier', 'left', 'right',
            'start', 'end', 'step', 'iterators', 'value', 'key'
        ];

        const newScope = {
            depth: scope.depth + (this._isScope(node) ? 1 : 0),
            parent: node
        };

        for (const prop of childProps) {
            const child = node[prop];
            if (Array.isArray(child)) {
                child.forEach(c => this._walkAST(c, analysis, newScope));
            } else if (child && typeof child === 'object' && child.type) {
                this._walkAST(child, analysis, newScope);
            }
        }
    }

    /**
     * Get callee name dari expression
     */
    _getCalleeName(node) {
        if (!node) return '<unknown>';
        
        if (node.type === Nodes.Types.IDENTIFIER) {
            return node.name;
        }
        
        if (node.type === Nodes.Types.MEMBER_EXPRESSION) {
            const base = this._getCalleeName(node.base);
            const id = node.identifier?.name || '?';
            return `${base}${node.indexer || '.'}${id}`;
        }
        
        if (node.type === Nodes.Types.INDEX_EXPRESSION) {
            return `${this._getCalleeName(node.base)}[...]`;
        }
        
        return '<expression>';
    }

    /**
     * Check if node creates new scope
     */
    _isScope(node) {
        if (!node || !node.type) return false;
        
        const scopeTypes = [
            Nodes.Types.FUNCTION_DECLARATION,
            Nodes.Types.FUNCTION_EXPRESSION,
            Nodes.Types.FOR_NUMERIC_STATEMENT,
            Nodes.Types.FOR_GENERIC_STATEMENT,
            Nodes.Types.DO_STATEMENT
        ];
        return scopeTypes.includes(node.type);
    }

    /**
     * Get last error
     */
    getLastError() {
        return this.lastError;
    }
}

// Export both class dan instance
module.exports = LuaParser;
module.exports.LuaParser = LuaParser;
module.exports.Lexer = Lexer;
module.exports.Parser = ParserCore;
module.exports.Nodes = Nodes;
