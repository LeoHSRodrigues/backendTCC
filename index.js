const express = require('express')
const app = express();
const cors = require("cors");
bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
require("dotenv").load();
mongoose.connect(process.env.DATABASE_URL, { dbName: "sistemaDeVotacao", useNewUrlParser: true, useCreateIndex: false, autoIndex: false });
// mongoose.set('debug', true);
require('./autenticacao');
const { spawn } = require('child_process')
var Pessoa = require('./models/pessoa');
var Promise = require("bluebird");

const whitelist = ['http://localhost:4200', 'localhost'];
const corsOptions = {
  credentials: true, // This is important.
  origin: (origin, callback) => {
    if (whitelist.includes(origin))
      return callback(null, true)

    callback(new Error('Not allowed by CORS'));
  }
}

var server = app.listen(8000, () =>
  console.log('Rodando na porta 8000!'),
);

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());
app.use(bodyParser.text());

app.post('/api/login', (req, res, next) => {
  campos = req.body;
  passport.authenticate('loginNormal', { session: false }, function (err, resultado, info) {
    if (err) { return next(err); }
    if (resultado) {
      // console.log(resultado);
      return res.json(resultado.toAuthJSON());
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);

});

app.post('/api/cadastro', (req, res, next) => {
  Pessoa.countDocuments({ CPF: req.body.formulario.CPF }, function (err, dados, info) {
    if (err) return handleError(err);
    // console.log(dados);
    if(dados > 0){
      return res.status(422).json(info);
    }
    else{
      var pessoa = new Pessoa({ Nome: req.body.formulario.Nome,CPF: req.body.formulario.CPF,tipoConta: req.body.formulario.tipoConta,Senha: req.body.formulario.Senha,Digital: req.body.formulario.Digital });
 
      // save model to database
      pessoa.save(function (err, pessoa) {
        if (err) return console.error(err);
        console.log(" saved to bookstore collection.");
      });
    }
  });

});

app.get('/api/listaPessoas', (req, res, next) => {
  Pessoa.find({},'Nome CPF tipoConta' ,function(err, pessoas) {
    console.log(pessoas);
    return res.send(pessoas);
 });
});

var io = require('socket.io').listen(server);


io.on('connection', function (socket) {
  socket.on("login", message => {
    if (message.startsWith('mensagem1') && message.length === 20) {
      cpf = message.slice(09);
      Pessoa.findOne({ CPF: cpf }, '--Senha', function (err, dados) {
        if (err) return handleError(err);
        var ls = spawn('python', ["-u", "./python_scripts/comparaCaracteristicas.py"], { stdio: 'pipe' });
        ls.stdin.write(dados.Digital);
        ls.stdin.end();
        ls.stdout.on('data', function (data) {
          if (data.toString().startsWith('achou')) {
            if (data.toString().slice(6) > 0) {
              io.emit("login", dados.toAuthJSON());
            }
            else {
              io.emit("login", 'msgDigital não encontrada em nosso sistema');
            }
          }
          else {
            io.emit("login", 'msg' + data.toString());
          }
        });
        ls.stderr.on('data', function (data) {
          console.log('stderr: ' + data.toString());
        });
        ls.on('exit', function (code) {
          console.log('Acabou');
        });
      });
    }
  });
  socket.on("registro", message => {
    Pessoa.find({ tipoConta: 'Admin' }, '-_id -Senha -CPF -Nome -tipoConta', function (err, docs) {
      var ls = spawn('python', ["-u", "./python_scripts/criaCaracteristicas.py"]);
      ls.stdout.on('data', function (data) {
        if (data.toString().startsWith('[')) {
          digital = data.toString();
          resultadoDigital = digital.slice(1, -3).split(',');
          let resultado = verificaAdmins(resultadoDigital, docs);
          if(resultado === 'achou'){
            io.emit("registro",'achou');
          }
          else{
            io.emit("registro",'nachou');
          }
        }
        else {
          io.emit("registro", data.toString());
        }
      });
      ls.stderr.on('data', function (data) {
        console.log('stderr: ' + data.toString());
      });
      ls.on('exit', function (code) {
        // console.log('Script Acabou');
      });
    });
  });
  socket.on("cadastro", message => {
    var ls = spawn('python', ["-u", "./python_scripts/gerarCaracteristicas.py"]);
    ls.stdout.on('data', function (data) {
      io.emit('cadastro',data.toString());
      if (data.toString().startsWith('[')) {
        digital = data.toString();
        io.emit("cadastro",digital);
      }
      else {
        io.emit("cadastro", data.toString());
      }
    });
    ls.stderr.on('data', function (data) {
      console.log('stderr: ' + data.toString());
    });
    ls.on('exit', function (code) {
      // console.log('Script Acabou');
    });
  });
  socket.on('disconnect', function () { console.log("user disconnected") });
})

function verificaAdmins(resultadoDigital, docs) {
  for (dados of docs) {
    let str = resultadoDigital+'lplplp'+dados.Digital;
    const child_process = require("child_process");
    const result = child_process.spawnSync("python.exe python_scripts/verificaAdmin.py", { input: str,shell: true});
    if (result.stdout.toString().trim() > '0'){
      return 'achou';
    }
  };
    return 'nachou';
}
