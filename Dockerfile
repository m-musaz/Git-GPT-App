FROM node:20-slim

WORKDIR /app

# Copy package files first
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY widget/package.json ./widget/

# Install dependencies fresh (no package-lock to avoid platform mismatch)
RUN npm install

# Copy source code
COPY . .

# Build all workspaces
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

