var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var passportLocalMongoose = require('passport-local-mongoose');
var Schema = mongoose.Schema;

var pessoaSchema = new Schema({
    nome: { type: String, required: true },
    CPF: { type: String, unique: true, required: true },
    tipoConta: { type: String, required: true },
    senha: { type: String, required: true }
});

pessoaSchema.methods.generateJWT = function() {
    return jwt.sign({
        id: this._id,
        nome: this.nome,
        exp: 604800,
    }, process.env.SECRET);
};

pessoaSchema.methods.toAuthJSON = function () {
    return {
        nome: this.nome,
        CPF: this.CPF,
        token: this.generateJWT(),
        tipoConta: this.tipoConta,
    };
};

pessoaSchema.plugin(passportLocalMongoose);

let Pessoa = mongoose.model("Pessoa", pessoaSchema); 
module.exports = Pessoa;