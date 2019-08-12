const express = require('express')
const app = express();

app.get('/api', (req, res) => {
  res.json({"foo": "bar"});
});

app.listen(8000, () => {
  console.log('Example app listening on port 8000!')
});