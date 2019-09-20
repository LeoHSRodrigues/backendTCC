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
var Auditoria = require('./models/auditoria');

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

data = new Date();

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
      pessoa.save(function (err, pessoa) {
        if (err) return console.error(err);
      });
      Auditoria.create({ CPF: req.body.formulario.CPF,Acao: 'Cadastrou',Data: data}, function (err, small) {
        if (err) return handleError(err);
        // saved!
      });
      return res.json(pessoa);
    }
  });

});
app.post('/api/atualizar', (req, res, next) => {
      Pessoa.updateOne({CPF: req.body.formulario.CPF }, { Nome: req.body.formulario.Nome,CPF: req.body.formulario.CPF,tipoConta: req.body.formulario.tipoConta,Digital: req.body.formulario.Digital }, function(err, teste) {
        Auditoria.create({ CPF: req.body.formulario.CPF,Acao: 'Atualizou',Data: data}, function (err, small) {
          if (err) return handleError(err);
          // saved!
        });
        return res.json(teste);
      });
});
app.get('/api/apagarPessoa/:id', (req, res, next) => {
  console.log(req.params.id);
      Pessoa.deleteOne({CPF: req.params.id }, function(err, teste) {
        if (err) return handleError(err);
        Auditoria.create({ CPF: req.params.id,Acao: 'Apagou',Data: data}, function (err, small) {
          if (err) return handleError(err);
          // saved!
        });
        return res.json(teste);
      });
});

app.get('/api/listaPessoas', (req, res, next) => {
  Pessoa.find({},'Nome CPF tipoConta' ,function(err, pessoas) {
    return res.send(pessoas);
 });
});
app.get('/api/buscarPessoa/:id', (req, res, next) => {
  Pessoa.findOne({ CPF: req.params.id }, '-Senha -_id -createdAt -updatedAt -__v', function (err, dados) {
    if (err) return handleError(err);
    if (dados !== null){
      return res.send(dados);
    }
    else{
      return res.status(422).json();
    }
});
});

app.get('/api/listaLogs', (req, res, next) => {
  Auditoria.find({},'CPF Acao Data' ,function(err, auditoria) {
    return res.send(auditoria);
 });
});

var io = require('socket.io').listen(server);

io.on('connection', function (socket) {
  socket.on("login", message => {
    if (message.startsWith('mensagem1') && message.length === 20) {
      cpf = message.slice(09);
      Pessoa.findOne({ CPF: cpf }, '-Senha', function (err, dados) {
        if (err) return handleError(err);
        if (dados !== null){
        var ls = spawn('python', ["-u", "./python_scripts/comparaCaracteristicas.py"], { stdio: 'pipe' });
        ls.stdin.write(dados.Digital);
        ls.stdin.end();

        global.timer = setTimeout(function(){ 
          ls.kill();
          io.emit('login','Tentativa Expirada, tente novamente');
        }, 7000);

        ls.stdout.on('data', function (data) {

          clearTimeout(timer);
          timer = setTimeout(function(){ 
            ls.kill();
            io.emit('login','Tentativa Expirada, tente novamente');
        }, 7000);

          if (data.toString().startsWith('achou')) {
            if (data.toString().slice(6) > 0) {
              clearTimeout(timer);
              io.emit("login", dados.toAuthJSON());
            }
            else {
              io.emit("login", 'Digital não encontrada em nosso sistema');
            }
          }
          else {
            io.emit("login", data.toString());
          }
        });
        ls.stderr.on('data', function (data) {
          console.log('stderr: ' + data.toString());
        });
        ls.on('exit', function (code) {
          // console.log('Acabou');
        });
      }
      else{
        io.emit("login", 'CPF não cadastrado no sistema');
      }
      });
    }
  });
  socket.on("registro", message => {
    Pessoa.find({ tipoConta: 'Admin' }, '-_id -Senha -CPF -Nome -tipoConta', function (err, docs) {
      var ls = spawn('python', ["-u", "./python_scripts/criaCaracteristicas.py"]);

      global.tempo = setTimeout(function(){ 
        ls.kill();
        io.emit('registro','Tentativa Expirada, tente novamente');
      }, 5000);

      ls.stdout.on('data', function (data) {

        clearTimeout(tempo);

        tempo = setTimeout(function(){ 
          ls.kill();
          io.emit('registro','Tentativa Expirada, tente novamente');
        }, 7000);

        if (data.toString().startsWith('[')) {
          clearTimeout(tempo);
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

    global.tempoCadastro = setTimeout(function(){ 
      ls.kill();
      io.emit('cadastro','Tentativa Expirada, tente novamente');
    }, 7000);

    ls.stdout.on('data', function (data) {
      clearTimeout(tempoCadastro);

      tempoCadastro = setTimeout(function(){ 
        ls.kill();
        io.emit('cadastro','Tentativa Expirada, tente novamente');
      }, 7000);

      io.emit('cadastro',data.toString());
      if (data.toString().startsWith('[')) {
        digital = data.toString();
        io.emit("cadastro",digital);
        clearTimeout(tempoCadastro);
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
