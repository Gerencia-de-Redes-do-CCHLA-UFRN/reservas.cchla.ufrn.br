const mongoose = require('mongoose');

const permissoesPadrao = {
  'reservas:visualizar': true,
  'reservas:criar': true,
  'reservas:editar': true,
  'reservas:aprovar': true,
  'reservas:excluir': false,
  'feriados:gerir': true,
  'usuarios:gerir': false
};

const permissoesRoot = {
  'reservas:visualizar': true,
  'reservas:criar': true,
  'reservas:editar': true,
  'reservas:aprovar': true,
  'reservas:excluir': true,
  'feriados:gerir': true,
  'usuarios:gerir': true
};

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  nivel: { type: String, default: 'admin' },
  permissoes: { type: Map, of: Boolean },
  data_criacao: { type: Date, default: Date.now }
});

AdminSchema.statics.permissoesPadrao = permissoesPadrao;
AdminSchema.statics.permissoesRoot = permissoesRoot;

module.exports = mongoose.model('Admin', AdminSchema, 'admins');
