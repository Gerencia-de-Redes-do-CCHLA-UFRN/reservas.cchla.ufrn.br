const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

exports.listarContas = async (req, res) => {
    try {
        const admins = await Admin.find({}, { password_hash: 0 }).lean();

        const lista = admins.map(a => ({
            _id: a._id,
            email: a.email,
            nivel: a.nivel,
            permissoes: a.permissoes instanceof Map
                ? Object.fromEntries(a.permissoes)
                : (a.permissoes || {}),
            data_criacao: a.data_criacao
        }));

        return res.status(200).json(lista);
    } catch (error) {
        console.error("Erro ao listar contas:", error);
        return res.status(500).json({ erro: true, mensagem: "Erro interno no servidor." });
    }
};

exports.criarConta = async (req, res) => {
    try {
        const { email, senha, nivel, permissoes } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ erro: true, mensagem: "E-mail e senha são obrigatórios." });
        }

        if (senha.length < 6) {
            return res.status(400).json({ erro: true, mensagem: "A senha deve ter pelo menos 6 caracteres." });
        }

        const existente = await Admin.findOne({ email });
        if (existente) {
            return res.status(409).json({ erro: true, mensagem: "Já existe um usuário com este e-mail." });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(senha, salt);

        let permissoesMap;
        if (permissoes && typeof permissoes === 'object') {
            permissoesMap = new Map(Object.entries(permissoes));
        } else if (nivel === 'root') {
            permissoesMap = new Map(Object.entries(Admin.permissoesRoot));
        } else {
            permissoesMap = new Map(Object.entries(Admin.permissoesPadrao));
        }

        const novoAdmin = new Admin({
            email,
            password_hash,
            nivel: nivel || 'admin',
            permissoes: permissoesMap
        });

        await novoAdmin.save();

        return res.status(201).json({
            sucesso: true,
            mensagem: "Conta criada com sucesso.",
            admin: {
                _id: novoAdmin._id,
                email: novoAdmin.email,
                nivel: novoAdmin.nivel,
                permissoes: Object.fromEntries(novoAdmin.permissoes)
            }
        });
    } catch (error) {
        console.error("Erro ao criar conta:", error);
        return res.status(500).json({ erro: true, mensagem: "Erro interno no servidor." });
    }
};

exports.atualizarConta = async (req, res) => {
    try {
        const { id, email, senha, nivel, permissoes } = req.body;

        if (!id) {
            return res.status(400).json({ erro: true, mensagem: "ID do usuário é obrigatório." });
        }

        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json({ erro: true, mensagem: "Usuário não encontrado." });
        }

        if (email) {
            const emailExistente = await Admin.findOne({ email, _id: { $ne: id } });
            if (emailExistente) {
                return res.status(409).json({ erro: true, mensagem: "Este e-mail já está em uso." });
            }
            admin.email = email;
        }

        if (senha) {
            if (senha.length < 6) {
                return res.status(400).json({ erro: true, mensagem: "A senha deve ter pelo menos 6 caracteres." });
            }
            const salt = await bcrypt.genSalt(10);
            admin.password_hash = await bcrypt.hash(senha, salt);
        }

        if (nivel) {
            admin.nivel = nivel;
        }

        if (permissoes && typeof permissoes === 'object') {
            admin.permissoes = new Map(Object.entries(permissoes));
        }

        await admin.save();

        return res.status(200).json({
            sucesso: true,
            mensagem: "Conta atualizada com sucesso.",
            admin: {
                _id: admin._id,
                email: admin.email,
                nivel: admin.nivel,
                permissoes: Object.fromEntries(admin.permissoes)
            }
        });
    } catch (error) {
        console.error("Erro ao atualizar conta:", error);
        return res.status(500).json({ erro: true, mensagem: "Erro interno no servidor." });
    }
};

exports.excluirConta = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ erro: true, mensagem: "ID do usuário é obrigatório." });
        }

        if (id === req.usuarioLogado.id) {
            return res.status(403).json({ erro: true, mensagem: "Você não pode excluir sua própria conta." });
        }

        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json({ erro: true, mensagem: "Usuário não encontrado." });
        }

        await Admin.findByIdAndDelete(id);

        return res.status(200).json({ sucesso: true, mensagem: "Conta excluída com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir conta:", error);
        return res.status(500).json({ erro: true, mensagem: "Erro interno no servidor." });
    }
};
