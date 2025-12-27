/**
 * LuaShield - Lua Parser
 * Full Lua 5.1 Parser menghasilkan AST
 */

const { TokenType } = require('./lexer');
const Nodes = require('./nodes');

class Parser {
    constructor(lexer) {
        this.lexer = lexer;
        this.tokens = [];
        this.pos = 0;
        this.currentToken = null;
    }

    /**
     * Parse tokens ke AST
     */
    parse(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.currentToken = this.tokens[0];

        const body = this.parseBlock();

        return Nodes.Builders.chunk(body);
    }

    // ═══════════════════════════════════════════════════════════
    // BLOCK & STATEMENTS
    // ═══════════════════════════════════════════════════════════
    
    parseBlock() {
        const statements = [];

        while (!this.isBlockEnd()) {
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
            
            // Optional semicolon
            this.match(TokenType.OPERATOR, ';');
        }

        return statements;
    }

    isBlockEnd() {
        if (this.isEOF()) return true;
        
        const endKeywords = ['end', 'else', 'elseif', 'until'];
        return this.check(TokenType.KEYWORD) && 
               endKeywords.includes(this.currentToken.value);
    }

    parseStatement() {
        // Skip comments
        while (this.check(TokenType.COMMENT)) {
            this.advance();
        }

        if (this.isEOF() || this.isBlockEnd()) {
            return null;
        }

        // Local statement
        if (this.matchKeyword('local')) {
            return this.parseLocalStatement();
        }

        // Function declaration
        if (this.matchKeyword('function')) {
            return this.parseFunctionDeclaration(false);
        }

        // If statement
        if (this.matchKeyword('if')) {
            return this.parseIfStatement();
        }

        // While statement
        if (this.matchKeyword('while')) {
            return this.parseWhileStatement();
        }

        // Do statement
        if (this.matchKeyword('do')) {
            return this.parseDoStatement();
        }

        // Repeat statement
        if (this.matchKeyword('repeat')) {
            return this.parseRepeatStatement();
        }

        // For statement
        if (this.matchKeyword('for')) {
            return this.parseForStatement();
        }

        // Return statement
        if (this.matchKeyword('return')) {
            return this.parseReturnStatement();
        }

        // Break statement
        if (this.matchKeyword('break')) {
            return Nodes.Builders.breakStatement();
        }

        // Goto statement
        if (this.matchKeyword('goto')) {
            const label = this.expect(TokenType.IDENTIFIER).value;
            return Nodes.Builders.gotoStatement(label);
        }

        // Label statement ::label::
        if (this.match(TokenType.OPERATOR, '::')) {
            const label = this.expect(TokenType.IDENTIFIER).value;
            this.expect(TokenType.OPERATOR, '::');
            return Nodes.Builders.labelStatement(label);
        }

        // Assignment or call statement
        return this.parseExpressionStatement();
    }

    // ═══════════════════════════════════════════════════════════
    // LOCAL STATEMENT
    // ═══════════════════════════════════════════════════════════

    parseLocalStatement() {
        // local function
        if (this.matchKeyword('function')) {
            return this.parseFunctionDeclaration(true);
        }

        // local variables
        const variables = [];
        
        do {
            const name = this.expect(TokenType.IDENTIFIER);
            variables.push(Nodes.Builders.identifier(name.value));
        } while (this.match(TokenType.OPERATOR, ','));

        // Optional initialization
        let init = [];
        if (this.match(TokenType.OPERATOR, '=')) {
            init = this.parseExpressionList();
        }

        return Nodes.Builders.localStatement(variables, init);
    }

    // ═══════════════════════════════════════════════════════════
    // FUNCTION DECLARATION
    // ═══════════════════════════════════════════════════════════

    parseFunctionDeclaration(isLocal) {
        let identifier = null;

        if (!isLocal || this.check(TokenType.IDENTIFIER)) {
            identifier = this.parseFunctionName();
        }

        this.expect(TokenType.OPERATOR, '(');
        const parameters = this.parseParameterList();
        this.expect(TokenType.OPERATOR, ')');

        const body = this.parseBlock();
        this.expectKeyword('end');

        return Nodes.Builders.functionDeclaration(identifier, parameters, isLocal, body);
    }

