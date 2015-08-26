/**
 * App initialization module
 */
define([
  'devgrid',
  'modernizr-tests',
  'router',
  'socketio',
  'core/global/views/GlobalView',
  'core/users/views/UsersView',
  'peersock'
], function(
  Devgrid,
  ModernizrTests,
  Router,
  io,
  GlobalView,
  UsersView,
  PeerSock
) {
  var Init = function() {
    return {

      /**
       * Initialize modules
       */
      initialize: function() {

        // Module initializations
        Devgrid.initialize();
        ModernizrTests.initialize();
        Router.initialize({pushState: true});

        // Backbone initializations
        var globalView = new GlobalView();
        var usersView = new UsersView();

        // Build socket
        var socket = io.connect('//localhost:9222');

        // Register
        socket.emit('register', {ready: true});

        // Reference PeerSock (for signaling interface)
        var ps = PeerSock({socket: socket});


        // 1) Each client receives registration upon page load
        socket.on('ready', function( info ) {
          console.log('Registering client: ', info.client_id);
          usersView.registerClient(socket, info.client_id);
        });


        // 2) Server "new peer" message
        socket.on('peer', function( info ) {
          //console.log('Waiting for connection from peer: ', info.peer_id);

          // Create new PeerSock connection object for new peer
          usersView.registerPeer(info.client_id, info.peer_id, true);

          // Send message to new peer, telling it to connect
          ps.signal.send('peer_connect', info.peer_id, info.client_id, {
            test: 'test'
          });
        });


        // 3) "time to connect" message sent from peer
        ps.signal.onmessage('peer_connect', function( info ) {
          //console.log('Connecting w/ peer: ', info.peer_id);

          // Create PeerSock object that matches one previously created by peer
          usersView.registerPeer(info.client_id, info.peer_id, false);

          // Initialize connection with peer
          //usersView.connectToPeer(info.client_id, info.peer_id);
        });
      }
    };
  };

  return Init;
});
