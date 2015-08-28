var
  _                   = require('lodash'),
  io                  = require('socket.io'),
  express             = require('express'),
  port                = 9222,
  app                 = express(),
  hosts               = {},
  channels            = {},
  server              = null;

// Trust X-Forwarded-* header fields
app.enable('trust proxy');

// Initialize server & socket.io
server = app.listen(port);
io = io.listen(server, {log: false});

// Connection handlers
io.sockets.on('connection', function(socket) {

  /**
   * Listen on request to register a client.
   */
  socket.on('register', function(msg) {
    var
      channel       = msg.channel || socket.id;

    // Create channel if it doesn't exist
    if (!channels[channel]) {
      channels[channel] = {
        hosts: {}
      };
    }

    // Register peer as ready
    if (msg.ready && !(socket.id in hosts)) {

      // Build hosts objects referenced by socket id
      channels[channel].hosts[socket.id] = hosts[socket.id] = {
        socket: socket,
        client_id: socket.id,
        channel: channel,
        init: {
          channel: channel,
          client_id: socket.id,
          peers: []
        }
      };

      // Populate list of peers
      _.filter(channels[channel].hosts, function(host, idx) {
        if (idx != socket.id) channels[channel].hosts[socket.id].init.peers.push(idx);
      });

      // Send initialization info to client
      socket.emit('ready', hosts[socket.id].init);
    }
  });

  /**
   * Listen on request to deregister client.
   */
  socket.on('disconnect', function() {
    socket.broadcast.emit('peer_disconnect', socket.id);
    var channel = hosts[socket.id].channel;
    delete channels[channel].hosts[socket.id];
    delete hosts[socket.id];

  });

  /**
   * Listen on request to send data message to target peer.
   *
   * @param messageObject {Object}
   * @param messageObject.peer_id     Socket ID of target peer to send message to
   * @param messageObject.client_id   Socket ID of peer sending the message
   * @param messageObject.handler_id  Name of listening 'onmessage' callback
   */
  socket.on('MessageToPeer', function( messageObject ) {
    var
      target_peer   = null,
      handler       = messageObject.handler_id;

    // Send message to peer
    if (messageObject.peer_id in hosts) {
      target_peer = hosts[messageObject.peer_id].socket;
      target_peer.emit(handler, _.extend(messageObject, {
        client_id: messageObject.peer_id,
        peer_id: messageObject.client_id
      }));
    }
  });

});
