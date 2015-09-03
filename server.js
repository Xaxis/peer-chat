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
  socket.on('register', function( msg ) {
    var
      channel       = msg.channel || socket.id;

    // Create channel if it doesn't exist
    if (!channels[channel]) {
      channels[channel] = {
        hosts: {}
      };
    }

    // Register peer as ready in main hosts object
    if (msg.ready && !(socket.id in hosts)) {

      // Build host object
      hosts[socket.id] = {
        socket: socket,
        client_id: socket.id,
        channels: []
      }
    }

    // Register peer as ready in given channel
    if (msg.ready && !(socket.id in channels[channel]).hosts) {
      console.log('User "' + socket.id + '" JOINING channel "' + channel + '"');

      // Add channel to main hosts object
      hosts[socket.id].channels.push(channel);

      // Build host object in channel
      channels[channel].hosts[socket.id] = {
        socket: socket,
        client_id: socket.id,
        channel: channel,
        init: {
          channel_name: channel,
          client_id: socket.id,
          peers: []
        }
      };

      // Populate list of peers
      _.filter(channels[channel].hosts, function( host, idx ) {
        if (idx != socket.id) channels[channel].hosts[socket.id].init.peers.push(idx);
      });

      // Send initialization info to client
      socket.emit('ready_' + channel, channels[channel].hosts[socket.id].init);
    }
  });

  /**
   * Listen on request to deregister client.
   */
  socket.on('disconnect', function() {

    // Iterate through channels registered to peer
    _.each(hosts[socket.id].channels, function( channel ) {
      console.log('User "' + socket.id + '" LEAVING channel "' + channel + '"');

      // Disconnect message to all peers on channel
      // @todo - this should only emit to all peers who are in a given channel
      socket.broadcast.emit('peer_disconnect_' + channel, socket.id);

      // Delete host object from channel
      delete channels[channel].hosts[socket.id];
    });

    // Remove main hosts object
    delete hosts[socket.id];
  });


  /**
   * Listen on request to deregister from a channel
   */
  socket.on('channel_close', function( msg ) {
    var
      channel       = msg.channel,
      peer_id       = msg.peer_id;
    if (channel in channels) {

      // Iterate through hosts in a given channel
      _.each(channels[channel].hosts, function(host) {
        host.socket.emit('channel_close_' + channel, {
          channel: channel,
          peer_id: peer_id
        });
      });

      // Remove user from channel
      if (peer_id in channels[channel].hosts) {
        delete channels[channel].hosts[peer_id];
      }
    }
  });

  /**
   * Listen on request to send data message to target peer.
   *
   * @param messageObject {Object}
   * @param messageObject.peer_id     Socket ID of target peer to send message to
   * @param messageObject.client_id   Socket ID of peer sending the message
   * @param messageObject.handler_id  Name of listening 'onmessage' callback
   */
  socket.on('MessageToPeer', function( msg ) {
    var
      target_peer   = null,
      handler       = msg.handler_id;

    // Send message to peer
    if (msg.peer_id in hosts) {
      target_peer = hosts[msg.peer_id].socket;
      target_peer.emit(handler, _.extend(msg, {
        client_id: msg.peer_id,
        peer_id: msg.client_id
      }));
    }
  });

});
