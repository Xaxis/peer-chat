/**
 * Main router module
 */
define([
  'underscore',
  'backbone',
  'socketio',
  'core/users/views/UsersView',
  'peersock'
], function(
  _,
  Backbone,
  io,
  UsersView,
  PeerSock
) {
  var AppRouter = Backbone.Router.extend({
    routes: {
      '': 'loadChannel',
      '*actions': 'loadChannel',
      'channel': 'loadChannel',
      'channel/:id': 'loadChannel'
    }
  });

  var initialize = function() {
    var
      app_router      = new AppRouter;

    // Default route handler
    app_router.on('route:loadChannel', function(actions) {
      var
        channel       = null;

      // Determine route
      if (!actions) {
        channel = '';
      } else {
        var paths = actions.split('/');
        if (paths.length) {
          channel = paths[0];
        } else {
          channel = '';
        }
      }

      // Load channel
      loadChannel(channel, app_router);
    });

    // Start history stack
    Backbone.history.start();

    return app_router;
  };

  /**
   * Loads a given chat room channel.
   *
   * @param channel {String}
   * @param router {Object}
   */
  var loadChannel = function( channel, router ) {

    // Build socket
    var socket = io.connect('//localhost:9222');

    // Register
    socket.emit('register', {
      ready: true,
      channel: channel
    });

    // Initialize channel users
    var usersView = new UsersView();

    // Reference PeerSock (for signaling interface)
    var signal = PeerSock({socket: socket}).signal;

    // Each client receives registration upon page load
    socket.on('ready', function( info ) {

      // Update channel url
      router.navigate(info.channel, {trigger: true, replace: true});

      console.log('Registering client: ', info.client_id, info);
      usersView.registerClient(socket, info.client_id);
      usersView.addUserToList(info.client_id, 'anonymous');

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
  };

  return {
    initialize: initialize
  }
});
