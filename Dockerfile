# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /app

# Install Python and build tools (needed for some native modules)
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your source code
COPY . .

# Build the Next.js app
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine
WORKDIR /app

# Install Python runtime and ffmpeg (which includes ffprobe)
RUN apk add --no-cache python3 ffmpeg

# Copy the built application from the builder stage
COPY --from=builder /app ./

# Expose the port your app runs on
EXPOSE 3000

# Start the application in production mode (or dev mode with 0.0.0.0 binding)
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
