// @todo - when adding a channel through the UI, user doesn't show up in other users list and vica versa
// OR MAYBE it is working but it just relates to more ice candidate failures?

// @todo - when user joins a channel with a peer, then closes the channel, then joins again (through the UI)
// the user list of the non-joining peer isn't updated

// @todo - whe

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

    // Backbone router object
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
      var
        self        = this;

      // Initialize objects
      this.signal = PeerSock({socket: this.socket}).signal;
      this.app_router = new this.AppRouter;
      this.usersView = new UsersView(this.app_router);

      /**
       * Handle loading of a given channel
       */
      this.app_router.on('route:loadChannel', function (channel) {
        var
          channel_name = null;

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

        // Register
        self.socket.emit('register', {
          ready: true,
          channel: channel_name
        });

        // Register channel specific ready listener
        self.socket.on('ready_init', function (info) {
          self.app_router.navigate(info.channel_name, {trigger: true, replace: true});
        });

        // Proceed creating channel if not already present
        if (!self.channels.hasOwnProperty(channel_name) && channel_name) {
          self.channels[channel_name] = {};

          // Register channel specific ready listener
          self.socket.on('ready_' + channel_name, function (info) {
            console.log('Registering client: ', info.client_id, info);

            // Update channel url
            self.app_router.navigate(info.channel_name, {trigger: true, replace: true});

            // Ready channel elements
            self.usersView.addUserChannelElm(info.channel_name);
            self.usersView.addUserChannelLabel(info.channel_name);

            // Register client - happens once
            self.usersView.registerClient(self.socket, info.client_id);

            // Add 'self' to appropriate user list
            self.usersView.addUserToList(info.client_id, 'anonymous', info.channel_name);

            // Iterate through active hosts in a given channel
            // - Peers connected to a given channel are what is returned in 'info.peers'
            _.each(info.peers, function (peer_id) {

              // Register peer listeners AND/OR register a new channel to an existing peer
              self.usersView.registerPeer(info.client_id, peer_id, info.channel_name, false);

              // Inform all other listening peers registered on a given channel of new peer
              self.signal.send('peer_connect_' + info.channel_name, peer_id, info.client_id, {
                command: 'connect',
                channel_name: info.channel_name
              });
            });
          });

          // Handle connection requests from peer
          self.signal.onmessage('peer_connect_' + channel_name, function (msg) {
            self.usersView.registerPeer(msg.client_id, msg.peer_id, msg.message.channel_name, true);
            self.usersView.connectToPeer(msg.client_id, msg.peer_id, msg.message.channel_name);
          });

          // Handle peer disconnects
          self.signal.onmessage('peer_disconnect_' + channel_name, function (peer_id) {
            self.usersView.removeFromUserList(peer_id);
          });

          // Handle channel closes
          self.socket.on('channel_close_' + channel_name, function (msg) {
            console.log('Closed channel: ' + msg.channel);
            self.usersView.removeFromChannelUserList(msg.peer_id, msg.channel);
          });
        }

        // Load channel again
        else if (channel_name) {
          self.usersView.addUserChannelElm(channel_name);
          self.usersView.addUserChannelLabel(channel_name);
        }
      });

      /**
       * Handle closing of a given channel.
       */
      this.app_router.on('route:closeChannel', function (channel) {
        self.socket.emit('channel_close', {
          channel: channel
        });
      });

      // Start history stack
      Backbone.history.start({pushState: false});
    }
  };
});
