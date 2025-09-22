# Multi-stage build for Angular app
FROM node:22.12-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Copy source code
COPY . .

# Build the Angular application - Fix: specify the project name
RUN ng build shared-lib
RUN ng build client --configuration staging


# Production stage with Nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY k8s/ctx/nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist/shared-lib/ /usr/share/nginx/html
COPY --from=builder /app/dist/client/browser/ /usr/share/nginx/html

# Copy additional nginx configuration for Angular routing
COPY k8s/ctx/default.conf /etc/nginx/conf.d/default.conf

# Switch to non-root user
USER nginx
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
