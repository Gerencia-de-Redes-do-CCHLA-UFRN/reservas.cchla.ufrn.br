require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const reservaController = require('./controllers/reservaController');
const authController = require('./controllers/authController');
const securityController = require('./controllers/securityController');
const userController = require('./controllers/userController');
const authMiddleware = require('./middleware/auth');
const SecurityLog = require('./models/SecurityLog');
const SecurityConfig = require('./models/SecurityConfig');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS - Mantendo domínios permitidos + Locais (via Docker Nginx)
const dominiosPermitidos = [
    "https://reservas.cchla.ufrn.br",
    "http://localhost" // Para desenvolvimento
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || dominiosPermitidos.some(d => origin.startsWith(d))) {
            callback(null, true);
        } else {
            console.error("CORS Bloqueado para a origem:", origin);
            callback(new Error("Acesso bloqueado por política de segurança CORS."));
        }
    }
}));

app.use(express.json());

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('Conectado ao MongoDB!'))
  .catch(err => console.error('Erro ao conectar no MongoDB:', err));

// Middleware de segurança global (Rastreamento)
app.use(async (req, res, next) => {
    try {
        if (req.path.startsWith('/api/fazerLogin')) return next(); // Login já é rastreado no authController

        const config = await SecurityConfig.findOne();
        if (!config) return next();

        let deveRastrear = false;
        if (config.monitorarTodoProjeto) deveRastrear = true;
        
        // Simulação de mapeamento de rotas para os checkboxes
        // Na prática real, frontend e NGINX teriam que enviar logs,
        // mas aqui vamos rastrear o que bater na API.
        if (!deveRastrear) {
            if (config.monitorarCalendarioPublico && req.path.includes('obterEventosCalendario')) deveRastrear = true;
            if (config.monitorarFormularioPublico && (req.path.includes('checarDisponibilidade') || req.path.includes('enviarSolicitacao'))) deveRastrear = true;
            if (config.monitorarAcompanhamentoPublico && req.path.includes('consultarTicket')) deveRastrear = true;
            if (config.monitorarPainel && req.path.includes('admin')) deveRastrear = true;
        }

        if (deveRastrear) {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
            // Para não lotar o banco, registramos apenas como info genérica ou se falhar
            // Mas a instrução pede registro extensivo se marcado
            await SecurityLog.create({
                ip,
                username: 'Acesso API',
                success: true,
                userExists: false,
                route: req.path
            });
        }
    } catch (e) {
        console.error("Erro no middleware de segurança", e);
    }
    next();
});

// --- ROTAS PÚBLICAS ---
app.post('/api/checarDisponibilidade', reservaController.checarDisponibilidade);
app.post('/api/enviarSolicitacao', reservaController.enviarSolicitacao);
app.get('/api/obterEventosCalendario', reservaController.obterEventosCalendario);
app.post('/api/consultarTicket', reservaController.consultarTicket);
app.post('/api/fazerLogin', authController.fazerLogin);

// --- ROTAS PROTEGIDAS (Admin) ---
app.get('/api/adminObterReservas', authMiddleware, reservaController.adminObterReservas);
app.post('/api/adminAtualizarDocumento', authMiddleware, reservaController.adminAtualizarDocumento);
app.post('/api/adminExcluirDocumento', authMiddleware, reservaController.adminExcluirDocumento);
app.post('/api/adminCadastrarDocumento', authMiddleware, reservaController.adminCadastrarDocumento);
app.post('/api/alterarSenha', authMiddleware, authController.alterarSenha);
app.post('/api/notificar', authMiddleware, reservaController.notificar);

// --- ROTAS PROTEGIDAS (Segurança) ---
app.get('/api/security/stats', authMiddleware, securityController.getStats);
app.get('/api/security/config', authMiddleware, securityController.getConfig);
app.post('/api/security/config', authMiddleware, securityController.updateConfig);

// --- ROTAS PROTEGIDAS (Usuários / ROOT) ---
app.get('/api/adminListarUsuarios', authMiddleware, userController.listarUsuarios);
app.post('/api/adminCriarUsuario', authMiddleware, userController.criarUsuario);
app.post('/api/adminAtualizarUsuario', authMiddleware, userController.atualizarUsuario);
app.post('/api/adminExcluirUsuario', authMiddleware, userController.excluirUsuario);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
