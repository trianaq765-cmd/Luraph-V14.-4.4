/**
 * LuaShield - AST Node Types & Builders
 * Definisi semua node types untuk Lua AST
 */

// ═══════════════════════════════════════════════════════════
// NODE TYPES
// ═══════════════════════════════════════════════════════════
const Types = {
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
    MEMBER_EXPRESSION: 'MemberExpression',
    INDEX_EXPRESSION: 'IndexExpression',
    CALL_EXPRESSION: 'CallExpression',
    STRING_CALL_EXPRESSION: 'StringCallExpression',
    TABLE_CALL_EXPRESSION: 'TableCallExpression',
    FUNCTION_EXPRESSION: 'FunctionExpression',
    BINARY_EXPRESSION: 'BinaryExpression',
    UNARY_EXPRESSION: 'UnaryExpression',
    LOGICAL_EXPRESSION: 'LogicalExpression',
    
    // Literals
    STRING_LITERAL: 'StringLiteral',
    NUMERIC_LITERAL: 'NumericLiteral',
    BOOLEAN_LITERAL: 'BooleanLiteral',
    NIL_LITERAL: 'NilLiteral',
    VARARG_LITERAL: 'VarargLiteral',
    
    // Table
    TABLE_CONSTRUCTOR: 'TableConstructorExpression',
    TABLE_KEY: 'TableKey',
    TABLE_KEY_STRING: 'TableKeyString',
    TABLE_VALUE: 'TableValue',
    
    // Comments
    COMMENT: 'Comment'
};

