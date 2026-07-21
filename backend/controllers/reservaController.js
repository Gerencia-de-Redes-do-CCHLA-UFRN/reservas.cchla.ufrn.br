const axios = require('axios');
const Reserva = require('../models/Reserva');
const emailService = require('../services/emailService');

async function validarDisponibilidade(reservasRequisitadas) {
    if (!reservasRequisitadas || !Array.isArray(reservasRequisitadas)) {
        return { conflitos: [], agendaCompleta: [] };
    }
    
    const conflitos = [];
    const agendaCompleta = []; 
    
    const dataBusca = new Date();
    dataBusca.setDate(dataBusca.getDate() - 2);
    const limiteIso = dataBusca.toISOString().substring(0, 10);
    
    // Mongoose Find
    const reservasBanco = await Reserva.find({
        Início: { $gte: limiteIso + "T00:00" },
        Status: { $nin: ['Reprovado', 'Cancelado'] }
    }).lean();

    for (let req of reservasRequisitadas) {
        let reqIniIso = `${req.dateStr}T${req.hIni}`;
        let reqFimIso = `${req.dateStr}T${req.hFim}`;

        for (let rBanco of reservasBanco) {
            const dataFormatada = rBanco.Início.substring(0,10).split('-').reverse().join('/');
            
            if (rBanco.Auditório === req.auditorio && rBanco.Início.startsWith(req.dateStr)) {
                const jaExiste = agendaCompleta.find(a => a.hIniBanco === rBanco.Início.substring(11,16) && a.dataBr === dataFormatada);
                if (!jaExiste) {
                    agendaCompleta.push({
                        auditorio: rBanco.Auditório,
                        dataBr: dataFormatada,
                        hIniBanco: rBanco.Início.substring(11,16),
                        hFimBanco: rBanco.Fim.substring(11,16)
                    });
                }
            }

            const overlap = (reqIniIso < rBanco.Fim) && (reqFimIso > rBanco.Início);
            if (overlap && rBanco.Auditório === req.auditorio) {
                conflitos.push({
                    solicitado: req,
                    conflitoCom: rBanco.Atividade || rBanco.Motivo || 'Atividade Agendada',
                    statusBanco: rBanco.Status || 'Pendente',
                    dataBr: dataFormatada,
                    hIniBanco: rBanco.Início.substring(11,16),
                    hFimBanco: rBanco.Fim.substring(11,16)
                });
            }
        }
    }
    return { conflitos, agendaCompleta };
}

