/**
 * LuaShield - Lua Lexer
 * Tokenizer untuk Lua 5.1 source code
 */

const Nodes = require('./nodes');

// ═══════════════════════════════════════════════════════════
// TOKEN TYPES
// ═══════════════════════════════════════════════════════════
const TokenType = {
    EOF: 'EOF',
    
    // Literals
    STRING: 'String',
    NUMBER: 'Number',
    BOOLEAN: 'Boolean',
    NIL: 'Nil',
    VARARG: 'Vararg',
    
    // Identifiers & Keywords
    IDENTIFIER: 'Identifier',
    KEYWORD: 'Keyword',
    
    // Operators
    OPERATOR: 'Operator',
    
    // Punctuation
    PUNCTUATION: 'Punctuation',
    
    // Comments
    COMMENT: 'Comment'
};

// ═══════════════════════════════════════════════════════════
// KEYWORDS
// ═══════════════════════════════════════════════════════════
const KEYWORDS = new Set([
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
    'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
    'repeat', 'return', 'then', 'true', 'until', 'while'
]);

// ═══════════════════════════════════════════════════════════
// OPERATORS
// ═══════════════════════════════════════════════════════════
const OPERATORS = [
    '...', '..', '==', '~=', '<=', '>=', '<<', '>>', '//', '::',
    '+', '-', '*', '/', '%', '^', '#', '&', '~', '|',
    '<', '>', '=', '(', ')', '{', '}', '[', ']',
    ';', ':', ',', '.', 
];

class Lexer {
    constructor() {
        this.source = '';
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
    }

    /**
     * Tokenize source code
     */
    tokenize(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];

        while (!this.isEOF()) {
            this.skipWhitespace();
            
            if (this.isEOF()) break;

            const token = this.readToken();
            if (token) {
                this.tokens.push(token);
            }
        }

        // Add EOF token
        this.tokens.push({
            type: TokenType.EOF,
            value: '',
            line: this.line,
            column: this.column
        });