// ═══════════════════════════════════════════════════════════
// NODE BUILDERS
// ═══════════════════════════════════════════════════════════
const Builders = {
    // Program
    chunk(body, comments = []) {
        return {
            type: Types.CHUNK,
            body: body || [],
            comments: comments
        };
    },

    block(body) {
        return {
            type: Types.BLOCK,
            body: body || []
        };
    },

    // Statements
    localStatement(variables, init = []) {
        return {
            type: Types.LOCAL_STATEMENT,
            variables: variables,
            init: init
        };
    },

    assignmentStatement(variables, init) {
        return {
            type: Types.ASSIGNMENT_STATEMENT,
            variables: variables,
            init: init
        };
    },

    callStatement(expression) {
        return {
            type: Types.CALL_STATEMENT,
            expression: expression
        };
    },

    functionDeclaration(identifier, parameters, isLocal, body) {
        return {
            type: Types.FUNCTION_DECLARATION,
            identifier: identifier,
            parameters: parameters || [],
            isLocal: isLocal || false,
            body: body || []
        };
    },

    ifStatement(clauses) {
        return {
            type: Types.IF_STATEMENT,
            clauses: clauses || []
        };
    },

    ifClause(condition, body) {
        return {
            type: Types.IF_CLAUSE,
            condition: condition,
            body: body || []
        };
    },

    elseifClause(condition, body) {
        return {
            type: Types.ELSEIF_CLAUSE,
            condition: condition,
            body: body || []
        };
    },

    elseClause(body) {
        return {
            type: Types.ELSE_CLAUSE,
            body: body || []
        };
    },

    whileStatement(condition, body) {
        return {
            type: Types.WHILE_STATEMENT,
            condition: condition,
            body: body || []
        };
    },

    doStatement(body) {
        return {
            type: Types.DO_STATEMENT,
            body: body || []
        };
    },

    repeatStatement(condition, body) {
        return {
            type: Types.REPEAT_STATEMENT,
            condition: condition,
            body: body || []
        };
    },

    forNumericStatement(variable, start, end, step, body) {
        return {
            type: Types.FOR_NUMERIC_STATEMENT,
            variable: variable,
            start: start,
            end: end,
            step: step,
            body: body || []
        };
    },

    forGenericStatement(variables, iterators, body) {
        return {
            type: Types.FOR_GENERIC_STATEMENT,
            variables: variables,
            iterators: iterators,
            body: body || []
        };
    },

    returnStatement(arguments_) {
        return {
            type: Types.RETURN_STATEMENT,
            arguments: arguments_ || []
        };
    },

    breakStatement() {
        return { type: Types.BREAK_STATEMENT };
    },

    gotoStatement(label) {
        return {
            type: Types.GOTO_STATEMENT,
            label: label
        };
    },

    labelStatement(label) {
        return {
            type: Types.LABEL_STATEMENT,
            label: label
        };
    },

    // Expressions
    identifier(name) {
        return {
            type: Types.IDENTIFIER,
            name: name
        };
    },

    memberExpression(base, indexer, identifier) {
        return {
            type: Types.MEMBER_EXPRESSION,
            base: base,
            indexer: indexer, // '.' or ':'
            identifier: identifier
        };
    },

    indexExpression(base, index) {
        return {
            type: Types.INDEX_EXPRESSION,
            base: base,
            index: index
        };
    },

    callExpression(base, arguments_) {
        return {
            type: Types.CALL_EXPRESSION,
            base: base,
            arguments: arguments_ || []
        };
    },

    stringCallExpression(base, argument) {
        return {
            type: Types.STRING_CALL_EXPRESSION,
            base: base,
            argument: argument
        };
    },

    tableCallExpression(base, argument) {
        return {
            type: Types.TABLE_CALL_EXPRESSION,
            base: base,
            argument: argument
        };
    },

    functionExpression(parameters, body) {
        return {
            type: Types.FUNCTION_EXPRESSION,
            parameters: parameters || [],
            body: body || []
        };
    },

    binaryExpression(operator, left, right) {
        return {
            type: Types.BINARY_EXPRESSION,
            operator: operator,
            left: left,
            right: right
        };
    },

    unaryExpression(operator, argument) {
        return {
            type: Types.UNARY_EXPRESSION,
            operator: operator,
            argument: argument
        };
    },

    logicalExpression(operator, left, right) {
        return {
            type: Types.LOGICAL_EXPRESSION,
            operator: operator,
            left: left,
            right: right
        };
    },

    // Literals
    stringLiteral(value, raw) {
        return {
            type: Types.STRING_LITERAL,
            value: value,
            raw: raw || `"${value}"`
        };
    },

    numericLiteral(value, raw) {
        return {
            type: Types.NUMERIC_LITERAL,
            value: value,
            raw: raw || String(value)
        };
    },

    booleanLiteral(value) {
        return {
            type: Types.BOOLEAN_LITERAL,
            value: value,
            raw: String(value)
        };
    },

    nilLiteral() {
        return {
            type: Types.NIL_LITERAL,
            value: null,
            raw: 'nil'
        };
    },

    varargLiteral() {
        return {
            type: Types.VARARG_LITERAL,
            value: '...',
            raw: '...'
        };
    },

    // Table
    tableConstructor(fields) {
        return {
            type: Types.TABLE_CONSTRUCTOR,
            fields: fields || []
        };
    },

    tableKey(key, value) {
        return {
            type: Types.TABLE_KEY,
            key: key,
            value: value
        };
    },

    tableKeyString(key, value) {
        return {
            type: Types.TABLE_KEY_STRING,
            key: key,
            value: value
        };
    },

    tableValue(value) {
        return {
            type: Types.TABLE_VALUE,
            value: value
        };
    },

    // Comment
    comment(value, raw) {
        return {
            type: Types.COMMENT,
            value: value,
            raw: raw
        };
    }
};

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
const Utils = {
    /**
     * Check if node is expression
     */
    isExpression(node) {
        const exprTypes = [
            Types.IDENTIFIER, Types.MEMBER_EXPRESSION, Types.INDEX_EXPRESSION,
            Types.CALL_EXPRESSION, Types.STRING_CALL_EXPRESSION, Types.TABLE_CALL_EXPRESSION,
            Types.FUNCTION_EXPRESSION, Types.BINARY_EXPRESSION, Types.UNARY_EXPRESSION,
            Types.LOGICAL_EXPRESSION, Types.STRING_LITERAL, Types.NUMERIC_LITERAL,
            Types.BOOLEAN_LITERAL, Types.NIL_LITERAL, Types.VARARG_LITERAL,
            Types.TABLE_CONSTRUCTOR
        ];
        return node && exprTypes.includes(node.type);
    },

    /**
     * Check if node is statement
     */
    isStatement(node) {
        const stmtTypes = [
            Types.LOCAL_STATEMENT, Types.ASSIGNMENT_STATEMENT, Types.CALL_STATEMENT,
            Types.FUNCTION_DECLARATION, Types.IF_STATEMENT, Types.WHILE_STATEMENT,
            Types.DO_STATEMENT, Types.REPEAT_STATEMENT, Types.FOR_NUMERIC_STATEMENT,
            Types.FOR_GENERIC_STATEMENT, Types.RETURN_STATEMENT, Types.BREAK_STATEMENT,
            Types.GOTO_STATEMENT, Types.LABEL_STATEMENT
        ];
        return node && stmtTypes.includes(node.type);
    },

    /**
     * Check if node is literal
     */
    isLiteral(node) {
        const literalTypes = [
            Types.STRING_LITERAL, Types.NUMERIC_LITERAL,
            Types.BOOLEAN_LITERAL, Types.NIL_LITERAL, Types.VARARG_LITERAL
        ];
        return node && literalTypes.includes(node.type);
    },

    /**
     * Clone node (deep)
     */
    clone(node) {
        if (!node) return null;
        return JSON.parse(JSON.stringify(node));
    },

    /**
     * Add location info ke node
     */
    withLocation(node, line, column, range) {
        if (node) {
            node.line = line;
            node.column = column;
            if (range) {
                node.range = range;
            }
        }
        return node;
    }
};

module.exports = {
    Types,
    Builders,
    Utils,
    // Shorthand exports
    ...Types,
    ...Builders
};
