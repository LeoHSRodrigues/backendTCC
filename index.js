const express = require("express");
const app = express();
const cors = require("cors");
bodyParser = require("body-parser");
let mongoose = require("mongoose");
let passport = require("passport");
const uuidv5 = require("uuid/v5");
let multer = require("multer");
let path = require("path");
let fs = require("fs");
let os = require("os");
require("dotenv").load();
mongoose.connect(process.env.DATABASE_URL, {
  dbName: "sistemaDeVotacao",
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: false,
  autoIndex: false
});
// mongoose.set('debug', true);
app.options("*", cors());
require("./autenticacao");
const { spawn } = require("child_process");
let Pessoa = require("./models/pessoa");
let Auditoria = require("./models/auditoria");
let Urna = require("./models/urna");

// const whitelist = ["http://localhost:4200", "localhost:8000"];
// const corsOptions = {
//   credentials: true, // This is important.
//   origin: (origin, callback) => {
//     if (whitelist.includes(origin)) return callback(null, true);

//     callback(new Error("Not allowed by CORS"));
//   }
// };

let server = app.listen(8000, () => console.log("Rodando na porta 8000!"));

data = new Date();

// app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());
app.use(bodyParser.text());
app.use(express.static("assets"));

app.post("/api/login", (req, res, next) => {
  campos = req.body;
  passport.authenticate("loginNormal", { session: false }, function(
    err,
    resultado,
    info
  ) {
    if (err) {
      return next(err);
    }
    if (resultado) {
      // console.log(resultado);
      return res.json(resultado.toAuthJSON());
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);
});

let storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./assets");
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

let upload = multer({ storage: storage });

app.post("/api/cadastroPessoa", (req, res, next) => {
  Pessoa.countDocuments({ CPF: req.body.CPF }, function(err, dados, info) {
    if (err) return handleError(err);
    if (dados > 0) {
      return res.status(422).json(info);
    } else {
      upload.single("Foto")(req, res, function(err) {
        if (err instanceof multer.MulterError) {
          return handleError(err);
        } else if (err) {
          return handleError(err);
        }
        if (req.file !== undefined && req.file !== null) {
          pessoa = new Pessoa({
            Nome: req.body.Nome,
            CPF: req.body.CPF,
            tipoConta: req.body.tipoConta,
            Senha: req.body.Senha,
            Digital: req.body.Digital,
            Foto: req.file.filename
          });
        } else {
          pessoa = new Pessoa({
            Nome: req.body.Nome,
            CPF: req.body.CPF,
            tipoConta: req.body.tipoConta,
            Senha: req.body.Senha,
            Digital: req.body.Digital,
            Foto: "N/A"
          });
        }
        pessoa.save(function(err, pessoa) {
          if (err) return console.error(err);
        });
        Auditoria.create(
          { CPF: req.body.CPF, Acao: "Cadastrou", Data: data },
          function(err, small) {
            if (err) return handleError(err);
            // saved!
          }
        );
        return res.json(pessoa);
      });
    }
  });
});
app.post("/api/cadastroUrna", (req, res, next) => {
  let Apelido = req.body.formulario.Apelido;
  let senha = req.body.formulario.Senha;
  const MY_NAMESPACE = "1db7b033-3d38-4bb9-b9a1-b59a95d04949";
  let UUID = uuidv5(Apelido, MY_NAMESPACE);
  Urna.countDocuments({ UUID: UUID }, function(err, dados, info) {
    if (err) return handleError(err);
    if (dados > 0) {
      return res.status(422).json(info);
    } else {
      let urna = new Urna({ UUID: UUID, Apelido: Apelido, Senha: senha });
      urna.save(function(err, urna) {
        if (err) return console.error(err);
      });
      Auditoria.create(
        {
          CPF: req.body.formulario.Apelido,
          Acao: "Cadastrou Urna",
          Data: data
        },
        function(err, small) {
          if (err) return handleError(err);
          // saved!
        }
      );
      return res.json(urna);
    }
  });
});

app.post("/api/atualizarPessoa", (req, res, next) => {
  Pessoa.updateOne(
    { CPF: req.body.formulario.CPF },
    {
      Nome: req.body.formulario.Nome,
      CPF: req.body.formulario.CPF,
      tipoConta: req.body.formulario.tipoConta,
      Digital: req.body.formulario.Digital,
      Senha: req.body.formulario.Senha
    },
    function(err, teste) {
      Auditoria.create(
        { CPF: req.body.formulario.CPF, Acao: "Atualizou", Data: data },
        function(err, small) {
          if (err) return handleError(err);
          // saved!
        }
      );
      return res.json(teste);
    }
  );
});
app.post("/api/atualizarUrna", (req, res, next) => {
  if (req.body.formulario.MudarSenha === "Sim") {
    const MY_NAMESPACE = "1db7b033-3d38-4bb9-b9a1-b59a95d04949";
    let UUID = uuidv5(req.body.formulario.Apelido, MY_NAMESPACE);
    Urna.countDocuments({ UUID: UUID }, function(err, dados, info) {
      if (err) return handleError(err);
      if (dados > 0) {
        return res.status(422).json(info);
      } else {
        Urna.updateOne(
          { UUID: req.body.formulario.UUID },
          {
            Apelido: req.body.formulario.Apelido,
            Senha: req.body.formulario.Senha
          },
          function(err, teste) {
            Auditoria.create(
              { CPF: req.body.formulario.UUID, Acao: "Atualizou", Data: data },
              function(err, small) {
                if (err) return handleError(err);
                // saved!
              }
            );
            return res.json(teste);
          }
        );
      }
    });
  } else {
    Urna.updateOne(
      { UUID: req.body.formulario.UUID },
      {
        Apelido: req.body.formulario.Apelido,
        Senha: req.body.formulario.Senha
      },
      function(err, teste) {
        Auditoria.create(
          { CPF: req.body.formulario.UUID, Acao: "Atualizou", Data: data },
          function(err, small) {
            if (err) return handleError(err);
            // saved!
          }
        );
        return res.json(teste);
      }
    );
  }
});
app.get("/api/apagarPessoa/:id", (req, res, next) => {
  Pessoa.deleteOne({ CPF: req.params.id }, function(err, teste) {
    if (err) return handleError(err);
    Auditoria.create(
      { CPF: req.params.id, Acao: "Apagou", Data: data },
      function(err, small) {
        if (err) return handleError(err);
        // saved!
      }
    );
    return res.json(teste);
  });
});
app.get("/api/apagarUrna/:id", (req, res, next) => {
  Urna.deleteOne({ UUID: req.params.id }, function(err, teste) {
    if (err) return handleError(err);
    Auditoria.create(
      { CPF: req.params.id, Acao: "Apagou", Data: data },
      function(err, small) {
        if (err) return handleError(err);
        // saved!
      }
    );
    return res.json(teste);
  });
});

app.get("/api/listaPessoas", (req, res, next) => {
  Pessoa.find({}, "Nome CPF tipoConta", function(err, pessoas) {
    return res.send(pessoas);
  });
});
app.get("/api/buscarPessoa/:id", (req, res, next) => {
  Pessoa.findOne(
    { CPF: req.params.id },
    "-_id -createdAt -updatedAt -__v",
    function(err, dados) {
      if (err) return handleError(err);
      if (dados !== null) {
        return res.send(dados);
      } else {
        return res.status(422).json();
      }
    }
  );
});
app.get("/api/buscarPessoaNav/:id", (req, res, next) => {
  Pessoa.findOne(
    { CPF: req.params.id },
    "-_id -createdAt -Senha -Digital -tipoConta -CPF -updatedAt -__v",
    function(err, dados) {
      if (err) return handleError(err);
      if (dados !== null) {
        enderecoBase = buscaEndereco();
        if (dados.Foto !== undefined && dados.Foto !== null) {
          imagem = enderecoBase + ':8000/' + dados.Foto;
        } else {
          imagem = "N/A";
        }
        resultadoFinal = { Foto: imagem, Nome: dados.Nome };
        return res.send(resultadoFinal);
      } else {
        return res.status(422).json();
      }
    }
  );
});
app.get("/api/buscarUrna/:id", (req, res, next) => {
  Urna.findOne(
    { UUID: req.params.id },
    "-_id -UUID -createdAt -updatedAt -__v",
    function(err, dados) {
      if (err) return handleError(err);
      if (dados !== null) {
        return res.send(dados);
      } else {
        return res.status(422).json();
      }
    }
  );
});

app.get("/api/listaLogs", (req, res, next) => {
  Auditoria.find({}, "CPF Acao Data", function(err, auditoria) {
    return res.send(auditoria);
  });
});
app.get("/api/listaUrnas", (req, res, next) => {
  Urna.find({}, "UUID Apelido", function(err, urna) {
    return res.send(urna);
  });
});

let io = require("socket.io").listen(server);

io.on("connection", function(socket) {
  socket.on("login", message => {
    if (message.startsWith("mensagem1") && message.length === 20) {
      cpf = message.slice(09);
      Pessoa.findOne({ CPF: cpf }, "-Senha", function(err, dados) {
        if (err) return handleError(err);
        if (dados !== null) {
          let ls = spawn(
            "python",
            ["-u", "./python_scripts/comparaCaracteristicas.py"],
            { stdio: "pipe" }
          );
          ls.stdin.write(dados.Digital);
          ls.stdin.end();

          global.timer = setTimeout(function() {
            ls.kill();
            io.emit("login", "Tentativa Expirada, tente novamente");
          }, 7000);

          ls.stdout.on("data", function(data) {
            clearTimeout(timer);
            timer = setTimeout(function() {
              ls.kill();
              io.emit("login", "Tentativa Expirada, tente novamente");
            }, 7000);

            if (data.toString().startsWith("achou")) {
              if (data.toString().slice(6) > 0) {
                clearTimeout(timer);
                io.emit("login", dados.toAuthJSON());
              } else {
                io.emit("login", "Digital não encontrada em nosso sistema");
              }
            } else {
              io.emit("login", data.toString());
            }
          });
          ls.stderr.on("data", function(data) {
            console.log("stderr: " + data.toString());
          });
          ls.on("exit", function(code) {
            // console.log('Acabou');
          });
        } else {
          io.emit("login", "CPF não cadastrado no sistema");
        }
      });
    }
  });
  socket.on("registro", message => {
    Pessoa.find(
      { tipoConta: "Admin" },
      "-_id -Senha -CPF -Nome -tipoConta",
      function(err, docs) {
        let ls = spawn("python", [
          "-u",
          "./python_scripts/criaCaracteristicas.py"
        ]);

        global.tempo = setTimeout(function() {
          ls.kill();
          io.emit("registro", "Tentativa Expirada, tente novamente");
        }, 5000);

        ls.stdout.on("data", function(data) {
          clearTimeout(tempo);

          tempo = setTimeout(function() {
            ls.kill();
            io.emit("registro", "Tentativa Expirada, tente novamente");
          }, 7000);

          if (data.toString().startsWith("[")) {
            clearTimeout(tempo);
            digital = data.toString();
            resultadoDigital = digital.slice(1, -3).split(",");
            let resultado = verificaAdmins(resultadoDigital, docs);
            if (resultado === "achou") {
              io.emit("registro", "achou");
            } else {
              io.emit("registro", "nachou");
            }
          } else {
            io.emit("registro", data.toString());
          }
        });
        ls.stderr.on("data", function(data) {
          console.log("stderr: " + data.toString());
        });
        ls.on("exit", function(code) {
          // console.log('Script Acabou');
        });
      }
    );
  });
  socket.on("cadastro", message => {
    let ls = spawn("python", [
      "-u",
      "./python_scripts/gerarCaracteristicas.py"
    ]);

    global.tempoCadastro = setTimeout(function() {
      ls.kill();
      io.emit("cadastro", "Tentativa Expirada, tente novamente");
    }, 7000);

    ls.stdout.on("data", function(data) {
      clearTimeout(tempoCadastro);

      tempoCadastro = setTimeout(function() {
        ls.kill();
        io.emit("cadastro", "Tentativa Expirada, tente novamente");
      }, 7000);

      io.emit("cadastro", data.toString());
      if (data.toString().startsWith("[")) {
        digital = data.toString();
        io.emit("cadastro", digital);
        clearTimeout(tempoCadastro);
      } else {
        io.emit("cadastro", data.toString());
      }
    });
    ls.stderr.on("data", function(data) {
      console.log("stderr: " + data.toString());
    });
    ls.on("exit", function(code) {
      // console.log('Script Acabou');
    });
  });
  socket.on("disconnect", function() {
    console.log("user disconnected");
  });
});

function verificaAdmins(resultadoDigital, docs) {
  for (dados of docs) {
    let str = resultadoDigital + "lplplp" + dados.Digital;
    const child_process = require("child_process");
    const result = child_process.spawnSync(
      "python.exe python_scripts/verificaAdmin.py",
      { input: str, shell: true }
    );
    if (result.stdout.toString().trim() > "0") {
      return "achou";
    }
  }
  return "nachou";
}
function base64_encode(file) {
  return fs.readFileSync(file, "base64");
}
function buscaEndereco(){
  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      global.endereco = iface.address;
        return;
    });
  });
  return global.endereco;
}
