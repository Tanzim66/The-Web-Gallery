const express = require('express');
const session = require('express-session');
var multer  = require('multer');
const bcrypt = require('bcrypt');
const cookie = require('cookie');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();

var Datastore = require('nedb'), 
users = new Datastore({filename: 'db/users.db', autoload: true}),
imagePosts = new Datastore({ filename: 'db/imagePosts.db', autoload: true}), 
comments = new Datastore({ filename: 'db/comments.db', autoload: true });

var upload = multer({ dest: 'uploads/' });

app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(express.static('frontend'));

app.use((req, res, next) => {
    let username = (req.session.username)? req.session.username : '';
    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7
    }));
    next();
});

app.use((req, res, next) => {
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

const isAuthenticated = (req, res, next) => {
    if (!req.session.username) return res.status(401).end("access denied");
    next();
};

app.post('/signup/', (req, res, next) => {
    const {username, password} = req.body;
    if(!(username && password)) return res.status(400).end('Username and password required');
    
    users.findOne({_id: username}, (err, user) => {
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("Username " + username + " already exists");
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, (err, hash) => {
                users.update({_id: username},{_id: username, hash: hash}, {upsert: true}, (err) => {
                    if (err) return res.status(500).end(err);     
                        req.session.username = username;
                        res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                            path : '/', 
                            maxAge: 60 * 60 * 24 * 7
                        }));
                        return res.status(200).json({"message": "Successfully registered"});
                });
            });
        });
    });
});

app.post('/signin/', (req, res, next) => {
    const {username, password} = req.body;
    if(!(username && password)) return res.status(400).end('Username and password required');
    users.findOne({_id: username}, (err, user) => {
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end(`User ${username} does not exist`);
        bcrypt.compare(password, user.hash, (err, valid) => {
            if (err) return res.status(500).end(err);
            if (!valid) return res.status(401).end("Invalid credentials");
            req.session.username = user._id;
            res.setHeader('Set-Cookie', cookie.serialize('username', user._id, {
                    path : '/', 
                    maxAge: 60 * 60 * 24 * 7
            }));
            return res.status(200).json({"message": "Successfully signed in"});
        });
    });
});

app.get('/signout/', isAuthenticated, function(req, res, next){
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7
    }));
    return res.status(200).json({"message": "Successfully signed out"});
});

app.get('/api/users/', isAuthenticated, (req, res, next) => {
    var skip = 0;
    if(req.query.skip) skip = req.query.skip;
    users.find({$not: { _id: req.session.username }}).sort({_id: 1}).skip(skip*10).limit(10).exec((err, data) => { 
        if(err){
            console.log(err);
            return res.status(500).end(err);
        }
        return res.json(data);
    });
});

app.post('/api/user/images/', isAuthenticated, upload.single('picture'), (req, res, next) => {
    const {title, date} =  req.body;
    if(!(title && date)) return res.status(400).end("Bad request");
    var doc = {owner: req.session.username, title, date, image: req.file};
    imagePosts.insert(doc, (err, newDoc) => {
        if(err){
            console.log(err);
            return res.status(500).end(err);
        }
        return res.json(newDoc);
    });
});

app.delete('/api/user/images/:id/', isAuthenticated, (req, res, next) => {
    const imageId = req.params.id;
    imagePosts.findOne({_id: imageId}, (err, doc) => {
        if(err){
            console.log(err);
            return res.status(500).end(err);
        }
        if (!doc) return res.status(404).end("Image id:" + imageId + " does not exist");
        if (doc.owner != req.session.username) return res.status(403).end("Forbidden");
        comments.remove({imageId: imageId}, {multi: true}, 
            (err, numCommentsRemoved) => {
            if(err){
                console.log(err);
                return res.status(500).end(err);
            }
            imagePosts.remove({_id: imageId}, {}, 
                (err, numPostsRemoved) => {
                if(err){
                    console.log(err);
                    return res.status(500).end(err);
                }
                fs.unlink(`./${doc.image.path}`, (err) => {
                    if (err) return res.status(500).end(err);
                    return res.json(doc);
                });
            });
        });
    });
});

app.get('/api/users/:id/images/', isAuthenticated, (req, res, next) => {
    const username = req.params.id;
    let skip = 0;
    if(req.query.skip) skip = req.query.skip;
    imagePosts.find({owner: username}).sort({date:-1}).skip(skip).limit(1).exec((err, data) => { 
        if(err){
            console.log(err);
            return res.status(500).end(err);
        }
        return res.json(data);
    });
});

app.post('/api/user/comments/', isAuthenticated, (req, res, next) => {
    const {imageId, content, date} =  req.body;
    if(!(imageId && content && date)) return res.status(400).end("Bad request");
    var doc = {owner: req.session.username, imageId, date, content};
    comments.insert(doc, (err, newDoc) => {
        if(err){
            console.log(err);
            return res.status(500).end("Failed to insert comment");
        }
        return res.json(newDoc);
    });
});

app.delete('/api/user/comments/:id/', isAuthenticated, (req, res, next) => {
    comments.findOne({_id: req.params.id}, (err, commentDoc) => {
        if(err){
            console.log(err);
            return res.status(500).end(err);
        }
        if (!commentDoc) return res.status(404).end("Comment id:" + req.params.id + " does not exist");
        imagePosts.findOne({_id: commentDoc.imageId}, (err, imageDoc) => {
            if(err){
                console.log(err);
                return res.status(500).end(err);
            }
            if(imageDoc.owner != req.session.username && commentDoc.owner != req.session.username)
            return res.status(403).end("Forbidden");

            comments.remove({_id: req.params.id}, {}, (err, numRemoved) => {
                if(err){
                    console.log(err);
                    return res.status(500).end(err);
                }
                return res.json(commentDoc);
            });
        });
    });
});

app.get('/api/images/:id/comments/', isAuthenticated, (req, res, next) => {
    var skip = 0;
    if(req.query.skip) skip = req.query.skip;
    comments.find({imageId: req.params.id}).sort({date:-1}).skip(skip*10).limit(10).exec((err, data) => { 
        if(err){
            console.log(err);
            return res.status(500).end(err);
        }
        return res.json(data);
    });
});

app.get('/api/images/:id/picture/', isAuthenticated, (req, res, next) => {
    imagePosts.findOne({_id: req.params.id}, (err, doc) => {
        if(err){
            console.log(err);
            return res.status(500).end(err);
        }
        if (!doc) return res.status(404).end("Image id:" + req.params.id + " does not exist");
        let image = doc.image;
        res.setHeader('Content-Type', image.mimetype);
        res.sendFile(image.path, { root: '.' });
    });
});

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});