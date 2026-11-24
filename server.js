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
    if (req.session?.user || req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}
function getUserInfo(req) {
    if(req.session?.user) return req.session.user;
    if(req.isAuthenticated()) return req.user;
    return {username:"Guest"};
}
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});
app.get('/', (req, res) => {
    res.redirect('/courses');
});
// 改咗呢度！唔再 render index.ejs，直接跳去 /courses
app.get('/index', isLoggedIn, (req, res) => {
    res.redirect('/courses');
});

app.get('/course', (req, res) => {
    res.redirect('/courses/new');
});
app.get('/courses/:id/items/new', isLoggedIn, (req, res) => {
    const course = demoCourses.find(c => String(c._id) === req.params.id);
    if (!course) return res.status(404).send('cant find this course');
    res.render('item-form', {
        user: getUserInfo(req),
        course,
        item: null
    });
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
            user: getUserInfo(req),
            course: null,
            error: 'plz ender the info。'
        });
    }

    demoCourses.push({
        _id: new ObjectId(),
        code: code.trim(),
        name: name.trim(),
        academicYear: academicYear.trim(),
        semester,
        category,
        items: []
    });

    return res.redirect(303, '/courses');
});

app.get('/courses', isLoggedIn, (req, res) => {
    const filters = {
        academicYear: req.query.academicYear ?? '',
        semester: req.query.semester ?? '',
        category: req.query.category ?? ''
    };

    const courses = demoCourses
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
        user: getUserInfo(req),
        years: [...new Set(demoCourses.map(course => course.academicYear))].sort(),
        filters,
        courses
    });
});

app.get('/courses/new', isLoggedIn, (req, res) => {
    res.render('course-form', {
        user: getUserInfo(req),
        course: null,
        error: null
    });
});

app.get('/courses/:id/edit', isLoggedIn, (req, res) => {
    const course = demoCourses.find(
        row => String(row._id) === req.params.id
    );

    if (!course) {
        return res.status(404).send('找不到這門課程。');
    }

    return res.render('course-form', {
        user: getUserInfo(req),
        course,
        error: null
    });
});

app.post('/courses/:id/update', isLoggedIn, (req, res) => {
    const course = demoCourses.find(
        row => String(row._id) === req.params.id
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
            user: getUserInfo(req),
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
    const index = demoCourses.findIndex(
        row => String(row._id) === req.params.id
    );

    if (index === -1) {
        return res.status(404).send('cant find this courses');
    }

    demoCourses.splice(index, 1);
    return res.redirect(303, '/courses');
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

app.get('/courses/:id', isLoggedIn, (req, res) => {
    const course = demoCourses.find(c => String(c._id) === req.params.id);
    if (!course) return res.status(404).send('cant find this course');

    const items = course.items ?? [];
    return res.render('course', {
        user: getUserInfo(req),
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
        user: getUserInfo(req),
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
app.post('/logout', (req, res) => {
    req.session.destroy(()=>{
        res.redirect('/login');
    });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    console.log("Received registration materials：", username, password);
    res.redirect('/login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("Received login information：", username, password);
    req.session.user = { username: username };
    res.redirect('/index');
});

app.get('/home', isLoggedIn, (req, res) => {
    res.send(`welcome ${getUserInfo(req).username}！<br><a href="/index">進入學習管理</a> <br><form action="/logout" method="POST"><button>logout</button></form>`);
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

