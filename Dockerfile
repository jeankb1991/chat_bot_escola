# Imagem base leve do Node.js 20 (Atualizada para suportar o banco SQLite mais recente)
FROM node:20-bookworm-slim

# Instala apenas o essencial (Python e ferramentas de Build para SQLite + Git e LibVips para Baileys)
RUN apt-get update && apt-get install -y \
    python3 make g++ git libvips-dev \
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
