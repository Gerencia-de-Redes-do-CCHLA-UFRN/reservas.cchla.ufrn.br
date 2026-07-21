const mongoose = require('mongoose');

const securityConfigSchema = new mongoose.Schema({
    monitorarTodoProjeto: { type: Boolean, default: false },
    monitorarCalendarioPublico: { type: Boolean, default: false },
    monitorarFormularioPublico: { type: Boolean, default: false },
    monitorarAcompanhamentoPublico: { type: Boolean, default: false },
    monitorarPainel: { type: Boolean, default: false },
    monitorarFeriados: { type: Boolean, default: false },
    monitorarFormularioPainel: { type: Boolean, default: false }
}, { collection: 'security-cchla-config' });

module.exports = mongoose.model('SecurityConfig', securityConfigSchema);