exports.checarDisponibilidade = async (req, res) => {
    try {
        const resultado = await validarDisponibilidade(req.body.reservas);
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};

exports.enviarSolicitacao = async (req, res) => {
    const payload = req.body;
    try {
        if (!payload.recaptchaToken) throw new Error("Captcha ausente.");
        
        // Em um ambiente de dev, pode-se usar uma chave mock. 
        // Aqui mantemos a verificação real se a SECRET estiver definida
        if (process.env.RECAPTCHA_SECRET && process.env.RECAPTCHA_SECRET !== 'substitua_pela_sua_chave_secreta_do_recaptcha') {
            const recaptchaVerify = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${payload.recaptchaToken}`);
            if (!recaptchaVerify.data.success) throw new Error("Falha na validação (Robô).");
        }
        
        if (!payload.reservas || !Array.isArray(payload.reservas) || payload.reservas.length === 0) {
            throw new Error("O pacote de reservas está vazio ou em formato inválido.");
        }
        if (payload.reservas.length > 50) {
            throw new Error("Limite de 50 solicitações por vez excedido (Proteção contra Flood).");
        }
        
        for (let item of payload.reservas) {
            if (!item.auditorio || !item.dateStr || !item.hIni || !item.hFim) {
                throw new Error("Dados de reserva incompletos. Faltam parâmetros obrigatórios.");
            }
            if (item.hIni >= item.hFim) {
                throw new Error(`Detecção de fraude temporal: A hora de término (${item.hFim}) não pode ser inferior ou igual à de início (${item.hIni}).`);
            }
            if (item.hIni < "07:00" || item.hFim > "21:30") {
                throw new Error("Os horários solicitados estão fora da matriz operacional do CCHLA (07:00 às 21:30).");
            }
        }

        let ticketFinal = null;
        
        const historyUser = await Reserva.find({ Matrícula: payload.matricula }).lean();
        
        for (let d of historyUser) {
            if (d.Email === payload.email || d.Telefone === payload.telefone) {
                ticketFinal = d.Ticket; 
                break;
            }
        }

        if (!ticketFinal) {
            ticketFinal = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        const dataSolicitacao = new Date().toLocaleString('pt-BR');
        const locaisStrings = [];
        const datasStrings = [];
        const documentosParaInserir = [];

        payload.reservas.forEach(item => {
            const dFmt = item.dateStr.split('-').reverse().join('/');
            locaisStrings.push(item.auditorio);
            datasStrings.push(`${dFmt} das ${item.hIni} às ${item.hFim}`);
            
            documentosParaInserir.push({
                Ticket: ticketFinal,
                Auditório: item.auditorio, 
                Solicitante: payload.solicitante,
                Matrícula: payload.matricula, 
                Telefone: payload.telefone, 
                Departamento: payload.departamento,
                Atividade: payload.atividade, 
                Início: `${item.dateStr}T${item.hIni}`, 
                Fim: `${item.dateStr}T${item.hFim}`,
                Email: payload.email, 
                Data_Solicitacao: dataSolicitacao, 
                Status: "Pendente",
                Alerta_Conflito: item.teveConflito ? "Sim" : "Não"
            });
        });

        await Reserva.insertMany(documentosParaInserir);

        try {
            await emailService.enviarConfirmacao({
                email: payload.email,
                ticket: ticketFinal,
                solicitante: payload.solicitante,
                auditorio: [...new Set(locaisStrings)].join(", "),
                atividade: payload.atividade,
                data_inicio: datasStrings.join("<br>")
            });
        } catch (emailError) {
            console.error("Falha ao enviar e-mail de confirmação:", emailError.message);
        }

        return res.status(200).json({ sucesso: true, ticketGerado: ticketFinal });

    } catch (error) {
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};

exports.obterEventosCalendario = async (req, res) => {
    try {
        const reservas = await Reserva.find({ Status: { $in: ["Aprovado", "Aprovada"] } }).lean();
        
        const eventos = reservas.map(d => {
            return {
                id: d._id.toString(),
                Auditório: d.Auditório,
                Atividade: d.Atividade,
                Início: d.Início,
                Fim: d.Fim,
                Solicitante: d.Solicitante,
                Departamento: d.Departamento
            };
        });

        return res.status(200).json(eventos);
    } catch (error) {
        console.error("Erro ao buscar eventos do calendário:", error);
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};

exports.consultarTicket = async (req, res) => {
    try {
        const { ticket } = req.body;
        if (!ticket) throw new Error("Ticket não fornecido na requisição.");

        const reservas = await Reserva.find({ Ticket: ticket.toUpperCase() }).lean();
        
        const resultados = reservas.map(data => ({
            id: data._id.toString(),
            Ticket: data.Ticket,
            Status: data.Status || 'Pendente',
            Auditório: data.Auditório,
            Atividade: data.Atividade,
            Início: data.Início || data.Inicio,
            Fim: data.Fim || data.fim,
            Solicitante: data.Solicitante,
            Departamento: data.Departamento,
            Telefone: data.Telefone,
            Email: data.Email || data['E-mail'],
            Data_Solicitacao: data.Data_Solicitacao,
            timestamp_criacao: data.timestamp_criacao,
            Motivo_Reprovacao: data.Motivo_Reprovacao
        }));

        return res.status(200).json(resultados);
    } catch (error) {
        console.error("Erro na consulta pública do ticket:", error);
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};

// -- ROTAS ADMIN --
exports.adminObterReservas = async (req, res) => {
    try {
        // Ordena pela data de criação descrescente (-1)
        const reservas = await Reserva.find().sort({ timestamp_criacao: -1 }).lean();
        
        // Adiciona id_documento para compatibilidade com o front-end
        const result = reservas.map(r => {
            r.id_documento = r._id.toString();
            return r;
        });
        
        return res.status(200).json(result);
    } catch (error) {
        console.error("Erro no adminObterReservas:", error);
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};

exports.adminAtualizarDocumento = async (req, res) => {
    try {
        const { idDoc, dadosAtualizacao } = req.body;
        if (!idDoc || !dadosAtualizacao) throw new Error("Parâmetros incompletos.");

        if (dadosAtualizacao.Status) {
            dadosAtualizacao.Status_Alterado_Por = req.usuarioLogado.email;
        }

        await Reserva.findByIdAndUpdate(idDoc, dadosAtualizacao);
        return res.status(200).json({ sucesso: true });
    } catch (error) {
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};

exports.adminExcluirDocumento = async (req, res) => {
    try {
        if (req.usuarioLogado.email !== 'tobias.rocha@ufrn.br' && req.usuarioLogado.nivel !== 'root') {
            throw new Error("Sua conta não tem permissão nível 'Root' para excluir registros.");
        }

        const { idDoc } = req.body;
        await Reserva.findByIdAndDelete(idDoc);
        return res.status(200).json({ sucesso: true });
    } catch (error) {
        return res.status(403).json({ erro: true, mensagem: error.message });
    }
};

exports.adminCadastrarDocumento = async (req, res) => {
    try {
        const { payload } = req.body;
        if (!payload) throw new Error("O corpo da requisição está vazio.");

        payload.Status_Alterado_Por = req.usuarioLogado.email;

        const novaReserva = new Reserva(payload);
        await novaReserva.save();
        
        return res.status(200).json({ sucesso: true, id: novaReserva._id.toString() });
    } catch (error) {
        console.error("Erro no adminCadastrarDocumento:", error);
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};

exports.notificar = async (req, res) => {
    try {
        const data = req.body;
        if (data.tipo === 'status_update_grouped') {
            await emailService.enviarStatusUpdateGrupo(data);
        } else if (data.tipo === 'status_update') {
            await emailService.enviarStatusUpdate(data);
        } else {
            await emailService.enviarConfirmacao(data);
        }
        return res.status(200).json({ sucesso: true });
    } catch (error) {
        console.error("Erro ao enviar notificação:", error.message);
        return res.status(500).json({ erro: true, mensagem: error.message });
    }
};
