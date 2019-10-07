var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var urnaSchema = new Schema({
    UUID: { type: String, required: true },
    Apelido: { type: String, required: true },
    Senha: { type: String, required: true },
},{ collection: 'Urna' });

urnaSchema.set('timestamps', true);

let Urna = mongoose.model("Urna", urnaSchema); 
module.exports = Urna;