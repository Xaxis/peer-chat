/**
 * Backbone module view template
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'peersock',
  '../collections/UsersCollection',
  'text!../templates/UserListItem.tpl.html',
  'text!../templates/UserMessageItem.tpl.html'
], function(
  $,
  _,
  Backbone,
  PeerSock,
  UsersCollection,
  tplUserListItem,
  tplUserMessageItem
) {
  var UsersView = Backbone.View.extend({
    el: $('body'),

    templates: {
      userListItem: _.template(tplUserListItem),
      userMessageItem: _.template(tplUserMessageItem)
    },

    events: {
      'keypress .pc-text-input': 'textInputHandler'
    },

    client_id: null,

    /**
     * Initialize collection
     */
    initialize: function() {

      // Bind methods
      _.bindAll(this,
        'registerClient',
        'registerPeer',
        'connectToPeer',
        'getPeerConnections',
        'addUserToList',
        'removeFromUserList',
        'addMessageToWindow',
        'messageCommandParser',
        'sendMessageToPeer',
        'sendMessageToAllPeers',
        'textInputHandler'
      );

      // Initialize model collection
      this.collection = new UsersCollection();
    },

    /**
     * Creates client model and references client/socket id "globally".
     *
     * @param socket {Object}           Socket.io object
     * @param client_id {String}        Socket id from server
     */
    registerClient: function( socket, client_id ) {

      // Register client in collection
      this.collection.add({
        socket: socket,
        client_id: client_id
      });

      // Reference client id "globally"
      this.client_id = client_id;
    },

    /**
     * Starts signaling channel p2p connection listeners and adds PeerSock object to client model.
     *
     * @param client_id {String}          The socket id of the client
     * @param peer_id {String}            The socket id of the peer
     * @param connecting {Boolean}        Switches channel_id string to match for both peers
     */
    registerPeer: function( client_id, peer_id, connecting ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
          return model.get('client_id') == client_id;
        }),
        channel_id          = connecting ? 'peer_chat_' + peer_id + '_' + client_id : 'peer_chat_' + client_id + '_' + peer_id,
        ps                  = {},
        p2p                 = null;

      // Configure a new PeerSock object
      ps[peer_id] = PeerSock({
        socket: client_model.get('socket'),
        debug: false
      });

      // Update client model w/ new PeerSock object
      client_model.set({
        connections: _.extend(client_model.get('connections'), ps)
      });

      // Reference PeerSock object
      p2p = client_model.get('connections')[peer_id];

      // Initialize peer connection w/ data channel
      p2p.newListeningChannel({
        channel_id: channel_id,
        onMessage: function(c) {
          var msg = JSON.parse(c.data);

          // Parse incoming messages
          self.messageCommandParser(msg.command, msg.data);

          // Send confirmation connection message once
          if (!p2p.connection_established) {
            p2p.connection_established = true;
            c.channel.send(JSON.stringify({
              command: 'connect',
              data: {
                peer_id: client_id
              }
            }));
          }
        }
      });
    },

    /**
     * Initializes p2p connection with peer, builds data channel, establishes default data channel event listeners, and
     * starts channel keep alive pings for each channel.
     *
     * @param client_id {String}        The socket id of the client
     * @param peer_id {String}          The socket id of the peer
     */
    connectToPeer: function( client_id, peer_id ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
          return model.get('client_id') == client_id;
        }),
        p2p                 = client_model.get('connections')[peer_id];

      // Initialize data channel
      p2p.startListeningChannel({
        channel_id: 'peer_chat_' + peer_id + '_' + client_id,
        client_id: client_id,
        peer_id: peer_id,

        // Send connecting message to peer
        onOpen: function(c) {
          c.channel.send(JSON.stringify({
            command: 'connect',
            data: {
              peer_id: client_id
            }
          }));

          // Keep data channel open
          self.channelKeepAlive('peer_chat_' + peer_id + '_' + client_id, peer_id, 8000);
        },

        // Handle message from peer
        onMessage: function(c) {
          var msg = JSON.parse(c.data);

          // Parse incoming messages
          self.messageCommandParser(msg.command, msg.data);
        }
      });
    },

    /**
     * Returns PeerSock objects stored in the connections property of the client model.
     *
     * @param client_id {String}        The socket id of the client
     * @returns {*}
     */
    getPeerConnections: function( client_id ) {
      var client_model = this.collection.find(function(model) {
        return model.get('client_id') == client_id;
      });
      return client_model.get('connections');
    },

    /**
     * Adds user list item element to the user list.
     *
     * @param peer_id {String}        The socket id of the peer
     */
    addUserToList: function( peer_id ) {
      $('.user-list').append(this.templates.userListItem({peer_id: peer_id}));
    },

    /**
     * Removes user list item element from the user list (removes element from DOM).
     * @todo - also remove PeerSock object from client model
     * @todo - also remove channel keep alive interval from client model
     *
     * @param peer_id {String}        The socket id of the peer
     */
    removeFromUserList: function( peer_id ) {
      $('[data-peer-id="'+ peer_id +'"]').remove();
    },

    /**
     * Appends a user message to the chat window.
     *
     * @param user {String}
     * @param message {String}
     */
    addMessageToWindow: function( user, message ) {
      $('.pc-window').append(this.templates.userMessageItem({
        user: user,
        message: message
      }));
    },

    /**
     * Executes various functionality based on commands received from peers.
     *
     * @param command {String}        Command to execute
     * @param data {Object}           Data sent from peer
     */
    messageCommandParser: function( command, data ) {
      switch (command) {

        // Connection establishment
        case 'connect' :
          this.addUserToList(data.peer_id);
          break;

        // Channel keep-alive ping
        case 'ping' :
          return false;
          break;

        // Broadcast message to peers
        case 'group-message' :
          this.addMessageToWindow(data.user, data.message);
          break;
      }
    },

    /**
     * Sends a "ping" command over an open data channel effectively keeping a data channel from timing out and closing.
     *
     * @param channel_id        Id of the data channel to use
     * @param peer_id           Peer to send ping to
     * @param speed             The interval at which to send a ping
     * @returns {number}
     */
    channelKeepAlive: function( channel_id, peer_id, speed ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
          return model.get('client_id') == self.client_id;
        }),
        p2p                 = client_model.get('connections')[peer_id];
        p2p.keep_alive      = setInterval(function() {
          p2p.sendOnChannel(channel_id, JSON.stringify({
            command: 'ping',
              data: {
                message: null
              }
            }));
        }, speed);
      return p2p.keep_alive;
    },

    /**
     * Sends a message to a given peer.
     *
     * @param peer_id {String}        The socket id of the peer
     * @param message {String}        Message to send
     */
    sendMessageToPeer: function( peer_id, message ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
          return model.get('client_id') == self.client_id;
        }),
        p2p                 = client_model.get('connections')[peer_id];

      // Iterate through all data channels
      _.each(p2p.channels, function(channel, id) {

        // Send message
        p2p.sendOnChannel(id, JSON.stringify({
          command: 'group-message',
          data: {
            user: self.client_id,
            message: message
          }
        }));
      });
    },

    /**
     * Sends a message to all connected peers.
     *
     * @param message {String}        The socket id of the peer
     */
    sendMessageToAllPeers: function( message ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
          return model.get('client_id') == self.client_id;
        }),
        peers               = client_model.get('connections');
      _.each(peers, function(p2p, id) {
        self.sendMessageToPeer(id, message);
      });
    },

    /**
     * Handles text input.
     *
     * @param e {Object}      The event object
     */
    textInputHandler: function( e ) {
      var
        target        = $(e.target),
        message       = target.val(),
        key_code     = e.keyCode;
      switch (true) {
        case key_code == 13 :
          this.addMessageToWindow(this.client_id, message);
          this.sendMessageToAllPeers(message);
          target.val('');
          break;
      }
    }

  });

  return UsersView;
});
