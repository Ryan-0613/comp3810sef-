//Project topic：StudyManager — Learning Record Management System
//Group member:              Work role of each member:
// 1. Ye Sai Huen    14475760   Database + Schema / Model
// 2. Chan Ming Ho   14491434   Login, Registration, Session, Facebook OAuth
// 3. CRUD web UI
// 4. Cheung Hin Yat 14491970   RESTful API
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const app = express();
const port = 3000;
const path = require('node:path');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'mysecretkey123',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const facebookAuth = {
    'clientID': '1171738229131964',
    'clientSecret': '493230679533b68571c8dbf83007a339',
    'callbackURL': 'http://localhost:3000/auth/facebook/callback'
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
const userCollectionName = "users";

async function connectDB() {
    await client.connect();
    console.log("MongoDB connected");
}
connectDB().catch(err => console.log("DB connect error:", err));


passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use(new FacebookStrategy(facebookAuth,
    function(accessToken, refreshToken, profile, done) {
        console.log("Facebook data:", profile);
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
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('register');
});
app.get('/index', (req, res) => {
    res.redirect('/courses');
});
const demoCourses = [];
app.post('/courses', isLoggedIn, (req, res) => {
    const { code, name, academicYear, semester, category } = req.body;

    const validText = [code, name, academicYear].every(
        value => typeof value === 'string' && value.trim() !== ''
    );

    if (
        !validText ||
        !['1', '2', 'Summer'].includes(semester) ||
        !['Major', 'Minor'].includes(category)
    ) {
        return res.status(400).render('course-form', {
            user: { name: req.session.user.username },
            course: null,
            error: 'plz ender the info。'
        });
    }

    demoCourses.push({
        _id: new ObjectId(),
        owner: getCurrentUserKey(req),
        code: code.trim(),
        name: name.trim(),
        academicYear: academicYear.trim(),
        semester,
        category
    });

    return res.redirect(303, '/courses');
});

app.get('/courses', isLoggedIn, (req, res) => {
    const currentUser = getCurrentUserKey(req);
    const userCourses = demoCourses.filter(course => course.owner === currentUser);

    const filters = {
        academicYear: req.query.academicYear ?? '',
        semester: req.query.semester ?? '',
        category: req.query.category ?? ''
    };

    const courses = userCourses
        .filter(course =>
            (!filters.academicYear || course.academicYear === filters.academicYear) &&
            (!filters.semester || course.semester === filters.semester) &&
            (!filters.category || course.category === filters.category)
        )
        .map(course => ({
            course,
            stats: calculateStats(course.items ?? [])
        }));

    res.render('index', {
        user: { name: req.session.user.username },
        years: [...new Set(userCourses.map(course => course.academicYear))].sort(),
        filters,
        courses
    });
});

app.get('/courses/new', isLoggedIn, (req, res) => {
    res.render('course-form', {
        user: { name: req.session.user.username },
        course: null,
        error: null
    });
});

app.get('/courses/:id/edit', isLoggedIn, (req, res) => {
    const currentUser = getCurrentUserKey(req);
    const course = demoCourses.find(
        row => String(row._id) === req.params.id && row.owner === currentUser
    );
    if (!course) {
        return res.status(404).send('This course cannot be found.');
    }

    return res.render('course-form', {
        user: { name: req.session.user.username },
        course,
        error: null
    });
});

app.post('/courses/:id/update', isLoggedIn, (req, res) => {
    const currentUser = getCurrentUserKey(req);
    const course = demoCourses.find(
        row => String(row._id) === req.params.id && row.owner === currentUser
    );
    if (!course) {
        return res.status(404).send('cant find this couses');
    }

    const { code, name, academicYear, semester, category } = req.body;

    const validText = [code, name, academicYear].every(
        value => typeof value === 'string' && value.trim() !== ''
    );

    if (
        !validText ||
        !['1', '2', 'Summer'].includes(semester) ||
        !['Major', 'Minor'].includes(category)
    ) {
        return res.status(400).render('course-form', {
            user: { name: req.session.user.username },
            course,
            error: 'plz ender the coures info'
        });
    }

    Object.assign(course, {
        code: code.trim(),
        name: name.trim(),
        academicYear: academicYear.trim(),
        semester,
        category
    });

    return res.redirect(303, '/courses');
});

app.post('/courses/:id/delete', isLoggedIn, (req, res) => {
    const currentUser = getCurrentUserKey(req);
    const index = demoCourses.findIndex(
        row => String(row._id) === req.params.id && row.owner === currentUser
    );
    if (index === -1) {
        return res.status(404).send('cant find this courses');
    }
    demoCourses.splice(index, 1);
    return res.redirect(303, '/courses');
});

app.get('/course', (req, res) => {
    res.redirect('course-form');
});
app.get('/register', (req, res) => {
    res.render('register');
});

function calculateStats(items) {
    const total = items.length;
    const revisedCount = items.filter(item => item.revised).length;
    const sum = items.reduce((acc, item) => acc + item.familiarity, 0);

    return {
        avgFamiliarity: total ? Math.round((sum / total) * 10) / 10 : 0,
        revisedCount,
        total,
        progress: total ? Math.round((revisedCount / total) * 100) : 0
    };
}

function getCurrentUserKey(req) {
    return req.session?.user?.username || '';
}

app.get('/courses/:id', isLoggedIn, (req, res) => {
    const currentUser = getCurrentUserKey(req);
    const course = demoCourses.find(
        c => String(c._id) === req.params.id && c.owner === currentUser
    );;
    if (!course) return res.status(404).send('cant find this course');

    const items = course.items ?? [];
    return res.render('course', {
        user: { name: req.session.user.username },
        course,
        stats: calculateStats(items),
        lectures: items.filter(item => item.kind === 'Lecture'),
        tutorials: items.filter(item => item.kind === 'Tutorial')
    });
});

app.post('/courses/:id/items', isLoggedIn, (req, res) => {
    const course = demoCourses.find(c => String(c._id) === req.params.id);
    if (!course) return res.status(404).send('cant find this course');

    const { kind, title, familiarity, revised, recordingUrl, notes } = req.body;

    if (
        !['Lecture', 'Tutorial'].includes(kind) ||
        typeof title !== 'string' || !title.trim() ||
        typeof familiarity !== 'string' || !/^[0-5]$/.test(familiarity)
    ) {
        return res.status(400).send('ender your familiarity from 0 to 5 ');
    }

    let safeRecordingUrl = '';
    if (recordingUrl) {
        try {
            const url = new URL(recordingUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).send('plz use HTTP or HTTPS URL');
            }
            safeRecordingUrl = url.href;
        } catch {
            return res.status(400).send('URL not useful');
        }
    }

    (course.items ??= []).push({
        _id: new ObjectId(),
        kind,
        title: title.trim(),
        familiarity: Number(familiarity),
        revised: revised === 'on',
        recordingUrl: safeRecordingUrl,
        notes: typeof notes === 'string' ? notes.trim() : ''
    });

    return res.redirect(303, `/courses/${course._id}`);
});

function findDemoItem(courseId, itemId) {
    const course = demoCourses.find(c => String(c._id) === courseId);
    const item = (course?.items ?? []).find(i => String(i._id) === itemId);
    return { course, item };
}

app.get('/courses/:id/items/:itemId/edit', isLoggedIn, (req, res) => {
    const { course, item } = findDemoItem(req.params.id, req.params.itemId);

    if (!item) {
        return res.status(404).send('data cant be find');
    }

    return res.render('item-form', {
        user: { name: req.session.user.username },
        course,
        item
    });
});

app.post('/courses/:id/items/:itemId/update', isLoggedIn, (req, res) => {
    const { course, item } = findDemoItem(req.params.id, req.params.itemId);

    if (!item) {
        return res.status(404).send('cant find this course');
    }

    const { kind, title, familiarity, revised, recordingUrl, notes } =
        req.body ?? {};

    if (
        !['Lecture', 'Tutorial'].includes(kind) ||
        typeof title !== 'string' || !title.trim() ||
        typeof familiarity !== 'string' || !/^[0-5]$/.test(familiarity)
    ) {
        return res.status(400).send('ender your familiarity from 0-5');
    }

    let safeRecordingUrl = '';
    if (recordingUrl) {
        try {
            const url = new URL(recordingUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).send('plz use HTTP or HTTPS URL');
            }
            safeRecordingUrl = url.href;
        } catch {
            return res.status(400).send('URL not useful');
        }
    }

    Object.assign(item, {
        kind,
        title: title.trim(),
        familiarity: Number(familiarity),
        revised: revised === 'on',
        recordingUrl: safeRecordingUrl,
        notes: typeof notes === 'string' ? notes.trim() : ''
    });

    return res.redirect(303, `/courses/${course._id}`);
});

