/**
 * LuaShield - Code Minifier
 * Compress dan minify Lua code
 */

class Minifier {
    constructor(options = {}) {
        this.config = {
            removeComments: options.removeComments !== false,
            removeWhitespace: options.removeWhitespace !== false,
            preserveWatermark: options.preserveWatermark !== false,
            singleLine: options.singleLine || false
        };

        // Lua keywords yang perlu space di sekitarnya
        this.keywords = new Set([
            'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
            'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
            'repeat', 'return', 'then', 'true', 'until', 'while'
        ]);

        // Token yang tidak butuh space
        this.operators = new Set([
            '+', '-', '*', '/', '%', '^', '#',
            '==', '~=', '<=', '>=', '<', '>', '=',
            '(', ')', '{', '}', '[', ']',
            ';', ':', ',', '.', '..', '...'
        ]);
    }

    /**
     * Main minify function
     */
    minify(code) {
        let result = code;

        // Step 1: Extract dan preserve strings
        const { code: codeWithPlaceholders, strings } = this._extractStrings(result);
        result = codeWithPlaceholders;

        // Step 2: Remove comments
        if (this.config.removeComments) {
            result = this._removeComments(result);
        }

        // Step 3: Normalize whitespace
        if (this.config.removeWhitespace) {
            result = this._normalizeWhitespace(result);
        }

        // Step 4: Remove unnecessary spaces around operators
        result = this._optimizeSpaces(result);

        // Step 5: Restore strings
        result = this._restoreStrings(result, strings);

        // Step 6: Final cleanup
        result = this._finalCleanup(result);

        // Step 7: Single line if requested
        if (this.config.singleLine) {
            result = this._toSingleLine(result);
        }

        return result;
    }

    /**
     * Extract strings dan replace dengan placeholders
     */
    _extractStrings(code) {
        const strings = [];
        let index = 0;

        // Match semua jenis string
        const result = code.replace(
            /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\[\[[\s\S]*?\]\]|\[=+\[[\s\S]*?\]=+\])/g,
            (match) => {
                strings.push(match);
                return `___STRING_${index++}___`;
            }
        );

