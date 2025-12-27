/**
 * LuaShield - Code Serializer
 * Serialize AST/bytecode ke Lua code string
 */

const Random = require('../../utils/random');
const Nodes = require('../parser/nodes');

class Serializer {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        
        this.config = {
            indent: options.indent || '',
            newline: options.newline || '',
            minify: options.minify !== false,
            luraphStyle: options.luraphStyle !== false
        };

        this.indentLevel = 0;
    }

    /**
     * Serialize AST ke Lua code
     */
    serialize(ast) {
        if (!ast) return '';

        switch (ast.type) {
            case Nodes.Types.CHUNK:
                return this.serializeChunk(ast);
            case Nodes.Types.BLOCK:
                return this.serializeBlock(ast.body);
            default:
                return this.serializeNode(ast);
        }
    }

    /**
     * Serialize chunk
     */
    serializeChunk(chunk) {
        return this.serializeBlock(chunk.body);
    }

    /**
     * Serialize block of statements
     */
    serializeBlock(statements) {
        const parts = [];
        
        for (const stmt of statements) {
            const serialized = this.serializeNode(stmt);
            if (serialized) {
                parts.push(serialized);
            }
        }

        return parts.join(this.config.minify ? ';' : ';\n');
    }

    /**
     * Serialize single node
     */
    serializeNode(node) {
        if (!node) return '';

        switch (node.type) {
            // Statements
            case Nodes.Types.LOCAL_STATEMENT:
                return this.serializeLocalStatement(node);
            case Nodes.Types.ASSIGNMENT_STATEMENT:
                return this.serializeAssignment(node);
            case Nodes.Types.CALL_STATEMENT:
                return this.serializeNode(node.expression);
            case Nodes.Types.FUNCTION_DECLARATION:
                return this.serializeFunctionDeclaration(node);
            case Nodes.Types.IF_STATEMENT:
                return this.serializeIfStatement(node);
            case Nodes.Types.WHILE_STATEMENT:
                return this.serializeWhileStatement(node);
            case Nodes.Types.DO_STATEMENT:
                return this.serializeDoStatement(node);
            case Nodes.Types.REPEAT_STATEMENT:
                return this.serializeRepeatStatement(node);
            case Nodes.Types.FOR_NUMERIC_STATEMENT:
                return this.serializeForNumeric(node);
            case Nodes.Types.FOR_GENERIC_STATEMENT:
                return this.serializeForGeneric(node);
            case Nodes.Types.RETURN_STATEMENT:
                return this.serializeReturn(node);
            case Nodes.Types.BREAK_STATEMENT:
                return 'break';
            case Nodes.Types.GOTO_STATEMENT:
                return `goto ${node.label}`;
            case Nodes.Types.LABEL_STATEMENT:
                return `::${node.label}::`;

            // Expressions
            case Nodes.Types.IDENTIFIER:
                return node.name;
            case Nodes.Types.NUMERIC_LITERAL:
                return this.serializeNumber(node);
            case Nodes.Types.STRING_LITERAL:
                return this.serializeString(node);
            case Nodes.Types.BOOLEAN_LITERAL:
                return node.value ? 'true' : 'false';
            case Nodes.Types.NIL_LITERAL:
                return 'nil';
            case Nodes.Types.VARARG_LITERAL:
                return '...';
            case Nodes.Types.FUNCTION_EXPRESSION:
                return this.serializeFunctionExpression(node);
            case Nodes.Types.TABLE_CONSTRUCTOR:
                return this.serializeTableConstructor(node);
            case Nodes.Types.BINARY_EXPRESSION:
                return this.serializeBinaryExpression(node);
            case Nodes.Types.UNARY_EXPRESSION:
                return this.serializeUnaryExpression(node);
            case Nodes.Types.LOGICAL_EXPRESSION:
                return this.serializeLogicalExpression(node);
            case Nodes.Types.MEMBER_EXPRESSION:
                return this.serializeMemberExpression(node);
            case Nodes.Types.INDEX_EXPRESSION:
                return this.serializeIndexExpression(node);
            case Nodes.Types.CALL_EXPRESSION:
                return this.serializeCallExpression(node);
            case Nodes.Types.STRING_CALL_EXPRESSION:
                return `${this.serializeNode(node.base)}${this.serializeNode(node.argument)}`;
            case Nodes.Types.TABLE_CALL_EXPRESSION:
                return `${this.serializeNode(node.base)}${this.serializeNode(node.argument)}`;

            default:
                console.warn(`Unknown node type for serialization: ${node.type}`);
                return '';
        }
    }

    /**
     * Serialize local statement
     */
    serializeLocalStatement(node) {
        const vars = node.variables.map(v => this.serializeNode(v)).join(',');
        
        if (node.init && node.init.length > 0) {
            const init = node.init.map(i => this.serializeNode(i)).join(',');
            return `local ${vars}=${init}`;
        }
        
        return `local ${vars}`;
    }

    /**
     * Serialize assignment
     */
    serializeAssignment(node) {
        const vars = node.variables.map(v => this.serializeNode(v)).join(',');
        const init = node.init.map(i => this.serializeNode(i)).join(',');
        return `${vars}=${init}`;
    }

    /**
     * Serialize function declaration
     */
    serializeFunctionDeclaration(node) {
        const params = node.parameters.map(p => this.serializeNode(p)).join(',');
        const body = this.serializeBlock(node.body);
        const name = node.identifier ? this.serializeNode(node.identifier) : '';
        
        if (node.isLocal) {
            return `local function ${name}(${params})${body}end`;
        }
        
        return `function ${name}(${params})${body}end`;
    }

    /**
     * Serialize function expression
     */
    serializeFunctionExpression(node) {
        const params = node.parameters.map(p => this.serializeNode(p)).join(',');
        const body = this.serializeBlock(node.body);
        return `function(${params})${body}end`;
    }

    /**
     * Serialize if statement
     */
    serializeIfStatement(node) {
        const parts = [];

        for (let i = 0; i < node.clauses.length; i++) {
            const clause = node.clauses[i];
            
            if (clause.type === Nodes.Types.IF_CLAUSE) {
                const cond = this.serializeNode(clause.condition);
                const body = this.serializeBlock(clause.body);
                parts.push(`if ${cond} then ${body}`);
            } else if (clause.type === Nodes.Types.ELSEIF_CLAUSE) {
                const cond = this.serializeNode(clause.condition);
                const body = this.serializeBlock(clause.body);
                parts.push(`elseif ${cond} then ${body}`);
            } else if (clause.type === Nodes.Types.ELSE_CLAUSE) {
                const body = this.serializeBlock(clause.body);
                parts.push(`else ${body}`);
            }
        }

        return parts.join(' ') + ' end';
    }

    /**
     * Serialize while statement
     */
    serializeWhileStatement(node) {
        const cond = this.serializeNode(node.condition);
        const body = this.serializeBlock(node.body);
        return `while ${cond} do ${body}end`;
    }

    /**
     * Serialize do statement
     */
    serializeDoStatement(node) {
        const body = this.serializeBlock(node.body);
        return `do ${body}end`;
    }

    /**
     * Serialize repeat statement
     */
    serializeRepeatStatement(node) {
        const body = this.serializeBlock(node.body);
        const cond = this.serializeNode(node.condition);
        return `repeat ${body}until ${cond}`;
    }

    /**
     * Serialize numeric for
     */
    serializeForNumeric(node) {
        const varName = this.serializeNode(node.variable);
        const start = this.serializeNode(node.start);
        const end = this.serializeNode(node.end);
        const step = node.step ? `,${this.serializeNode(node.step)}` : '';
        const body = this.serializeBlock(node.body);
        
        return `for ${varName}=${start},${end}${step} do ${body}end`;
    }

    /**
     * Serialize generic for
     */
    serializeForGeneric(node) {
        const vars = node.variables.map(v => this.serializeNode(v)).join(',');
        const iterators = node.iterators.map(i => this.serializeNode(i)).join(',');
        const body = this.serializeBlock(node.body);
        
        return `for ${vars} in ${iterators} do ${body}end`;
    }

    /**
     * Serialize return
     */
    serializeReturn(node) {
        if (!node.arguments || node.arguments.length === 0) {
            return 'return';
        }
        
        const args = node.arguments.map(a => this.serializeNode(a)).join(',');
        return `return ${args}`;
    }

    /**
     * Serialize number (with Luraph-style formatting)
     */
    serializeNumber(node) {
        if (this.config.luraphStyle) {
            return this.random.formatNumber(node.value);
        }
        return node.raw || String(node.value);
    }

    /**
     * Serialize string
     */
    serializeString(node) {
        if (node.raw) {
            return node.raw;
        }
        
        // Escape string
        const escaped = node.value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        
        return `"${escaped}"`;
    }

    /**
     * Serialize table constructor
     */
    serializeTableConstructor(node) {
        if (!node.fields || node.fields.length === 0) {
            return '{}';
        }

        const fields = node.fields.map(f => this.serializeTableField(f));
        return `{${fields.join(',')}}`;
    }

    /**
     * Serialize table field
     */
    serializeTableField(field) {
        if (field.type === Nodes.Types.TABLE_VALUE) {
            return this.serializeNode(field.value);
        } else if (field.type === Nodes.Types.TABLE_KEY_STRING) {
            const key = field.key.name || this.serializeNode(field.key);
            const value = this.serializeNode(field.value);
            return `${key}=${value}`;
        } else if (field.type === Nodes.Types.TABLE_KEY) {
            const key = this.serializeNode(field.key);
            const value = this.serializeNode(field.value);
            return `[${key}]=${value}`;
        }
        return '';
    }

    /**
     * Serialize binary expression
     */
    serializeBinaryExpression(node) {
        const left = this.serializeNode(node.left);
        const right = this.serializeNode(node.right);
        
        // Add parentheses for clarity
        return `(${left}${node.operator}${right})`;
    }

    /**
     * Serialize unary expression
     */
    serializeUnaryExpression(node) {
        const arg = this.serializeNode(node.argument);
        
        if (node.operator === 'not') {
            return `not(${arg})`;
        }
        
        return `${node.operator}${arg}`;
    }

    /**
     * Serialize logical expression
     */
    serializeLogicalExpression(node) {
        const left = this.serializeNode(node.left);
        const right = this.serializeNode(node.right);
        return `(${left} ${node.operator} ${right})`;
    }

    /**
     * Serialize member expression
     */
    serializeMemberExpression(node) {
        const base = this.serializeNode(node.base);
        const id = node.identifier.name || this.serializeNode(node.identifier);
        return `${base}${node.indexer}${id}`;
    }

    /**
     * Serialize index expression
     */
    serializeIndexExpression(node) {
        const base = this.serializeNode(node.base);
        const index = this.serializeNode(node.index);
        return `${base}[${index}]`;
    }

    /**
     * Serialize call expression
     */
    serializeCallExpression(node) {
        const base = this.serializeNode(node.base);
        const args = (node.arguments || []).map(a => this.serializeNode(a)).join(',');
        return `${base}(${args})`;
    }

    /**
     * Serialize bytecode ke Lua table literal
     */
    serializeBytecode(bytecode, constants) {
        const byteStrings = [];
        
        for (const byte of bytecode) {
            byteStrings.push(this.random.formatNumber(byte));
        }

        const constStrings = constants.map((c, i) => {
            const key = this.random.formatNumber(i);
            const value = this.serializeConstant(c);
            return `[${key}]=${value}`;
        });

        return {
            bytecode: `{${byteStrings.join(',')}}`,
            constants: `{${constStrings.join(',')}}`
        };
    }

    /**
     * Serialize constant value
     */
    serializeConstant(value) {
        if (value === null || value === undefined) {
            return 'nil';
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'number') {
            return this.random.formatNumber(value);
        }
        if (typeof value === 'string') {
            return this.serializeString({ value, raw: null });
        }
        if (typeof value === 'object') {
            // Nested function or table
            return '{}';
        }
        return 'nil';
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
        this.indentLevel = 0;
    }
}

module.exports = Serializer;
