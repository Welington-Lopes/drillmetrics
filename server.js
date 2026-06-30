'use strict';

const express    = require('express');
const mysql      = require('mysql2');
const cors       = require('cors');
const bodyParser = require('body-parser');
const si         = require('systeminformation');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ─── Banco de dados ────────────────────────────────────────────────────────────
const db = mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME     || 'geosol_db'
});

db.connect(err => {
    if (err) {
        console.error('[DB] Erro ao conectar ao MySQL:', err.message);
        console.error('[DB] Verifique as credenciais e se o servidor MySQL está ativo.');
        return;
    }
    console.log('[DB] MySQL conectado com sucesso.');
});

// Helper para queries com Promises
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// ─── Estado global em memória (por sonda) ─────────────────────────────────────
const sondaStates = {};

function getSondaState(id) {
    const key = String(id);
    if (!sondaStates[key]) {
        sondaStates[key] = {
            faults: { leak: 0, filter: 0, gas: 0, rock: 0 },
            logs:   [{ time: new Date().toLocaleTimeString('pt-BR'), msg: `Sonda ${key} inicializada.`, type: 'info' }],
        };
    }
    return sondaStates[key];
}

// ─── Middleware de erro genérico ───────────────────────────────────────────────
function sendError(res, status, msg) {
    return res.status(status).json({ success: false, message: msg });
}

// ─── TELEMETRIA ────────────────────────────────────────────────────────────────
app.get('/api/telemetria/:sonda_id', async (req, res) => {
    const id    = req.params.sonda_id;
    const state = getSondaState(id);

    try {
        const [cpu, mem, temp] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.cpuTemperature()
        ]);

        const baseRpm     = cpu.currentLoad;
        const baseTorque  = mem.total > 0 ? (mem.active / mem.total) * 100 : 0;
        const basePressao = cpu.currentLoad * 0.72;
        const baseTemp    = typeof temp.main === 'number' && temp.main > 0 ? temp.main : 45;

        const f = state.faults;
        const totalFault = (f.leak + f.filter + f.gas + f.rock) / 4;

        const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

        const finalData = {
            sonda_id:    id,
            rpm:         clamp(baseRpm     + f.rock   * 0.5, 0, 100),
            torque:      clamp(baseTorque  + f.filter * 0.4, 0, 100),
            pressao:     clamp(basePressao + f.leak   * 0.6, 0, 100),
            temperatura: clamp(baseTemp    + f.gas    * 0.3, 0, 150),
            gas:         clamp(Math.random() * 2 + f.gas * 0.05, 0, 100),
            fault_level: clamp(totalFault, 0, 100),
            timestamp:   new Date().toISOString()
        };

        res.json(finalData);
    } catch (err) {
        console.error('[Telemetria]', err.message);
        sendError(res, 500, 'Erro ao coletar telemetria: ' + err.message);
    }
});

// ─── SIMULAÇÃO DE FALHAS ───────────────────────────────────────────────────────
app.post('/api/simular-erro', async (req, res) => {
    const { sonda_id, tipo, intensidade } = req.body;

    const tiposValidos = ['leak', 'filter', 'gas', 'rock'];
    if (!tiposValidos.includes(tipo)) return sendError(res, 400, 'Tipo de falha inválido.');

    const nivel = Math.max(0, Math.min(100, parseInt(intensidade, 10) || 0));
    const state = getSondaState(sonda_id);
    state.faults[tipo] = nivel;

    const nomesTipo = { leak: 'Vazamento Hidráulico', filter: 'Filtro Obstruído', gas: 'Gás Tóxico', rock: 'Rocha Extrema' };
    const msg  = `Simulação de ${nomesTipo[tipo]}: intensidade ${nivel}%`;
    const type = nivel > 70 ? 'error' : nivel > 30 ? 'warning' : 'info';
    state.logs.push({ time: new Date().toLocaleTimeString('pt-BR'), msg, type });

    if (nivel > 70) {
        try {
            await query(
                'INSERT INTO alertas (sonda_id, mensagem, tipo) VALUES (?, ?, ?)',
                [sonda_id, `Nivel Critico — ${nomesTipo[tipo]}: ${nivel}%`, 'Crítico']
            );
        } catch (err) {
            console.error('[Alerta DB]', err.message);
        }
    }

    res.json({ success: true });
});

// ─── LOGS ─────────────────────────────────────────────────────────────────────
app.get('/api/logs/:sonda_id', (req, res) => {
    const state = getSondaState(req.params.sonda_id);
    res.json(state.logs.slice(-50));
});

