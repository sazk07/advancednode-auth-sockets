'use strict'
const passport = require('passport')
const { ObjectID } = require('mongodb')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const GitHubStrategy = require('passport-github').Strategy
require('dotenv').config()

module.exports = function (app, myDatabase) {
  const localStrategy = new LocalStrategy((username, password, done) => {
    myDatabase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`)
      err && (done(err))
      !user || !bcrypt.compareSync(password, user.password) && (done(null, false))
      return done(null, user)
    })
  })
  passport.use(localStrategy)

  const githubStrategy = new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/github/callback"
  }, (accessToken, refreshToken, profile, done) => {
    myDatabase.findOneAndUpdate({
      id: profile.id
    }, {
      $setOnInsert: {
        id: profile.id,
        username: profile.username,
        name: profile.displayName || 'John Doe',
        photo: profile.photos[0].value || '',
        email: Array.isArray(profile.emails) ? profile.emails[0].value : 'No public email',
        created_on: new Date(),
        provider: profile.provider || ''
      },
      $set: {
        last_login: new Date()
      },
      $inc: {
        login_count: 1
      }
    }, {
      upsert: true,
      new: true
    }, (err, doc) => {
      return cb(null, doc.value)
    })
  })
  passport.use(githubStrategy)

  passport.serializeUser((user, cb) => {
    cb(null, user._id)
  })
  passport.deserializeUser((id, cb) => {
    myDatabase.findOne({ _id: new ObjectID(id) }, (err, user) => {
      return cb(null, user)
    })
  })
}
