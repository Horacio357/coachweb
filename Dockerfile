FROM node:20-alpine

# Instalar herramientas de compilación C++ para módulos nativos (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código del proyecto
COPY . .

# Exponer el puerto 3000 por defecto
EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
