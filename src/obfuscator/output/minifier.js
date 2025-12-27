/**
 * LuaShield - Code Minifier (FIXED)
 * Safe minification tanpa merusak syntax
 */

class Minifier {
    constructor(options = {}) {
        this.config = {
            removeComments: options.removeComments !== false,
            removeWhitespace: options.removeWhitespace !== false,
            preserveWatermark: options.preserveWatermark !== false
        };

        this.keywords = new Set([
            'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
            'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
            'repeat', 'return', 'then', 'true', 'until', 'while'
        ]);
    }

    minify(code) {
        if (!code || code.trim().length === 0) return code;

        let result = code;

        // Step 1: Preserve strings
        const preserved = this._preserveStrings(result);
        result = preserved.code;

        // Step 2: Remove comments
        if (this.config.removeComments) {
            result = this._removeComments(result);
        }

        // Step 3: Safe whitespace normalization
        if (this.config.removeWhitespace) {
            result = this._normalizeWhitespace(result);
        }

        // Step 4: Restore strings
        result = this._restoreStrings(result, preserved.strings);

        // Step 5: Final safe cleanup
        result = this._safeCleanup(result);

        return result.trim();
    }

    _preserveStrings(code) {
        const strings = [];
        let index = 0;

        const result = code.replace(
            /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\[\[[\s\S]*?\]\]|\[=+\[[\s\S]*?\]=+\])/g,
            (match) => {
                strings.push(match);
                return `__LSTR${index++}__`;
            }
        );

        return { code: result, strings };
    }

    _restoreStrings(code, strings) {
        let result = code;
        for (let i = 0; i < strings.length; i++) {
            result = result.split(`__LSTR${i}__`).join(strings[i]);
        }
        return result;
    }

    _removeComments(code) {
        let result = code;
        let watermark = '';

        if (this.config.preserveWatermark) {
            const match = result.match(/^(\s*--\[\[[\s\S]*?(?:LuaShield|Protected)[\s\S]*?\]\])/i);
            if (match) {
                watermark = match[1] + '\n\n';
                result = result.slice(match[0].length);
            }
        }

        result = result.replace(/--\[\[[\s\S]*?\]\]/g, '');
        result = result.replace(/--\[=+\[[\s\S]*?\]=+\]/g, '');
        result = result.replace(/--[^\n]*/g, '');

        return watermark + result;
    }

    _normalizeWhitespace(code) {
        let result = code;

        // Replace multiple whitespace
        result = result.replace(/[ \t]+/g, ' ');
        result = result.replace(/\n\s*\n+/g, '\n');

        // Process lines
        result = result.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ');

        // Safe keyword spacing
        result = this._ensureKeywordSpacing(result);

        return result;
    }

    _ensureKeywordSpacing(code) {
        let result = code;

        // Keywords need space after
        const afterKeywords = ['and', 'do', 'else', 'elseif', 'for', 'function', 
            'if', 'in', 'local', 'not', 'or', 'repeat', 'return', 'then', 'until', 'while'];
        
        for (const kw of afterKeywords) {
            result = result.replace(new RegExp(`\\b${kw}([a-zA-Z0-9_])`, 'g'), `${kw} $1`);
        }

        // Keywords need space before
        const beforeKeywords = ['and', 'do', 'else', 'elseif', 'end', 'or', 'then', 'until'];
        
        for (const kw of beforeKeywords) {
            result = result.replace(new RegExp(`([a-zA-Z0-9_])${kw}\\b`, 'g'), `$1 ${kw}`);
        }

        // Special fixes
        result = result.replace(/end end/g, 'end end');
        result = result.replace(/end else/g, 'end else');
        result = result.replace(/end elseif/g, 'end elseif');
        result = result.replace(/then local/g, 'then local');
        result = result.replace(/do local/g, 'do local');
        result = result.replace(/else local/g, 'else local');

        return result;
    }

    _safeCleanup(code) {
        let result = code;

        result = result.replace(/;+/g, ';');
        result = result.replace(/; *(end|else|elseif|until)/g, ' $1');
        result = result.replace(/\s+;/g, ';');
        result = result.replace(/;\s*$/g, '');

        return result;
    }
}

module.exports = Minifier;
