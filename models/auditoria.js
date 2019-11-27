var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var auditoriaSchema = new Schema({
    CPF: { type: String, required: true },
    Acao: { type: String,  required: true },
    Data: { type: String, required: true },
},{ collection: 'Auditoria' });
let Auditoria = mongoose.model("Auditoria", auditoriaSchema); 
module.exports = Auditoria;