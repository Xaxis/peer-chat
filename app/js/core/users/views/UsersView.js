/**
 * Backbone module view template
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'peersock',
  'text!../templates/users.tpl.html',
  '../collections/UsersCollection'
], function(
  $,
  _,
  Backbone,
  PeerSock,
  UsersTemplate,
  UsersCollection
) {
  var UsersView = Backbone.View.extend({
    el: $('body'),

    module_template: _.template(UsersTemplate),

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
        'connectToPeer'
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
     */
    registerPeer: function( client_id, peer_id, direction ) {
      var client_model = this.collection.find(function(model) {
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
        channel_id: 'peer_chat_' + (direction ? peer_id : client_id),
        //channel_id: 'peer_chat_',
        onMessage: function(c) {
          console.log('New message from peer!', c.data);
        }
      });

      if (!direction) {
        p2p.startListeningChannel({
          channel_id: 'peer_chat_' + (direction ? peer_id : client_id),
          client_id: client_id,
          peer_id: peer_id,

          // Send message to peer
          onOpen: function(c) {
            c.channel.send(JSON.stringify({
              msg: 'Message from peer: ' + client_id
            }));
          },

          // Handle message from peer
          onMessage: function(c) {
            console.log(c.data);
          }
        });
      }

      console.log(client_model.get('connections'));
    },

    /**
     *
     * @param peer_id
     * @param client_id
     */
    connectToPeer: function( client_id, peer_id ) {
      var client_model = this.collection.find(function(model) {
        return model.get('client_id') == client_id;
      });

      // Reference PeerSock object
      var p2p = client_model.get('connections')[peer_id];

      p2p.startListeningChannel({
        channel_id: 'peer_chat_',
        client_id: client_id,
        peer_id: peer_id,

        // Send message to peer
        onOpen: function(c) {
          c.channel.send(JSON.stringify({
            msg: 'Message from peer: ' + client_id
          }));
        },

        // Handle message from peer
        onMessage: function(c) {
          console.log(c.data);
        }
      });
    }

  });

  return UsersView;
});
