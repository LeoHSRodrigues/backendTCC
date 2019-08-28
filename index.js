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

const whitelist = ['http://localhost:4200', 'http://example2.com'];
const corsOptions = {
  credentials: true, // This is important.
  origin: (origin, callback) => {
    if(whitelist.includes(origin))
      return callback(null, true)

      callback(new Error('Not allowed by CORS'));
  }
}

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());
app.use(bodyParser.text());

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
  
});


var server = app.listen(8000, () => 
console.log('Rodando na porta 8000!'),
);

var io = require('socket.io').listen(server);
io.on('connection', function (socket) {
  // socket.broadcast.emit('user connected');
  socket.on("message", message => {
    console.log("Message Received: " + message);
    io.emit("message", { type: "new-message", text: message });
  });
  socket.on('disconnect', function () { console.log("user disconnected") });
})