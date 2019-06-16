var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var User = require('./models/user');
var Album = require('./models/albums');
var Photo = require('./models/photos');
var ejs = require('ejs');
var path = require('path');
var cors = require('cors');
const methodOverride = require('method-override');
var multer = require('multer');
var multerS3 = require('multer-s3')
var aws = require('aws-sdk');

// invoke an instance of express application.
var app = express();

const BUCKET_NAME = 'photogallerycodechef';
const IAM_USER_KEY = 'AKIARLCQJXE6WDIX3YGD';
const IAM_USER_SECRET = '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';

// set our application port
app.set('port', process.env.PORT || 8000);
app.set('views', __dirname + '/public');
app.set('view engine', 'ejs');
// set morgan to log info about our requests for development use.
app.use(morgan('dev'));

app.use(cors());
// app.use(methodOverride('_method'));
// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));

app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
    }
}))
// initialize cookie-parser to allow us access the cookies stored in the browser. 
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60000000
    }
}));


// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});

// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/dashboard');
    } else {
        next();
    }
};

// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
    res.redirect('/login');
});

// route for user signup
app.route('/signup')
    .get(sessionChecker, (req, res) => {
        res.render('signup');
    })
    .post((req, res) => {
        User.findAll({ where: { username: req.body.username } }).then(function (user) {
            if (user.length > 0) {
                res.render('signup', {error: "Username already exists.."});
            } else {
                User.create({
                    username: req.body.username,
                    email: req.body.email,
                    password: req.body.password
                })
                    .then(user => {
                        req.session.user = user.dataValues;
                        res.redirect('/dashboard');
                    })
                    .catch(error => {
                        res.redirect('/signup');
                    });
            }

        })

    });

// route for user Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
        res.render('login');
    })
    .post((req, res) => {
        var username = req.body.username,
            password = req.body.password;

        User.findOne({ where: { username: username } }).then(function (user) {
            if (!user) {
                res.render('login', { err: "Invalid Username." });
            } else if (!user._modelOptions.instanceMethods.validPassword(user, password)) {
                res.render('login', { err: "Password do not match." });
            } else {
                req.session.user = user.dataValues;
                res.redirect('/dashboard');
            }
        });
    });

// route for user's dashboard
app.get('/dashboard', (req, res) => {
    if (req.session.user != null && req.cookies.user_sid != null) {
        var username = req.session.user.username;
        Album.findAll({ where: { username: username } }).then(function (album) {
            console.log(req.session.user, req.cookies.user_sid)
            res.render('dashboard', { album: album });
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/dashboard', (req, res) => {
    var username = req.session.user.username;
    Album.findAll({ where: { username: username, albumname: req.body.albumname } }).then(function (album) {
        console.log(album);
        if (album.length === 0) {
            Album.create({
                username: req.session.user.username,
                albumname: req.body.albumname,
                description: req.body.description
            })
                .then(albumDetail => {
                    console.log(albumDetail);
                    res.redirect('/dashboard');
                })
                .catch(error => {
                    Album.findAll({ where: { username: username } }).then(function (album) {
                        res.render('dashboard', { album: album, err: error });
                    }); 
                });
        } else {
            Album.findAll({ where: { username: username } }).then(function (album) {
                console.log(req.session.user, req.cookies.user_sid)
                res.render('dashboard', { album: album, error: "album already exists!!!!!!!" });
            });
        }
    });

});
// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});
app.put('/album/:id', (req, res) => {
    var username = req.session.user.username;
    Album.findAll({ where: { username: username, albumname: req.body.albumname } }).then(function (album) {
        console.log(album)
        if (album.length === 0) {
            Album.update({
                albumname: req.body.albumname,
                description: req.body.description,
            }, { where: { albumname: req.params.id, username: username } })
                .then(albumDetail => {
                    res.redirect('/dashboard');
                })
                .catch(error => {
                    console.log(error);
                });
        } else {
            Album.findAll({ where: { username: username } }).then(function (album) {
                console.log(req.session.user, req.cookies.user_sid)
                res.render('dashboard', { album: album, error: "album already exists!!!!!!!" });
            });
        }

    });
});

app.delete('/album/:id', (req, res) => {
    var username = req.session.user.username;
    Album.findAll({ where: { albumname: req.params.id, username: username } })
        .then(album => {
            Photo.destroy({ where: { albumId: album[0].dataValues.id } })
                .then(photos => {
                    Album.destroy({ where: { albumname: req.params.id, username: username } })
                        .then(albumDetail => {
                            res.redirect('/dashboard');
                        })
                        .catch(error => {
                            console.log(error);
                        });
                })
        })
});
app.get('/album/:id', (req, res) => {
    if (req.session.user != null && req.cookies.user_sid != null) {
        res.render('editAlbum', { id: req.params.id })
    } else {
        res.redirect('/login');
    }
});

app.get('/showAlbum/:id', (req, res) => {
    if (req.session.user != null && req.cookies.user_sid != null) {
        Album.findAll({ where: { username: req.session.user.username, albumname: req.params.id } })
            .then(album => {
                Photo.findAll({ where: { albumId: album[0].dataValues.id } })
                    .then(photos => {
                        res.render('showAlbum', { id: req.params.id, photos: photos })
                    })
            })
    } else {
        res.redirect('/login');
    }
});

var storage = multer.memoryStorage({
    destination: function (req, file, callback) {
        callback(null, '');
    }
});

aws.config.update({
    secretAccessKey: IAM_USER_SECRET,
    accessKeyId: IAM_USER_KEY,
    region: 'us-east-2'
});


var s3 = new aws.S3()

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString())
        }
    })
})

app.post('/upload/:id', upload.array('upl', 1), function (req, res) {
    var key = req.files[0].key;
    var urlParams = {
        Bucket: BUCKET_NAME, Key: key,
        Expires: 60 * 60 * 24 * 5
    }
    s3.getSignedUrl('getObject', urlParams, function (err, url) {
        if (err)
            console.log("--------------------", err);
        Album.findAll({ where: { username: req.session.user.username, albumname: req.params.id } })
            .then(function (album) {
                Photo.create({
                    albumId: album[0].dataValues.id,
                    photoId: url
                }).then(photo => {
                    console.log(photo);
                    res.redirect(`/showAlbum/${req.params.id}`)
                }).catch(error => {
                    console.log(error);
                })
            });
    });
})

app.delete('/album/:albumId/photo/:id', (req, res) => {
    var username = req.session.user.username;
    Album.findAll({ where: { albumname: req.params.albumId, username: username } })
        .then(album => {
            Photo.destroy({ where: { id: req.params.id } })
                .then(photos => {
                    res.redirect(`/showAlbum/${req.params.albumId}`);
                })
        })
});

// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
});
// start the express server
app.listen(app.get('port'), () => console.log(`App started on port ${app.get('port')}`));