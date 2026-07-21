require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Conectado ao MongoDB!");

        readline.question('Digite o E-mail do novo administrador: ', async (email) => {
            readline.question('Digite a Senha: ', async (senha) => {
                
                const adminExistente = await Admin.findOne({ email });
                if (adminExistente) {
                    console.log("Este administrador já existe!");
                    process.exit(0);
                }

                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(senha, salt);

                const novoAdmin = new Admin({
                    email: email,
                    password_hash: hash,
                    nivel: 'root'
                });

                await novoAdmin.save();
                console.log(`✅ Administrador ${email} criado com sucesso!`);
                process.exit(0);
            });
        });

    } catch (error) {
        console.error("Erro ao criar admin:", error);
        process.exit(1);
    }
}

seedAdmin();
