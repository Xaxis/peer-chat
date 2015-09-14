var
  _                   = require('lodash'),
  io                  = require('socket.io'),
  express             = require('express'),
  port                = 9222,
  app                 = express(),
  hosts               = {},
  channels            = {},
  usernames           = {},
  server              = null,
  uniqueUsername      = function( socket ) {
    var
      name        = 'anony' + _.random(100000, 999999);
    if (usernames.hasOwnProperty(name)) {
      return uniqueUsername(socket);
    } else {
      usernames[name] = {
        id: socket.id
      };
      return name;
    }
  };

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
      channel         = msg.channel || socket.id;

    // Send init registration back to peer when no channel is specified
    if (!msg.channel) {
      console.log('User ' + socket.id + ' ATTEMPTING registration w/o channel');
      socket.emit('ready_init', {
        channel_name: channel,
        username: uniqueUsername(socket)
      });
      return false;
    }

    // Create channel if it doesn't exist
    if (!channels[channel]) {
      console.log('Channel "' + channel + '" CREATED');
      channels[channel] = {
        hosts: {},
        created: Date.now()
      };
    }

    // Register peer as ready in main hosts object
    if (msg.ready && !(hosts.hasOwnProperty(socket.id))) {
      console.log('User ' + socket.id + ' REGISTERED @ ' + socket.client.conn.remoteAddress);

      // Build host object
      hosts[socket.id] = {
        socket: socket,
        client_id: socket.id,
        channels: [],
        username: uniqueUsername(socket),
        whois: {
          ip: socket.client.conn.remoteAddress,
          active: Date.now()
        }
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
        joined: Date.now(),
        init: {
          channel_name: channel,
          client_id: socket.id,
          peers: [],
          username: hosts[socket.id].username,
          whois: hosts[socket.id].whois
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
            host.socket.emit('peer_disconnect_' + channel, {
              peer_id: socket.id,
              channels: hosts[socket.id].channels
            });
          });
        }

        // Delete disconnecting peer's host object from channel
        if (channels.hasOwnProperty(channel)) {
          delete channels[channel].hosts[socket.id];
        }

        // Remove channel if no further peers are residing
        if (_.size(channels[channel].hosts) <= 0) {
          delete channels[channel];
          console.log('Channel "' + channel + '" REMOVED on peer disconnect');
        }
      });
    }

    // Remove username
    if (usernames.hasOwnProperty(hosts[socket.id].username)) {
      delete usernames[hosts[socket.id].username];
    }

    // Remove main hosts object
    console.log('User ' + socket.id + ' DISCONNECTED');
    delete hosts[socket.id];
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

      // Remove channel if there are no further users
      if (_.size(channels[channel].hosts) <= 0) {
        delete channels[channel];
        console.log('Channel "' + channel + '" REMOVED on channel close');
      }
    }
  });

  /**
   * Listen for request to list all available channels.
   */
  socket.on('list_channels', function( msg ) {
    console.log('User ' + socket.id + ' REQUESTING channel list');
    var
      channel_list        = [],
      user_count          = _.size(hosts);

    // Build channel list
    _.each(channels, function(channel, name) {
      channel_list.push({
        name: name,
        count: _.size(channel.hosts),
        active: channel.created
      });
    });

    // Send channels list back to client
    socket.emit('list_channels', {
      requesting_channel: msg.channel_name,
      user_count: user_count,
      channel_list: channel_list
    });
  });

  /**
   * Listen for request to list a user's active channels
   */
  socket.on('list_user_channels', function( msg ) {
    console.log('User ' + socket.id + ' REQUESTING channel users list');
    var
      channel_list        = [];

    // Proceed when user is connected
    if (hosts.hasOwnProperty(msg.id)) {
      _.each(hosts[msg.id].channels, function(channel) {
        if (channels.hasOwnProperty(channel)) {
          if (channels[channel].hosts.hasOwnProperty(msg.id)) {
            channel_list.push({
              name: channel,
              joined: channels[channel].hosts[msg.id].joined
            });
          }
        }
      });
    }

    // Send channels list back to client
    socket.emit('list_user_channels', {
      requesting_user: msg.username,
      requesting_channel: msg.channel_name,
      channel_list: channel_list
    });
  });

  /**
   * Listen for request to change a username.
   */
  socket.on('username_change', function( msg ) {
    console.log('User ' + socket.id + ' REQUESTING name change');
    if (usernames.hasOwnProperty(msg.new_username)) {
      console.log('User ' + socket.id + ' SUCCESSFUL name change');
      socket.emit('username_change', {
        success: false,
        old_username: msg.old_username,
        new_username: msg.new_username,
        channel_name: msg.channel_name
      });
    } else {
      console.log('User ' + socket.id + ' FAILED name change');
      usernames[msg.new_username] = {
        id: socket.id
      };
      hosts[socket.id].username = msg.new_username;
      delete usernames[msg.old_username];
      socket.emit('username_change', {
        success: true,
        old_username: msg.old_username,
        new_username: msg.new_username,
        channel_name: msg.channel_name
      });
    }
  });

  /**
   * Listen for "whois" request on a given user.
   */
  socket.on('whois_user', function( msg ) {
    console.log('User ' + socket.id + ' REQUESTING whois of USER ' + msg.username);
    if (usernames.hasOwnProperty(msg.username)) {
      socket.emit('whois_user', {
        success: true,
        username: msg.username,
        channel_name: msg.channel_name,
        socket_id: usernames[msg.username].id,
        peer_ip: hosts[usernames[msg.username].id].whois.ip,
        host_name: socket.handshake.headers.host
      });
    } else {
      socket.emit('whois_user', {
        success: false,
        username: msg.username,
        channel_name: msg.channel_name
      });
    }
  });

  /**
   * Listen on request to send data message to target peer.
   */
  socket.on('MessageToPeer', function( msg ) {
    console.log('User ' + socket.id + ' MESSAGING on SIGNAL ' + msg.handler_id + ' to PEER ' + msg.peer_id);
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
