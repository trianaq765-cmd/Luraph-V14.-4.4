/**
 * LuaShield - Watermark Generator
 * Add custom watermarks ke obfuscated code
 */

const Random = require('../../utils/random');
const Config = require('../config');

class WatermarkGenerator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        
        this.config = {
            text: options.text || Config.WATERMARK_TEXT.replace('%VERSION%', Config.VERSION),
            style: options.style || 'comment',
            hidden: options.hidden || false,
            position: options.position || 'top'
        };
    }

    /**
     * Generate watermark
     */
    generate(customText = null) {
        const text = customText || this.config.text;

        switch (this.config.style) {
            case 'comment':
                return this._generateCommentWatermark(text);
            case 'hidden':
                return this._generateHiddenWatermark(text);
            case 'variable':
                return this._generateVariableWatermark(text);
            case 'encoded':
                return this._generateEncodedWatermark(text);
            default:
                return this._generateCommentWatermark(text);
        }
    }

    /**
     * Generate comment-style watermark
     */
    _generateCommentWatermark(text) {
        const lines = text.split('\n');
        const formatted = lines.map(line => `\t${line}`).join('\n');

        return `--[[\n${formatted}\n]]\n\n`;
    }

    /**
     * Generate hidden watermark (dalam string/variable yang tidak digunakan)
     */
    _generateHiddenWatermark(text) {
        const varName = this.random.generateName(2);
        const encoded = this._encodeText(text);

        return `local ${varName}=${encoded};`;
    }

    /**
     * Generate watermark sebagai variable
     */
    _generateVariableWatermark(text) {
        const varName = `_${this.random.generateName(1)}${this.random.generateName(1)}_`;
        const parts = [];

        // Split text dan encode
        for (let i = 0; i < text.length; i++) {
            parts.push(this.random.formatNumber(text.charCodeAt(i)));
        }

        // Buat sebagai table
        return `local ${varName}={${parts.join(',')}};`;
    }

    /**
     * Generate encoded watermark
     */
    _generateEncodedWatermark(text) {
        const varName = this.random.generateName(2);
        const key = this.random.bytes(8);
        const keyStr = key.map(b => this.random.formatNumber(b)).join(',');

        // XOR encode
        const encoded = [];
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const keyByte = key[i % key.length];
            encoded.push(this.random.formatNumber(charCode ^ keyByte));
        }

        let code = '';
        code += `local ${varName}=(function(d,k)`;
        code += `local r='';`;
        code += `for i=1,#d do `;
        code += `r=r..string.char(bit32.bxor(d[i],k[((i-1)%#k)+1]));`;
        code += `end;`;
        code += `return r;`;
        code += `end)({${encoded.join(',')}},{${keyStr}});`;

        return code;
    }

    /**
     * Encode text ke escape sequences
     */
    _encodeText(text) {
        const result = [];
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            const format = this.random.int(1, 3);
            
            if (format === 1) {
                result.push(`\\${code}`);
            } else if (format === 2) {
                result.push(`\\x${code.toString(16).padStart(2, '0')}`);
            } else {
                if (code >= 32 && code <= 126 && code !== 34 && code !== 92) {
                    result.push(text[i]);
                } else {
                    result.push(`\\${code}`);
                }
            }
        }
        return `"${result.join('')}"`;
    }

    /**
     * Add watermark ke code
     */
    apply(code, position = null) {
        position = position || this.config.position;
        const watermark = this.generate();

        if (position === 'top') {
            return watermark + code;
        } else if (position === 'bottom') {
            return code + '\n' + watermark;
        } else if (position === 'both') {
            return watermark + code + '\n' + this._generateHiddenWatermark(this.config.text);
        }

        return watermark + code;
    }

    /**
     * Generate timestamp watermark
     */
    generateTimestamp() {
        const now = new Date();
        const timestamp = now.toISOString();
        const vars = {
            time: this.random.generateName(2)
        };

        return `local ${vars.time}="${timestamp}";`;
    }

    /**
     * Generate unique ID watermark
     */
    generateUniqueId() {
        const id = this.random.key(32);
        const vars = {
            id: this.random.generateName(2)
        };

        return `local ${vars.id}="${id}";`;
    }

    /**
     * Reset state
     */
    reset() {
        this.random.resetNames();
    }
}

module.exports = WatermarkGenerator;
