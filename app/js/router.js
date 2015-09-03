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

  // Socket.io socket reference
  var socket = io.connect('//localhost:9222');

  // User view reference
  var usersView = null;

  // Which channels are active
  var channels = {};

  // App router definition
  var AppRouter = Backbone.Router.extend({
    routes: {
      '*channel/close/:peer': 'closeChannel',
      '*actions': 'loadChannel'
    }
  });

  /**
   * Router initialization method.
   *
   * @returns {AppRouter}
   */
  var initialize = function() {
    var
      app_router      = new AppRouter;

    // Channel loading
    app_router.on('route:loadChannel', function(channel) {
      var
        channel_name       = null;

      // Determine route
      if (!channel) {
        channel_name = '';
      } else {
        var paths = channel.split('/');
        if (paths.length) {
          channel_name = paths[0];
        } else {
          channel_name = '';
        }
      }

      // Load a #channel
      loadChannel(channel_name, app_router);
    });

    // Command handling
    app_router.on('route:closeChannel', function(channel, peer_id) {
      socket.emit('channel_close', {
        channel: channel,
        peer_id: peer_id
      });
    });

    // Initialize core view
    usersView = new UsersView(app_router);

    // Start history stack
    Backbone.history.start({pushState: false});

    return app_router;
  };

  /**
   * Loads a given chat room channel.
   *
   * @param channel_name {String}
   * @param router {Object}
   */
  var loadChannel = function( channel_name, router ) {

    // Reference PeerSock (for signaling interface)
    var signal = PeerSock({socket: socket}).signal;

    // Register
    socket.emit('register', {
      ready: true,
      channel: channel_name
    });

    // Proceed when channel is not already open
    if (!channels.hasOwnProperty(channel_name)) {
      channels[channel_name] = {};

      // Register channel specific ready listener
      socket.on('ready_' + channel_name, function( info ) {
        console.log('Registering client: ', info.client_id, info);

        // Update channel url
        router.navigate(info.channel_name, {trigger: true, replace: true});

        // Ready channel elements
        usersView.addUserChannelElm(info.channel_name);
        usersView.addUserChannelLabel(info.channel_name);

        // Register client - happens once
        usersView.registerClient(socket, info.client_id);

        // Add 'self' to appropriate user list
        usersView.addUserToList(info.client_id, 'anonymous', channel_name);

        // Iterate through active hosts in a given channel
        // - Peers connected to a given channel are what is returned in 'info.peers'
        _.each(info.peers, function(peer_id) {

          // Register peer listeners AND/OR register a new channel to an existing peer
          usersView.registerPeer(info.client_id, peer_id, channel_name, false);

          // Inform all other listening peers registered on a given channel of new peer
          signal.send('peer_connect_' + channel_name, peer_id, info.client_id, {
            command: 'connect',
            channel_name: info.channel_name
          });
        });
      });

      // Register channel close listener
      socket.on('channel_close_' + channel_name, function( msg ) {
        console.log('Closed channel: ' + msg.channel);
        usersView.removeFromChannelUserList(msg.peer_id, msg.channel);
        delete channels[msg.channel];
      });

      // Handle connection requests from peer
      signal.onmessage('peer_connect_' + channel_name, function( msg ) {
        usersView.registerPeer(msg.client_id, msg.peer_id, msg.message.channel_name, true);
        usersView.connectToPeer(msg.client_id, msg.peer_id, msg.message.channel_name);
      });

      // Handle peer disconnects
      signal.onmessage('peer_disconnect_' + channel_name, function( peer_id ) {
        usersView.removeFromUserList(peer_id);
      });
    }
  };

  return {
    initialize: initialize
  }
});
