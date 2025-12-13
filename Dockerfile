ARG  NODE_ENV

# BUILD FOR PRODUCTION
FROM node:20-alpine AS build

WORKDIR /app

ENV NODE_ENV = ${NODE_ENV}

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Copy source files needed for build
COPY tsconfig.build.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies (prepare script will skip husky if .husky doesn't exist)
RUN yarn --network-timeout 1000000

# Copy all source code
COPY . .

# Build the application
RUN yarn build


# PRODUCTION
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install only production dependencies
RUN yarn --network-timeout 1000000 --production

# Install LibreOffice for document conversion and poppler for OCR PDF rendering
RUN apk add --no-cache libreoffice poppler-utils

# Copy built application from build stage
COPY --from=build /app/dist ./dist

CMD [ "node", "dist/main.js" ]

