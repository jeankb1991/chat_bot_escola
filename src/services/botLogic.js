const { getSession, updateSession, saveLead } = require('../db/database');
const { GoogleGenAI } = require('@google/genai');

// Inicia o cliente do Gemini se a chave existir
let ai;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui') {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Definição dos Estados Posíveis na conversa
const STATES = {
    WELCOME: 'WELCOME',
    ASK_NAME: 'ASK_NAME',
    WAITING_NAME: 'WAITING_NAME',
    AI_CHAT: 'AI_CHAT'
};

const SYSTEM_PROMPT = `Você é o assistente virtual (agente de IA) do Jean, um profissional de tecnologia.
Sua postura deve ser sempre educada, formal, prestativa e objetiva. Trate os interlocutores com zelo e polidez profissional.
- Evite gírias, excesso de emojis ou informalidades demasiadas.
- Caso o contato deseje tratar de assuntos urgentes, particulares, ou registrar um recado para o Jean, informe polidamente que você anotará a mensagem e que o Jean retornará assim que possível.
- Responda de forma clara, direta e cordial.
- Caso o interlocutor pergunte pelo portfólio ou contato profissional do Jean, forneça as seguintes vias: (Instagram: @seu_instagram, LinkedIn: linkedin.com/in/seu_linkedin, GitHub: github.com/seu_github).
Lembre-se: sua missão é fornecer um atendimento de excelência, eficiente, cordial e estritamente profissional.`;

async function handleIncomingMessage(phone, text, whatsappClient) {
    if (!text) return;
    text = text.trim();

    // Palavras de reinício caso o usuário queira resetar o bot
    const forceMenuKeywords = ['voltar', 'inicio', 'início', 'reset', 'cancelar'];
    if (forceMenuKeywords.includes(text.toLowerCase())) {
        await updateSession(phone, { state: STATES.WELCOME, name: null, history: [] });
        await whatsappClient.sendMessage(phone, "Oi! Aqui é o assistente inteligente do Jean. Como você se chama?");
        await updateSession(phone, { state: STATES.WAITING_NAME });
        return;
    }

    // Busca ou cria a sessão do usuário
    let session = await getSession(phone);
    if (!session) {
        await updateSession(phone, { state: STATES.WELCOME, name: null, history: [] });
        session = { phone, state: STATES.WELCOME, name: null, history: [] };
    }

    const state = session.state;

    switch (state) {
        case STATES.WELCOME:
        case STATES.ASK_NAME:
            await whatsappClient.sendMessage(phone, "Olá. Eu sou o assistente virtual do Jean.");
            await whatsappClient.sendMessage(phone, "Para iniciarmos o atendimento, por favor, me informe o seu nome.");
            await updateSession(phone, { state: STATES.WAITING_NAME });
            break;

        case STATES.WAITING_NAME:
            const username = text;
            await updateSession(phone, { name: username, state: STATES.AI_CHAT, history: [] });
            await whatsappClient.sendMessage(phone, `Muito prazer, *${username}*. Como posso auxiliá-lo(a) hoje?`);
            break;

        case STATES.AI_CHAT:
        default:
            // Interação com a IA
            if (!ai) {
                await whatsappClient.sendMessage(phone, "Minha inteligência artificial ainda não foi ativada. Peça ao Jean para adicionar a chave `GEMINI_API_KEY` no servidor para eu começar a conversar com você! 🤖");
                return;
            }

            const history = session.history || [];
            history.push({ role: 'user', content: text });
            
            try {
                // Constroi o prompt com base no histórico
                let conversationText = SYSTEM_PROMPT + `\n\nNome do contato atual: ${session.name || 'Desconhecido'}\n\nHistórico:\n`;
                for (const msg of history) {
                    conversationText += `${msg.role === 'user' ? (session.name || 'Contato') : 'Você'}: ${msg.content}\n`;
                }

                // Criação da resposta via Google Gemini
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: conversationText
                });

                const botReply = response.text || "Desculpe, tive um problema interno ao tentar formular a resposta. 😶";
                
                history.push({ role: 'model', content: botReply });
                
                // Limita histórico a ultimas 10 mensagens para não pesar o banco
                if (history.length > 10) history.splice(0, history.length - 10);
                
                await updateSession(phone, { history });
                await whatsappClient.sendMessage(phone, botReply);

            } catch (error) {
                console.error("Erro no Gemini:", error);
                await whatsappClient.sendMessage(phone, "Vish, deu algum erro na minha rede neural e não consegui processar sua mensagem agora... Tenta de novo mais tarde? 🔌🤖");
            }
            break;
    }
}

module.exports = {
    handleIncomingMessage
};
