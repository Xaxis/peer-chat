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
    console.log('User ' + socket.id + ' ATTEMPTING registration');
    var
      channel       = msg.channel || socket.id;

    // Send init registration back to peer when no channel is specified
    if (!msg.channel) {
      console.log('User ' + socket.id + ' ATTEMPTING registration w/o channel');
      socket.emit('ready_init', {
        channel_name: socket.id
      });
      return false;
    }

    // Create channel if it doesn't exist
    if (!channels[channel]) {
      console.log('Channel "' + channel + '" CREATED');
      channels[channel] = {
        hosts: {}
      };
    }

    // Register peer as ready in main hosts object
    if (msg.ready && !(hosts.hasOwnProperty(socket.id))) {
      console.log('User ' + socket.id + ' REGISTERED');

      // Build host object
      hosts[socket.id] = {
        socket: socket,
        client_id: socket.id,
        channels: []
      }
    }

    // Register peer as ready in given channel
    if (msg.ready && !(channels[channel]).hosts.hasOwnProperty(socket.id)) {
      console.log('User ' + socket.id + ' JOINING channel "' + channel + '"');

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
   * Listen on peer disconnect.
   */
  socket.on('disconnect', function() {

    // Verify host still exists
    if (hosts.hasOwnProperty(socket.id)) {

      // Iterate through channels registered to peer
      _.each(hosts[socket.id].channels, function( channel ) {
        console.log('User ' + socket.id + ' LEAVING channel "' + channel + '"');

        // Confirm channel still exists
        if (channels.hasOwnProperty(channel)) {

          // Iterate through all peers that are also in this channel
          _.each(channels[channel].hosts, function(host) {

            // Send message to peer in this channel
            host.socket.emit('peer_disconnect_' + channel, socket.id);
          });
        }

        // Delete disconnecting peer's host object from channel
        delete channels[channel].hosts[socket.id];

        // Remove channel if no further peers are residing
        if (_.size(channels[channel].hosts) <= 0) {
          delete channels[channel];
          console.log('Channel "' + channel + '" REMOVED');
        }
      });
    }

    // Remove main hosts object
    delete hosts[socket.id];
    console.log('User ' + socket.id + ' DISCONNECTED');
  });


  /**
   * Listen on request to deregister from a channel.
   */
  socket.on('channel_close', function( msg ) {
    var
      channel       = msg.channel;
    if (channels.hasOwnProperty(channel)) {

      // Iterate through hosts in a given channel
      _.each(channels[channel].hosts, function(host) {
        host.socket.emit('channel_close_' + channel, {
          channel: channel,
          peer_id: socket.id
        });
      });

      // Remove user from channel
      if (channels[channel].hosts.hasOwnProperty(socket.id)) {
        delete channels[channel].hosts[socket.id];
        console.log('User ' + socket.id + 'LEFT channel "' + channel + '"');
      }
    }
  });

  /**
   * Listen on request to send data message to target peer.
   */
  socket.on('MessageToPeer', function( msg ) {
    var
      target_peer   = null,
      handler       = msg.handler_id;

    // Send message to peer
    if (hosts.hasOwnProperty(msg.peer_id)) {
      target_peer = hosts[msg.peer_id].socket;
      target_peer.emit(handler, _.extend(msg, {
        client_id: msg.peer_id,
        peer_id: msg.client_id
      }));
    }
  });

});
