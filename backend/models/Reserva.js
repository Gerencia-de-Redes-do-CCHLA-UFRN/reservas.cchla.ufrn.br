const mongoose = require('mongoose');

const ReservaSchema = new mongoose.Schema({
  Ticket: { type: String, required: true },
  Auditório: { type: String, required: true },
  Solicitante: { type: String, required: true },
  Matrícula: { type: String, required: true },
  Telefone: { type: String, required: true },
  Departamento: { type: String, required: true },
  Atividade: { type: String, required: true },
  Início: { type: String, required: true }, // ISO string ex: 2026-06-29T14:00
  Fim: { type: String, required: true }, // ISO string ex: 2026-06-29T16:00
  Email: { type: String, required: true },
  Data_Solicitacao: { type: String, required: true },
  Status: { type: String, default: 'Pendente' },
  Alerta_Conflito: { type: String, default: 'Não' },
  Motivo_Reprovacao: { type: String },
  Status_Alterado_Por: { type: String },
  timestamp_criacao: { type: Date, default: Date.now }
}, {
  // Allows any additional fields that existed in Firestore to be saved
  strict: false 
});

module.exports = mongoose.model('Reserva', ReservaSchema, 'reservas');
