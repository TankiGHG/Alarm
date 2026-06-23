FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create data directory and set permissions to node user before switching
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-root user
USER node

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies. Node 20 alpine with better-sqlite3 usually fetches prebuilt binary.
RUN npm install

# Copy application code
COPY --chown=node:node . .

EXPOSE 3000

CMD ["npm", "start"]
