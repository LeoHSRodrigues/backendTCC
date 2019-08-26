const express = require('express')
const app = express();
const cors = require("cors");
bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var jwt = require('jsonwebtoken');
require("dotenv").load();
mongoose.connect(process.env.DATABASE_URL,{dbName: "sistemaDeVotacao", useNewUrlParser: false, useCreateIndex:true});
// mongoose.set('debug', true);
require('./models/pessoa');
var Pessoa = mongoose.model('Pessoa');
require('./autenticacao');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());
app.use(bodyParser.text());
app.use(cors());

app.post('/api/login', (req, res,next) => {

  campos = req.body;
  
  passport.authenticate('local', {session: false}, function(err, resultado, info){
    if(err){ return next(err); }
    resultado.token = resultado.generateJWT();
    console.log(resultado); 
    // if(campos){
    //   return res.json({campos: campos.toAuthJSON()});
    // } else {
    //   return res.status(422).json(info);
    // }
  })(req, res, next);

});
  app.listen(8000, () =>
    console.log('Rodando na porta 8000!'),
  );