# Base image layer. This defines the OS and preinstalled node (+ npm)
# Official node 24 built on Alpine Linux (small).
FROM docker.io/library/node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53

# Sets the working directory inside the image to /app in the container
WORKDIR /app

# Copies package.json and package-lock.json from the host folder into the /app in the image
# .npmrc rides along: its legacy-peer-deps decides what `npm ci` expects in the lockfile.
COPY package*.json .npmrc ./

# Install all dependencies (including devDependencies for Vite dev server)
RUN npm ci

# Copy all the project files
COPY . .

# 8080 is THIS repo's port, not Vite's — Vite's own default is 5173. It is set in vite.config.ts
# from VITE_APP_PORT, which compose also uses for the published mapping, so the two cannot drift.
# EXPOSE is documentation either way: it publishes nothing, and changing VITE_APP_PORT without
# touching this line still works. Keep them in step so the file does not lie.
EXPOSE 8080

# Images default commands to be executed at RUNTIME. Must be in JSON array format.
CMD ["npm", "run", "dev"]