const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

exports.listarUsuarios = async (req, res) => {
    try {
        if (req.usuarioLogado.nivel !== 'root') return res.status(403).json({ erro: true, mensagem: 'Acesso negado.' });
        const usuarios = await Admin.find({}, { password_hash: 0 }); // Oculta senha
        res.json({ sucesso: true, usuarios });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: true, mensagem: 'Erro interno.' });
    }
};

exports.criarUsuario = async (req, res) => {
    try {
        if (req.usuarioLogado.nivel !== 'root') return res.status(403).json({ erro: true, mensagem: 'Acesso negado.' });
        const { email, senha, nivel, nome } = req.body;
        
        const existe = await Admin.findOne({ email });
        if (existe) return res.status(400).json({ erro: true, mensagem: 'E-mail já cadastrado.' });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(senha, salt);

        const novoAdmin = await Admin.create({ email, password_hash, nivel, nome });
        res.json({ sucesso: true, usuario: { email: novoAdmin.email, nivel: novoAdmin.nivel } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: true, mensagem: 'Erro interno.' });
    }
};

exports.atualizarUsuario = async (req, res) => {
    try {
        if (req.usuarioLogado.nivel !== 'root') return res.status(403).json({ erro: true, mensagem: 'Acesso negado.' });
        const { id, email, nivel, nome, senha } = req.body;
        
        const admin = await Admin.findById(id);
        if (!admin) return res.status(404).json({ erro: true, mensagem: 'Usuário não encontrado.' });

        if (email) admin.email = email;
        if (nivel) admin.nivel = nivel;
        if (nome !== undefined) admin.nome = nome;
        
        if (senha) {
            const salt = await bcrypt.genSalt(10);
            admin.password_hash = await bcrypt.hash(senha, salt);
        }

        await admin.save();
        res.json({ sucesso: true, mensagem: 'Atualizado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: true, mensagem: 'Erro interno.' });
    }
};

exports.excluirUsuario = async (req, res) => {
    try {
        if (req.usuarioLogado.nivel !== 'root') return res.status(403).json({ erro: true, mensagem: 'Acesso negado.' });
        const { id } = req.body;
        
        if (req.usuarioLogado.id === id) return res.status(400).json({ erro: true, mensagem: 'Não pode excluir a si mesmo.' });

        await Admin.findByIdAndDelete(id);
        res.json({ sucesso: true, mensagem: 'Excluído com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: true, mensagem: 'Erro interno.' });
    }
};
