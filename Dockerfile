# Imagem base leve do Node.js 20 (Atualizada para suportar o banco SQLite mais recente)
FROM node:20-bookworm-slim

# Instala os pacotes do Linux essenciais para o bot conseguir rodar o Chrome invisível nas nuvens, e ferramentas de compilação
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates python3 make g++ \
       libx11-xcb1 libxcomposite1 libasound2 libatk1.0-0 libatk-bridge2.0-0 \
       libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 \
       libgcc-s1 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
       libpangocairo-1.0-0 libstdc++6 libx11-6 libxcb1 \
       libxcursor1 libxdamage1 libxext6 libxfixes3 \
       libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
       libnss3 libdrm2 libxkbcommon0 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Configura a pasta de trabalho
WORKDIR /usr/src/app

# Copia TODOS os arquivos do seu GitHub de uma vez
COPY . .

# Esse é o segredo! Apaga a pasta node_modules que possa ter vindo do seu computador quebrando o banco,
# E instala as bibliotecas a força diretamente para o sistema do servidor a partir do código fonte (build-from-source)
RUN rm -rf node_modules && npm install --build-from-source=sqlite3

# Expõe a porta que o Render vai ler para manter o bot vivo
EXPOSE 3000

# Comando de largada
CMD ["npm", "start"]
