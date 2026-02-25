ARG  NODE_ENV

# BUILD FOR PRODUCTION
FROM node:20-alpine AS build

WORKDIR /app

ENV NODE_ENV = ${NODE_ENV}

# Copy package files
COPY package*.json ./

# Copy source files needed for build
COPY tsconfig.build.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy all source code
COPY . .

# Build the application
RUN npm run build


# PRODUCTION
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Install LibreOffice for document conversion and poppler for OCR PDF rendering
RUN apk add --no-cache libreoffice poppler-utils

# Copy built application from build stage
COPY --from=build /app/dist ./dist

CMD [ "node", "dist/main.js" ]

