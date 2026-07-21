FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/

# Copy static apps
COPY app-formulario /usr/share/nginx/html/app-formulario
COPY app-painel /usr/share/nginx/html/app-painel
COPY app-acompanhamento /usr/share/nginx/html/app-acompanhamento
COPY app-calendario /usr/share/nginx/html/app-calendario
COPY app-manutencao /usr/share/nginx/html/app-manutencao

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
