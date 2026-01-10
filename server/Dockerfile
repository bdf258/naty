FROM node:20-alpine

WORKDIR /app

# Install curl for health checks and build tools for native modules
RUN apk add --no-cache curl python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Health check using curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "index.js"]
