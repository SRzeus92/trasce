# Stage 1: build frontend assets (TypeScript + Tailwind)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# Copy sources and build
COPY frontend .
RUN npm run build

# Stage 2: nginx serving built assets + reverse proxy
FROM nginx:alpine

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy built frontend (index + dist)
COPY --from=frontend-builder /app/frontend/index.html /usr/share/nginx/html/index.html
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html/dist

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Generate self-signed certificate for development
# In production, use real certificates (Let's Encrypt, etc.)
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/C=IT/ST=State/L=City/O=42/CN=localhost"

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
