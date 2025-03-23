FROM nginx:alpine

# Remove default Nginx config and add a custom one
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a directory for static files (optional, as this will be mounted)
RUN mkdir -p /usr/share/nginx/html/static

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]