// ─── AUTENTICAÇÃO ──────────────────────────────────────────────────────────────
// NOTA: Em produção, senhas devem ser armazenadas com hash (bcrypt).
// A comparação direta é mantida por compatibilidade com o banco de dados existente.
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return sendError(res, 400, 'E-mail e senha são obrigatórios.');

    try {
        const results = await query(
            'SELECT id, nome, email, cargo FROM usuarios WHERE email = ? AND senha = ?',
            [email.trim(), senha]
        );
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            // Delay para dificultar ataques de força bruta
            setTimeout(() => sendError(res, 401, 'E-mail ou senha incorretos.'), 500);
        }
    } catch (err) {
        console.error('[Login]', err.message);
        sendError(res, 500, 'Erro interno do servidor.');
    }
});

app.post('/api/usuarios/criar', async (req, res) => {
    const { nome, email, senha, cargo } = req.body;
    if (!nome || !email || !senha) return sendError(res, 400, 'Todos os campos são obrigatórios.');
    if (senha.length < 6) return sendError(res, 400, 'A senha deve ter no mínimo 6 caracteres.');
    const cargoFinal = cargo === 'Admin' ? 'Admin' : 'Operador';

    try {
        await query(
            'INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)',
            [nome.trim(), email.trim().toLowerCase(), senha, cargoFinal]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Este e-mail já está cadastrado.');
        }
        console.error('[Criar usuário]', err.message);
        sendError(res, 500, 'Erro ao cadastrar operador.');
    }
});

// ─── PRAÇAS ────────────────────────────────────────────────────────────────────
app.get('/api/pracas', async (req, res) => {
    try {
        const results = await query('SELECT * FROM pracas ORDER BY nome');
        res.json(results);
    } catch (err) {
        sendError(res, 500, err.message);
    }
});

// ─── SONDAS ────────────────────────────────────────────────────────────────────
// FIX: Uso de query parametrizada ao invés de interpolação de string.
app.get('/api/sondas', async (req, res) => {
    const { praca_id } = req.query;
    try {
        let results;
        if (praca_id) {
            results = await query(
                'SELECT s.*, p.nome as praca_nome FROM sondas s LEFT JOIN pracas p ON s.praca_id = p.id WHERE s.praca_id = ? ORDER BY s.nome',
                [praca_id]
            );
        } else {
            results = await query(
                'SELECT s.*, p.nome as praca_nome FROM sondas s LEFT JOIN pracas p ON s.praca_id = p.id ORDER BY s.nome'
            );
        }
        res.json(results);
    } catch (err) {
        sendError(res, 500, err.message);
    }
});

// ─── CONFIGURAÇÃO DE PARÂMETROS ────────────────────────────────────────────────
app.get('/api/config/:sonda_id', async (req, res) => {
    try {
        const results = await query(
            'SELECT * FROM parametros_config WHERE sonda_id = ? ORDER BY id',
            [req.params.sonda_id]
        );
        res.json(results);
    } catch (err) {
        sendError(res, 500, err.message);
    }
});

app.post('/api/config/update', async (req, res) => {
    const { id, valor_min, valor_max } = req.body;
    if (valor_min === undefined || valor_max === undefined || !id) {
        return sendError(res, 400, 'Dados incompletos.');
    }
    if (parseFloat(valor_min) >= parseFloat(valor_max)) {
        return sendError(res, 400, 'O valor mínimo deve ser menor que o máximo.');
    }
    try {
        await query(
            'UPDATE parametros_config SET valor_min = ?, valor_max = ? WHERE id = ?',
            [valor_min, valor_max, id]
        );
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, err.message);
    }
});

// ─── ALERTAS ──────────────────────────────────────────────────────────────────
app.get('/api/alertas', async (req, res) => {
    try {
        const results = await query(
            `SELECT a.*, s.nome as sonda_nome
             FROM alertas a
             JOIN sondas s ON a.sonda_id = s.id
             WHERE a.ciente = FALSE
             ORDER BY a.timestamp DESC
             LIMIT 1`
        );
        res.json(results);
    } catch (err) {
        sendError(res, 500, err.message);
    }
});

app.post('/api/alertas/ciente', async (req, res) => {
    const { id } = req.body;
    if (!id) return sendError(res, 400, 'ID do alerta é obrigatório.');
    try {
        await query('UPDATE alertas SET ciente = TRUE WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, err.message);
    }
});

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[Servidor] GEOSOL Telemetry rodando em http://localhost:${PORT}`);
});
