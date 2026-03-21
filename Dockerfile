# Imagem base leve do Node.js 20 (Atualizada para suportar o banco SQLite mais recente)
FROM node:20-bookworm-slim

# Instala os pacotes do Linux essenciais para o bot conseguir rodar o Chrome invisível nas nuvens
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
       libx11-xcb1 libxcomposite1 libasound2 libatk1.0-0 libatk-bridge2.0-0 \
       libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 \
       libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
       libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
       libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
       libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# Configura a pasta de trabalho
WORKDIR /usr/src/app

# Copia e instala as bibliotecas do pacote
COPY package*.json ./
RUN npm install

# Copia o restante dos seus arquivos
COPY . .

# Expõe a porta que o Render vai ler para manter o bot vivo
EXPOSE 3000

# Comando de largada
CMD ["npm", "start"]