        return { code: result, strings };
    }

    /**
     * Restore strings dari placeholders
     */
    _restoreStrings(code, strings) {
        let result = code;
        for (let i = 0; i < strings.length; i++) {
            result = result.replace(`___STRING_${i}___`, strings[i]);
        }
        return result;
    }

    /**
     * Remove comments
     */
    _removeComments(code) {
        let result = code;

        // Preserve watermark comment jika ada
        let watermark = '';
        if (this.config.preserveWatermark) {
            const watermarkMatch = result.match(/^--\[\[[\s\S]*?LuaShield[\s\S]*?\]\]/m);
            if (watermarkMatch) {
                watermark = watermarkMatch[0] + '\n';
                result = result.replace(watermarkMatch[0], '');
            }
        }

        // Remove multi-line comments --[[ ... ]]
        result = result.replace(/--\[\[[\s\S]*?\]\]/g, '');
        
        // Remove multi-line comments --[=[ ... ]=]
        result = result.replace(/--\[=+\[[\s\S]*?\]=+\]/g, '');

        // Remove single-line comments
        result = result.replace(/--[^\n]*/g, '');

        return watermark + result;
    }

    /**
     * Normalize whitespace
     */
    _normalizeWhitespace(code) {
        let result = code;

        // Replace multiple spaces dengan single space
        result = result.replace(/[ \t]+/g, ' ');

        // Replace multiple newlines dengan single newline
        result = result.replace(/\n\s*\n/g, '\n');

        // Remove leading/trailing whitespace per line
        result = result.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        return result;
    }

    /**
     * Optimize spaces di sekitar operators
     */
    _optimizeSpaces(code) {
        let result = code;

        // Remove space sebelum punctuation
        result = result.replace(/\s+([;,\)\]\}])/g, '$1');

        // Remove space setelah punctuation
        result = result.replace(/([(\[\{])\s+/g, '$1');

        // Remove space di sekitar operators
        result = result.replace(/\s*([\+\-\*\/%\^#=<>~])\s*/g, '$1');

        // Fix: restore space yang diperlukan untuk keywords
        result = this._restoreKeywordSpaces(result);

        // Fix double operators
        result = result.replace(/([=<>~])=\s*/g, '$1=');
        result = result.replace(/\.\.\s*/g, '..');

        return result;
    }

    /**
     * Restore spaces yang diperlukan untuk keywords
     */
    _restoreKeywordSpaces(code) {
        let result = code;

        // Patterns yang perlu space
        const patterns = [
            // Keywords yang butuh space setelahnya
            { regex: /\b(local)(\w)/g, replace: '$1 $2' },
            { regex: /\b(function)(\w)/g, replace: '$1 $2' },
            { regex: /\b(return)(\w)/g, replace: '$1 $2' },
            { regex: /\b(if)(\w)/g, replace: '$1 $2' },
            { regex: /\b(elseif)(\w)/g, replace: '$1 $2' },
            { regex: /\b(while)(\w)/g, replace: '$1 $2' },
            { regex: /\b(for)(\w)/g, replace: '$1 $2' },
            { regex: /\b(in)(\w)/g, replace: '$1 $2' },
            { regex: /\b(do)(\w)/g, replace: '$1 $2' },
            { regex: /\b(then)(\w)/g, replace: '$1 $2' },
            { regex: /\b(else)(\w)/g, replace: '$1 $2' },
            { regex: /\b(until)(\w)/g, replace: '$1 $2' },
            { regex: /\b(repeat)(\w)/g, replace: '$1 $2' },
            { regex: /\b(not)(\w)/g, replace: '$1 $2' },
            { regex: /\b(and)(\w)/g, replace: '$1 $2' },
            { regex: /\b(or)(\w)/g, replace: '$1 $2' },

            // Keywords yang butuh space sebelumnya
            { regex: /(\w)(and)\b/g, replace: '$1 $2' },
            { regex: /(\w)(or)\b/g, replace: '$1 $2' },
            { regex: /(\w)(not)\b/g, replace: '$1 $2' },
            { regex: /(\w)(then)\b/g, replace: '$1 $2' },
            { regex: /(\w)(do)\b/g, replace: '$1 $2' },
            { regex: /(\w)(end)\b/g, replace: '$1 $2' },
            { regex: /(\w)(else)\b/g, replace: '$1 $2' },
            { regex: /(\w)(elseif)\b/g, replace: '$1 $2' },
            { regex: /(\w)(until)\b/g, replace: '$1 $2' },
            { regex: /(\w)(in)\b/g, replace: '$1 $2' },

            // end followed by keyword
            { regex: /\bend\b(\w)/g, replace: 'end $1' },
        ];

        for (const pattern of patterns) {
            result = result.replace(pattern.regex, pattern.replace);
        }

        return result;
    }

    /**
     * Final cleanup
     */
    _finalCleanup(code) {
        let result = code;

        // Remove empty statements
        result = result.replace(/;+/g, ';');
        result = result.replace(/;\s*;/g, ';');

        // Remove trailing semicolons before end/else/elseif/until
        result = result.replace(/;(\s*)(end|else|elseif|until)\b/g, '$1$2');

        // Ensure proper spacing
        result = result.replace(/end\s*end/g, 'end end');
        result = result.replace(/end\s*else/g, 'end else');
        result = result.replace(/end\s*elseif/g, 'end elseif');
        result = result.replace(/end\s*until/g, 'end until');

        // Fix function calls
        result = result.replace(/\)\s*\(/g, ')(');

        // Trim
        result = result.trim();

        return result;
    }

    /**
     * Convert ke single line
     */
    _toSingleLine(code) {
        return code
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Estimate compression ratio
     */
    getCompressionRatio(original, minified) {
        return {
            originalSize: original.length,
            minifiedSize: minified.length,
            ratio: ((1 - minified.length / original.length) * 100).toFixed(2) + '%',
            saved: original.length - minified.length
        };
    }
}

module.exports = Minifier;
