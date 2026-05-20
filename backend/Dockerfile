FROM node:20-alpine

WORKDIR /home/node/app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy source
COPY src ./src

# Create logs directory
RUN mkdir -p logs

# Non-root user
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
