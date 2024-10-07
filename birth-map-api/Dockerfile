# Use the official Node.js 18 image based on Ubuntu
FROM node:18

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    wget \
    unzip \
    libssl-dev \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Set NODE_ENV to development to include devDependencies
ENV NODE_ENV=development

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start your application
CMD ["npm", "start"]
