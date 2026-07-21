const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SecurityLog = require('../models/SecurityLog');

exports.fazerLogin = async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        // Obter IP real do proxy do Nginx ou da conexão
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        
        if (!email || !senha) {
            return res.status(400).json({ erro: true, mensagem: "E-mail e senha são obrigatórios." });
        }

        // Verifica bloqueio por excesso de tentativas (exceto para o root principal)
        if (email !== 'tobias.rocha@ufrn.br') {
            const quinzeMinutosAtras = new Date(Date.now() - 15 * 60 * 1000);
            
            // Conta quantas falhas recentes esse IP ou E-mail teve
            const falhasRecentes = await SecurityLog.countDocuments({
                $or: [{ ip: ip }, { username: email }],
                success: false,
                timestamp: { $gte: quinzeMinutosAtras }
            });

            if (falhasRecentes >= 5) {
                return res.status(403).json({ 
                    erro: true, 
                    mensagem: "Muitas tentativas falhas. Seu acesso foi bloqueado temporariamente por segurança. Tente novamente mais tarde." 
                });
            }
        }

        const admin = await Admin.findOne({ email });
        
        if (!admin) {
            await SecurityLog.create({ ip, username: email, success: false, userExists: false, route: '/api/fazerLogin' });
            return res.status(401).json({ erro: true, mensagem: "E-mail ou senha incorretos. Acesso negado." });
        }

        const senhaValida = await bcrypt.compare(senha, admin.password_hash);
        
        if (!senhaValida) {
            await SecurityLog.create({ ip, username: email, success: false, userExists: true, route: '/api/fazerLogin' });
            return res.status(401).json({ erro: true, mensagem: "E-mail ou senha incorretos. Acesso negado." });
        }

        const token = jwt.sign(
            { id: admin._id, email: admin.email, nivel: admin.nivel },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await SecurityLog.create({ ip, username: email, success: true, userExists: true, route: '/api/fazerLogin' });
        return res.status(200).json({ sucesso: true, token });

    } catch (error) {
        console.error("Erro no login:", error);
        return res.status(500).json({ erro: true, mensagem: "Erro interno no servidor." });
    }
};

exports.alterarSenha = async (req, res) => {
    try {
        const adminId = req.usuarioLogado.id;
        const { senhaAtual, novaSenha } = req.body;

        if (!senhaAtual || !novaSenha) {
            return res.status(400).json({ erro: true, mensagem: "Senha atual e nova senha são obrigatórias." });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ erro: true, mensagem: "Administrador não encontrado." });
        }

        const senhaValida = await bcrypt.compare(senhaAtual, admin.password_hash);
        if (!senhaValida) {
            return res.status(401).json({ erro: true, mensagem: "A senha atual está incorreta." });
        }

        const salt = await bcrypt.genSalt(10);
        const novoHash = await bcrypt.hash(novaSenha, salt);

        admin.password_hash = novoHash;
        await admin.save();

        return res.status(200).json({ sucesso: true, mensagem: "Senha alterada com sucesso." });
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        return res.status(500).json({ erro: true, mensagem: "Erro interno no servidor." });
    }
};
