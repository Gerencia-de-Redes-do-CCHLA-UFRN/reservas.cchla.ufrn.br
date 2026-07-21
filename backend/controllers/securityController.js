const SecurityLog = require('../models/SecurityLog');
const SecurityConfig = require('../models/SecurityConfig');

exports.getStats = async (req, res) => {
    try {
        if (req.usuarioLogado.nivel !== 'root') {
            return res.status(403).json({ erro: true, mensagem: 'Acesso negado. Apenas usuários root podem visualizar estatísticas.' });
        }

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // 1. IPs mais bloqueados (falhos)
        const topIps = await SecurityLog.aggregate([
            { $match: { success: false } },
            { $group: { _id: "$ip", count: { $sum: 1 }, country: { $first: "$country" } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // 2. Acessos com mais falhas por usuário
        const topUsers = await SecurityLog.aggregate([
            { $match: { success: false } },
            { $group: { _id: "$username", count: { $sum: 1 }, userExists: { $first: "$userExists" }, lastAttempt: { $max: "$timestamp" } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // 3. Falhas nos últimos 14 dias para o gráfico
        const dailyFailures = await SecurityLog.aggregate([
            { $match: { success: false, timestamp: { $gte: fourteenDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.json({
            sucesso: true,
            topIps: topIps.map(ip => ({ ip: ip._id, count: ip.count, country: ip.country })),
            topUsers: topUsers.map(u => ({ username: u._id, count: u.count, userExists: u.userExists, lastAttempt: u.lastAttempt })),
            dailyFailures: dailyFailures.map(d => ({ date: d._id, count: d.count }))
        });

    } catch (error) {
        console.error("Erro ao buscar stats do security:", error);
        res.status(500).json({ erro: true, mensagem: "Erro interno ao buscar estatísticas." });
    }
};

exports.getConfig = async (req, res) => {
    try {
        if (req.usuarioLogado.nivel !== 'root') {
            return res.status(403).json({ erro: true, mensagem: 'Acesso negado.' });
        }
        
        let config = await SecurityConfig.findOne();
        if (!config) {
            config = await SecurityConfig.create({});
        }

        res.json({ sucesso: true, config });
    } catch (error) {
        console.error("Erro ao buscar config do security:", error);
        res.status(500).json({ erro: true, mensagem: "Erro interno ao buscar configurações." });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        if (req.usuarioLogado.nivel !== 'root') {
            return res.status(403).json({ erro: true, mensagem: 'Acesso negado.' });
        }

        const {
            monitorarTodoProjeto,
            monitorarCalendarioPublico,
            monitorarFormularioPublico,
            monitorarAcompanhamentoPublico,
            monitorarPainel,
            monitorarFeriados,
            monitorarFormularioPainel
        } = req.body;

        let config = await SecurityConfig.findOne();
        if (!config) {
            config = new SecurityConfig();
        }

        if (typeof monitorarTodoProjeto !== 'undefined') config.monitorarTodoProjeto = monitorarTodoProjeto;
        if (typeof monitorarCalendarioPublico !== 'undefined') config.monitorarCalendarioPublico = monitorarCalendarioPublico;
        if (typeof monitorarFormularioPublico !== 'undefined') config.monitorarFormularioPublico = monitorarFormularioPublico;
        if (typeof monitorarAcompanhamentoPublico !== 'undefined') config.monitorarAcompanhamentoPublico = monitorarAcompanhamentoPublico;
        if (typeof monitorarPainel !== 'undefined') config.monitorarPainel = monitorarPainel;
        if (typeof monitorarFeriados !== 'undefined') config.monitorarFeriados = monitorarFeriados;
        if (typeof monitorarFormularioPainel !== 'undefined') config.monitorarFormularioPainel = monitorarFormularioPainel;

        await config.save();
        res.json({ sucesso: true, config });
    } catch (error) {
        console.error("Erro ao atualizar config do security:", error);
        res.status(500).json({ erro: true, mensagem: "Erro interno ao atualizar configurações." });
    }
};
