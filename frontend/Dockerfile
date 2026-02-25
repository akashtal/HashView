FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose Metro bundler port
EXPOSE 8081

# Command to start the Expo bundler
CMD ["npx", "expo", "start"]
