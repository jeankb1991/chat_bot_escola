# 🤖 Chatbot Escolar Inteligente para WhatsApp

Um sistema completo de atendimento educacional para escolas, atuando automaticamente pelo WhatsApp (via Webhook) para responder dúvidas frequentes sobre matrículas, financeiro, horários e muito mais.

## ✨ Funcionalidades
1. **Atendimento Humanizado:** Utiliza máquina de estados (Session/State Machine) garantindo fluxo inteligente. Simulador de delay de digitação para aparentar humanidade.
2. **Captação de Matrículas:** O Chatbot tem uma etapa de vendas (`MATRICULA`) que salva o interesse no banco de dados SQLite.
3. **Escalabilidade Plug-n-Play:** É um Webhook agnóstico. Funciona recebendo POST do Twilio (Sandbox/Oficial), da Meta Cloud API ou de nosso próprio simulador WebHub!
4. **Armazenamento Seguro:** Não perde o estado da conversa caso a pessoa demore horas pra responder (Sessões armazenadas no SQLite).

## 🚀 Como Executar e Testar Agora

**Não tem Twilio? Sem problemas! Criei um simulador embutido para você testar imediatamente.**

### Passos de Instalação:
1. Abra um terminal na pasta do projeto e instale as bibliotecas:
   ```bash
   npm install
   ```
2. Inicialize o servidor e o banco de dados:
   ```bash
   npm start
   ```
3. Acesse **[http://localhost:3000](http://localhost:3000)** no seu navegador.
4. Nessa tela web, digite o seu número, mande um *"Oi"*, responda informando seu nome e veja todo o fluxo da conversa direto pelos testes práticos! Observe os Logs do seu terminal que mostrarão a Inteligência Artificial agindo do "Outro Lado" no tempo calculado da digitação!

## 📂 Visão Geral da Arquitetura
* **`server.js`:** Ponto de entrada que centraliza o Express, CORS, e escuta nosso portal de Webhook.
* **`src/controllers/webhookController.js`:** Parser inteligente. Ele consegue descobrir de onde a mensagem está vindo.
* **`src/services/botLogic.js`:** O coração! Fluxo de decisões, menus e estados de cada telefone que entra em contato.
* **`src/services/whatsappService.js`:** O robô enviador. Atualmente simula e loga localmente, mas já está pronto (e comentado) com o código para engatilhar um POST para disparo no zap real.
* **`src/db/database.js`:** Banco de dados SQLite contendo todo o histórico entre `bot <-> user`, além de banco de Leads interessados (captação para time escolar).

## 🔗 Passo-a-Passo: Configurar Twilio/WhatsApp Real
Quando estiver pronto para plugar num WhatsApp Oficial:

1. Modifique `.env`:
   ```env
   # Você vai precisar do seu Access Token
   WHATSAPP_TOKEN=seu_token_da_meta_aqui
   WHATSAPP_API_URL=https://graph.facebook.com/v17.0/PHONE_ID/messages
   ```
2. Em `whatsappService.js`, retire os comentários (`//`) da chamada do `axios.post(...)`.
3. Instale o ngrok (`npm start` rodando normalmente). E em outra aba:
   ```bash
   ngrok http 3000
   ```
4. Copie a URL (ex: `https://abcdxyz.ngrok-free.app`) fornecida pelo ngrok e registre seu Webhook no painel da Meta For Developers apontando para: `https://abcdxyz.ngrok-free.app/webhook`. (Ele fará o GET request de validação e vai verificar com o token `escola123`).

## ✍🏻 Estilo de Comunicação
O Bot foi programado usando Emojis simples, saudações educadas, compreensão do nome e personalização nas falas. Se o usuário digitar algo fora do menu (do 1 ao 6), ele volta ao fluxo sem erro gritante.
