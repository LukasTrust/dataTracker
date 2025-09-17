# ---- Stage 1: Build Angular app ----
FROM node:22.19.0 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install -g @angular/cli@20.3.1 && npm install

COPY . .

# Build Angular app for production
RUN npx ng build --configuration production

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Copy the correct dist folder into Nginx
COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html/

# Remove default config first
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