app.post('/courses/:id/items/:itemId/delete', isLoggedIn, (req, res) => {
    const course = demoCourses.find(
        c => String(c._id) === req.params.id
    );

    if (!course) {
        return res.status(404).send('cant find this course');
    }

    const items = course.items ?? [];
    const index = items.findIndex(
        item => String(item._id) === req.params.itemId
    );

    if (index === -1) {
        return res.status(404).send('data cant be find');
    }

    items.splice(index, 1);
    return res.redirect(303, `/courses/${course._id}`);
});
app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));


app.get("/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    (req, res) => {
        req.session.user = req.user;
        res.redirect('/index');
    }
);


app.get('/index', isLoggedIn, (req, res) => {
    res.render('index', { username: req.session.user.username });
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    console.log("Received registration materials：", username, password);

    try {
        const db = client.db(dbName);
        const usersCollection = db.collection(userCollectionName);

        const existingUser = await usersCollection.findOne({ username: username });
        if (existingUser) {
            return res.render('register', { err: 'This account has already been registered, please use another account.' });
        }

        await usersCollection.insertOne({
            username: username,
            password: password
        });

        console.log("User saved to MongoDB:", username);
        res.redirect('/login');
    } catch (err) {
        console.error("Register DB error:", err);
        res.render('register', { err: 'A database error occurred during registration, please try again later.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("Received login information:", username, password);

    try {
        const db = client.db(dbName);
        const usersCollection = db.collection(userCollectionName);

        const user = await usersCollection.findOne({
            username: username,
            password: password
        });

        if (!user) {
            return res.render('login', { err: 'The account or password is wrong!' });
        }

        req.session.user = {
            id: user._id,
            username: user.username
        };
        res.redirect('/index');
    } catch (err) {
        console.error("Login DB error:", err);
        res.render('login', { err: 'A database error occurred while logging in, please try again later.' });
    }
});

app.get('/home', isLoggedIn, (req, res) => {
    res.send(`welcome ${req.session.user.username}！<br><a href="/index">Enter learning management</a> <br><form action="/logout" method="POST"><button>logout</button></form>`);
});
app.use(express.json());
const recordCollectionName = "study_records";

const insertDocument = async (db, doc) => {
  var collection = db.collection(recordCollectionName);
  let results = await collection.insertOne(doc);
  console.log("insert one document:" + JSON.stringify(results));
  return results;
};

const findDocument = async (db, criteria) => {
  var collection = db.collection(recordCollectionName);
  let results = await collection.find(criteria).toArray();
  console.log("find the documents:" + JSON.stringify(results));
  return results;
};

const updateDocument = async (db, criteria, updateData) => {
  var collection = db.collection(recordCollectionName);
  let results = await collection.updateOne(criteria, { $set: updateData });
  console.log("update one document:" + JSON.stringify(results));
  return results;
};

const deleteDocument = async (db, criteria) => {
  var collection = db.collection(recordCollectionName);
  let results = await collection.deleteMany(criteria);
  console.log("delete the documents:" + JSON.stringify(results));
  return results;
};

/* CREATE - add a new study record
curl -i -X POST http://localhost:3000/api/records \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "title=Learn Node.js&subject=Web Development&duration=120&date=2026-11-19&status=Completed"
*/
app.post('/api/records', async (req, res) => {
  try {
    const db = client.db(dbName);
    let newDoc = {
      title: req.body.title,
      subject: req.body.subject,
      duration: Number(req.body.duration),
      date: req.body.date,
      status: req.body.status
    };
    const results = await insertDocument(db, newDoc);
    res.status(201).json({ message: "Record created successfully", id: results.insertedId, data: newDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* READ, get all study records
curl -i http://localhost:3000/api/records
*/
app.get('/api/records', async (req, res) => {
  try {
    const db = client.db(dbName);
    const docs = await findDocument(db, {});
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* READ, get one record by ID
curl -i http://localhost:3000/api/records/<ID>
*/
app.get('/api/records/:id', async (req, res) => {
  try {
    const db = client.db(dbName);
    let criteria = { _id: ObjectId.createFromHexString(req.params.id) };
    const docs = await findDocument(db, criteria);
    if (docs.length > 0) {
      res.status(200).json(docs[0]);
    } else {
      res.status(404).json({ message: "Record not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Invalid ID format" });
  }
});

/* UPDATE, update a record
curl -i -X PUT http://localhost:3000/api/records/<ID> \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "title=Learn Node.js&duration=150&status=In Progress"
*/
app.put('/api/records/:id', async (req, res) => {
  try {
    const db = client.db(dbName);
    let criteria = { _id: ObjectId.createFromHexString(req.params.id) };

    let updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.subject !== undefined) updateData.subject = req.body.subject;
    if (req.body.duration !== undefined) updateData.duration = Number(req.body.duration);
    if (req.body.date !== undefined) updateData.date = req.body.date;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    const results = await updateDocument(db, criteria, updateData);

    if (results.matchedCount > 0) {
      res.status(200).json({ message: "Record updated successfully", modified: results.modifiedCount });
    } else {
      res.status(404).json({ message: "Record not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE, delete a record
curl -i -X DELETE http://localhost:3000/api/records/<ID>
*/
app.delete('/api/records/:id', async (req, res) => {
  try {
    const db = client.db(dbName);
    let criteria = { _id: ObjectId.createFromHexString(req.params.id) };

    const results = await deleteDocument(db, criteria);

    if (results.deletedCount > 0) {
      res.status(200).json({ message: "Record deleted successfully", deleted: results.deletedCount });
    } else {
      res.status(404).json({ message: "Record not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

