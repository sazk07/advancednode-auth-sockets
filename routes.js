'use strict'
const passport = require('passport')
const bcrypt = require('bcrypt')

module.exports = function (app, myDatabase) {
  app.route('/').get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please log in",
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    })
  });

  const ensureAuthenticated = (req, res, next) => {
    req.isAuthenticated() && next() || res.redirect('/')
  }

  app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile')
  })

  app.get('/profile', ensureAuthenticated, (req, res) => {
    res.render("profile", {
      username: req.user.username
    })
  })

  app.get('/chat', ensureAuthenticated, (req, res) => {
    app.render("chat", {
      user: req.user
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.post('/register', (req, res, next) => {
    myDatabase.findOne({
      username: req.body.username
    }, (err, user) => {
      switch (true) {
        case err:
          next(err)
          break;
        case user:
          res.redirect('/')
          break;
        default:
          const hash = bcrypt.hashSync(req.body.password, 12)
          myDatabase.insertOne({
            username: req.body.username,
            password: hash
          }, (err, cb) => {
            err && res.redirect('/') || next(null, cb.ops[0])
          })
          break;
      }
    })
  }, passport.authenticate('local', { failureRedirect: '/' }), (req, res, next) => {
    res.redirect('/profile')
  })

  app.get('/auth/github', passport.authenticate('github'))
  app.get('/auth/github/callback', passport.authenticate('github', {
    failureRedirect: '/'
  }), (req, res) => {
    req.session.user_id = req.user.id
    res.redirect('/chat')
  })

  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found')
  })
}
