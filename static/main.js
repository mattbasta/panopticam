define('main', ['gumhelper', 'video'], function(gum, video) {
    var db;
    var gifs;
    var user;
    $('#roompicker button').on('click', function() {
        var room = $('#roompicker [name=room]').val();
        var name = $('#roompicker [name=name]').val();

        db = new Firebase('https://hellocam.firebaseIO.com/rooms/' + room);
        user = db.child(name);
        user.set({'name': name, 'waiting': false});
        user.on('child_changed', function(snap) {
            console.log('User ' + snap.name() + ' changed');
            if (snap.name() === 'waiting' && snap.val()) {
                console.log('Starting capture');
                startCapture();
            }
        });

        db.on('child_added', function(snap) {
            var user = snap.val();
            if (!user.name) return;
            var name = user.name;
            name = name.replace(/</g, '');
            name = name.replace(/>/g, '');
            name = name.replace(/&/g, '&amp;');
            $('#participants').append('<li data-name="' + name + '">' + name);
        });

        gifs = new Firebase('https://hellocam.firebaseIO.com/gifs/' + room);
        gifs.on('value', function(snap) {
            var src = snap.val();
            if (!src) return;
            if (src.substr(0, 5) !== 'data:') {
                return;
            }
            var img = new Image();
            img.src = src;
            img.onload = function() {
                $('#snap').html('').append(img);
            };
        });

        $('#roompicker').addClass('hidden');
        $('#room').removeClass('hidden');
    });

    $('#participants').on('click', 'li:not(.active)', function() {
        var $this = $(this);
        var user = $this.data('name');
        db.child(user).update({waiting: true});
        $this.addClass('active');
        setTimeout(function() {
            $this.removeClass('active');
        }, 5000);
    })

    var shooter;
    var waiting_capturer;
    if (navigator.getMedia) {
        gum.startVideoStreaming(
            function errorCb() {
                console.error('Could not start gum');
            },
            function successCallback(stream, videoElement, width, height) {
                videoElement.width = width / 5;
                videoElement.height = height / 5;
                videoElement.play();
                shooter = new video(videoElement);
                if (waiting_capturer) {
                    waiting_capturer();
                }
            }
        );
    }
    function startCapture() {
        function capturer() {
            console.log('starting capture');
            shooter.getShot(function(pickshur) {
                console.log('uploading image');
                gifs.set(pickshur);
                user.update({'waiting': false});
            }, 10, 0.2);
        }
        if (shooter) {
            capturer();
        } else {
            console.error('No capturer; delaying');
            waiting_capturer = capturer;
        }
    }

});
require('main');
