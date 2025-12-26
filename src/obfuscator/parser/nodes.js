/**
 * LuaShield - AST Node Types
 * Define semua node types untuk Lua AST
 */

const NodeTypes = {
    // Program
    CHUNK: 'Chunk',
    BLOCK: 'Block',

    // Statements
    LOCAL_STATEMENT: 'LocalStatement',
    ASSIGNMENT_STATEMENT: 'AssignmentStatement',
    CALL_STATEMENT: 'CallStatement',
    FUNCTION_DECLARATION: 'FunctionDeclaration',
    IF_STATEMENT: 'IfStatement',
    IF_CLAUSE: 'IfClause',
    ELSEIF_CLAUSE: 'ElseifClause',
    ELSE_CLAUSE: 'ElseClause',
    WHILE_STATEMENT: 'WhileStatement',
    DO_STATEMENT: 'DoStatement',
    REPEAT_STATEMENT: 'RepeatStatement',
    FOR_NUMERIC_STATEMENT: 'ForNumericStatement',
    FOR_GENERIC_STATEMENT: 'ForGenericStatement',
    RETURN_STATEMENT: 'ReturnStatement',
    BREAK_STATEMENT: 'BreakStatement',
    GOTO_STATEMENT: 'GotoStatement',
    LABEL_STATEMENT: 'LabelStatement',

    // Expressions
    IDENTIFIER: 'Identifier',
    LITERAL: 'Literal',
    STRING_LITERAL: 'StringLiteral',
    NUMERIC_LITERAL: 'NumericLiteral',
    BOOLEAN_LITERAL: 'BooleanLiteral',
    NIL_LITERAL: 'NilLiteral',
    VARARG_LITERAL: 'VarargLiteral',
    TABLE_CONSTRUCTOR: 'TableConstructorExpression',
    TABLE_KEY: 'TableKey',
    TABLE_KEY_STRING: 'TableKeyString',
    TABLE_VALUE: 'TableValue',
    BINARY_EXPRESSION: 'BinaryExpression',
    UNARY_EXPRESSION: 'UnaryExpression',
    LOGICAL_EXPRESSION: 'LogicalExpression',
    MEMBER_EXPRESSION: 'MemberExpression',
    INDEX_EXPRESSION: 'IndexExpression',
    CALL_EXPRESSION: 'CallExpression',
    STRING_CALL_EXPRESSION: 'StringCallExpression',
    TABLE_CALL_EXPRESSION: 'TableCallExpression',
    FUNCTION_EXPRESSION: 'FunctionDeclaration',

    // Comments
    COMMENT: 'Comment'
};

/**
 * Node Factory - Create AST nodes
 */
class NodeFactory {
    static createNode(type, properties = {}) {
        return {
            type,
            ...properties
        };
    }

    // ═══════════════════════════════════════════════════════
    // LITERALS
    // ═══════════════════════════════════════════════════════
    static identifier(name) {
        return {
            type: NodeTypes.IDENTIFIER,
            name
        };
    }

    static stringLiteral(value, raw = null) {
        return {
            type: NodeTypes.STRING_LITERAL,
            value,
            raw: raw || `"${value}"`
        };
    }

    static numericLiteral(value, raw = null) {
        return {
            type: NodeTypes.NUMERIC_LITERAL,
            value,
            raw: raw || String(value)
        };
    }

    static booleanLiteral(value) {
        return {
            type: NodeTypes.BOOLEAN_LITERAL,
            value,
            raw: value ? 'true' : 'false'
        };
    }

    static nilLiteral() {
        return {
            type: NodeTypes.NIL_LITERAL,
            value: null,
            raw: 'nil'
        };
    }

    static varargLiteral() {
        return {
            type: NodeTypes.VARARG_LITERAL,
            value: '...',
            raw: '...'
        };
    }

    // ═══════════════════════════════════════════════════════
    // EXPRESSIONS
    // ═══════════════════════════════════════════════════════
    static binaryExpression(operator, left, right) {
        return {
            type: NodeTypes.BINARY_EXPRESSION,
            operator,
            left,
            right
        };
    }

