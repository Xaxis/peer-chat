/**
 * App initialization module
 */
define([
  'devgrid',
  'modernizr-tests',
  'router',
  'socketio',
  'core/users/views/UsersView',
  'peersock'
], function(
  Devgrid,
  ModernizrTests,
  Router,
  io,
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
        var usersView = new UsersView();

        // Build socket
        var socket = io.connect('//localhost:9222');

        // Register
        socket.emit('register', {ready: true});

        // Reference PeerSock (for signaling interface)
        var signal = PeerSock({socket: socket}).signal;

        // Each client receives registration upon page load
        socket.on('ready', function( info ) {
          console.log('Registering client: ', info.client_id, info);
          usersView.registerClient(socket, info.client_id);
          usersView.addUserToList(info.client_id);

          // Iterate through active hosts
          _.each(info.peers, function(peer_id) {
            usersView.registerPeer(info.client_id, peer_id, false);
            signal.send('peer_connect', peer_id, info.client_id, {
              command: 'connect'
            });
          });
        });

        // Handle connection requests from peer
        signal.onmessage('peer_connect', function( msg ) {
          usersView.registerPeer(msg.client_id, msg.peer_id, true);
          usersView.connectToPeer(msg.client_id, msg.peer_id);
        });

        // Handle peer disconnects
        signal.onmessage('peer_disconnect', function( peer_id ) {
          usersView.removeFromUserList(peer_id);
        });
      }
    };
  };

  return Init;
});
