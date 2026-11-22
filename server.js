const express = require('express');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
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
      'clientID'        : '1171738229131964', 
      'clientSecret'    : '493230679533b68571c8dbf83007a339', 
      'callbackURL'     : 'http://localhost:3000/auth/facebook/callback'
};


const mongourl = 'mongodb+srv://G56:aFu3BknvxYR8P1Kf@cluster0.cc1haok.mongodb.net/';
const client = new MongoClient(mongourl, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const dbName = 'project_G56';
const collectionName = "course";

async function connectDB() {
  await client.connect();
  console.log("MongoDB connected");
}
connectDB().catch(err => console.log("DB connect error:", err));


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
      username: profile.displayName, 
      type: "facebook"
    };
    return done(null, fbUser);
  }
));


function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
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


app.get("/auth/facebook", passport.authenticate("facebook", { scope : ["email"] }));


app.get("/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect : "/login" }),
  (req, res) => {
    req.session.user = req.user; 
    res.redirect('/study');
  }
);


app.get('/study', isLoggedIn, (req, res) => {
  res.render('study', { username: req.session.user.username });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  console.log("Received registration materials：", username, password);
  res.redirect('/login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log("Received login information：", username, password);
  req.session.user = {username: username};
  res.redirect('/study');
});

app.get('/home', isLoggedIn, (req, res) => {
  res.send(`welcome ${req.session.user.username}！<br><a href="/study">進入學習管理</a> <br><form action="/logout" method="POST"><button>logout</button></form>`);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