    static unaryExpression(operator, argument) {
        return {
            type: NodeTypes.UNARY_EXPRESSION,
            operator,
            argument
        };
    }

    static logicalExpression(operator, left, right) {
        return {
            type: NodeTypes.LOGICAL_EXPRESSION,
            operator,
            left,
            right
        };
    }

    static memberExpression(base, identifier, indexer = '.') {
        return {
            type: NodeTypes.MEMBER_EXPRESSION,
            base,
            identifier,
            indexer
        };
    }

    static indexExpression(base, index) {
        return {
            type: NodeTypes.INDEX_EXPRESSION,
            base,
            index
        };
    }

    static callExpression(base, args) {
        return {
            type: NodeTypes.CALL_EXPRESSION,
            base,
            arguments: args
        };
    }

    static tableConstructor(fields) {
        return {
            type: NodeTypes.TABLE_CONSTRUCTOR,
            fields
        };
    }

    static tableKey(key, value) {
        return {
            type: NodeTypes.TABLE_KEY,
            key,
            value
        };
    }

    static tableKeyString(key, value) {
        return {
            type: NodeTypes.TABLE_KEY_STRING,
            key,
            value
        };
    }

    static tableValue(value) {
        return {
            type: NodeTypes.TABLE_VALUE,
            value
        };
    }

    // ═══════════════════════════════════════════════════════
    // STATEMENTS
    // ═══════════════════════════════════════════════════════
    static localStatement(variables, init = []) {
        return {
            type: NodeTypes.LOCAL_STATEMENT,
            variables,
            init
        };
    }

    static assignmentStatement(variables, init) {
        return {
            type: NodeTypes.ASSIGNMENT_STATEMENT,
            variables,
            init
        };
    }

    static callStatement(expression) {
        return {
            type: NodeTypes.CALL_STATEMENT,
            expression
        };
    }

    static functionDeclaration(identifier, parameters, body, isLocal = false) {
        return {
            type: NodeTypes.FUNCTION_DECLARATION,
            identifier,
            parameters,
            body,
            isLocal
        };
    }

    static ifStatement(clauses) {
        return {
            type: NodeTypes.IF_STATEMENT,
            clauses
        };
    }

    static ifClause(condition, body) {
        return {
            type: NodeTypes.IF_CLAUSE,
            condition,
            body
        };
    }

    static elseifClause(condition, body) {
        return {
            type: NodeTypes.ELSEIF_CLAUSE,
            condition,
            body
        };
    }

    static elseClause(body) {
        return {
            type: NodeTypes.ELSE_CLAUSE,
            body
        };
    }

    static whileStatement(condition, body) {
        return {
            type: NodeTypes.WHILE_STATEMENT,
            condition,
            body
        };
    }

    static doStatement(body) {
        return {
            type: NodeTypes.DO_STATEMENT,
            body
        };
    }

    static repeatStatement(condition, body) {
        return {
            type: NodeTypes.REPEAT_STATEMENT,
            condition,
            body
        };
    }

    static forNumericStatement(variable, start, end, step, body) {
        return {
            type: NodeTypes.FOR_NUMERIC_STATEMENT,
            variable,
            start,
            end,
            step,
            body
        };
    }

    static forGenericStatement(variables, iterators, body) {
        return {
            type: NodeTypes.FOR_GENERIC_STATEMENT,
            variables,
            iterators,
            body
        };
    }

    static returnStatement(args) {
        return {
            type: NodeTypes.RETURN_STATEMENT,
            arguments: args
        };
    }

    static breakStatement() {
        return {
            type: NodeTypes.BREAK_STATEMENT
        };
    }

    // ═══════════════════════════════════════════════════════
    // PROGRAM
    // ═══════════════════════════════════════════════════════
    static chunk(body, comments = []) {
        return {
            type: NodeTypes.CHUNK,
            body,
            comments
        };
    }

    static block(statements) {
        return {
            type: NodeTypes.BLOCK,
            statements
        };
    }
}

