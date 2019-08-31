const express = require('express')
const app = express();
const cors = require("cors");
bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
require("dotenv").load();
mongoose.connect(process.env.DATABASE_URL, { dbName: "sistemaDeVotacao", useNewUrlParser: false, useCreateIndex: true });
// mongoose.set('debug', true);
require('./autenticacao');
const { spawn } = require('child_process')
var Pessoa = require('./models/pessoa');

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
      return res.json(resultado.toAuthJSON());
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);

});

var io = require('socket.io').listen(server);


io.on('connection', function (socket) {
  // console.log('Conectou');
  socket.on("login", message => {
    if (message.startsWith('mensagem1') && message.length === 20) {
      cpf = message.slice(09);
      Pessoa.findOne({ CPF: cpf }, 'Digital', function (err, dados) {
        if (err) return handleError(err);
        var ls = spawn('python', ["-u", "./python_scripts/comparaCaracteristicas.py"], { stdio: 'pipe' });
        ls.stdin.write(dados.Digital);
        ls.stdin.end();
        ls.stdout.on('data', function (data) {
          if (data.toString().startsWith('achou')) {
            console.log(data.toString().slice(6));
            if (data.toString().slice(6) > 0) {
              io.emit("login", 'sucesso');
            }
            else {
              io.emit("login", 'erro');
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
          // console.log('child process exited with code ' + code.toString());
        });
      });
    }
  });
  socket.on("registro", message => {
    var ls = spawn('python', ["-u", "./python_scripts/comparaCaracteristicas.py"], { stdio: 'pipe' });
    ls.stdin.write(dados.Digital);
    ls.stdin.end();
    ls.stdout.on('data', function (data) {
      if (data.toString().startsWith('achou')) {
        console.log(data.toString().slice(6));
        if (data.toString().slice(6) > 0) {
          io.emit("registro", 'sucesso');
        }
        else {
          io.emit("registro", 'erro');
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
      // console.log('child process exited with code ' + code.toString());
    });
  });
  socket.on('disconnect', function () { console.log("user disconnected") });
})
