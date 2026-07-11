# Stage 1: Build stage
FROM node:22-alpine AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package configuration files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the Angular SSR application in production mode
RUN npm run build -- --configuration=production

# Stage 2: Dependencies stage (install only production dependencies)
FROM node:22-alpine AS dependencies

WORKDIR /usr/src/app

COPY package*.json ./

# Install only production dependencies to keep the image lightweight
RUN npm ci --omit=dev

# Stage 3: Runner stage
FROM node:22-alpine AS runner

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

WORKDIR /usr/src/app

# Copy production dependencies
COPY --from=dependencies /usr/src/app/node_modules ./node_modules

# Copy built application output
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json

# Expose port 4000 (default for Angular SSR)
EXPOSE 4000

# Start the application server
CMD ["node", "dist/AngularEventplace/server/server.mjs"]