        return this.tokens;
    }

    /**
     * Read next token
     */
    readToken() {
        const char = this.peek();
        const startLine = this.line;
        const startColumn = this.column;

        // Comments
        if (char === '-' && this.peek(1) === '-') {
            return this.readComment();
        }

        // Strings
        if (char === '"' || char === "'") {
            return this.readString(char);
        }

        // Long strings [[ ]] or [=[ ]=]
        if (char === '[' && (this.peek(1) === '[' || this.peek(1) === '=')) {
            return this.readLongString();
        }

        // Numbers
        if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek(1)))) {
            return this.readNumber();
        }

        // Identifiers and keywords
        if (this.isAlpha(char) || char === '_') {
            return this.readIdentifier();
        }

        // Operators and punctuation
        return this.readOperator();
    }

    /**
     * Read comment
     */
    readComment() {
        const startLine = this.line;
        const startColumn = this.column;
        
        this.advance(); // -
        this.advance(); // -

        let value = '';
        let isLong = false;

        // Check for long comment --[[ ]]
        if (this.peek() === '[') {
            const eqCount = this.countEquals();
            if (this.peek() === '[') {
                isLong = true;
                this.advance(); // [
                value = this.readUntilLongClose(eqCount);
            }
        }

        if (!isLong) {
            // Single line comment
            while (!this.isEOF() && this.peek() !== '\n') {
                value += this.advance();
            }
        }

        return {
            type: TokenType.COMMENT,
            value: value,
            line: startLine,
            column: startColumn,
            isLong: isLong
        };
    }

    /**
     * Read string literal
     */
    readString(quote) {
        const startLine = this.line;
        const startColumn = this.column;
        
        this.advance(); // Opening quote
        let value = '';
        let raw = quote;

        while (!this.isEOF()) {
            const char = this.peek();

            if (char === quote) {
                raw += char;
                this.advance();
                break;
            }

            if (char === '\\') {
                raw += char;
                this.advance();
                const escaped = this.readEscapeSequence();
                value += escaped.value;
                raw += escaped.raw;
            } else if (char === '\n') {
                this.error('Unterminated string');
            } else {
                value += char;
                raw += char;
                this.advance();
            }
        }

        return {
            type: TokenType.STRING,
            value: value,
            raw: raw,
            line: startLine,
            column: startColumn
        };
    }

    /**
     * Read escape sequence
     */
    readEscapeSequence() {
        const char = this.advance();
        
        const escapes = {
            'a': '\x07', 'b': '\b', 'f': '\f', 'n': '\n',
            'r': '\r', 't': '\t', 'v': '\v', '\\': '\\',
            '"': '"', "'": "'", '\n': '\n'
        };

        if (escapes[char] !== undefined) {
            return { value: escapes[char], raw: char };
        }

        // Numeric escape \ddd
        if (this.isDigit(char)) {
            let numStr = char;
            for (let i = 0; i < 2 && this.isDigit(this.peek()); i++) {
                numStr += this.advance();
            }
            const code = parseInt(numStr, 10);
            return { value: String.fromCharCode(code), raw: numStr };
        }

        // Hex escape \xXX
        if (char === 'x') {
            const hex = this.advance() + this.advance();
            const code = parseInt(hex, 16);
            return { value: String.fromCharCode(code), raw: 'x' + hex };
        }

        // Unknown escape - keep as is
        return { value: char, raw: char };
    }

    /**
     * Read long string [[ ]] or [=[ ]=]
     */
    readLongString() {
        const startLine = this.line;
        const startColumn = this.column;
        
        this.advance(); // [
        const eqCount = this.countEquals();
        this.advance(); // [

        const value = this.readUntilLongClose(eqCount);

        return {
            type: TokenType.STRING,
            value: value,
            raw: `[${'='.repeat(eqCount)}[${value}]${'='.repeat(eqCount)}]`,
            line: startLine,
            column: startColumn,
            isLong: true
        };
    }

    /**
     * Count equals untuk long string/comment
     */
    countEquals() {
        let count = 0;
        while (this.peek() === '=') {
            this.advance();
            count++;
        }
        return count;
    }

    /**
     * Read until long close ]=] atau ]===]
     */
    readUntilLongClose(eqCount) {
        let value = '';
        
        // Skip first newline if present
        if (this.peek() === '\n') {
            this.advance();
        }

        while (!this.isEOF()) {
            if (this.peek() === ']') {
                let matched = true;
                const saved = this.pos;
                
                this.advance(); // ]
                for (let i = 0; i < eqCount; i++) {
                    if (this.peek() !== '=') {
                        matched = false;
                        break;
                    }
                    this.advance();
                }
                
                if (matched && this.peek() === ']') {
                    this.advance(); // ]
                    return value;
                }
                
                // Not matched, restore and add to value
                value += ']';
                this.pos = saved + 1;
            } else {
                value += this.advance();
            }
        }

        this.error('Unterminated long string');
    }

    /**
     * Read number
     */
    readNumber() {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        // Hex number 0x or 0X
        if (this.peek() === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
            value += this.advance() + this.advance(); // 0x
            while (this.isHexDigit(this.peek())) {
                value += this.advance();
            }
            // Hex float
            if (this.peek() === '.') {
                value += this.advance();
                while (this.isHexDigit(this.peek())) {
                    value += this.advance();
                }
            }
            // Hex exponent
            if (this.peek() === 'p' || this.peek() === 'P') {
                value += this.advance();
                if (this.peek() === '+' || this.peek() === '-') {
                    value += this.advance();
                }
                while (this.isDigit(this.peek())) {
                    value += this.advance();
                }
            }
        }
        // Binary 0b or 0B
        else if (this.peek() === '0' && (this.peek(1) === 'b' || this.peek(1) === 'B')) {
            value += this.advance() + this.advance(); // 0b
            while (this.peek() === '0' || this.peek() === '1' || this.peek() === '_') {
                if (this.peek() !== '_') {
                    value += this.advance();
                } else {
                    this.advance(); // Skip underscore
                }
            }
        }
        // Decimal
        else {
            while (this.isDigit(this.peek()) || this.peek() === '_') {
                if (this.peek() !== '_') {
                    value += this.advance();
                } else {
                    this.advance();
                }
            }
            // Decimal point
            if (this.peek() === '.' && this.isDigit(this.peek(1))) {
                value += this.advance(); // .
                while (this.isDigit(this.peek())) {
                    value += this.advance();
                }
            }
            // Exponent
            if (this.peek() === 'e' || this.peek() === 'E') {
                value += this.advance();
                if (this.peek() === '+' || this.peek() === '-') {
                    value += this.advance();
                }
                while (this.isDigit(this.peek())) {
                    value += this.advance();
                }
            }
        }

        return {
            type: TokenType.NUMBER,
            value: this.parseNumber(value),
            raw: value,
            line: startLine,
            column: startColumn
        };
    }

    /**
     * Parse number string ke nilai
     */
    parseNumber(str) {
        str = str.replace(/_/g, '');
        
        if (str.startsWith('0x') || str.startsWith('0X')) {
            return parseInt(str, 16);
        }
        if (str.startsWith('0b') || str.startsWith('0B')) {
            return parseInt(str.slice(2), 2);
        }
        return parseFloat(str);
    }

    /**
     * Read identifier or keyword
     */
    readIdentifier() {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
            value += this.advance();
        }

        // Check if keyword
        if (KEYWORDS.has(value)) {
            // Special cases
            if (value === 'true' || value === 'false') {
                return {
                    type: TokenType.BOOLEAN,
                    value: value === 'true',
                    raw: value,
                    line: startLine,
                    column: startColumn
                };
            }
            if (value === 'nil') {
                return {
                    type: TokenType.NIL,
                    value: null,
                    raw: value,
                    line: startLine,
                    column: startColumn
                };
            }
            return {
                type: TokenType.KEYWORD,
                value: value,
                line: startLine,
                column: startColumn
            };
        }

        return {
            type: TokenType.IDENTIFIER,
            value: value,
            line: startLine,
            column: startColumn
        };
    }

    /**
     * Read operator or punctuation
     */
    readOperator() {
        const startLine = this.line;
        const startColumn = this.column;

        // Try to match longest operator first
        for (const op of OPERATORS) {
            let match = true;
            for (let i = 0; i < op.length; i++) {
                if (this.peek(i) !== op[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                for (let i = 0; i < op.length; i++) {
                    this.advance();
                }
                
                // Check for vararg
                if (op === '...') {
                    return {
                        type: TokenType.VARARG,
                        value: '...',
                        line: startLine,
                        column: startColumn
                    };
                }
                
                return {
                    type: TokenType.OPERATOR,
                    value: op,
                    line: startLine,
                    column: startColumn
                };
            }
        }

        // Unknown character
        const char = this.advance();
        this.error(`Unexpected character: ${char}`);
    }

    /**
     * Skip whitespace
     */
    skipWhitespace() {
        while (!this.isEOF()) {
            const char = this.peek();
            if (char === ' ' || char === '\t' || char === '\r') {
                this.advance();
            } else if (char === '\n') {
                this.advance();
                this.line++;
                this.column = 1;
            } else {
                break;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════
    peek(offset = 0) {
        const pos = this.pos + offset;
        if (pos >= this.source.length) return '\0';
        return this.source[pos];
    }

    advance() {
        const char = this.source[this.pos];
        this.pos++;
        this.column++;
        if (char === '\n') {
            this.line++;
            this.column = 1;
        }
        return char;
    }

    isEOF() {
        return this.pos >= this.source.length;
    }

    isDigit(char) {
        return char >= '0' && char <= '9';
    }

    isHexDigit(char) {
        return this.isDigit(char) || 
               (char >= 'a' && char <= 'f') || 
               (char >= 'A' && char <= 'F');
    }

    isAlpha(char) {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    }

    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isDigit(char);
    }

    error(message) {
        throw new Error(`Lexer Error at ${this.line}:${this.column}: ${message}`);
    }
}

module.exports = Lexer;
module.exports.TokenType = TokenType;
module.exports.KEYWORDS = KEYWORDS;
