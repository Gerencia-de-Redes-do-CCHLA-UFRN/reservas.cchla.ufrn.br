const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    if (req.method === "OPTIONS") return next();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ erro: true, mensagem: "Acesso negado: Token ausente." });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuarioLogado = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ erro: true, mensagem: "Token inválido ou expirado." });
    }
};

const verificarPermissao = (acao) => {
    return (req, res, next) => {
        if (!req.usuarioLogado) {
            console.log('[PERMISSAO] usuarioLogado ausente');
            return res.status(401).json({ erro: true, mensagem: "Acesso negado: autenticação necessária." });
        }

        const usuario = req.usuarioLogado;
        console.log('[PERMISSAO] acao:', acao, 'email:', usuario.email, 'nivel:', usuario.nivel, 'permissoes:', JSON.stringify(usuario.permissoes));

        if (usuario.permissoes && usuario.permissoes[acao] === true) {
            console.log('[PERMISSAO] APROVADO por permissoes granulares');
            return next();
        }

        if (!usuario.permissoes && usuario.nivel === 'root') {
            console.log('[PERMISSAO] APROVADO por nivel root (legado)');
            return next();
        }

        console.log('[PERMISSAO] NEGADO');
        return res.status(403).json({ erro: true, mensagem: "Permissão insuficiente para esta ação." });
    };
};

module.exports = verificarToken;
module.exports.verificarPermissao = verificarPermissao;
