require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const Reserva = require('../models/Reserva');

// ATENÇÃO: Você precisará do arquivo serviceAccountKey.json do Firebase
// Baixe no Console do Firebase -> Configurações do Projeto -> Contas de Serviço -> Gerar nova chave privada
// Coloque o arquivo serviceAccountKey.json na pasta "scripts"

let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
    console.error("❌ ERRO: Arquivo serviceAccountKey.json não encontrado na pasta scripts.");
    console.log("Por favor, baixe-o no console do Firebase e coloque-o nesta pasta antes de rodar a migração.");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrar() {
    try {
        console.log("Conectando ao MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Conectado ao MongoDB.");

        console.log("Lendo dados do Firestore...");
        const snapshot = await db.collection("reservas").get();
        
        let reservasParaInserir = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Tratamento da data de criação (Firestore Timestamp -> JS Date)
            let timestamp_criacao = Date.now();
            if (data.timestamp_criacao && data.timestamp_criacao.toDate) {
                timestamp_criacao = data.timestamp_criacao.toDate();
            }

            reservasParaInserir.push({
                ...data,
                Ticket: data.Ticket || 'N/A',
                Auditório: data.Auditório || data.Auditorio || 'N/A',
                Solicitante: data.Solicitante || 'N/A',
                Matrícula: data.Matrícula || data.Matricula || 'N/A',
                Telefone: data.Telefone || 'N/A',
                Departamento: data.Departamento || 'N/A',
                Atividade: data.Atividade || 'N/A',
                Início: data.Início || data.Inicio || 'N/A',
                Fim: data.Fim || data.fim || 'N/A',
                Email: data.Email || data['E-mail'] || 'N/A',
                Data_Solicitacao: data.Data_Solicitacao || 'N/A',
                timestamp_criacao: timestamp_criacao,
                _id: new mongoose.Types.ObjectId() // Gera novo ID do Mongo
            });
        });

        console.log(`Encontrados ${reservasParaInserir.length} registros no Firestore.`);

        if (reservasParaInserir.length > 0) {
            console.log("Inserindo no MongoDB...");
            await Reserva.insertMany(reservasParaInserir);
            console.log(`✅ Migração de ${reservasParaInserir.length} registros concluída com sucesso!`);
        } else {
            console.log("Nenhum registro para migrar.");
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Erro durante a migração:", error);
        process.exit(1);
    }
}

migrar();
