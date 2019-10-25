const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const opcoesVotacaoSchema = new Schema({
    Nome: { type: String, required: true },
    DataInicio: { type: String, required: true },
    DataTermino: { type: String, required: true },
    Status: { type: String, required: true },
},{ collection: 'Opcoes_Votacao' });

let opcoesVotacao = mongoose.model("opcoesVotacao", opcoesVotacaoSchema); 
module.exports = opcoesVotacao;