# Base image
FROM node:18-alpine AS base

# Create app directory
RUN apk add --no-cache libc6-compat
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json yarn.lock* ./

# Install app dependencies
RUN yarn install
RUN apt-get install dnsutils
# Bundle app source
COPY . .

# Copy the .env file
#COPY .env  ./

# Creates a "dist" folder with the production build
RUN yarn build

# Expose the port on which the app will run
EXPOSE 3000

# Start the server using the production build
CMD ["yarn", "start"]
