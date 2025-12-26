/**
 * LuaShield - File Handler
 * Handles file uploads, downloads, dan temporary files
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const http = require('http');

class FileHandler {
    constructor() {
        this.tempDir = path.join(process.cwd(), 'temp');
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 500000; // 500KB
        
        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Download file dari Discord attachment
     */
    async downloadFromUrl(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            
            protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                const chunks = [];
                let size = 0;

                response.on('data', (chunk) => {
                    size += chunk.length;
                    if (size > this.maxFileSize) {
                        response.destroy();
                        reject(new Error(`File too large. Max: ${this.maxFileSize} bytes`));
                        return;
                    }
                    chunks.push(chunk);
                });

                response.on('end', () => {
                    resolve(Buffer.concat(chunks).toString('utf-8'));
                });

                response.on('error', reject);
            }).on('error', reject);
        });
    }

    /**
     * Save string to temporary file
     */
    saveTempFile(content, extension = '.lua') {
        const filename = `${uuidv4()}${extension}`;
        const filepath = path.join(this.tempDir, filename);
        
        fs.writeFileSync(filepath, content, 'utf-8');
        
        return {
            filename,
            filepath,
            size: Buffer.byteLength(content, 'utf-8')
        };
    }

    /**
     * Read file
     */
    readFile(filepath) {
        if (!fs.existsSync(filepath)) {
            throw new Error('File not found');
        }
        return fs.readFileSync(filepath, 'utf-8');
    }

    /**
     * Delete temporary file
     */
    deleteTempFile(filepath) {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                return true;
            }
        } catch (err) {
            console.error('Failed to delete temp file:', err);
        }
        return false;
    }

    /**
     * Clean old temporary files (older than 1 hour)
     */
    cleanTempFiles(maxAge = 3600000) {
        const now = Date.now();
        let cleaned = 0;

        try {
            const files = fs.readdirSync(this.tempDir);
            
            for (const file of files) {
                const filepath = path.join(this.tempDir, file);
                const stats = fs.statSync(filepath);
                
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filepath);
                    cleaned++;
                }
            }
        } catch (err) {
            console.error('Failed to clean temp files:', err);
        }

        return cleaned;
    }

    /**
     * Validate Lua file
     */
    validateLuaContent(content) {
        const errors = [];

        // Check size
        if (Buffer.byteLength(content, 'utf-8') > this.maxFileSize) {
            errors.push(`File too large. Max: ${this.maxFileSize} bytes`);
        }

        // Check if empty
        if (!content || content.trim().length === 0) {
            errors.push('File is empty');
        }

        // Basic Lua syntax check (very basic)
        const openBrackets = (content.match(/\bfunction\b/g) || []).length;
        const closeBrackets = (content.match(/\bend\b/g) || []).length;
        
        // This is a very rough check - real validation happens in parser
        if (openBrackets > closeBrackets + 5) {
            errors.push('Possible syntax error: unmatched function/end blocks');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Create Buffer from content for Discord attachment
     */
    createBuffer(content, filename = 'obfuscated.lua') {
        return {
            attachment: Buffer.from(content, 'utf-8'),
            name: filename
        };
    }

    /**
     * Get file stats
     */
    getStats(content) {
        const lines = content.split('\n').length;
        const size = Buffer.byteLength(content, 'utf-8');
        const chars = content.length;

        return { lines, size, chars };
    }
}

module.exports = new FileHandler();
