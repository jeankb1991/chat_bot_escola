const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { saveHistory } = require('../db/database');

const simulateTyping = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class WhatsAppService {
    constructor() {
        console.log('\n⏳ Inicializando o robô do WhatsApp Web (pode demorar alguns segundos)...\n');
        
        this.client = new Client({
            // Mantemos a sessão antiga e confiável
            authStrategy: new LocalAuth({ clientId: "bot-escola" }), 
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
                headless: true // ⚠️ FUNDAMENTAL PARA O RENDER.COM! Não pode ter tela gráfica.
            }
        });

        this.lastQr = null; // Armazena o código para exibir na página web
        this.isAuthenticated = false;

        this.client.on('qr', (qr) => {
            this.lastQr = qr; // Salva o QR atual
            console.log('\n========================================================================');
            console.log('\x1b[33m%s\x1b[0m', '📱 ESCANEIE O QR CODE ABAIXO COM O SEU CELULAR NO APLICATIVO WHATSAPP:');
            console.log('========================================================================\n');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
             this.isAuthenticated = true;
             this.lastQr = null; 
             console.log('\n\x1b[32m%s\x1b[0m', '✅ SUCESSO! SEU BOT FOI VINCULADO AO SEU NÚMERO E ESTÁ NO AR!');
        });

        this.client.on('auth_failure', () => {
             console.error('\n\x1b[31m%s\x1b[0m', '❌ Autenticação falhou! Reinicie o servidor.');
        });
    }

    initialize() {
        this.client.initialize();
    }

    async sendMessage(to, body) {
        if(!to) return;
        
        await saveHistory(to, 'bot', body);
        const delay = Math.min(Math.max(body.length * 20, 1000), 3000); 
        console.log(`\x1b[32m[BOT -> ${to}]:\x1b[0m\n${body}\n`);

        const chatId = to.includes('@') ? to : `${to}@c.us`;

        try {
            // VERIFICAÇÃO INFALÍVEL LID WhatsApp
            const numberDetails = await this.client.getNumberId(chatId);
            if (!numberDetails) {
                console.warn(`O número ${to} não está registrado ou não validou.`);
                return false; 
            }

            const validId = numberDetails._serialized;

            try {
                const chatObj = await this.client.getChatById(validId);
                await chatObj.sendStateTyping();
                await simulateTyping(delay);
                await chatObj.clearState();
            } catch (err) {
                await simulateTyping(500);
            }

            await this.client.sendMessage(validId, body);
            return true;

        } catch (error) {
            console.error(`⚠️ Erro fatal no envio para o número ${to}:`, error.message);
            return false;
        }
    }
}

module.exports = new WhatsAppService();
