const express = require('express');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'mysecretkey123',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
const facebookAuth = {
      'clientID'        : '', 
      'clientSecret'    : '', 
      'callbackURL'     : ''
};
const mongourl = ''
const dbName = '';
const collectionName = "studyRecords";

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new FacebookStrategy(facebookAuth,
  function (accessToken, refreshToken, profile, done) {
    console.log("Facebook data：", profile);
    const fbUser = {
      id: profile.id,
      name: profile.displayName,
      type: "facebook"
    };
    return done(null, fbUser);
  }
));

function isLoggedIn(req, res, next) {
  if (req.session?.user || req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});


app.get("/auth/facebook", passport.authenticate("facebook", { scope : "email" }));
app.get("/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect : "/home",
    failureRedirect : "/login"
  })
);

app.get('/logout', (req, res) => {
  req.logout(function(err) {
    req.session.destroy();
    res.redirect('/login');
  });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  console.log("Received registration materials：", username, password);
  /*
  const User = require('./models/user');
  const newUser = new User({username, password});
  await newUser.save();
  */
  res.redirect('/login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log("Received login information：", username, password);
  /*
  const User = require('./models/user');
  const foundUser = await User.findOne({username: username});
  if(foundUser && foundUser.password === password){
    req.session.user = foundUser;
    res.redirect('/home');
  }else{
    res.send("Incorrect account password");
  }
  */
  req.session.user = {username: username};
  res.redirect('/home');
});

app.get('/home', isLoggedIn, (req, res) => {
  if(req.session.user){
    res.send(`welcome ${req.session.user.username}！<br><a href="/logout">logout</a>`);
  }else{
    res.send(`welcome Facebook user ${req.user.name}！<br><a href="/logout">logout</a>`);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


