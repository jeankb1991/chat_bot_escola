const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria e conecta ao arquivo de banco de dados SQLite local
const dbPath = path.resolve(__dirname, 'escola_bot.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('📦 Conectado ao banco de dados SQLite com sucesso.');
    }
});

// Inicialização das tabelas necessárias para o projeto
db.serialize(() => {
    // 1. Tabela de SESSÕES: armazena em qual etapa da conversa o usuário está (Máquina de Estados)
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        phone TEXT PRIMARY KEY,
        name TEXT,
        state TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Tabela de LEADS/ESTUDANTES: guarda os contatos para matrícula ou informações futuras
    db.run(`CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        name TEXT,
        interest TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // 3. Tabela de HISTÓRICO: armazena todo o fluxo da conversa (mensagens enviadas e recebidas)
    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        sender TEXT, -- 'user' (usuário digitou) ou 'bot' (bot respondeu)
        message TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// --- FUNÇÕES UTILITÁRIAS (Promisificadas para facilitar uso com async/await) ---

const getSession = (phone) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM sessions WHERE phone = ?', [phone], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const updateSession = (phone, data) => {
    return new Promise(async (resolve, reject) => {
        const session = await getSession(phone);
        if (session) {
            db.run(
                'UPDATE sessions SET state = ?, name = ?, updatedAt = CURRENT_TIMESTAMP WHERE phone = ?',
                [data.state || session.state, data.name || session.name, phone],
                function (err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        } else {
            db.run(
                'INSERT INTO sessions (phone, name, state) VALUES (?, ?, ?)',
                [phone, data.name || null, data.state || 'WELCOME'],
                function (err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        }
    });
};

const clearSession = (phone) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM sessions WHERE phone = ?', [phone], function (err) {
            if (err) reject(err);
            resolve(this.changes);
        });
    });
};

const saveLead = (phone, name, interest) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO leads (phone, name, interest) VALUES (?, ?, ?)',
            [phone, name, interest],
            function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            }
        );
    });
};

const saveHistory = (phone, sender, message) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO history (phone, sender, message) VALUES (?, ?, ?)',
            [phone, sender, message],
            function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            }
        );
    });
};

module.exports = {
    db,
    getSession,
    updateSession,
    clearSession,
    saveLead,
    saveHistory,
    getStats: () => {
        return new Promise((resolve, reject) => {
            const stats = {};
            db.get('SELECT COUNT(*) as count FROM history', (err, row) => {
                if (err) return reject(err);
                stats.totalMessages = row.count;
                db.get('SELECT COUNT(*) as count FROM leads', (err, row) => {
                    if (err) return reject(err);
                    stats.totalLeads = row.count;
                    db.get('SELECT COUNT(*) as count FROM sessions', (err, row) => {
                        if (err) return reject(err);
                        stats.totalSessions = row.count;
                        resolve(stats);
                    });
                });
            });
        });
    }
};
