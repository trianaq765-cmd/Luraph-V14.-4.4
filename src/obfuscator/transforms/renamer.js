/**
 * LuaShield - Variable Renamer
 * Rename variables dengan Luraph-style names
 */

const Random = require('../../utils/random');

class Renamer {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.renameMap = new Map();
        this.scopeStack = [];
        this.globalScope = new Set();
        
        // Built-in names yang tidak boleh di-rename
        this.builtIns = new Set([
            // Lua built-ins
            'print', 'pairs', 'ipairs', 'next', 'type', 'tostring', 'tonumber',
            'pcall', 'xpcall', 'error', 'assert', 'select', 'unpack', 'pack',
            'rawget', 'rawset', 'rawequal', 'setmetatable', 'getmetatable',
            'collectgarbage', 'loadstring', 'load', 'dofile', 'require',
            'module', 'setfenv', 'getfenv',
            
            // Lua libraries
            'string', 'table', 'math', 'bit32', 'bit', 'coroutine', 'os', 'io', 'debug',
            
            // Lua globals
            '_G', '_VERSION', '_ENV', 'arg', 'self',
            
            // String methods
            'sub', 'byte', 'char', 'find', 'format', 'gmatch', 'gsub', 'len',
            'lower', 'upper', 'match', 'rep', 'reverse', 'split',
            
            // Table methods
            'concat', 'insert', 'remove', 'sort', 'move', 'pack', 'unpack',
            
            // Math methods
            'abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'deg', 'exp', 'floor',
            'fmod', 'huge', 'log', 'max', 'min', 'modf', 'pi', 'pow', 'rad',
            'random', 'randomseed', 'sin', 'sqrt', 'tan', 'clamp', 'sign', 'noise',
            
            // Bit32 methods
            'band', 'bor', 'bxor', 'bnot', 'lshift', 'rshift', 'arshift',
            'extract', 'replace', 'btest',
            
            // Coroutine methods
            'create', 'resume', 'yield', 'status', 'wrap', 'running',
            
            // Roblox globals
            'game', 'workspace', 'script', 'plugin',
            'Instance', 'Vector2', 'Vector3', 'CFrame', 'Color3', 'BrickColor',
            'UDim', 'UDim2', 'Rect', 'Ray', 'Region3', 'Faces', 'Axes',
            'Enum', 'TweenInfo', 'NumberSequence', 'ColorSequence',
            'NumberSequenceKeypoint', 'ColorSequenceKeypoint',
            'PhysicalProperties', 'NumberRange', 'PathWaypoint',
            'Random', 'DateTime', 'Font', 'OverlapParams', 'RaycastParams',
            'DockWidgetPluginGuiInfo', 'RotationCurveKey',
            
            // Roblox services & globals
            'task', 'wait', 'Wait', 'spawn', 'Spawn', 'delay', 'Delay',
            'tick', 'time', 'elapsedTime', 'utf8', 'typeof', 'version',
            'printidentity', 'warn', 'shared', 'UserSettings',
            
            // Roblox methods sering dipakai
            'new', 'Clone', 'Destroy', 'FindFirstChild', 'WaitForChild',
            'GetChildren', 'GetDescendants', 'IsA', 'GetService',
            'Connect', 'Disconnect', 'Fire', 'Invoke',
            
            // Common executor globals
            'getgenv', 'getrenv', 'getreg', 'getgc', 'getinfo',
            'hookfunction', 'hookmetamethod', 'newcclosure', 'iscclosure',
            'islclosure', 'isexecutorclosure', 'checkcaller', 'getcallingscript',
            'setreadonly', 'isreadonly', 'getrawmetatable', 'setrawmetatable',
            'getnamecallmethod', 'setnamecallmethod', 'getsenv', 'getcustomasset',
            'fireclickdetector', 'firetouchinterest', 'fireproximityprompt',
            'getconnections', 'request', 'http_request', 'syn', 'fluxus'
        ]);
    }

    /**
     * Check jika identifier adalah built-in
     */
    isBuiltIn(name) {
        return this.builtIns.has(name);
    }

    /**
     * Add custom built-in (untuk target platform)
     */
    addBuiltIn(name) {
        if (Array.isArray(name)) {
            name.forEach(n => this.builtIns.add(n));
        } else {
            this.builtIns.add(name);
        }
    }

    /**
     * Generate new name untuk identifier
     */
    generateName(originalName) {
        // Check cache
        if (this.renameMap.has(originalName)) {
            return this.renameMap.get(originalName);
        }

        // Skip built-ins
        if (this.isBuiltIn(originalName)) {
            return originalName;
        }

        // Generate Luraph-style name
        const newName = this.random.generateName();
        this.renameMap.set(originalName, newName);
        
        return newName;
    }

    /**
     * Rename semua identifiers dalam code
     */
    rename(code) {
        // Step 1: Extract semua identifiers
        const identifiers = this._extractIdentifiers(code);
        
        // Step 2: Generate mapping untuk setiap identifier
        for (const id of identifiers) {
            if (!this.isBuiltIn(id)) {
                this.generateName(id);
            }
        }

        // Step 3: Apply renaming
        let result = code;
        
        // Sort by length (longest first) to avoid partial replacements
        const sorted = Array.from(this.renameMap.entries())
            .sort((a, b) => b[0].length - a[0].length);

        for (const [oldName, newName] of sorted) {
            // Use word boundary to avoid partial matches
            const regex = new RegExp(`\\b${this._escapeRegex(oldName)}\\b`, 'g');
            result = result.replace(regex, newName);
        }

        return result;
    }

    /**
     * Extract identifiers dari code
     */
    _extractIdentifiers(code) {
        const identifiers = new Set();
        
        // Remove strings dan comments first
        const cleanCode = code
            .replace(/--\[\[[\s\S]*?\]\]/g, '') // Multi-line comments
            .replace(/--.*$/gm, '')              // Single-line comments
            .replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, '""'); // Strings
        
        // Extract local variable declarations
        const localRegex = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;
        while ((match = localRegex.exec(cleanCode)) !== null) {
            identifiers.add(match[1]);
        }

        // Extract function parameters
        const funcRegex = /\bfunction\s*[a-zA-Z_]*\s*\(([^)]*)\)/g;
        while ((match = funcRegex.exec(cleanCode)) !== null) {
            const params = match[1].split(',').map(p => p.trim()).filter(p => p);
            params.forEach(p => {
                const paramName = p.split('=')[0].trim();
                if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(paramName)) {
                    identifiers.add(paramName);
                }
            });
        }

        // Extract for loop variables
        const forRegex = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=,]/g;
        while ((match = forRegex.exec(cleanCode)) !== null) {
            identifiers.add(match[1]);
        }

        return Array.from(identifiers);
    }

    /**
     * Escape special regex characters
     */
    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get rename mapping
     */
    getMapping() {
        return Object.fromEntries(this.renameMap);
    }

    /**
     * Reset state
     */
    reset() {
        this.renameMap.clear();
        this.random.resetNames();
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            renamed: this.renameMap.size,
            mapping: this.getMapping()
        };
    }
}

module.exports = Renamer;
