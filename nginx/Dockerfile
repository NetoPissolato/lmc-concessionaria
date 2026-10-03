FROM nginx:1.25-alpine

# Remover config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nossa config
COPY nginx.conf /etc/nginx/nginx.conf

# Criar diretórios necessários
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

# O certbot renova o certificado em disco, mas o nginx só lê o arquivo novo ao recarregar.
# Recarrega a cada 12h (sem derrubar conexões) para nunca servir um certificado vencido.
CMD ["/bin/sh", "-c", "while :; do sleep 12h; nginx -s reload; done & exec nginx -g 'daemon off;'"]
