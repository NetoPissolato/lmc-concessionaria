FROM nginx:1.25-alpine

# Remover config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nossa config
COPY nginx.conf /etc/nginx/nginx.conf

# Criar diretórios necessários
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
