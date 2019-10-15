var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CandidatoSchema = new Schema({
    Nome: { type: String, required: true },
    CPF: { type: String, unique: true, required: true },
    tipoConta: { type: String, required: true, enum: ['Eleitor', 'Candidato'], default: 'Eleitor'},
    Foto: { type: String, required: true },
    Numero: { type: String, required: false },
},{ collection: 'Candidatos' });

CandidatoSchema.set('timestamps', true);

let Candidato = mongoose.model("Candidato", CandidatoSchema); 
module.exports = Candidato;