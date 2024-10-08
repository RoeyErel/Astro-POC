# Use the official Node.js 18 image
FROM node:18

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including devDependencies
RUN npm install

# Copy the rest of your application
COPY . .

# Expose the port for the Vite development server
EXPOSE 5173

# Start the Vite development server
CMD ["npm", "run", "dev"]
