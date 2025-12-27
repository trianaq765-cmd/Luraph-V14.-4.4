/**
 * LuaShield - VM Obfuscator Transform
 * Mengintegrasikan bytecode generator dengan VM template
 */

const BytecodeGenerator = require('../vm/bytecode');
const VMTemplate = require('../vm/template');
const Random = require('../../utils/random');

class VMObfuscator {
    constructor(options = {}) {
        this.random = new Random(options.seed);
        this.bytecodeGen = new BytecodeGenerator({
            seed: options.seed,
            compressionLevel: options.compressionLevel || 3
        });
        this.vmTemplate = new VMTemplate({
            seed: options.seed
        });
        
        this.config = {
            enabled: options.enabled !== false,
            complexity: options.complexity || 'medium', // low, medium, high, extreme
            multiLayer: options.multiLayer || false,
            layers: options.layers || 2,
            antiTamper: options.antiTamper !== false,
            antiDebug: options.antiDebug !== false,
            encryptStrings: options.encryptStrings !== false,
            obfuscateVM: options.obfuscateVM !== false
        };

        this.complexitySettings = {
            low: { fakeOps: 10, handlers: 15, registers: 32 },
            medium: { fakeOps: 25, handlers: 30, registers: 64 },
            high: { fakeOps: 50, handlers: 50, registers: 128 },
            extreme: { fakeOps: 100, handlers: 80, registers: 256 }
        };
    }

    /**
     * Transform code dengan VM protection
     */
    transform(code, context = {}) {
        if (!this.config.enabled) return code;

        try {
            const settings = this.complexitySettings[this.config.complexity] || 
                           this.complexitySettings.medium;

            // Generate bytecode
            const bytecode = this.bytecodeGen.generate(code);

            // Generate VM dengan settings
            const vm = this.vmTemplate.generate({
                bytecode: bytecode,
                fakeOps: settings.fakeOps,
                handlers: settings.handlers,
                registers: settings.registers,
                antiTamper: this.config.antiTamper,
                antiDebug: this.config.antiDebug
            });

            // Wrap dalam loader
            let result = this._wrapWithLoader(vm, bytecode);

            // Multi-layer jika diaktifkan
            if (this.config.multiLayer) {
                for (let i = 1; i < this.config.layers; i++) {
                    result = this._addLayer(result, i);
                }
            }

            return result;

        } catch (error) {
            console.error('[VMObfuscator] Error:', error.message);
            return code; // Fallback ke original
        }
    }

    /**
     * Wrap VM dengan loader code
     */
    _wrapWithLoader(vmCode, bytecode) {
        const loaderVar = this.random.generateName(3);
        const envVar = this.random.generateName(3);
        const dataVar = this.random.generateName(3);
        const runVar = this.random.generateName(3);
        const checkVar = this.random.generateName(3);

        // Serialize bytecode
        const serialized = this._serializeBytecode(bytecode);

        // Anti-tamper check
        const antiTamper = this.config.antiTamper ? this._generateAntiTamper(checkVar) : '';

        // Anti-debug check
        const antiDebug = this.config.antiDebug ? this._generateAntiDebug() : '';

        return `
do
    ${antiDebug}
    ${antiTamper}
    
    local ${envVar} = getfenv and getfenv() or _ENV or _G
    local ${dataVar} = "${serialized}"
    
    ${vmCode}
    
    local ${runVar} = function()
        local ${loaderVar} = ${this.vmTemplate.getVMName()}
        if ${loaderVar} and type(${loaderVar}) == "table" and ${loaderVar}.execute then
            return ${loaderVar}:execute(${dataVar}, ${envVar})
        end
    end
    
    ${this.config.antiTamper ? `if ${checkVar}() then` : ''}
        ${runVar}()
    ${this.config.antiTamper ? `end` : ''}
end
`.trim();
    }

    /**
     * Serialize bytecode ke string
     */
    _serializeBytecode(bytecode) {
        const data = {
            h: bytecode.header,
            i: bytecode.instructions.map(inst => ({
                o: inst.opcode,
                a: inst.A,
                b: inst.B,
                c: inst.C,
                x: inst.Bx,
                s: inst.sBx,
                f: inst.isFake ? 1 : 0
            })),
            c: bytecode.constants.map(c => ({
                t: c.type.charAt(0),
                v: c.value,
                e: c.encrypted
            })),
            u: bytecode.upvalues,
            p: bytecode.prototypes,
            d: bytecode.debugInfo
        };

        // Encode ke base64-like format
        const json = JSON.stringify(data);
        const encoded = this._encode(json);
        
        return encoded;
    }

    /**
     * Custom encoding
     */
    _encode(str) {
        const key = this.random.bytes(16);
        const encoded = [];
        
        for (let i = 0; i < str.length; i++) {
            const byte = str.charCodeAt(i) ^ key[i % key.length];
            encoded.push(byte.toString(16).padStart(2, '0'));
        }
        
        // Prepend key
        const keyHex = key.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return keyHex + encoded.join('');
    }

    /**
     * Generate anti-tamper code
     */
    _generateAntiTamper(checkVar) {
        const hashVar = this.random.generateName(2);
        const valVar = this.random.generateName(2);
        
        return `
    local ${checkVar} = function()
        local ${hashVar} = 0
        local ${valVar} = tostring({}):sub(8)
        for i = 1, #${valVar} do
            ${hashVar} = (${hashVar} * 31 + string.byte(${valVar}, i)) % 2147483647
        end
        return ${hashVar} > 0
    end
`;
    }

    /**
     * Generate anti-debug code
     */
    _generateAntiDebug() {
        const checkFuncs = [
            `if rawget(_G, "debug") then local d = rawget(_G, "debug") if d.sethook then d.sethook(function() end) end end`,
            `if jit then pcall(function() jit.off() end) end`,
        ];

        return checkFuncs.join('\n    ');
    }

    /**
     * Add additional protection layer
     */
    _addLayer(code, layerNum) {
        const wrapperVar = this.random.generateName(3);
        const funcVar = this.random.generateName(3);
        const envVar = this.random.generateName(2);

        // Encode the code
        const encoded = this._encodeLayer(code, layerNum);

        return `
do
    local ${envVar} = getfenv and getfenv() or _ENV or _G
    local ${wrapperVar} = "${encoded.data}"
    local ${funcVar} = function(s, k)
        local r = {}
        for i = 1, #s, 2 do
            local b = tonumber(s:sub(i, i+1), 16)
            if b then
                r[#r+1] = string.char(((b - k[((i-1)/2) % #k + 1]) + 256) % 256)
            end
        end
        return table.concat(r)
    end
    local ok, result = pcall(function()
        return loadstring(${funcVar}(${wrapperVar}, {${encoded.key.join(',')}}))
    end)
    if ok and result then
        setfenv and setfenv(result, ${envVar})
        result()
    end
end
`.trim();
    }

    /**
     * Encode layer data
     */
    _encodeLayer(code, layerNum) {
        const keyLen = 8 + layerNum * 4;
        const key = [];
        for (let i = 0; i < keyLen; i++) {
            key.push(this.random.int(1, 255));
        }

        const encoded = [];
        for (let i = 0; i < code.length; i++) {
            const byte = (code.charCodeAt(i) + key[i % key.length]) % 256;
            encoded.push(byte.toString(16).padStart(2, '0'));
        }

        return { data: encoded.join(''), key };
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            complexity: this.config.complexity,
            multiLayer: this.config.multiLayer,
            layers: this.config.layers,
            antiTamper: this.config.antiTamper,
            antiDebug: this.config.antiDebug
        };
    }
}

module.exports = VMObfuscator;
