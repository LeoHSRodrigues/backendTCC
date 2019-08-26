var mongoose = require('mongoose');  
mongoose.connect(process.env.DATABASE_URL);  
var Schema = mongoose.Schema;
require('./models/pessoa');