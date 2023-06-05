'use strict';
require('dotenv').config();
const createError = require('http-errors')
const express = require('express');
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

fccTesting(app); //For FCC testing purposes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(process.cwd() + '/public'));
app.set('view engine', 'pug')
app.set('views', './views/pug')

app.route('/').get((req, res) => {
  res.render(index)
});

app.use((req, res, next) => {
  next(createError(404))
})
app.use((err, req, res, next) => {
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}
  res.status(err.status || 500)
  res.render("error")
})
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
