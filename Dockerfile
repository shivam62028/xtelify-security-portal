# Stage 1: Build the app using Node 20
FROM node:20-alpine AS build
WORKDIR /app

# Copy only the package files first
COPY package*.json ./
RUN npm install

# Copy the rest and build
COPY . .
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]