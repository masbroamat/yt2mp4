# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Install yt-dlp and its dependencies
RUN apk add --no-cache yt-dlp ffmpeg

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Conditionally replace the Windows "del" command with Linux "rm -f" in the download route file if it exists.
RUN sed -i 's/del "/rm -f "/g' ./src/app/api/download/route.js

# Build the Next.js app
RUN npm run build

# Expose the Next.js default port
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "run", "start"]
