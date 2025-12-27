/**
 * LuaShield - Parser Module Entry
 * Lua 5.1 Parser untuk obfuscation
 */

const Lexer = require('./lexer');
const Parser = require('./parser');
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
        this.parser = new Parser(this.lexer);
    }

    /**
     * Parse Lua source code ke AST
     */
    parse(source) {
        try {
            // Tokenize
            const tokens = this.lexer.tokenize(source);
            
            // Parse ke AST
            const ast = this.parser.parse(tokens);
            
            return {
                success: true,
                ast: ast,
                tokens: tokens
            };
        } catch (error) {
            return {
                success: false,
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
            return result;
        }

        const analysis = {
            functions: [],
            variables: [],
            strings: [],
            numbers: [],
            tables: [],
            calls: [],
            loops: [],
            conditions: []
        };

        this._walkAST(result.ast, analysis);

        return {
            success: true,
            ast: result.ast,
            analysis: analysis
        };
    }

    /**
     * Walk AST dan extract informasi
     */
    _walkAST(node, analysis, scope = { depth: 0, parent: null }) {
        if (!node) return;

        switch (node.type) {
            case Nodes.Types.FUNCTION_DECLARATION:
            case Nodes.Types.FUNCTION_EXPRESSION:
                analysis.functions.push({
                    name: node.identifier?.name || '<anonymous>',
                    params: node.parameters?.map(p => p.name) || [],
                    line: node.line,
                    scope: scope.depth
                });
                break;

            case Nodes.Types.LOCAL_STATEMENT:
                node.variables?.forEach(v => {
                    analysis.variables.push({
                        name: v.name,
                        type: 'local',
                        line: node.line,
                        scope: scope.depth
                    });
                });
                break;

            case Nodes.Types.ASSIGNMENT_STATEMENT:
                node.variables?.forEach(v => {
                    if (v.type === Nodes.Types.IDENTIFIER) {
                        analysis.variables.push({
                            name: v.name,
                            type: 'assignment',
                            line: node.line,
                            scope: scope.depth
                        });
                    }
                });
                break;

            case Nodes.Types.STRING_LITERAL:
                analysis.strings.push({
                    value: node.value,
                    raw: node.raw,
                    line: node.line
                });
                break;

            case Nodes.Types.NUMERIC_LITERAL:
                analysis.numbers.push({
                    value: node.value,
                    raw: node.raw,
                    line: node.line
                });
                break;

            case Nodes.Types.TABLE_CONSTRUCTOR:
                analysis.tables.push({
                    fields: node.fields?.length || 0,
                    line: node.line
                });
                break;

            case Nodes.Types.CALL_EXPRESSION:
            case Nodes.Types.CALL_STATEMENT:
                analysis.calls.push({
                    callee: this._getCalleeName(node.base || node.expression),
                    args: node.arguments?.length || 0,
                    line: node.line
                });
                break;

            case Nodes.Types.FOR_NUMERIC_STATEMENT:
            case Nodes.Types.FOR_GENERIC_STATEMENT:
            case Nodes.Types.WHILE_STATEMENT:
            case Nodes.Types.REPEAT_STATEMENT:
                analysis.loops.push({
                    type: node.type,
                    line: node.line
                });
                break;

            case Nodes.Types.IF_STATEMENT:
                analysis.conditions.push({
                    clauses: node.clauses?.length || 1,
                    line: node.line
                });
                break;
        }

        // Recursively walk children
        const children = this._getChildren(node);
        children.forEach(child => {
            this._walkAST(child, analysis, {
                depth: scope.depth + (this._isScope(node) ? 1 : 0),
                parent: node
            });
        });
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
            return `${base}.${id}`;
        }
        
        if (node.type === Nodes.Types.INDEX_EXPRESSION) {
            return `${this._getCalleeName(node.base)}[...]`;
        }
        
        return '<expression>';
    }

    /**
     * Get child nodes
     */
    _getChildren(node) {
        const children = [];
        
        if (!node || typeof node !== 'object') return children;

        // Common child properties
        const childProps = [
            'body', 'block', 'expression', 'expressions',
            'arguments', 'parameters', 'variables', 'init',
            'condition', 'clauses', 'fields', 'base',
            'index', 'identifier', 'left', 'right',
            'start', 'end', 'step', 'iterators', 'value', 'key'
        ];

        childProps.forEach(prop => {
            const child = node[prop];
            if (Array.isArray(child)) {
                children.push(...child);
            } else if (child && typeof child === 'object') {
                children.push(child);
            }
        });

        return children;
    }

    /**
     * Check if node creates new scope
     */
    _isScope(node) {
        const scopeTypes = [
            Nodes.Types.FUNCTION_DECLARATION,
            Nodes.Types.FUNCTION_EXPRESSION,
            Nodes.Types.FOR_NUMERIC_STATEMENT,
            Nodes.Types.FOR_GENERIC_STATEMENT,
            Nodes.Types.DO_STATEMENT
        ];
        return scopeTypes.includes(node.type);
    }
}

module.exports = LuaParser;
