# Base image layer. This defines the OS and preinstalled node (+ npm)
# Official node 25 built on Alpine Linux (small).
FROM node:25-alpine

# Sets the working directory inside the image to /app in the container
WORKDIR /app

# Copies package.json and package-lock.json from the host folder into the /app in the image
COPY package*.json ./

# Install all dependencies (including devDependencies for Vite dev server)
RUN npm ci

# Copy all the project files
COPY . .

# Vite dev server defaults to port 8080
EXPOSE 8080

# Images default commands to be executed at RUNTIME. Must be in JSON array format.
CMD ["npm", "run", "dev"]