    parseFunctionName() {
        let base = Nodes.Builders.identifier(this.expect(TokenType.IDENTIFIER).value);

        // a.b.c
        while (this.match(TokenType.OPERATOR, '.')) {
            const name = this.expect(TokenType.IDENTIFIER).value;
            base = Nodes.Builders.memberExpression(base, '.', Nodes.Builders.identifier(name));
        }

        // a:b (method)
        if (this.match(TokenType.OPERATOR, ':')) {
            const name = this.expect(TokenType.IDENTIFIER).value;
            base = Nodes.Builders.memberExpression(base, ':', Nodes.Builders.identifier(name));
        }

        return base;
    }

    parseParameterList() {
        const params = [];

        if (!this.check(TokenType.OPERATOR, ')')) {
            do {
                if (this.check(TokenType.VARARG)) {
                    this.advance();
                    params.push(Nodes.Builders.varargLiteral());
                    break;
                }
                const name = this.expect(TokenType.IDENTIFIER);
                params.push(Nodes.Builders.identifier(name.value));
            } while (this.match(TokenType.OPERATOR, ','));
        }

        return params;
    }

    // ═══════════════════════════════════════════════════════════
    // CONTROL FLOW STATEMENTS
    // ═══════════════════════════════════════════════════════════

    parseIfStatement() {
        const clauses = [];

        // if clause
        const condition = this.parseExpression();
        this.expectKeyword('then');
        const body = this.parseBlock();
        clauses.push(Nodes.Builders.ifClause(condition, body));

        // elseif clauses
        while (this.matchKeyword('elseif')) {
            const elifCondition = this.parseExpression();
            this.expectKeyword('then');
            const elifBody = this.parseBlock();
            clauses.push(Nodes.Builders.elseifClause(elifCondition, elifBody));
        }

        // else clause
        if (this.matchKeyword('else')) {
            const elseBody = this.parseBlock();
            clauses.push(Nodes.Builders.elseClause(elseBody));
        }

        this.expectKeyword('end');

        return Nodes.Builders.ifStatement(clauses);
    }

    parseWhileStatement() {
        const condition = this.parseExpression();
        this.expectKeyword('do');
        const body = this.parseBlock();
        this.expectKeyword('end');

        return Nodes.Builders.whileStatement(condition, body);
    }

    parseDoStatement() {
        const body = this.parseBlock();
        this.expectKeyword('end');

        return Nodes.Builders.doStatement(body);
    }

    parseRepeatStatement() {
        const body = this.parseBlock();
        this.expectKeyword('until');
        const condition = this.parseExpression();

        return Nodes.Builders.repeatStatement(condition, body);
    }

    parseForStatement() {
        const firstName = this.expect(TokenType.IDENTIFIER);

        // Numeric for: for i = 1, 10 do
        if (this.match(TokenType.OPERATOR, '=')) {
            const start = this.parseExpression();
            this.expect(TokenType.OPERATOR, ',');
            const end = this.parseExpression();
            
            let step = null;
            if (this.match(TokenType.OPERATOR, ',')) {
                step = this.parseExpression();
            }

            this.expectKeyword('do');
            const body = this.parseBlock();
            this.expectKeyword('end');

            return Nodes.Builders.forNumericStatement(
                Nodes.Builders.identifier(firstName.value),
                start, end, step, body
            );
        }

        // Generic for: for k, v in pairs(t) do
        const variables = [Nodes.Builders.identifier(firstName.value)];
        
        while (this.match(TokenType.OPERATOR, ',')) {
            const name = this.expect(TokenType.IDENTIFIER);
            variables.push(Nodes.Builders.identifier(name.value));
        }

        this.expectKeyword('in');
        const iterators = this.parseExpressionList();

        this.expectKeyword('do');
        const body = this.parseBlock();
        this.expectKeyword('end');

        return Nodes.Builders.forGenericStatement(variables, iterators, body);
    }

    parseReturnStatement() {
        const args = [];

        if (!this.isBlockEnd() && !this.check(TokenType.OPERATOR, ';')) {
            args.push(...this.parseExpressionList());
        }

        return Nodes.Builders.returnStatement(args);
    }

