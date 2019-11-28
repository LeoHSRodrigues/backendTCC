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
let moment = require('moment-timezone');
moment.tz.setDefault("America/Belem");
require("dotenv").load();
mongoose.connect(process.env.DATABASE_URL, {
  dbName: "sistemaDeVotacao",
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: false,
  useFindAndModify: false,
  autoIndex: false
});
// mongoose.set('debug', true);
app.options("*", cors());
require("./autenticacao");
const { spawn } = require("child_process");
let Pessoa = require("./models/pessoa");
let Auditoria = require("./models/auditoria");
let Urna = require("./models/urna");
let Candidato = require("./models/candidatos");
let Votacao = require("./models/votacao");
let opcoesVotacao = require("./models/opcoesVotacao");

const whitelist = ["http://localhost:4200", "localhost:8000"];
const corsOptions = {
  credentials: true // This is important.
  // origin: (origin, callback) => {
  //   if (whitelist.includes(origin)) return callback(null, true);

  //   callback(new Error("Not allowed by CORS"));
  // }
};

let server = app.listen(8000, () => console.log("Rodando na porta 8000!"));

data = new Date();

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());
app.use(bodyParser.text());
app.use(express.static("assets"));
app.set("trust proxy", true);

let storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./assets");
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

let upload = multer({ storage: storage });

function verificaVotacao(req, res, next) {
  if ( req.path != '/api/statusAgendamentoVotacao' && req.path != '/api/contaVotos') {
    return next();
  }
  opcoesVotacao.countDocuments({}, function(err, dados, info) {
    if (err) return handleError(err);
    if (dados > 0) {
      opcoesVotacao.findOne({}, "Status DataInicio DataTermino", function(
        err,
        resultados
      ) {
        if (err) return handleError(err);
        const termino = moment(resultados.DataTermino);
        const inicioVotacao = moment(resultados.DataInicio);
        const agora = moment(new Date());
        const antesDeFinalizar = moment(agora).isBefore(termino);
        const depoisDoInicio = moment(agora).isAfter(inicioVotacao);
        if (resultados.Status === "Aguardando") {
          if (antesDeFinalizar === true && depoisDoInicio === true) {
            opcoesVotacao.updateOne({}, { Status: "Iniciada" }, function(
              err,
              teste
            ) {
              Auditoria.create(
                {
                  CPF: "N/A",
                  Acao: "Iniciado pelo tempo",
                  Data: data
                },
                function(err, small) {
                  if (err) return handleError(err);
                  // saved!
                }
              );
            });
          } else {
          }
          } else {
            if (resultados.Status === "Iniciada") {
              if (antesDeFinalizar === false && depoisDoInicio === true) {
                opcoesVotacao.updateOne({}, { Status: "Contagem" }, function(
                  err,
                  teste
                ) {
                  Auditoria.create(
                    {
                      CPF: "N/A",
                      Acao: "Entrou em status de contagem pelo tempo expirado",
                      Data: data
                    },
                    function(err, small) {
                      if (err) return handleError(err);
                      // saved!
                    }
                  );
                });
              } else {
              }
            }
          }
      });
    } else {
    }
  });
  next();
}

app.all('*', verificaVotacao);

app.post("/api/login", upload.none(), (req, res, next) => {
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
      if (info.errors.permissao) {
        return res.status(422).json(info.errors.permissao);
      } else {
        return res.status(400).json(info.errors.permissao);
      }
    }
  })(req, res, next);
});

