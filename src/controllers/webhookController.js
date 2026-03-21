const { handleIncomingMessage } = require('../services/botLogic');
const { saveHistory } = require('../db/database');

// Trata os POST requests onde é entregue a mensagem
const webhookPost = async (req, res) => {
    try {
        const body = req.body;
        
        let phone = '';
        let messageText = '';

        // Formato para API Oficial Facebook/Meta Cloud API
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const msgObj = body.entry[0].changes[0].value.messages[0];
            phone = msgObj.from; 
            messageText = msgObj.text ? msgObj.text.body : '';
        } 
        // Formato para Twilio WhatsApp Sandbox
        else if (body.WaId || body.Body) {
            phone = body.WaId || req.body.From; // Em alguns casos o Twilio usa req.body.From ex: 'whatsapp:+551199999999'
            messageText = body.Body;
            if(phone && phone.includes('whatsapp:')) phone = phone.split('whatsapp:')[1];
        } 
        // Nosso Formulario Web (HTML Mock para testar local sem celular)
        else if (body.phone && body.message) {
            phone = body.phone;
            messageText = body.message;
        }

        // Se conseguiu extrair as info principais que precisa de uma mensagem...
        if (phone && messageText) {
            
            // Log local e salivamento para o histórico de auditoria
            console.log(`\n\x1b[34m[USUÁRIO ${phone}]:\x1b[0m ${messageText}`);
            await saveHistory(phone, 'user', messageText);

            // Delega o tratamento assincronamente para não prender a resposta ao webhook
            // Fornecemos o numero do zap do usuario + texto que ele enviou
            handleIncomingMessage(phone, messageText).catch(err => {
                console.error('Erro na lógica do chatbot:', err);
            });
        }

        // Importante! WhatsApp manda reenviar a mensagem se não recebermos um statusCode = 200 rápido (ACK)
        res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('Erro ao processar o payload do Webhook:', error);
        res.status(500).send('ERROR_INTEGRATION_PARSER');
    }
};

// O GET serve para validar o webhook se for a primeira vez instalando a API Cloud Oficial da Meta
const webhookVerify = (req, res) => {
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'escola123';

    // Parâmetros utilizados apenas pela API do Facebook para se autenticar
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED (Facebook validou conectividade com sua aplicação)');
            res.status(200).send(challenge);
        } else {
            console.warn('❌ Token de verificação webhhok incorreto ou ausente.');
            res.sendStatus(403);
        }
    } else {
        res.status(200).send('API de verificação de Webhook ativa. Meta Graph está pronto.');
    }
};

module.exports = {
    webhookPost,
    webhookVerify
};
