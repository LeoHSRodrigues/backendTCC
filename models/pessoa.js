var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var passportLocalMongoose = require('passport-local-mongoose');
var Schema = mongoose.Schema;

var pessoaSchema = new Schema({
    Nome: { type: String, required: true },
    CPF: { type: String, unique: true, required: true },
    tipoConta: { type: String, required: true },
    Senha: { type: String, required: true },
    Digital: { type: String, required: true },
    Foto: { type: String, required: true },
},{ collection: 'Pessoa' });

pessoaSchema.set('timestamps', true);

pessoaSchema.methods.generateJWT = function() {
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 6);
    
    return jwt.sign({
        id: this._id,
        nome: this.nome,
        exp: parseInt(exp.getTime() / 1000),
    }, process.env.SECRET);
};

pessoaSchema.methods.toAuthJSON = function () {
    return {
        Nome: this.Nome,
        CPF: this.CPF,
        token: this.generateJWT(),
    };
};

pessoaSchema.plugin(passportLocalMongoose);

let Pessoa = mongoose.model("Pessoa", pessoaSchema); 
module.exports = Pessoa;