app.post("/api/loginUrna", upload.none(), (req, res, next) => {
  let ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  let Apelido = req.body.Apelido;
  let senha = req.body.Senha;
  const update = { IPuso: ip, Status: "Em uso" };
  //mudar pra env variable
  const MY_NAMESPACE = "1db7b033-3d38-4bb9-b9a1-b59a95d04949";
  let UUID = uuidv5(Apelido, MY_NAMESPACE);
  Urna.findOne({ UUID: UUID, Senha: senha }, "Status", function(err, dados) {
    if (err) return handleError(err);
    if (!dados) return res.status(422).json('Erro');
    if (dados.Status === "Em uso") {
      Urna.findOne({ UUID: UUID, Senha: senha, IPuso: ip }, "Status", function(
        err,
        dados
      ) {
        if (err) return handleError(err);
        if (dados) {
          Urna.findOneAndUpdate(
            { UUID: UUID, Senha: senha },
            update,
            { new: true },
            (err, doc) => {
              if (err) {
                console.log("Something wrong when updating data!");
              }
              const resultado = { UUID: doc.Apelido, Hash: doc.Senha };
              return res.json(resultado);
            }
          );
        } else {
          return res.status(422).json("error");
        }
      });
    } else {
      Urna.findOneAndUpdate(
        { UUID: UUID, Senha: senha },
        update,
        { new: true },
        (err, doc) => {
          if (err) {
            console.log("Something wrong when updating data!");
          }
          const resultado = { UUID: doc.UUID, Hash: doc.Senha };
          return res.json(resultado);
        }
      );
    }
    // return res.json(dados);
  });
});