/**
 * AST Walker - Traverse AST nodes
 */
class ASTWalker {
    constructor() {
        this.visitors = {};
    }

    addVisitor(nodeType, visitor) {
        if (!this.visitors[nodeType]) {
            this.visitors[nodeType] = [];
        }
        this.visitors[nodeType].push(visitor);
    }

    walk(node, parent = null) {
        if (!node) return;

        // Call visitors untuk node type ini
        const visitors = this.visitors[node.type] || [];
        for (const visitor of visitors) {
            visitor(node, parent);
        }

        // Walk children
        this._walkChildren(node);
    }

    _walkChildren(node) {
        switch (node.type) {
            case NodeTypes.CHUNK:
                node.body.forEach(child => this.walk(child, node));
                break;

            case NodeTypes.LOCAL_STATEMENT:
            case NodeTypes.ASSIGNMENT_STATEMENT:
                node.variables.forEach(v => this.walk(v, node));
                node.init.forEach(i => this.walk(i, node));
                break;

            case NodeTypes.FUNCTION_DECLARATION:
                if (node.identifier) this.walk(node.identifier, node);
                node.parameters.forEach(p => this.walk(p, node));
                node.body.forEach(s => this.walk(s, node));
                break;

            case NodeTypes.IF_STATEMENT:
                node.clauses.forEach(c => this.walk(c, node));
                break;

            case NodeTypes.IF_CLAUSE:
            case NodeTypes.ELSEIF_CLAUSE:
                this.walk(node.condition, node);
                node.body.forEach(s => this.walk(s, node));
                break;

            case NodeTypes.ELSE_CLAUSE:
                node.body.forEach(s => this.walk(s, node));
                break;

            case NodeTypes.WHILE_STATEMENT:
            case NodeTypes.REPEAT_STATEMENT:
                this.walk(node.condition, node);
                node.body.forEach(s => this.walk(s, node));
                break;

            case NodeTypes.DO_STATEMENT:
                node.body.forEach(s => this.walk(s, node));
                break;

            case NodeTypes.FOR_NUMERIC_STATEMENT:
                this.walk(node.variable, node);
                this.walk(node.start, node);
                this.walk(node.end, node);
                if (node.step) this.walk(node.step, node);
                node.body.forEach(s => this.walk(s, node));
                break;

            case NodeTypes.FOR_GENERIC_STATEMENT:
                node.variables.forEach(v => this.walk(v, node));
                node.iterators.forEach(i => this.walk(i, node));
                node.body.forEach(s => this.walk(s, node));
                break;

            case NodeTypes.RETURN_STATEMENT:
                node.arguments.forEach(a => this.walk(a, node));
                break;

            case NodeTypes.CALL_STATEMENT:
                this.walk(node.expression, node);
                break;

            case NodeTypes.CALL_EXPRESSION:
                this.walk(node.base, node);
                node.arguments.forEach(a => this.walk(a, node));
                break;

            case NodeTypes.BINARY_EXPRESSION:
            case NodeTypes.LOGICAL_EXPRESSION:
                this.walk(node.left, node);
                this.walk(node.right, node);
                break;

            case NodeTypes.UNARY_EXPRESSION:
                this.walk(node.argument, node);
                break;

            case NodeTypes.MEMBER_EXPRESSION:
                this.walk(node.base, node);
                this.walk(node.identifier, node);
                break;

            case NodeTypes.INDEX_EXPRESSION:
                this.walk(node.base, node);
                this.walk(node.index, node);
                break;

            case NodeTypes.TABLE_CONSTRUCTOR:
                node.fields.forEach(f => this.walk(f, node));
                break;

            case NodeTypes.TABLE_KEY:
            case NodeTypes.TABLE_KEY_STRING:
                this.walk(node.key, node);
                this.walk(node.value, node);
                break;

            case NodeTypes.TABLE_VALUE:
                this.walk(node.value, node);
                break;
        }
    }
}

module.exports = {
    NodeTypes,
    NodeFactory,
    ASTWalker
};
