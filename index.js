const express = require('express')
const app = express();
const cors = require("cors");
const mongo = require('mongodb').MongoClient
var jwt = require('jsonwebtoken');
bodyParser = require('body-parser');
require("dotenv").load();
var jwt = require('jsonwebtoken');


// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse the raw data
app.use(bodyParser.raw());
// parse text
app.use(bodyParser.text());
app.use(cors());
const url = 'mongodb://localhost:27017'


app.post('/api', (req, resultado) => {

  mongo.connect(url, { useNewUrlParser: true },(err, client) => {
    if (err) {
      console.error(err)
      return
    }
    
    // console.log(req.body);
    const db = client.db('sistemaDeVotacao')
    const collection = db.collection('usuarios')
    collection.find({"CPF" : req.body.CPF, "Senha": req.body.Senha}).count(function (err, res) {
      if (err)
         throw err;
         if (res == 1){
          var query = {"CPF" : req.body.CPF, "Senha": req.body.Senha};
          collection.find(query).toArray(function(err, result) {
            if (err) throw err;
            id = result[0]['_id']
            var token = jwt.sign({ id }, process.env.SECRET, {
              expiresIn: 604800
            });
            campos = {'token': token,'id': result[0]['_id'],'Nome': result[0]['Nome']}
            client.close();
            resultado.json(campos);
          });
          }
          else{
            resultado.json(null);

         }
      client.close();
  });
  })
});

app.listen(8000, () => {
  console.log('Example app listening on port 8000!')
});