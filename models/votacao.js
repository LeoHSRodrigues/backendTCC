const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Votacaochema = new Schema({
    Numero: { type: String, required: true },
},{ collection: 'Votacao' });


let Votacao = mongoose.model("Votacao", Votacaochema); 
module.exports = Votacao;