app.post("/api/cadastroPessoa", (req, res, next) => {
  upload.single("Foto")(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return handleError(err);
    } else if (err) {
      return handleError(err);
    }
    Pessoa.countDocuments({ CPF: req.body.CPF }, function(err, dados, info) {
      if (err) return handleError(err);
      if (dados > 0) {
        if (req.file !== undefined && req.file !== null) {
          fs.unlinkSync("assets/" + req.file.filename);
        }
        return res.status(422).json(info);
      } else {
        if (req.file !== undefined && req.file !== null) {
          pessoa = new Pessoa({
            Nome: req.body.Nome,
            CPF: req.body.CPF,
            tipoConta: req.body.tipoConta,
            Senha: req.body.Senha,
            Digital: req.body.Digital,
            Foto: req.file.filename,
            Voto: 'NAO'
          });
          candidato = new Candidato({
            Nome: req.body.Nome,
            CPF: req.body.CPF,
            Foto: req.file.filename
          });
        } else {
          pessoa = new Pessoa({
            Nome: req.body.Nome,
            CPF: req.body.CPF,
            tipoConta: req.body.tipoConta,
            Senha: req.body.Senha,
            Digital: req.body.Digital,
            Foto: "N/A",
            Voto:'Nao'
          });
          candidato = new Candidato({
            Nome: req.body.Nome,
            CPF: req.body.CPF,
            Foto: "N/A"
          });
        }
        pessoa.save(function(err, pessoa) {
          if (err) return console.error(err);
        });
        candidato.save(function(err, candidato) {
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
      }
    });
  });
});
app.post("/api/cadastroUrna", upload.none(), (req, res, next) => {
  let Apelido = req.body.Apelido;
  let senha = req.body.Senha;
  // mudar pra env variable
  const MY_NAMESPACE = "1db7b033-3d38-4bb9-b9a1-b59a95d04949";
  let UUID = uuidv5(Apelido, MY_NAMESPACE);
  Urna.countDocuments({ UUID: UUID }, function(err, dados, info) {
    if (err) return handleError(err);
    if (dados > 0) {
      return res.status(422).json(info);
    } else {
      let urna = new Urna({ UUID: UUID, Apelido: Apelido, Senha: senha, Status: 'Livre' });
      urna.save(function(err, urnas) {
        if (err) return console.error(err);
      });
      Auditoria.create(
        {
          CPF: req.body.Apelido,
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

app.post("/api/cadastroCandidato", upload.none(), (req, res, next) => {
  Candidato.countDocuments({ Numero: req.body.Numero }, function(
    err,
    dados,
    info
  ) {
    if (err) return handleError(err);
    if (dados > 0) {
      return res.status(422).json(info);
    } else {
      Candidato.updateOne(
        { CPF: req.body.CPF },
        {
          Numero: req.body.Numero,
          tipoConta: "Candidato"
        },
        function(err, teste) {
          Auditoria.create(
            { CPF: req.body.CPF, Acao: "Virou candidato", Data: data },
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
});
app.post("/api/opcoesVotacao", upload.none(), (req, res, next) => {
  opcoesVotacao.countDocuments({}, function(err, dados, info) {
    if (err) return handleError(err);
    if (dados > 0) {
      return res.status(422).json(info);
    } else {
      opcoesVotacao.create(
        {
          Nome: req.body.NomeEleicao,
          DataInicio: req.body.DataInicioVotacao,
          DataTermino: req.body.DataTerminoVotacao,
          Status: "Aguardando"
        },
        function(err, small) {
          if (err) return res.json(err);
          Auditoria.create(
            { CPF: req.body.CPF, Acao: "Aguardando Votação", Data: data },
            function(err, small) {
              if (err) return res.json(err);
              // saved!
            }
          );
          Votacao.deleteMany({}, function(err, teste) {
            if (err) return handleError(err);
            // return res.json(teste);
          });
          return res.json(small);
        }
      );
    }
  });
});

app.post("/api/atualizarCandidato", upload.none(), (req, res, next) => {
  Candidato.countDocuments({ Numero: req.body.Numero }, function(
    err,
    dados,
    info
  ) {
    if (err) return handleError(err);
    if (dados > 0) {
      return res.status(422).json(info);
    } else {
      Candidato.updateOne(
        { CPF: req.body.CPF },
        {
          Numero: req.body.Numero,
          tipoConta: "Candidato"
        },
        function(err, teste) {
          Auditoria.create(
            { CPF: req.body.CPF, Acao: "Atualizou candidatura", Data: data },
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
});

app.post("/api/atualizarPessoa", (req, res, next) => {
  upload.single("Foto")(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return handleError(err);
    } else if (err) {
      return handleError(err);
    }
    if (req.file !== undefined && req.file !== null) {
      Pessoa.updateOne(
        { CPF: req.body.CPF },
        {
          Nome: req.body.Nome,
          CPF: req.body.CPF,
          tipoConta: req.body.tipoConta,
          Digital: req.body.Digital,
          Senha: req.body.Senha,
          Foto: req.file.filename
        },
        function(err, teste) {
          Auditoria.create(
            { CPF: req.body.CPF, Acao: "Atualizou", Data: data },
            function(err, small) {
              if (err) return handleError(err);
              // saved!
            }
          );
        }
      );
    } else {
      Pessoa.updateOne(
        { CPF: req.body.CPF },
        {
          Nome: req.body.Nome,
          CPF: req.body.CPF,
          tipoConta: req.body.tipoConta,
          Digital: req.body.Digital,
          Senha: req.body.Senha
        },
        function(err, teste) {
          Auditoria.create(
            { CPF: req.body.CPF, Acao: "Atualizou", Data: data },
            function(err, small) {
              if (err) return handleError(err);
              // saved!
            }
          );
        }
      );
    }
  });
  return res.status(200).json({ status: "ok" });
});

app.post("/api/atualizarUrna", upload.none(), (req, res, next) => {
  //mudar pra env variable
  const MY_NAMESPACE = "1db7b033-3d38-4bb9-b9a1-b59a95d04949";
  let UUID = uuidv5(req.body.Apelido, MY_NAMESPACE);
  if (req.body.MudarSenha === "Sim") {
    Urna.countDocuments({ UUID: UUID }, function(err, dados, info) {
      if (err) return handleError(err);
      if (dados > 0) {
        return res.status(422).json(info);
      } else {
        Urna.updateOne(
          { UUID: req.body.UUID },
          {
            Apelido: req.body.Apelido,
            Senha: req.body.Senha,
            UUID: UUID
          },
          function(err, teste) {
            Auditoria.create(
              { CPF: req.body.UUID, Acao: "Atualizou", Data: data },
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
      { UUID: req.body.UUID },
      {
        Apelido: req.body.Apelido,
        Senha: req.body.Senha,
        UUID: UUID
      },
      function(err, teste) {
        Auditoria.create(
          { CPF: req.body.UUID, Acao: "Atualizou", Data: data },
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

app.get("/api/encerraVotacao/:id", (req, res, next) => {
  opcoesVotacao.updateOne({}, { Status: "Contagem" }, function(err, teste) {
    Auditoria.create(
      {
        CPF: req.params.id,
        Acao: "Encerrou votação e iniciou a contagem",
        Data: data
      },
      function(err, small) {
        if (err) return handleError(err);
        // saved!
      }
    );
    return res.json(teste);
  });
});
app.get("/api/statusAgendamentoVotacao", (req, res, next) => {
  res.send();
});

app.get("/api/finalizarVotacao/:id", (req, res, next) => {
  opcoesVotacao.deleteMany({}, function(err, teste) {
    if (err) return handleError(err);
    Urna.updateMany({IPuso: '', Status: ''}, function(err, teste) {
      if (err) return handleError(err);
    Auditoria.create(
      { CPF: req.params.id, Acao: "Finalizou Votação", Data: data },
      function(err, small) {
        if (err) return handleError(err);
        // saved!
      }
    );
  });
  return res.json(teste);
  });
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
app.get("/api/apagarCandidato/:id", (req, res, next) => {
  Candidato.deleteOne({ CPF: req.params.id }, function(err, teste) {
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

app.get("/api/removerCandidatura/:id", upload.none(), (req, res, next) => {
  Candidato.updateOne(
    { CPF: req.params.id },
    {
      Numero: "",
      tipoConta: "Eleitor"
    },
    function(err, teste) {
      Auditoria.create(
        { CPF: req.params.id, Acao: "Revogou candidatura", Data: data },
        function(err, small) {
          if (err) return handleError(err);
          // saved!
        }
      );
      return res.json(teste);
    }
  );
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

app.get("/api/votacaoPessoa", (req, res, next) => {
  Pessoa.countDocuments({ Voto: "NAO" }, function(err, dados) {
    if (err) return handleError(err);
    if (dados < 0) {
      return res.status(422).json(info);
    } else {
      return res.json('Sucesso');
    }
  });
});

app.post("/api/validaVotoPessoa", upload.none(), (req, res, next) => {
  Pessoa.countDocuments({ Voto: "SIM",CPF: req.body.CPF }, function(err, dados) {
    if (err) return handleError(err);
    if (dados > 0) {
      return res.status(422).json(info);
    } else {
      return res.json('Sucesso');
    }
  });
});

app.post("/api/atualizarVotoPessoa", upload.none(), (req, res, next) => {
  Pessoa.updateOne(
    { CPF: req.body.CPF },
    {
      Voto: 'SIM',
    },function(err, teste) {
      return res.json(teste);
    }
  );
});


app.get("/api/contaCandidatos", (req, res, next) => {
  Candidato.countDocuments({ tipoConta: "Candidato" }, function(err, dados) {
    if (err) return handleError(err);
    return res.json(dados);
  });
});

app.get("/api/contaCadastrados", (req, res, next) => {
  Candidato.countDocuments({}, function(err, dados) {
    if (err) return handleError(err);
    return res.json(dados);
  });
});
app.get("/api/contaVotos", (req, res, next) => {
  Votacao.countDocuments({}, function(err, dados) {
    if (err) return handleError(err);
    return res.json(dados);
  });
});
app.get("/api/datasVotacao", (req, res, next) => {
  opcoesVotacao.findOne({}, "DataInicio DataTermino -_id", function(
    err,
    dados
  ) {
    if (err) return handleError(err);
    if (dados) return res.json(dados);
    return res.json('Vazio');
  });
});
app.get("/api/contaUrnas", (req, res, next) => {
  Urna.countDocuments({}, function(err, dados) {
    if (err) return handleError(err);
    return res.json(dados);
  });
});

app.get("/api/verificaVotacaoAtivada", (req, res, next) => {
  opcoesVotacao.findOne({}, "Status", function(err, dados) {
    if (err) return handleError(err);
    return res.json(dados);
  });
});

app.get("/api/verificaStatusVotacao", (req, res, next) => {
  opcoesVotacao.findOne({}, "Status", function(err, dados) {
    if (err) return handleError(err);
    return res.json(dados);
  });
});

app.get("/api/listaPessoas", (req, res, next) => {
  Pessoa.find({}, "Nome CPF tipoConta Foto", function(err, pessoas) {
    enderecoBase = buscaEndereco();
    resultadoFinal = [];
    pessoas.map((elementoAtual, index) => {
      if (elementoAtual.Foto === "" || elementoAtual.Foto === "N/A") {
        fotoFinal = "N/A";
      } else {
        fotoFinal = "http://" + enderecoBase + ":8000/" + elementoAtual.Foto;
      }
      resultadoFinal.push({
        Nome: elementoAtual.Nome,
        CPF: elementoAtual.CPF,
        tipoConta: elementoAtual.tipoConta,
        Foto: fotoFinal
      });
    });
    return res.send(resultadoFinal);
  });
});

app.get("/api/listaVotos", (req, res, next) => {
  Votacao.aggregate([
    {
      $group: {
        _id: {Numero: "$Numero", Nome: "$Nome"},
        Contagem: { $sum: 1 }
      }
    },
    { $sort: { Contagem: -1 } },
  ]).exec(function(e, d) {
    res.send(d);
  });
});

app.get("/api/listaCandidatos", (req, res, next) => {
  Candidato.find({ tipoConta: "Candidato" }, "Nome CPF Numero", function(
    err,
    pessoas
  ) {
    enderecoBase = buscaEndereco();
    resultadoFinal = [];
    pessoas.map((elementoAtual, index) => {
      resultadoFinal.push({
        Nome: elementoAtual.Nome,
        CPF: elementoAtual.CPF,
        Numero: elementoAtual.Numero
      });
    });
    return res.send(resultadoFinal);
  });
});

app.get("/api/listaVotacao", (req, res, next) => {
  Candidato.find({}, "Nome CPF tipoConta Foto Numero", function(err, pessoas) {
    enderecoBase = buscaEndereco();
    resultadoFinal = [];
    pessoas.map((elementoAtual, index) => {
      if (elementoAtual.Foto === "" || elementoAtual.Foto === "N/A") {
        fotoFinal = "N/A";
      } else {
        fotoFinal = "http://" + enderecoBase + ":8000/" + elementoAtual.Foto;
      }
      resultadoFinal.push({
        Nome: elementoAtual.Nome,
        CPF: elementoAtual.CPF,
        tipoConta: elementoAtual.tipoConta,
        Foto: fotoFinal,
        Numero: elementoAtual.Numero
      });
    });
    return res.send(resultadoFinal);
  });
});

app.get("/api/buscarPessoa/:id", (req, res, next) => {
  Pessoa.findOne(
    { CPF: req.params.id },
    "-_id -createdAt -updatedAt -__v",
    function(err, dados) {
      if (err) return handleError(err);
      if (dados !== null) {
        enderecoBase = buscaEndereco();
        if (
          dados.Foto !== undefined &&
          dados.Foto !== null &&
          dados.Foto !== "N/A"
        ) {
          imagem = enderecoBase + ":8000/" + dados.Foto;
        } else {
          imagem = undefined;
        }
        resultadoFinal = {
          Nome: dados.Nome,
          CPF: dados.CPF,
          tipoConta: dados.tipoConta,
          Senha: dados.Senha,
          Digital: dados.Digital,
          Foto: imagem
        };
        return res.send(resultadoFinal);
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
        if (
          dados.Foto !== undefined &&
          dados.Foto !== null &&
          dados.Foto !== "N/A"
        ) {
          imagem = enderecoBase + ":8000/" + dados.Foto;
        } else {
          imagem = undefined;
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

app.get("/api/buscarCandidato/:id", (req, res, next) => {
  Candidato.findOne(
    { Numero: req.params.id },
    "-_id -createdAt -updatedAt -__v -Senha",
    function(err, dados) {
      if (err) return handleError(err);
      if (dados !== null) {
        enderecoBase = buscaEndereco();
        if (dados.Foto !== undefined && dados.Foto !== null) {
          imagem = enderecoBase + ":8000/" + dados.Foto;
        } else {
          imagem = "N/A";
        }
        resultadoFinal = { Nome: dados.Nome, Foto: imagem };
        return res.send(resultadoFinal);
      } else {
        return res.status(422).json();
      }
    }
  );
});

app.post("/api/salvarOpcaoVoto/",  upload.none(),(req, res, next) => {
  Votacao.create({ Numero: req.body.Numero, Nome: req.body.Nome }, function(err, small) {
    if (err) return handleError(err);
    // saved!
    res.send(small);
  });
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
function buscaEndereco() {
  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function(ifname) {
    ifaces[ifname].forEach(function(iface) {
      if ("IPv4" !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      global.endereco = iface.address;
      return;
    });
  });
  return global.endereco;
}
