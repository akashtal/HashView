FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Install python, build tools, canvas dependencies, and fonts for Debian
RUN apt-get update && apt-get install -y \
    python3 make g++ build-essential \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    fonts-dejavu-core fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (ignoring scripts temporarily if canvas tries to build from source)
RUN npm install --legacy-peer-deps


# Copy project files
COPY . .

# Expose backend port
EXPOSE 5001

# Command to run the application
CMD ["npm", "start"]
