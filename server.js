require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { webhookPost, webhookVerify } = require('./src/controllers/webhookController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para processar JSON e Form Data (importante para webhooks do Twilio)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ------------------------------------------------------------------------
// Rotas de Webhook para a API do WhatsApp
// ------------------------------------------------------------------------

// O GET é usado para verificação e validação do Webhook (exigido pela Meta/Facebook)
app.get('/webhook', webhookVerify);

// O POST é usado para receber as mensagens reais do usuário
app.post('/webhook', webhookPost);


// ------------------------------------------------------------------------
// ROTA PARA FACILITAR O PAREAMENTO DO WHATSAPP (QR CODE NA WEB)
// ------------------------------------------------------------------------
app.get('/qr', (req, res) => {
    const whatsappService = require('./src/services/whatsappService');
    
    if (whatsappService.isAuthenticated) {
        return res.send('<h1>✅ O WhatsApp já está conectado!</h1><p>Você já pode fechar esta página.</p>');
    }

    if (!whatsappService.lastQr) {
        return res.send('<h1>⏳ Aguardando QR Code...</h1><p>O bot está iniciando. Atualize a página em alguns instantes.</p><script>setTimeout(() => location.reload(), 3000)</script>');
    }

    // Gerar a URL da imagem do QR Code usando uma API pública (mais simples e rápido)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappService.lastQr)}`;

    res.send(`
        <html>
        <head>
            <title>Conectar WhatsApp - Chatbot Escolar</title>
            <style>
                body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5; margin: 0; }
                .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; }
                h1 { color: #075e54; margin-bottom: 0.5rem; }
                p { color: #666; margin-bottom: 1.5rem; }
                img { border: 10px solid white; border-radius: 8px; background: white; }
                .status { margin-top: 1rem; font-size: 0.9rem; color: #888; }
            </style>
            <script>
                // Atualiza a página automaticamente para detectar quando o bot conectar
                setInterval(() => {
                    fetch(window.location.href).then(r => r.text()).then(html => {
                        if (html.includes('✅')) window.location.reload();
                    });
                }, 5000);
            </script>
        </head>
        <body>
            <div class="card">
                <h1>Vincular WhatsApp</h1>
                <p>Abra o WhatsApp no seu celular e escaneie o código abaixo:</p>
                <img src="${qrImageUrl}" alt="WhatsApp QR Code" />
                <div class="status">Esta página atualizará sozinha após a conexão.</div>
            </div>
        </body>
        </html>
    `);
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Chatbot Escolar API</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 2rem; max-width: 800px; margin: auto; background: #f0f2f5; color: #333; }
                .container { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                h1 { color: #0056b3; }
                code { background: #eee; padding: 2px 6px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Chatbot Escolar - Backend</h1>
                <p>O servidor está rodando perfeitamente e aguardando as mensagens no endpoint: <code>POST /webhook</code></p>
                <p>Abra o console/terminal onde você rodou o script para ver os logs do bot enviando respostas de volta! 🎉</p>
                
                <hr style="margin: 2rem 0; border: 0; border-top: 1px solid #eee;" />
                
                <h3>🛠️ Testar o Chatbot (Simulador Web)</h3>
                <form action="/webhook" method="POST" target="dummyframe" onsubmit="setTimeout(() => document.getElementById('msgInput').value='', 100);">
                    <label>Seu Número de Telefone (Ex: 5511999999999):</label><br>
                    <input type="text" name="phone" value="5511999999999" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;" required /><br>
                    <label>Mensagem:</label><br>
                    <input type="text" name="message" id="msgInput" placeholder="Ex: Oi" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;" required autocomplete="off" /><br>
                    <button type="submit" style="background: #25D366; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: bold;">Enviar para o Bot</button>
                </form>
                <iframe name="dummyframe" id="dummyframe" style="display: none;"></iframe>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`🚀 Servidor do Webhook rodando na porta ${PORT}`);
    console.log(`🔗 Interface Local p/ testes Web: http://localhost:${PORT}`);
    console.log(`========================================================\n`);
});

// =========================================================================
// INTEGRAÇÃO: WHATSAPP WEB JS (Modo Sem Token via QR Code)
// =========================================================================
const whatsappService = require('./src/services/whatsappService');
const { handleIncomingMessage } = require('./src/services/botLogic');

// Ouça qualquer pessoa que chame você no WhatsApp vinculado!
whatsappService.client.on('message', async (msg) => {
    // Ignora mensagens de Grupos, Comunidades e de Status. Só responde contatos normais (@c.us)
    if (!msg.from || !msg.from.endsWith('@c.us')) {
        return;
    }

    // Escuta tudo o que as pessoas te enviam
    // fromMe = false (para assegurar que o bot não responderá a si mesmo)
    if (!msg.fromMe && msg.body) {
        
        // Obter número limpo sem o sulfixo @c.us (ex: 5511999999999@c.us -> 5511999999999)
        const phone = msg.from.split('@')[0]; 
        
        console.log(`\n\x1b[34m[WHATSAPP REAL - USUÁRIO ${phone}]:\x1b[0m ${msg.body}`);
        
        // Repassa exatamente a mesma inteligência construída antes para o modo celular gratuito!
        try {
            await handleIncomingMessage(phone, msg.body);
        } catch (error) {
            console.error('Erro na lógica do chatbot:', error);
        }
    }
});

// Inicializa a sessão web invisível!
whatsappService.initialize();