    // ═══════════════════════════════════════════════════════════
    // EXPRESSION STATEMENT (Assignment or Call)
    // ═══════════════════════════════════════════════════════════

    parseExpressionStatement() {
        const expr = this.parsePrimaryExpression();
        const suffixed = this.parseSuffixedExpression(expr);

        // Check if this is an assignment
        if (this.check(TokenType.OPERATOR, '=') || this.check(TokenType.OPERATOR, ',')) {
            const variables = [suffixed];

            while (this.match(TokenType.OPERATOR, ',')) {
                const nextExpr = this.parsePrimaryExpression();
                variables.push(this.parseSuffixedExpression(nextExpr));
            }

            this.expect(TokenType.OPERATOR, '=');
            const values = this.parseExpressionList();

            return Nodes.Builders.assignmentStatement(variables, values);
        }

        // Must be a call statement
        if (suffixed.type === Nodes.Types.CALL_EXPRESSION ||
            suffixed.type === Nodes.Types.STRING_CALL_EXPRESSION ||
            suffixed.type === Nodes.Types.TABLE_CALL_EXPRESSION) {
            return Nodes.Builders.callStatement(suffixed);
        }

        this.error('Expected assignment or function call');
    }

    // ═══════════════════════════════════════════════════════════
    // EXPRESSIONS
    // ═══════════════════════════════════════════════════════════

    parseExpressionList() {
        const expressions = [this.parseExpression()];

        while (this.match(TokenType.OPERATOR, ',')) {
            expressions.push(this.parseExpression());
        }

        return expressions;
    }

    parseExpression() {
        return this.parseOrExpression();
    }

    parseOrExpression() {
        let left = this.parseAndExpression();

        while (this.matchKeyword('or')) {
            const right = this.parseAndExpression();
            left = Nodes.Builders.logicalExpression('or', left, right);
        }

        return left;
    }

    parseAndExpression() {
        let left = this.parseComparisonExpression();

        while (this.matchKeyword('and')) {
            const right = this.parseComparisonExpression();
            left = Nodes.Builders.logicalExpression('and', left, right);
        }

        return left;
    }

    parseComparisonExpression() {
        let left = this.parseBitOrExpression();

        const ops = ['<', '>', '<=', '>=', '~=', '=='];
        while (this.checkOperator(ops)) {
            const op = this.advance().value;
            const right = this.parseBitOrExpression();
            left = Nodes.Builders.binaryExpression(op, left, right);
        }

        return left;
    }

    parseBitOrExpression() {
        let left = this.parseBitXorExpression();

        while (this.match(TokenType.OPERATOR, '|')) {
            const right = this.parseBitXorExpression();
            left = Nodes.Builders.binaryExpression('|', left, right);
        }

        return left;
    }

    parseBitXorExpression() {
        let left = this.parseBitAndExpression();

        while (this.match(TokenType.OPERATOR, '~')) {
            const right = this.parseBitAndExpression();
            left = Nodes.Builders.binaryExpression('~', left, right);
        }

        return left;
    }

    parseBitAndExpression() {
        let left = this.parseShiftExpression();

        while (this.match(TokenType.OPERATOR, '&')) {
            const right = this.parseShiftExpression();
            left = Nodes.Builders.binaryExpression('&', left, right);
        }

        return left;
    }

    parseShiftExpression() {
        let left = this.parseConcatExpression();

        while (this.checkOperator(['<<', '>>'])) {
            const op = this.advance().value;
            const right = this.parseConcatExpression();
            left = Nodes.Builders.binaryExpression(op, left, right);
        }

        return left;
    }

    parseConcatExpression() {
        let left = this.parseAddExpression();

        // Right associative
        if (this.match(TokenType.OPERATOR, '..')) {
            const right = this.parseConcatExpression();
            left = Nodes.Builders.binaryExpression('..', left, right);
        }

        return left;
    }

    parseAddExpression() {
        let left = this.parseMulExpression();

        while (this.checkOperator(['+', '-'])) {
            const op = this.advance().value;
            const right = this.parseMulExpression();
            left = Nodes.Builders.binaryExpression(op, left, right);
        }

        return left;
    }

