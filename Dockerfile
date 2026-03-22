# Imagem base leve do Node.js 20 (Atualizada para suportar o banco SQLite mais recente)
FROM node:20-bookworm-slim

# Instala as dependências e o Google Chrome Stable oficial
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates python3 make g++ \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Evita que o Puppeteer baixe o Chromium próprio (economiza RAM e Espaço)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

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
