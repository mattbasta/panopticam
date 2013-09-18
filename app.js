var express = require('express');
var Firebase = require('firebase');
var irc = require('irc');
var nunjucks = require('nunjucks');

var client = new irc.Client('irc.mozilla.org', 'panoptibot', {channels: ['#webdev', '#bots']});
var db = new Firebase('https://hellocam.firebaseIO.com/');

var app = express();
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('templates/'));
env.express(app);

app.use("/static", express.static(__dirname + '/static'));
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.render('index.html');
});

app.get('/img/:room', function(request, response) {
    var datauri = /^data:image\/gif;base64,(.*)$/;
    db.child('gifs/' + request.params.room).once('value', function(snap) {
        var val = snap.val();
        if (!val) response.send(404);
        var matches = val.match(datauri);
        if (!matches) response.send(500);
        response.set('Content-Type', 'image/gif');
        response.send(new Buffer(matches[1], 'base64'));
    });
});

client.addListener('message', function(from, to, message) {
    try {
        if (message.substr(0, client.nick.length + 1) !== client.nick + ":") return;
        message = message.substr(client.nick.length + 1);

        var data = message.trim().split(' ', 2);
        db.child('gifs/' + data[0]).once('value', function() {
            client.say('#bots', 'crimsontwins: http://panopticon.paas.allizom.org/img/' + data[0]);
        });
        db.child('rooms/' + data[0] + '/' + data[1] + '/waiting').set(true);
    } catch(e) {}
});

var port = process.env.VCAP_APP_PORT || 8080;
app.listen(port, function() {
    console.log('Listening on ' + port);
});
