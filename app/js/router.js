// @todo - feature that makes sure a username doesn't already exist

// @todo - write feature that determines if a peer is idle or not per channel

// @todo - prevent server from crashing from various UX states and allow for reconnection of peers when
// server restarts (without needing peers to refresh their browsers)

// @todo - add feature that allows users to specify a user name as a URL parameter

// @todo - add better input validation on /command inputs, name change ui, new channel ui, etc.

// @todo - seperate server code into "npm" modules loaded in by require

// @todo - set 'client_id' on connected peers "peer object" upon connection (so this doesn't need to be done elsewhere)

// @todo - determine/establish maximum peer connections a user can have in correlation w/ number of channels

// @todo - show how many users are in a given channel via the UI

// @todo - solve for icecandidate failures by attempting to reconnect failed peer connections
/**
 * Router module
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
  return {

    // Socket.io
    socket: io.connect('//localhost:9222'),

    // Signaling method
    signal: {},

    // Opened channels
    channels: {},

    // Router object
    AppRouter: Backbone.Router.extend({
      routes: {
        '*channel/close/:peer': 'closeChannel',
        '': 'loadChannel',
        '*actions': 'loadChannel'
      }
    }),

    // Router instance
    app_router: {},

    // Core view instance
    usersView: {},

    /**
     * Router initialization method.
     */
    initialize: function() {
      this.signal = PeerSock({socket: this.socket}).signal;
      this.app_router = new this.AppRouter;
      this.usersView = new UsersView(this.app_router, this.socket);

      // Bind methods
      _.bindAll(this,
        'routerOnLoadChannel',
        'routerOnCloseChannel',
        'socketOnReadyInit',
        'socketOnReadyChannel',
        'socketOnPeerConnectChannel',
        'socketOnPeerDisconnect',
        'socketOnPeerChannelClose'
      );

      // Attach router event handlers
      this.app_router.on('route:loadChannel', this.routerOnLoadChannel);
      this.app_router.on('route:closeChannel', this.routerOnCloseChannel);

      // Start history stack
      Backbone.history.start({pushState: false});
    },

    /**
     * Handles router command to create/open/load a #channel.
     *
     * @param channel {String}        The channel name
     */
    routerOnLoadChannel: function( channel ) {
      var
        channel_name        = '';

      // Parse route
      if (channel) {
        var paths = channel.split('/');
        if (paths.length) {
          channel_name = paths[0];
        }
      }

      // Register
      this.socket.emit('register', {
        ready: true,
        channel: channel_name
      });

      // Handle #channel specific ready messages (for those who didn't provide a #channel)
      this.socket.on('ready_init', this.socketOnReadyInit);

      // Proceed creating #channel if not already present
      if (!this.channels.hasOwnProperty(channel_name) && channel_name) {
        this.channels[channel_name] = {};

        // Register channel specific ready listener
        this.socket.on('ready_' + channel_name, this.socketOnReadyChannel);

        // Handle connection requests from peer
        this.signal.onmessage('peer_connect_' + channel_name, this.socketOnPeerConnectChannel);

        // Handle full peer disconnects
        this.signal.onmessage('peer_disconnect_' + channel_name, this.socketOnPeerDisconnect);

        // Handle peer channel closes (not full disconnects)
        this.socket.on('channel_close_' + channel_name, this.socketOnPeerChannelClose);
      }

      // Load channel again
      else if (channel_name) {
        this.usersView.addUserChannelElm(channel_name);
        this.usersView.addUserChannelLabel(channel_name);
      }
    },

    /**
     * Handles router command to close a #channel
     *
     * @param channel {String}        The channel name
     */
    routerOnCloseChannel: function( channel ) {
      this.socket.emit('channel_close', {
        channel: channel
      });
    },

    /**
     * Handles ready messages for clients who did not provide a #channel.
     *
     * @param info {Object}       Message object from server
     */
    socketOnReadyInit: function( info ) {
      this.app_router.navigate(info.channel_name, {trigger: true, replace: true});
    },

    /**
     * Handles channel specific ready messages from server.
     *
     * @param info {Object}       Message object from server
     */
    socketOnReadyChannel: function( info ) {
      console.log('Registering client: ', info.client_id, info);
      var
        self        = this;

      // Update #channel uri
      this.app_router.navigate(info.channel_name, {trigger: true, replace: true});

      // Ready channel elements
      this.usersView.addUserChannelElm(info.channel_name);
      this.usersView.addUserChannelLabel(info.channel_name);

      // Register client once
      this.usersView.registerClient(self.socket, info.client_id, info.username, info.channel_name);

      // Iterate through active hosts in a given channel and connected to channel's peers
      _.each(info.peers, function (peer_id) {

        // Register peer listeners AND/OR register a new channel to an existing peer
        self.usersView.registerPeer(info.client_id, peer_id, info.channel_name, false);

        // Inform all other listening peers registered on a given channel of new peer
        self.signal.send('peer_connect_' + info.channel_name, peer_id, info.client_id, {
          command: 'connect',
          channel_name: info.channel_name
        });
      });
    },

    /**
     * Handles socket connection requests from peer.
     *
     * @param msg {Object}        Message object from server
     */
    socketOnPeerConnectChannel: function( msg ) {
      this.usersView.registerPeer(msg.client_id, msg.peer_id, msg.message.channel_name, true);
      this.usersView.connectToPeer(msg.client_id, msg.peer_id, msg.message.channel_name);
    },

    /**
     * Handles a disconnected peer.
     *
     * @param peer_id {String}        The socket id of the peer
     */
    socketOnPeerDisconnect: function( msg ) {
      this.usersView.removeFromUserList(msg.peer_id, msg.channels);
    },

    /**
     * Handles the closing of a given #channel (not a full peer disconnect).
     *
     * @param msg {Object}        Message object from server
     */
    socketOnPeerChannelClose: function( msg ) {
      this.usersView.removeFromChannelUserList(msg.peer_id, msg.channel);
    }
  };
});
