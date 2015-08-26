/**
 * Backbone module view template
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'peersock',
  '../collections/UsersCollection',
  'text!../templates/UserListItem.tpl.html'
], function(
  $,
  _,
  Backbone,
  PeerSock,
  UsersCollection,
  tplUserListItem
) {
  var UsersView = Backbone.View.extend({
    el: $('body'),

    templates: {
      userListItem: _.template(tplUserListItem)
    },

    events: {
    },

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
        'messageCommandParser'
      );

      // Initialize model collection
      this.collection = new UsersCollection();
    },

    /**
     *
     * @param socket
     * @param client_id
     */
    registerClient: function( socket, client_id ) {

      // Register client in collection
      this.collection.add({
        socket: socket,
        client_id: client_id
      });
    },

    /**
     *
     * @param client_id
     * @param peer_id
     * @param connecting
     */
    registerPeer: function( client_id, peer_id, connecting ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
          return model.get('client_id') == client_id;
        });

      // Reference client/peer PeerSock container object
      var ps = {};

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
      var p2p = client_model.get('connections')[peer_id];

      // Initialize peer connection w/ data channel
      p2p.newListeningChannel({
        channel_id: connecting ? 'peer_chat_' + peer_id + '_' + client_id : 'peer_chat_' + client_id + '_' + peer_id,
        onMessage: function(c) {
          var msg = JSON.parse(c.data);

          // Parse incoming messages
          self.messageCommandParser(msg.command, msg.data);

          // Send confirmation connection message
          c.channel.send(JSON.stringify({
            command: 'connect',
            data: {
              peer_id: client_id
            }
          }));
        }
      });
    },

    /**
     *
     * @param peer_id
     * @param client_id
     */
    connectToPeer: function( client_id, peer_id ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
        return model.get('client_id') == client_id;
      });

      // Reference PeerSock object
      var p2p = client_model.get('connections')[peer_id];

      //
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
     *
     */
    getPeerConnections: function( client_id ) {
      var client_model = this.collection.find(function(model) {
        return model.get('client_id') == client_id;
      });
      return client_model.get('connections');
    },

    /**
     *
     * @param peer_id
     */
    addUserToList: function( peer_id ) {
      $('.user-list').append(this.templates.userListItem({peer_id: peer_id}));
    },

    /**
     *
     * @param peer_id
     */
    removeFromUserList: function( peer_id ) {
      $('[data-peer-id="'+ peer_id +'"]').remove();
    },

    /**
     *
     * @param command
     * @param data
     */
    messageCommandParser: function( command, data ) {
      switch (command) {

        // Connection establishment
        case 'connect' :
          this.addUserToList(data.peer_id);
          break;

        // Channel keep-alive ping
        case 'ping' :
          break;
      }
    }

  });

  return UsersView;
});
