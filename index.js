const express = require('express')
const app = express();
const cors = require("cors");
bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
require("dotenv").load();
mongoose.connect(process.env.DATABASE_URL,{dbName: "sistemaDeVotacao", useNewUrlParser: false, useCreateIndex:true});
// mongoose.set('debug', true);
require('./autenticacao');
const {PythonShell} = require("python-shell");
const python = require('./python');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());
app.use(bodyParser.text());
app.use(cors());

app.post('/api/login', (req, res,next) => {

  campos = req.body;
  
  passport.authenticate('local', {session: false}, function(err, resultado, info){
    if(err){ return next(err); }
    if(resultado){
      return res.json(resultado.toAuthJSON());
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);

});

app.post('/api/login/digital', (req, res,next) => {

python.gerarCaracteristicas();

});

  app.listen(8000, () =>
    console.log('Rodando na porta 8000!'),
  );