require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { webhookPost, webhookVerify } = require('./src/controllers/webhookController');
const { getStats } = require('./src/db/database');

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
        return res.send(`
            <html>
            <head>
                <title>Conectado - Chatbot Escolar</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #1e293b; padding: 3rem; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255,255,255,0.1); max-width: 400px; width: 90%; }
                    h1 { color: #22c55e; margin-bottom: 1rem; font-size: 2rem; }
                    p { color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; }
                    .btn { background: #22c55e; color: #020617; text-decoration: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 700; display: inline-block; transition: all 0.3s; }
                    .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.4); }
                </style>
            </head>
            <body>
                <div class="card">
                    <div style="font-size: 5rem; margin-bottom: 1rem;">✅</div>
                    <h1>WhatsApp Conectado!</h1>
                    <p>O bot está pronto para atender seus alunos e pais.</p>
                    <a href="/" class="btn">Ir para o Painel</a>
                </div>
            </body>
            </html>
        `);
    }

    if (!whatsappService.lastQr) {
        return res.send(`
            <html>
            <head>
                <title>Aguardando... - Chatbot Escolar</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #1e293b; padding: 3rem; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255,255,255,0.1); }
                    .loader { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #22c55e; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 2rem; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
                    p { color: #94a3b8; }
                </style>
                <script>setTimeout(() => location.reload(), 3000)</script>
            </head>
            <body>
                <div class="card">
                    <div class="loader"></div>
                    <h1>Iniciando Sessão...</h1>
                    <p>O bot está gerando o QR Code. Aguarde alguns instantes.</p>
                </div>
            </body>
            </html>
        `);
    }

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappService.lastQr)}`;

    res.send(`
        <html>
        <head>
            <title>Vincular WhatsApp - Chatbot Escolar</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; box-sizing: border-box; }
                .card { background: #1e293b; padding: 2.5rem; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255,255,255,0.1); max-width: 450px; width: 100%; }
                h1 { font-size: 1.75rem; color: #f8fafc; margin-bottom: 0.5rem; font-weight: 700; }
                p { color: #94a3b8; margin-bottom: 2rem; font-size: 1rem; line-height: 1.5; }
                .qr-container { background: white; padding: 1.5rem; border-radius: 16px; display: inline-block; margin-bottom: 2rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
                img { display: block; width: 250px; height: 250px; }
                .steps { text-align: left; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px; margin-top: 2rem; border-left: 4px solid #22c55e; }
                .steps ol { margin: 0; padding-left: 1.25rem; color: #cbd5e1; font-size: 0.9rem; }
                .steps li { margin-bottom: 0.5rem; }
                .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #22c55e; margin-top: 1.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
                .dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            </style>
            <script>
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
                <p>Escaneie o código para ativar seu bot escolar.</p>
                <div class="qr-container">
                    <img src="${qrImageUrl}" alt="WhatsApp QR Code" />
                </div>
                <div class="steps">
                    <ol>
                        <li>Abra o WhatsApp no seu celular</li>
                        <li>Toque em Aparellhos Conectados</li>
                        <li>Toque em Conectar um Aparelho</li>
                        <li>Aponte a câmera para esta tela</li>
                    </ol>
                </div>
                <div class="status-badge">
                    <div class="dot"></div>
                    Sincronizando em tempo real
                </div>
            </div>
        </body>
        </html>
    `);
});

app.get('/', async (req, res) => {
    const whatsappService = require('./src/services/whatsappService');
    let stats = { totalMessages: 0, totalLeads: 0, totalSessions: 0 };
    
    // Proteção: Caso a função não exista ou falhe (ex: deploy incompleto), o site não cai.
    if (typeof getStats === 'function') {
        try {
            const result = await getStats();
            if (result) stats = result;
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error.message);
        }
    }
    const isBotConnected = whatsappService.isAuthenticated;

    res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chatbot Escolar - Dashboard Premium</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script src="https://unpkg.com/lucide@latest"></script>
            <style>
                :root {
                    --bg: #0f172a;
                    --card: #1e293b;
                    --primary: #22c55e;
                    --text: #f8fafc;
                    --text-dim: #94a3b8;
                    --border: rgba(255, 255, 255, 0.1);
                }

                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; padding: 2rem; }
                .container { max-width: 1000px; margin: 0 auto; }

                /* Header */
                header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
                .brand { display: flex; align-items: center; gap: 1rem; }
                .brand-icon { background: var(--primary); padding: 0.75rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .brand h1 { font-size: 1.5rem; font-weight: 700; }
                
                .status-indicator { display: flex; align-items: center; gap: 0.75rem; background: var(--card); padding: 0.5rem 1rem; border-radius: 50px; border: 1px solid var(--border); font-size: 0.875rem; font-weight: 500; }
                .dot { width: 10px; height: 10px; border-radius: 50%; }
                .dot.online { background: var(--primary); box-shadow: 0 0 10px var(--primary); }
                .dot.offline { background: #ef4444; box-shadow: 0 0 10px #ef4444; }

                /* Stats Grid */
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
                .stat-card { background: var(--card); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--border); display: flex; align-items: center; gap: 1.25rem; transition: transform 0.2s; }
                .stat-card:hover { transform: translateY(-4px); }
                .stat-icon { background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 16px; color: var(--primary); }
                .stat-info span { display: block; }
                .stat-label { font-size: 0.875rem; color: var(--text-dim); margin-bottom: 0.25rem; }
                .stat-value { font-size: 1.5rem; font-weight: 700; color: #fff; }

                /* Main Content Grid */
                .main-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; }
                @media (max-width: 768px) { .main-grid { grid-template-columns: 1fr; } }

                .card { background: var(--card); padding: 2rem; border-radius: 24px; border: 1px solid var(--border); position: relative; overflow: hidden; }
                .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
                .card-header h2 { font-size: 1.25rem; font-weight: 600; }

                /* Form Styles */
                .form-group { margin-bottom: 1.5rem; }
                label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-dim); margin-bottom: 0.5rem; }
                input { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; color: white; font-family: inherit; font-size: 1rem; transition: border-color 0.2s; }
                input:focus { outline: none; border-color: var(--primary); }
                
                .btn-send { width: 100%; background: var(--primary); color: #020617; border: none; padding: 1rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: all 0.3s; }
                .btn-send:hover { transform: scale(1.02); box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.4); }

                /* Connection Card */
                .connection-card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1rem; }
                .qr-link { background: var(--primary); color: #020617; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: 0.875rem; margin-top: 1rem; }

                #toast { position: fixed; bottom: 2rem; right: 2rem; background: var(--primary); color: #020617; padding: 1rem 2rem; border-radius: 12px; font-weight: 600; transform: translateY(200%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 1000; }
                #toast.show { transform: translateY(0); }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <div class="brand">
                        <div class="brand-icon">
                            <i data-lucide="bot" size="24"></i>
                        </div>
                        <div>
                            <h1>Chatbot Escolar</h1>
                            <p style="font-size: 0.75rem; color: var(--text-dim);">Painel de Controle v2.0</p>
                        </div>
                    </div>
                    <div class="status-indicator">
                        <div class="dot ${isBotConnected ? 'online' : 'offline'}"></div>
                        <span>WhatsApp ${isBotConnected ? 'Conectado' : 'Desconectado'}</span>
                    </div>
                </header>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i data-lucide="message-circle"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Total de Mensagens</span>
                            <span class="stat-value">${stats.totalMessages || 0}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i data-lucide="user-check"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Leads Capturados</span>
                            <span class="stat-value">${stats.totalLeads || 0}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i data-lucide="zap"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Sessões Ativas</span>
                            <span class="stat-value">${stats.totalSessions || 0}</span>
                        </div>
                    </div>
                </div>

                <div class="main-grid">
                    <section class="card">
                        <div class="card-header">
                            <i data-lucide="terminal" style="color: var(--primary)"></i>
                            <h2>Simulador do Bot</h2>
                        </div>
                        <form action="/webhook" method="POST" target="dummyframe" onsubmit="showToast();">
                            <div class="form-group">
                                <label>Número do Telefone (Ex: 5511999999999)</label>
                                <input type="text" name="phone" value="5511999999999" required>
                            </div>
                            <div class="form-group" style="margin-bottom: 2rem;">
                                <label>Mensagem de Teste</label>
                                <input type="text" name="message" id="msgInput" placeholder="Ex: Oi" required autocomplete="off">
                            </div>
                            <button type="submit" class="btn-send">
                                <i data-lucide="send"></i>
                                Enviar para o Robô
                            </button>
                        </form>
                        <iframe name="dummyframe" id="dummyframe" style="display: none;"></iframe>
                    </section>

                    <section class="card connection-card">
                        <i data-lucide="smartphone" size="48" style="color: var(--text-dim)"></i>
                        <h3>Conectividade</h3>
                        <p style="color: var(--text-dim); font-size: 0.875rem;">Vincule seu WhatsApp para entrar no ar.</p>
                        ${isBotConnected 
                            ? '<span style="color: var(--primary); font-weight: 600;"><i data-lucide="check-circle" style="vertical-align: middle;"></i> Online</span>'
                            : '<a href="/qr" class="qr-link">Vincular Celular</a>'
                        }
                    </section>
                </div>
            </div>

            <div id="toast">Mensagem enviada com sucesso!</div>

            <script>
                lucide.createIcons();
                function showToast() {
                    const toast = document.getElementById('toast');
                    const input = document.getElementById('msgInput');
                    toast.classList.add('show');
                    setTimeout(() => {
                        toast.classList.remove('show');
                        input.value = '';
                    }, 3000);
                }
            </script>
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