    parseMulExpression() {
        let left = this.parseUnaryExpression();

        while (this.checkOperator(['*', '/', '//', '%'])) {
            const op = this.advance().value;
            const right = this.parseUnaryExpression();
            left = Nodes.Builders.binaryExpression(op, left, right);
        }

        return left;
    }

    parseUnaryExpression() {
        if (this.matchKeyword('not')) {
            const arg = this.parseUnaryExpression();
            return Nodes.Builders.unaryExpression('not', arg);
        }

        if (this.checkOperator(['-', '#', '~'])) {
            const op = this.advance().value;
            const arg = this.parseUnaryExpression();
            return Nodes.Builders.unaryExpression(op, arg);
        }

        return this.parsePowerExpression();
    }

    parsePowerExpression() {
        let base = this.parsePrimaryExpression();
        base = this.parseSuffixedExpression(base);

        // Right associative
        if (this.match(TokenType.OPERATOR, '^')) {
            const exp = this.parseUnaryExpression();
            return Nodes.Builders.binaryExpression('^', base, exp);
        }

        return base;
    }

    // ═══════════════════════════════════════════════════════════
    // PRIMARY & SUFFIXED EXPRESSIONS
    // ═══════════════════════════════════════════════════════════

    parsePrimaryExpression() {
        // nil
        if (this.check(TokenType.NIL)) {
            this.advance();
            return Nodes.Builders.nilLiteral();
        }

        // boolean
        if (this.check(TokenType.BOOLEAN)) {
            const token = this.advance();
            return Nodes.Builders.booleanLiteral(token.value);
        }

        // number
        if (this.check(TokenType.NUMBER)) {
            const token = this.advance();
            return Nodes.Builders.numericLiteral(token.value, token.raw);
        }

        // string
        if (this.check(TokenType.STRING)) {
            const token = this.advance();
            return Nodes.Builders.stringLiteral(token.value, token.raw);
        }

        // vararg
        if (this.check(TokenType.VARARG)) {
            this.advance();
            return Nodes.Builders.varargLiteral();
        }

        // function expression
        if (this.matchKeyword('function')) {
            return this.parseFunctionExpression();
        }

        // table constructor
        if (this.match(TokenType.OPERATOR, '{')) {
            return this.parseTableConstructor();
        }

        // parenthesized expression
        if (this.match(TokenType.OPERATOR, '(')) {
            const expr = this.parseExpression();
            this.expect(TokenType.OPERATOR, ')');
            return expr;
        }

        // identifier
        if (this.check(TokenType.IDENTIFIER)) {
            const name = this.advance().value;
            return Nodes.Builders.identifier(name);
        }

        this.error(`Unexpected token: ${this.currentToken?.value || 'EOF'}`);
    }

    parseSuffixedExpression(base) {
        while (true) {
            // Member access: .name
            if (this.match(TokenType.OPERATOR, '.')) {
                const name = this.expect(TokenType.IDENTIFIER).value;
                base = Nodes.Builders.memberExpression(
                    base, '.', Nodes.Builders.identifier(name)
                );
            }
            // Index access: [expr]
            else if (this.match(TokenType.OPERATOR, '[')) {
                const index = this.parseExpression();
                this.expect(TokenType.OPERATOR, ']');
                base = Nodes.Builders.indexExpression(base, index);
            }
            // Method call: :name(args)
            else if (this.match(TokenType.OPERATOR, ':')) {
                const name = this.expect(TokenType.IDENTIFIER).value;
                base = Nodes.Builders.memberExpression(
                    base, ':', Nodes.Builders.identifier(name)
                );
                base = this.parseCallExpression(base);
            }
            // Function call: (args)
            else if (this.check(TokenType.OPERATOR, '(')) {
                base = this.parseCallExpression(base);
            }
            // String call: "string" or 'string'
            else if (this.check(TokenType.STRING)) {
                const arg = this.advance();
                base = Nodes.Builders.stringCallExpression(
                    base, Nodes.Builders.stringLiteral(arg.value, arg.raw)
                );
            }
            // Table call: {table}
            else if (this.check(TokenType.OPERATOR, '{')) {
                this.advance();
                const arg = this.parseTableConstructor();
                base = Nodes.Builders.tableCallExpression(base, arg);
            }
            else {
                break;
            }
        }

        return base;
    }

