const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
    ip: {
        type: String,
        required: true
    },
    username: {
        type: String,
        default: 'N/A'
    },
    success: {
        type: Boolean,
        default: false
    },
    userExists: {
        type: Boolean,
        default: false
    },
    route: {
        type: String,
        default: '/api/fazerLogin'
    },
    country: {
        type: String,
        default: 'Desconhecido'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { collection: 'security-cchla' });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
