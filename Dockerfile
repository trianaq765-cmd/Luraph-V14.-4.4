# ═══════════════════════════════════════════════════════════
# LuaShield Obfuscator Bot - Docker Configuration
# ═══════════════════════════════════════════════════════════

# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start bot
CMD ["npm", "start"]
