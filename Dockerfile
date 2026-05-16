# ── Stage 1: Build the React app ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build arg baked into the JS bundle at build time
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Install dependencies (cached layer)
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine

# React static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx site config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
