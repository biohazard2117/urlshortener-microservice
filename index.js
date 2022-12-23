require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const validUrl = require('valid-url');
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongodb = require('mongodb')
const dns = require('dns');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// ===============Real Code=========================

// creating the url schema to hold data in mongodb
const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: String,
    required: true,
    default: 0
  }
});

const Url = mongoose.model('Url', urlSchema);

app.post('/api/shorturl', (req,res) => {
  const { url } = req.body;
  
  // retrieve the host name
  const hostname = url
  .replace(/http[s]?\:\/\//, '')
  .replace(/\/(.+)?/, '');

  dns.lookup(hostname, (err, address) => {
    if(err) {
      console.log(err);
    };
    if(!address) {
      res.json({
        error: "invalid url"
      });
    } else {
      // check if url already exists
      Url.findOne({orignal_url: url}, (err, shortend_url) => {
        if(err) console.log(err); 
        if(!shortend_url) {     // didn't found url in db
          Url.estimatedDocumentCount((err, count) => {
            if(err) console.log(err);
            const newShortUrl = new Url({
              original_url: url,
              short_url: count+1
            });

            newShortUrl.save((err, saved_url) => {             
              if(err) console.log(err);
              res.json({
                original_url: saved_url.original_url,
                short_url: saved_url.short_url
              }); 
            });
          });
        } else {            // found a url in db
          res.json({
                original_url: shortend_url.original_url,
                short_url: shortend_url.short_url
              }); 
        };
      });
      
    }
  })
});
app.get('/api/shorturl/:shorturl',(req,res) => {
  const {shorturl} = req.params;
  Url.findOne({short_url: shorturl}, (err, urlFound) => {
    if(err) console.log(err);
    if(!urlFound) {
      res.json({
        error: "No url found in db"
      });
    } else {
      res.redirect(urlFound.original_url); 
    }
  })
});





// connect to mongodb
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true
}).then(console.log("Database Connected"));

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
