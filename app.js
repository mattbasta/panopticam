var express = require('express');
var Firebase = require('firebase');
var irc = require('irc');
var nunjucks = require('nunjucks');

// var client = new irc.Client('irc.mozilla.org', 'panoptibot', {channels: ['#webdev', '#bots']});
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

var rooms = {};

function Room(name) {
    this.name = name;
    this.points = {};
    this.users = [];
    this.user_map = [];
    this.remove = function(name) {
        this.users = this.users.filter(function(v) {
            var isnt = v.name !== name;
            if (isnt) {
                v.sock.emit('leave', name);
            }
            return isnt;
        });
        delete this.user_map[name];
    };
    this.add = function(name, sock) {
        this.users.forEach(function(v) {
            v.sock.emit('join', name);
            sock.emit('join', v.name);
        });
        this.users.push({
            name: name,
            sock: sock
        });
        this.user_map[name] = sock;
    };
}


// client.addListener('message', function(from, to, message) {
//     try {
//         if (message.substr(0, client.nick.length + 1) !== client.nick + ":") return;
//         message = message.substr(client.nick.length + 1);

//         var data = message.trim().split(' ', 2);
//         db.child('gifs/' + data[0]).once('value', function() {
//             client.say('#bots', 'crimsontwins: http://panopticon.paas.allizom.org/img/' + data[0]);
//         });
//         db.child('rooms/' + data[0] + '/' + data[1] + '/waiting').set(true);
//     } catch(e) {}
// });

var port = process.env.PORT || process.env.VCAP_APP_PORT || 8080;
var listener = app.listen(port, function() {
    console.log('Listening on ' + port);
});
var sock = require('socket.io').listen(listener);

sock.configure(function () {
    sock.set('transports', ['websocket', 'flashsocket', 'xhr-polling']);
});

sock.sockets.on('connection', function(sock) {
    var joined = false;
    var name;
    var room;
    sock.on('join', function(data) {
        if (joined) return;
        joined = true;

        if (!(data.room in rooms)) {
            rooms[data.room] = new Room(data.room);
        }
        name = data.name;
        room = rooms[data.room];
        if (room.users.indexOf(data.name) !== -1) {
            socket.emit('error', 'User already exists!');
            return;
        }
        room.add(data.name, sock);
    });

    sock.on('request', function(user) {
        if (!(user in room.user_map)) return;
        room.points[user] = (room.points[user] || 0) + 1;
        room.user_map[user].emit('request', true);
    });

    sock.on('disconnect', function() {
        room.remove(name);
    });
});
