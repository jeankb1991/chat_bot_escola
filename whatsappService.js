const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isAuthenticated = false;
        this.lastQr = null;
        this.authPath = path.resolve(__dirname, '../../.wwebjs_auth/session-baileys');
        
        // Garantir que a pasta de autenticação exista
        if (!fs.existsSync(path.dirname(this.authPath))) {
            fs.mkdirSync(path.dirname(this.authPath), { recursive: true });
        }
    }

    async initialize() {
        console.log('\n⚡ Inicializando WhatsApp via Baileys (Modo Ultra-Leve)...\n');
        
        const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
        const { version } = await fetchLatestBaileysVersion();

        this.client = makeWASocket({
            version,
            printQRInTerminal: true,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Chatbot Escolar', 'Chrome', '1.0.0']
        });

        // Ouvir atualizações de conexão
        this.client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Converter o QR string para uma URL de imagem Base64 para o dashboard
                this.lastQr = qr;
                console.log('📱 Novo QR Code gerado!');
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Conexão fechada devido a:', lastDisconnect.error, ', tentando reconectar:', shouldReconnect);
                this.isAuthenticated = false;
                if (shouldReconnect) {
                    this.initialize();
                }
            } else if (connection === 'open') {
                console.log('\n\x1b[32m%s\x1b[0m', '✅ SUCESSO! SEU BOT ESTÁ ONLINE VIA BAILEYS!');
                this.isAuthenticated = true;
                this.lastQr = null;
            }
        });

        // Salvar credenciais sempre que houver mudança
        this.client.ev.on('creds.update', saveCreds);

        // Ouvir mensagens recebidas
        this.client.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe && msg.message) {
                        const phone = msg.key.remoteJid.split('@')[0];
                        const body = msg.message.conversation || 
                                     msg.message.extendedTextMessage?.text || 
                                     '';
                        
                        if (body) {
                            console.log(`\n\x1b[34m[BAILEYS - USUÁRIO ${phone}]:\x1b[0m ${body}`);
                            // Importação dinâmica para evitar dependência circular
                            const { handleIncomingMessage } = require('./botLogic');
                            try {
                                await handleIncomingMessage(phone, body);
                            } catch (error) {
                                console.error('Erro ao processar mensagem Baileys:', error);
                            }
                        }
                    }
                }
            }
        });
    }

    async sendMessage(to, body) {
        if (!this.client || !this.isAuthenticated) {
            console.error('❌ Não é possível enviar mensagem: Bot não conectado.');
            return;
        }

        try {
            // Formatar número para o padrão JID do WhatsApp
            const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
            await this.client.sendMessage(jid, { text: body });
            console.log(`\x1b[36m[BOT -> ${to}]:\x1b[0m ${body}`);
        } catch (error) {
            console.error('Erro ao enviar mensagem via Baileys:', error);
        }
    }
}

// Exportamos uma única instância (Singleton)
module.exports = new WhatsAppService();
