'use strict';
require('dotenv').config();
const express = require('express');
const logger = require('morgan')
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session')
const passport = require('passport')
const routes = require('./routes.js')
const auth = require('./auth.js');
const passportSocketIo = require('passport.socketio')
const MongoStore = require('connect-mongo')(session)
const cookieParser = require('cookie-parser')

const URI = process.env.MONGO_URI
const store = new MongoStore({
  url: URI
})

const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  key: 'express.sid',
  cookie: { secure: false }
}))

app.use(passport.initialize())
app.use(passport.session())

fccTesting(app); //For FCC testing purposes
app.use(logger("dev"))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(process.cwd() + '/public'));
app.set('view engine', 'pug')
app.set('views', './views/pug')

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  store: store,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail
}))

myDB(async client => {
  const myDatabase = await client.db('database').collection('users')
  let currentUsers = 0
  io.on('connection', socket => {
    console.log('A user has connected')
    ++currentUsers
    // emit event on connect
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true
    })
    // listen to the socket for the event
    socket.on('chat message', (message) => {
      io.emit('chat message', {
        username: socket.request.user.username,
        message
      })
    })
    socket.on('disconnect', () => {
      --currentUsers
      // emit event on disconnect
      io.emit('user', {
        username: socket.request.user.username,
        currentUsers,
        connected: false
      })
    })
  })
  routes(app, myDatabase)
  auth(app, myDatabase)
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' })
  })
})

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io')
  accept(null, true)
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message)
  console.log('failed connection to socket.io: ', message)
  accept(null, false)
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

