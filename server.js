const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'mysecretkey123',
  resave: false,
  saveUninitialized: false
}));

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

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
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
  res.send(`welcome ${req.session.user.username}！<br><a href="/logout">登出</a>`);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