    parseCallExpression(base) {
        this.expect(TokenType.OPERATOR, '(');
        
        const args = [];
        if (!this.check(TokenType.OPERATOR, ')')) {
            args.push(...this.parseExpressionList());
        }
        
        this.expect(TokenType.OPERATOR, ')');

        return Nodes.Builders.callExpression(base, args);
    }

    parseFunctionExpression() {
        this.expect(TokenType.OPERATOR, '(');
        const parameters = this.parseParameterList();
        this.expect(TokenType.OPERATOR, ')');

        const body = this.parseBlock();
        this.expectKeyword('end');

        return Nodes.Builders.functionExpression(parameters, body);
    }

    // ═══════════════════════════════════════════════════════════
    // TABLE CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    parseTableConstructor() {
        const fields = [];

        while (!this.check(TokenType.OPERATOR, '}')) {
            fields.push(this.parseTableField());

            if (!this.match(TokenType.OPERATOR, ',') && 
                !this.match(TokenType.OPERATOR, ';')) {
                break;
            }
        }

        this.expect(TokenType.OPERATOR, '}');

        return Nodes.Builders.tableConstructor(fields);
    }

    parseTableField() {
        // [expr] = expr
        if (this.match(TokenType.OPERATOR, '[')) {
            const key = this.parseExpression();
            this.expect(TokenType.OPERATOR, ']');
            this.expect(TokenType.OPERATOR, '=');
            const value = this.parseExpression();
            return Nodes.Builders.tableKey(key, value);
        }

        // Check for name = expr
        if (this.check(TokenType.IDENTIFIER) && this.checkNext(TokenType.OPERATOR, '=')) {
            const key = Nodes.Builders.identifier(this.advance().value);
            this.advance(); // =
            const value = this.parseExpression();
            return Nodes.Builders.tableKeyString(key, value);
        }

        // Just expr
        const value = this.parseExpression();
        return Nodes.Builders.tableValue(value);
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    check(type, value = null) {
        if (this.isEOF()) return false;
        if (this.currentToken.type !== type) return false;
        if (value !== null && this.currentToken.value !== value) return false;
        return true;
    }

    checkNext(type, value = null) {
        const next = this.tokens[this.pos + 1];
        if (!next) return false;
        if (next.type !== type) return false;
        if (value !== null && next.value !== value) return false;
        return true;
    }

    checkOperator(ops) {
        if (!this.check(TokenType.OPERATOR)) return false;
        if (Array.isArray(ops)) {
            return ops.includes(this.currentToken.value);
        }
        return this.currentToken.value === ops;
    }

    match(type, value = null) {
        if (this.check(type, value)) {
            this.advance();
            return true;
        }
        return false;
    }

    matchKeyword(keyword) {
        if (this.check(TokenType.KEYWORD, keyword)) {
            this.advance();
            return true;
        }
        return false;
    }

    expect(type, value = null) {
        if (!this.check(type, value)) {
            const expected = value ? `${type} '${value}'` : type;
            const got = this.currentToken ? 
                `${this.currentToken.type} '${this.currentToken.value}'` : 'EOF';
            this.error(`Expected ${expected}, got ${got}`);
        }
        return this.advance();
    }

    expectKeyword(keyword) {
        if (!this.matchKeyword(keyword)) {
            const got = this.currentToken ? this.currentToken.value : 'EOF';
            this.error(`Expected '${keyword}', got '${got}'`);
        }
    }

    advance() {
        const token = this.currentToken;
        this.pos++;
        this.currentToken = this.tokens[this.pos] || null;
        return token;
    }

    isEOF() {
        return !this.currentToken || this.currentToken.type === TokenType.EOF;
    }

    error(message) {
        const line = this.currentToken?.line || 0;
        const column = this.currentToken?.column || 0;
        throw new Error(`Parse Error at ${line}:${column}: ${message}`);
    }
}

module.exports = Parser;
