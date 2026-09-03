# Stage 1: Build the Vite React App
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine as production-stage

ENV APP_PORT=80
ENV BACKEND_URL=http://backend:8000
ENV NGINX_ENVSUBST_FILTER="APP_PORT|BACKEND_URL"

# Copy custom Nginx configuration template
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Copy built assets from the previous stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port from env (using the same default as the ENV)
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
