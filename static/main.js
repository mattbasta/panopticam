define('main', ['gumhelper', 'video'], function(gum, video) {
    var gifs;
    var name;
    var user;

    var socket = io.connect('/');

    var snd = new Audio("/static/pop.wav");
    var has_video = false;

    $('#roompicker').on('submit', function(e) {
        e.preventDefault();
        if (!has_video) return;

        var room = $('#roompicker [name=room]').val();
        name = $('#roompicker [name=name]').val();
        socket.emit('join', {room: room, name: name});
        $('#participants').append('<li data-name="' + name + '">' + name);

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
                snd.play();
                setTimeout(function(){
                    snd.currentTime = 0;
                }, 2000);
                $('#snap').html('').append(img);
            };
        });

        $('#roompicker').addClass('hidden');
        $('#room').removeClass('hidden');
    });

    $('#participants').on('click', 'li:not(.active)', function() {
        var $this = $(this);
        var user = $this.data('name');

        $this.addClass('active');
        setTimeout(function() {
            $this.removeClass('active');
        }, 5000);

        if (user === name) {
            startCapture();
            return;
        }
        socket.emit('request', user);
    });

    socket.on('error', function(data) {
        alert(data);
        window.location.reload();
    });

    socket.on('leave', function(data) {
        $('#participants [data-name="' + data + '"]').remove();
    });

    socket.on('join', function(data) {
        data = data.replace(/</g, '');
        data = data.replace(/>/g, '');
        data = data.replace(/&/g, '&amp;');
        data = data.replace(/"/g, '&quot;');
        $('#participants').append('<li data-name="' + data + '">' + data);
    });

    socket.on('request', function() {
        startCapture();
    });

    var shooter;
    var waiting_capturer;
    if (navigator.getMedia) {
        gum.startVideoStreaming(
            function errorCb() {
                console.error('Could not start gum');
            },
            function successCallback(stream, videoElement, width, height) {
                has_video = true;
                $('#roompicker button[disabled]').prop('disabled', false);
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

    var locked = false;
    function startCapture() {
        if (locked) return;
        locked = true;
        setTimeout(function() {
            locked = false;
        }, 3000);
        function capturer() {
            console.log('starting capture');
            shooter.getShot(function(pickshur) {
                console.log('uploading image');
                gifs.set(pickshur);
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
