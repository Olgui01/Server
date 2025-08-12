FROM node:22-alpine

WORKDIR /home/app

# Instalar dependencias necesarias para compilar sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

COPY package*.json ./

# Instalar dependencias (incluyendo sharp)
RUN npm install --include=optional

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
