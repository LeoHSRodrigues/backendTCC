var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Pessoa = require('./models/pessoa');

passport.use('loginNormal',new LocalStrategy({
  usernameField: 'CPF',
  passwordField: 'Senha',
}, function(CPF, senha, done) {
    Pessoa.findOne({CPF: CPF, Senha: senha}).then(function(pessoa){
        if(!pessoa){
        return done(null, false, {errors: {'email or password': 'is invalid'}});
    }
    return done(null, pessoa);
  }).catch(done);
}));

