/**
 * Backbone module view template
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'peersock',
  'ux',
  '../collections/UsersCollection',
  'text!../templates/UserChannel.tpl.html',
  'text!../templates/UserChannelLabel.tpl.html',
  'text!../templates/UserListItem.tpl.html',
  'text!../templates/UserMessageItem.tpl.html',
  'text!../templates/UserMessageAction.tpl.html',
  'text!../templates/UserMessagePrivate.tpl.html',
  'text!../templates/UserMessageNameChange.tpl.html',
  'text!../templates/UserMessageLeftChannel.tpl.html',
  'text!../templates/UserMessageJoinedChannel.tpl.html',
  'text!../templates/UserMessagePingRequest.tpl.html',
  'text!../templates/UserMessagePingAnswer.tpl.html',
  'text!../templates/UserMessageIgnoreAdd.tpl.html',
  'text!../templates/UserMessageIgnoreRemove.tpl.html',
  'text!../templates/UserMessageHelp.tpl.html',
  'text!../templates/UserMessageListAll.tpl.html',
  'text!../templates/UserMessageListUser.tpl.html'
], function(
  $,
  _,
  Backbone,
  PeerSock,
  UX,
  UsersCollection,
  tplUserChannel,
  tplUserChannelLabel,
  tplUserListItem,
  tplUserMessageItem,
  tplUserMessageAction,
  tplUserMessagePrivate,
  tplUserMessageNameChange,
  tplUserMessageLeftChannel,
  tplUserMessageJoinedChannel,
  tplUserMessagePingRequest,
  tplUserMessagePingAnswer,
  tplUserMessageIgnoreAdd,
  tplUserMessageIgnoreRemove,
  tplUserMessageHelp,
  tplUserMessageListAll,
  tplUserMessageListUser
) {
  var UsersView = Backbone.View.extend({
    el: $('body'),

    templates: {
      userChannel: _.template(tplUserChannel),
      userChannelLabel: _.template(tplUserChannelLabel),
      userListItem: _.template(tplUserListItem),
      userMessageItem: _.template(tplUserMessageItem),
      userMessageAction: _.template(tplUserMessageAction),
      userMessagePrivate: _.template(tplUserMessagePrivate),
      userMessageNameChange: _.template(tplUserMessageNameChange),
      userMessageLeftChannel: _.template(tplUserMessageLeftChannel),
      userMessageJoinedChannel: _.template(tplUserMessageJoinedChannel),
      userMessagePingRequest: _.template(tplUserMessagePingRequest),
      userMessagePingAnswer: _.template(tplUserMessagePingAnswer),
      userMessageIgnoreAdd: _.template(tplUserMessageIgnoreAdd),
      userMessageIgnoreRemove: _.template(tplUserMessageIgnoreRemove),
      userMessageHelp: _.template(tplUserMessageHelp),
      userMessageListAll: _.template(tplUserMessageListAll),
      userMessageListUser: _.template(tplUserMessageListUser)
    },

    events: {
      'click .pc-channel-label': 'userChannelLabelSwitch',
      'click .pc-channel-label .button': 'userChannelLabelClose',
      'blur .pc-channel-label--add-channel .text': 'addUserChannelBlur',
      'focus .pc-channel-label--add-channel .text': 'addUserChannelFocus',
      'keypress .pc-channel-label--add-channel .text': 'addUserChannelInput',
      'click .pc-channel-label--add-channel .button': 'addUserChannelButton',
      'keypress .pc-text-input': 'chatWindowTextInputHandler',
      'click .user-list-item.me': 'userListItemNameChange',
      'keypress .user-list-item.me input': 'userListItemNameChangeConfirm'
    },

    client_id: null,

    /**
     * View initialization method.
     *
     * @param router {Object}       Reference to backbone router
     * @param socket {Object}       Reference to socket.io
     */
    initialize: function( router, socket ) {

      // Bind methods
      _.bindAll(this,
        'socketListChannels',
        'socketListUserChannels',
        'addUserChannelElm',
        'getUserChannelContainerElm',
        'addUserChannelLabel',
        'getUserChannelLabelContainerElm',
        'userChannelLabelClose',
        'userChannelLabelSwitch',
        'addUserChannelBlur',
        'addUserChannelFocus',
        'addUserChannelInput',
        'addUserChannelButton',
        'removeUserChannelElms',
        'registerClient',
        'registerPeer',
        'connectToPeer',
        'getPeerConnections',
        'getClientModel',
        'addUserToList',
        'removeFromUserList',
        'removeFromChannelUserList',
        'addMessageToWindow',
        'sendMessageToPeer',
        'sendMessageToAllPeers',
        'userListItemNameChange',
        'userListItemNameChangeConfirm',
        'updateUsername',
        'chatWindowTextInputHandler',
        'isPeerIgnored',
        'messageCommandParser',
        'chatWindowTextInputCommand'
      );

      // Initialize instance properties
      this.router = router;
      this.socket = socket;
      this.collection = new UsersCollection();

      // Register socket.io event listeners
      this.socket.on('list_channels', this.socketListChannels);
      this.socket.on('list_user_channels', this.socketListUserChannels);
    },

    /**
     * List available channels returned from the server.
     *
     * @param channel_obj {Object}        Response message from server
     */
    socketListChannels: function( channel_obj ) {
      var
        sorted_channels       = _.sortBy(channel_obj.channel_list, 'name');

      // Map human readable channel creation time
      _.each(sorted_channels, function(o, id, obj) {
        obj[id].active = UX.getTimePassed(obj[id].active);
      });

      // Add channels list to the local window
      this.addMessageToWindow({
        username: this.getClientModel().get('username'),
        message: {
          channel_count: sorted_channels.length,
          user_count: channel_obj.user_count,
          channels: sorted_channels
        },
        id: this.client_id,
        channel_name: channel_obj.requesting_channel,
        template: 'userMessageListAll'
      });
    },

    /**
     * List available channels of a user returned from the server.
     *
     * @param channel_obj {Object}        Response message from server
     */
    socketListUserChannels: function( channel_obj ) {
      var
        sorted_channels       = _.sortBy(channel_obj.channel_list, 'name');

      // Map human readable join time
      _.each(sorted_channels, function(o, id, obj) {
        obj[id].joined = UX.getTimePassed(obj[id].joined);
      });

      // Add channels list to the local window
      this.addMessageToWindow({
        username: this.getClientModel().get('username'),
        message: {
          peername: channel_obj.requesting_user,
          channel_count: _.size(sorted_channels),
          channels: sorted_channels
        },
        id: this.client_id,
        channel_name: channel_obj.requesting_channel,
        template: 'userMessageListUser'
      });
    },

    /**
     * Adds user channel elements to the DOM.
     *
     * @param channel {String}        The channel id
     */
    addUserChannelElm: function( channel ) {
      var
        channel_elm       = $('[data-channel-id="' + channel + '"]');
      $('.pc-channel').removeClass('active');
      if (!channel_elm.length) {
        channel_elm = $(this.templates.userChannel({
          channelid: channel
        })).addClass('active');
        $('.pc-channels-container').append(channel_elm);
      } else {
        channel_elm.addClass('active');
      }
      UX.equalizeColumnsHeights(channel_elm.find('.pc-col-2'), channel_elm.find('.pc-col-1'));
    },

    /**
     * Returns the channel container element at a given id. When channel is passed as an element, attempts to find
     * the channel container assuming the passed element is a descendant.
     *
     * @param channel {String}        The channel id
     */
    getUserChannelContainerElm: function( channel ) {
      if (typeof channel == 'string') {
        return $('.pc-channel[data-channel-id="' + channel + '"]');
      } else if (channel.length) {
        return channel.closest('[data-channel-id]');
      } else {
        return false;
      }
    },

    /**
     * Adds user channel label elements to the DOM.
     *
     * @param channel {String}        The channel id
     */
    addUserChannelLabel: function( channel ) {
      var
        channel_elm       = $('[data-channel-label-id="' + channel + '"]');
      $('.pc-channel-label').removeClass('active');
      if (!channel_elm.length) {
        $('.pc-channel-label--add-channel').after($(this.templates.userChannelLabel({
          channelid: channel
        })).addClass('active'));
      } else {
        channel_elm.addClass('active');
      }
    },

    /**
     * Returns the channel label container element at a given id. When channel is passed as an element, attempts to find
     * the channel container assuming the passed element is a descendant.
     *
     * @param channel {String}      The channel id
     */
    // @todo - implement this method where applicable
    getUserChannelLabelContainerElm: function( channel ) {
      if (typeof channel == 'string') {
        return $('.pc-channel-label[data-channel-label-id="' + channel + '"]');
      } else if (channel.length) {
        return channel.closest('[data-channel-label-id]');
      } else {
        return false;
      }
    },

    /**
     * Handles switching between channels.
     *
     * @param e {Object}        The 'click' event object
     */
    userChannelLabelSwitch: function( e ) {
      var
        target            = $(e.currentTarget),
        channel           = target.find('.channelid').html(),
        channel_elm       = $('[data-channel-id="' + channel + '"]');
      $('.pc-channel').removeClass('active');
      $('.pc-channel-label').removeClass('active');
      channel_elm.addClass('active');
      target.addClass('active');
      this.router.navigate(channel, {trigger: true, replace: true});
    },

    /**
     * Handled closing a given channel.
     *
     * @param e {Object}        The 'click' event object
     */
    userChannelLabelClose: function( e ) {
      e.stopPropagation();
      var
        target              = $(e.currentTarget),
        channel             = target.prev('.text').html(),
        parent              = target.closest('.pc-channel-label'),
        prev_channel        = parent.prev('.pc-channel-label'),
        next_channel        = parent.next('.pc-channel-label'),
        channel_to_load     = '',
        channels_list       = this.getClientModel().get('channels');

      // Notify peers
      this.sendMessageToAllPeers('group-leave-channel', channel, '');

      // Remove channel elements
      this.removeUserChannelElms(channel);

      // Remove channel from channels list
      if (channels_list.hasOwnProperty(channel)) {
        delete channels_list[channel];
      }

      // Close the channel
      this.router.navigate(channel + '/close/' + this.client_id, {trigger: true, replace: true});

      // Redirect to appropriate location/show corresponding elements
      if (prev_channel.length) {
        channel_to_load = prev_channel.attr('data-channel-label-id');
        prev_channel.trigger('click');
        this.router.navigate(channel_to_load, {trigger: true, replace: true});
      }
      else if (next_channel.length) {
        channel_to_load = next_channel.attr('data-channel-label-id');
        next_channel.trigger('click');
        this.router.navigate(channel_to_load, {trigger: true, replace: true});
      }
      else {
        this.router.navigate(this.client_id, {trigger: true, replace: true});
      }
    },

    /**
     * Handles replacing default text when button is no longer active.
     *
     * @param e {Object}        The 'blur' event object
     */
    addUserChannelBlur: function( e ) {
      var
        target        = $(e.currentTarget),
        text          = target.attr('data-default-text');
      target.html(text);
    },

    /**
     * Handles erasing all text of the "input" on focus.
     *
     * @param e {Object}        The 'focus' event object
     */
    addUserChannelFocus: function( e ) {
      var
        target        = $(e.currentTarget);
      target.html('');
    },

    /**
     * Handles keyboard input for add new channel button.
     *
     * @param e {Object}        The 'focus' event object
     */
    addUserChannelInput: function( e ) {
      var
        target         = $(e.currentTarget),
        channel        = target.html(),
        key_code       = e.keyCode;
      if (key_code == 13) {
        if (channel.length > 0) {
          this.router.navigate(channel, {trigger: true, replace: true});
        }
        target.trigger('blur');
        return false;
      }
    },

    /**
     * Handles action to take when the add channel button icon is clicked.
     *
     * @param e {Object}        The 'click' event object
     */
    addUserChannelButton: function( e ) {
      var
        target        = $(e.currentTarget),
        input         = target.prev('.text');
      input.trigger('focus');
    },

    /**
     * Removes user channel elements from the DOM.
     *
     * @param channel {String}        The channel id
     */
    removeUserChannelElms: function( channel ) {
      var
        chat_window         = $('[data-channel-id="' + channel + '"]'),
        channel_label       = $('[data-channel-label-id="' + channel + '"]');
      chat_window.remove();
      channel_label.remove();
    },

    /**
     * Creates client model and references client/socket id "globally".
     *
     * @param socket {Object}             Socket.io object
     * @param client_id {String}          Socket id from server
     * @param username {String}           The username generated by server
     * @param channel_name {String}       The #channel id
     */
    registerClient: function( socket, client_id, username, channel_name ) {

      // Proceed if not already registered
      if (!this.client_id) {

        // Register client in collection
        this.collection.add({
          socket: socket,
          client_id: client_id,
          connection_time: Date.now(),
          username: username
        });

        // Reference client id "globally"
        this.client_id = client_id;

        // Add "self" to channel user list
        this.addUserToList(client_id, username, channel_name);
      } else {
        this.addUserToList(client_id, this.getClientModel().get('username'), channel_name);
      }

      // Add channel to channels list
      var channels = this.getClientModel().get('channels');
      if (!channels.hasOwnProperty(channel_name)) {
        channels[channel_name] = true;
      }

      // Add status message to local chat window
      this.addMessageToWindow({
        username: this.getClientModel().get('username'),
        message: channel_name,
        id: client_id,
        channel_name: channel_name,
        template: 'userMessageJoinedChannel'
      });
    },

    /**
     * Starts signaling channel p2p connection listeners and adds PeerSock object to client model.
     *
     * @param client_id {String}          The socket id of the client
     * @param peer_id {String}            The socket id of the peer
     * @param channel_name {String}       The name of the #channel
     * @param connecting {Boolean}        Switches channel_id string to match for both peers
     */
    registerPeer: function( client_id, peer_id, channel_name, connecting ) {
      var
        self                = this,
        client_model        = this.getClientModel(),
        channel_id          = connecting ? 'peer_chat_' + peer_id + '_' + client_id : 'peer_chat_' + client_id + '_' + peer_id,
        ps                  = {},
        p2p                 = null,
        peers               = this.getPeerConnections();

      // Register peer when not already registered
      if (!(peer_id in peers)) {

        // Configure a new PeerSock object
        ps[peer_id] = PeerSock({
          socket: client_model.get('socket'),
          debug: false
        });

        // Set initial peer options
        ps[peer_id].client_id = peer_id;      // @todo - is this being implemented upon connection?
        ps[peer_id].username = 'anonymous';   // @todo - determine if this needs to be set here
        ps[peer_id].ignore = false;

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
                  id: client_id,
                  username: client_model.get('username'),
                  channel_name: channel_name
                }
              }));

              // Notify peer - channel connection message
              self.sendMessageToPeer('channel-connect', peer_id, channel_name, '');
            }
          }
        });

      // Update already connected peer in new channel
      } else {
        var
          ps_obj        = this.getPeerConnections()[peer_id];
        this.addUserToList(peer_id, ps_obj.username, channel_name);
        self.sendMessageToAllPeers('channel-connect', channel_name, '');
      }
    },

    /**
     * Initializes p2p connection with peer, builds data channel, establishes default data channel event listeners, and
     * starts channel keep alive pings for each channel.
     *
     * @param client_id {String}          The socket id of the client
     * @param peer_id {String}            The socket id of the peer
     * @param channel_name {String}       The name of the #channel
     */
    connectToPeer: function( client_id, peer_id, channel_name ) {
      var
        self                = this,
        client_model        = this.getClientModel(),
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
              id: client_id,
              username: client_model.get('username'),
              channel_name: channel_name
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
     * @returns {Array}
     */
    getPeerConnections: function() {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
        return model.get('client_id') == self.client_id;
      });
      return client_model.get('connections');
    },

    /**
     * Returns the client model object from the collection.
     *
     * @returns {*}
     */
    getClientModel: function() {
      var
        self        = this;
      return this.collection.find(function(model) {
        return model.get('client_id') == self.client_id;
      });
    },

    /**
     * Adds user list item element to the user list.
     *
     * @param peer_id {String}            The socket id of the peer
     * @param username {String}           The user name of the peer
     * @param channel_name {String}       The channel name
     */
    addUserToList: function( peer_id, username, channel_name ) {
      var
        channel_elm       = $('.pc-channel[data-channel-id="' + channel_name + '"]'),
        list_item         = channel_elm.find('.user-list-item[data-peer-id="' + peer_id + '"]');
      if (!list_item.length) {
        channel_elm.find('.user-list').append($(this.templates.userListItem({
          peer_id: peer_id,
          username: username
        })).addClass(peer_id == this.client_id ? 'me' : ''));
      }
    },

    /**
     * Removes user list item element from the user list (removes element from DOM), removes keep alive "ping" interval,
     * removes PeerSock object from client model.
     *
     * @param peer_id {String}        The socket id of the peer
     * @param channels {Array}        List of channels
     */
    removeFromUserList: function( peer_id, channels ) {
      var
        self          = this,
        peers         = this.getPeerConnections();

      if (peers.hasOwnProperty(peer_id)) {
        _.each(peers[peer_id].channels, function(channel) {
          channel.channel.close();
        });

        // Add message to local channel chat windows
        _.each(this.getClientModel().get('channels'), function(co, cname) {
          if (_.indexOf(channels, cname) != -1) {
            self.addMessageToWindow({
              username: peers[peer_id].username,
              message: '',
              id: peer_id,
              channel_name: cname,
              template: 'userMessageLeftChannel'
            });
          }
        });

        // Clear keep-alive inetrval
        clearInterval(peers[peer_id].keep_alive);

        // Remove peer object
        delete peers[peer_id];

        // Remove user list element
        $('.user-list [data-peer-id="'+ peer_id +'"]').remove();
      }
    },

    /**
     * Removes a peer from the user list of a specific channel.
     *
     * @param peer_id {String}            The socket id of the peer
     * @param channel_name {String}       The channel name
     */
    removeFromChannelUserList: function( peer_id, channel_name ) {
      var
        channel_elm           = $('.pc-channel[data-channel-id="' + channel_name + '"]'),
        user_list_item        = channel_elm.find('.user-list-item[data-peer-id="'+ peer_id +'"]');
      user_list_item.remove();
    },

    /**
     * Appends a message to a #channel's chat window. When 'opts.message' is passed as an object, the default template
     * properties are extended with the properties in the passed object.
     *
     * @param opts {Object}
     * @param opts.username {String}              User name of peer
     * @param opts.message {String|Object}        Message to add
     * @param opts.id {String}                    The socket id of message source
     * @param opts.channel_name {String}          The name of the #channel
     * @param opts.template {String}              The name of the template object to use
     */
    addMessageToWindow: function( opts ) {
      var
        channel_elm           = $('.pc-channel[data-channel-id="' + opts.channel_name + '"]'),
        default_props         = {
          username: opts.username,
          message: opts.message,
          peer_id: opts.id
        },
        template_props        = typeof opts.message == 'object' ? _.extend({}, default_props, opts.message): default_props;
      channel_elm
        .find('.pc-window')
        .append($(this.templates[opts.template](template_props))
          .addClass(opts.id == this.client_id ? 'me' : ''));
      UX.scrollToBottom(channel_elm.find('.pc-window'), channel_elm.find('.pc-text-input'));
    },

    /**
     * Sends a "ping" command over an open data channel effectively keeping a data channel from timing out and closing.
     *
     * @param channel_id {String}       Id of the data channel to use
     * @param peer_id {String}          Peer to send ping to
     * @param speed {Integer}           The interval at which to send a ping
     * @returns {number}
     */
    channelKeepAlive: function( channel_id, peer_id, speed ) {
      var
        self                = this,
        client_model        = this.getClientModel(),
        p2p                 = client_model.get('connections')[peer_id];
        p2p.keep_alive      = setInterval(function() {
          p2p.sendOnChannel(channel_id, JSON.stringify({
            command: 'ping',
              data: {
                id: self.client_id,
                message: null
              }
            }));
        }, speed);
      return p2p.keep_alive;
    },

    /**
     * Sends a message to a given peer.
     *
     * @param command {String}            Command string
     * @param peer_id {String}            The socket id of the peer
     * @param channel_name {String}       The channel name
     * @param message {String}            Message to send
     */
    sendMessageToPeer: function( command, peer_id, channel_name, message ) {
      var
        client_model        = this.getClientModel(),
        p2p                 = client_model.get('connections')[peer_id];

      // Iterate through all data channels
      _.each(p2p.channels, function(channel, id) {
        p2p.sendOnChannel(id, JSON.stringify({
          command: command,
          data: {
            id: client_model.get('client_id'),
            username: client_model.get('username'),
            channel_name: channel_name,
            message: message
          }
        }));
      });
    },

    /**
     * Sends a message to all connected peers.
     *
     * @param command {String}            Command string
     * @param channel_name {String}       The channel name
     * @param message {String}            The socket id of the peer
     */
    sendMessageToAllPeers: function( command, channel_name, message ) {
      var
        self                = this,
        client_model        = this.collection.find(function(model) {
          return model.get('client_id') == self.client_id;
        }),
        peers               = client_model.get('connections');
      _.each(peers, function(p2p, id) {
        self.sendMessageToPeer(command, id, channel_name, message);
      });
    },

    /**
     * Handles renaming user text input.
     *
     * @param e {Object}        The 'click' event object
     */
    userListItemNameChange: function( e ) {
      e.stopPropagation();
      var
        target        = $(e.target),
        input         = null,
        client_model  = this.getClientModel(),
        username      = '',
        active        = target.data('name-change-active');
      if (!active) {
        target.data('name-change-active', true);
        username = client_model.get('username');
        input = $('<input class="user-name-change-input" type="text">').val(username);
        target.html('').append(input);
        input.focus();
        input[0].setSelectionRange(username.length, username.length);
      }
    },

    /**
     * Handles confirmation on enter key for user list item name change.
     *
     * @param e {Object}        The 'keypress' event object
     */
    userListItemNameChangeConfirm: function( e ) {
      var
        target            = $(e.target),
        parent            = target.parent(),
        client_model      = this.getClientModel(),
        username          = target.val(),
        old_username      = client_model.get('username');
      if (e.keyCode == 13 && username.length > 0 && username.length < 128) {

        // Update username change elms
        parent.data('name-change-active', false);
        target.remove();

        // Update the user name
        this.updateUsername(old_username, username);
      }
    },

    /**
     * Handles updating actions when a user changes their name.
     *
     * @param old_username {String}       The previous name
     * @param new_username {String}       The name to change to
     */
    updateUsername: function( old_username, new_username ) {
      var
        self              = this,
        client_model      = this.getClientModel(),
        channel_list      = client_model.get('channels');

      // Update client model prop
      client_model.set('username', new_username);

      // Add message to users open channel windows
      _.each(channel_list, function(co, cname) {
        self.addMessageToWindow({
          username: old_username,
          message: new_username,
          id: self.client_id,
          channel_name: cname,
          template: 'userMessageNameChange'
        });

        // Update user list element w/ new username
        var list_elm = self.getUserChannelContainerElm(cname).find('.user-list-item.me');
        list_elm.html(new_username);

        // Notify peers in channel
        self.sendMessageToAllPeers('name-change', cname, old_username);
      });
    },

    /**
     * Handles text input to send to peers.
     *
     * @param e {Object}      The 'keypress' event object
     */
    chatWindowTextInputHandler: function( e ) {
      var
        target              = $(e.target),
        channel_elm         = target.closest('.pc-channel'),
        channel_name        = channel_elm.attr('data-channel-id'),
        message             = target.val(),
        key_code            = e.keyCode;
      switch (key_code) {

        // Return/Enter
        case 13 :
          if (!this.chatWindowTextInputCommand(message, channel_name)) {
            this.addMessageToWindow({
              username: this.getClientModel().get('username'),
              message: message,
              id: this.client_id,
              channel_name: channel_name,
              template: 'userMessageItem'
            });
            this.sendMessageToAllPeers('group-message', channel_name, message);
          }

          // Store command history
          UX.pushOnElmStack(target, 'history', message, 99);

          // Clear input
          target.val('');
          return false;
          break;

        // Up arrow - Unix style command history
        case 38 :
          UX.unixTerminalHistoryOnInputElm(target, target.data('history'), target.data('stack-pointer'), 'up');
          return false;
          break;

        // Down arrow - Unix style command history
        case 40 :
          UX.unixTerminalHistoryOnInputElm(target, target.data('history'), target.data('stack-pointer'), 'down');
          return false;
          break;

      }
    },

    /**
     * Determines whether or not a peer is being ignored.
     *
     * @param peer_id {String}        The socket id of the peer
     */
    isPeerIgnored: function( peer_id ) {
      var
        peer_objs       = this.getPeerConnections();
      if (peer_objs.hasOwnProperty(peer_id)) {
       if (peer_objs[peer_id].ignore) {
         return true;
       }
      }
      return false;
    },

    /**
     * Executes various functionality based on commands received from peers.
     *
     * @param command {String}        Command to execute
     * @param data {Object}           Data sent from peer
     */
    messageCommandParser: function( command, data ) {
      switch (true) {

        // Connection establishment
        case command == 'connect' :
          var
            peer_obj       = this.getPeerConnections()[data.id];
          peer_obj.username = data.username;
          this.addUserToList(data.id, data.username, data.channel_name);
          break;

        // Channel establishment message
        case command == 'channel-connect' :
          this.addMessageToWindow({
            username: data.username,
            message: data.channel_name,
            id: data.id,
            channel_name: data.channel_name,
            template: 'userMessageJoinedChannel'
          });
          break;

        // Channel keep-alive ping
        case command == 'ping' :
          return false;
          break;

        // Broadcast message to peers
        case command == 'group-message' && !this.isPeerIgnored(data.id) :
          this.addMessageToWindow({
            username: data.username,
            message: data.message,
            id: data.id,
            channel_name: data.channel_name,
            template: 'userMessageItem'
          });
          break;

        // Broadcast message to peers - receiving a /me command message
        case command == 'group-message-me' && !this.isPeerIgnored(data.id) :
          this.addMessageToWindow({
            username: data.username,
            message: data.message.replace('/me ', ''),
            id: data.id,
            channel_name: data.channel_name,
            template: 'userMessageAction'
          });
          break;

        // Receive a private message from a peer
        case command == 'group-message-msg' && !this.isPeerIgnored(data.id) :
          this.addMessageToWindow({
            username: data.username,
            message: data.message.replace('/msg ', ''),
            id: data.id,
            channel_name: data.channel_name,
            template: 'userMessagePrivate'
          });
          break;

        // A user has changed their name
        case command == 'name-change' :

          // Update username
          var peer_obj = this.getPeerConnections()[data.id];
          peer_obj.username = data.username;

          // Update username elements
          $('.user-list-item[data-peer-id="' + data.id + '"]').html(data.username);

          // Add message to chat window
          this.addMessageToWindow({
            username: data.message,
            message: data.username,
            id: this.client_id,
            channel_name: data.channel_name,
            template: 'userMessageNameChange'
          });
          break;

        // A user has left a channel
        case command == 'group-leave-channel' :
          this.addMessageToWindow({
            username: data.username,
            message: '',
            id: data.id,
            channel_name: data.channel_name,
            template: 'userMessageLeftChannel'
          });
          break;

        // Handle a ping request/answer
        case command == 'peer-message-ping' :
          if (data.message == 'request') {
            this.sendMessageToPeer('peer-message-ping', data.id, data.channel_name, 'answer|' + Date.now());
          } else {
            var
              c_time        = Date.now(),
              p_time        = parseInt(data.message.replace('answer|', '')),
              a_time        = (c_time - p_time) / 1000;
            this.addMessageToWindow({
              username: this.getClientModel().get('username'),
              message: a_time,
              id: this.client_id,
              channel_name: data.channel_name,
              template: 'userMessagePingAnswer'
            });
          }
          break;

        // User added to ignore list
        case command == 'peer-message-ignore' :
          if (data.message.match(/^remove\|/)) {
            this.addMessageToWindow({
              username: data.username,
              message: data.message.replace('remove|', ''),
              id: this.client_id,
              channel_name: data.channel_name,
              template: 'userMessageIgnoreRemove'
            });
          }
          else {
            this.addMessageToWindow({
              username: data.username,
              message: data.message.replace('add|', ''),
              id: this.client_id,
              channel_name: data.channel_name,
              template: 'userMessageIgnoreAdd'
            });
          }
          break;
      }
    },

    /**
     * Handles the execution of IRC style commands.
     *
     * @param message {String}            Message w/ command to parse
     * @param channel_name {String}       The channel to perform the operation in
     */
    chatWindowTextInputCommand: function( message, channel_name ) {
      var
        commands        = ['clear', 'join', 'me', 'msg', 'nick', 'notice', 'part', 'close', 'partall', 'closeall', 'ping', 'query', 'quit', 'ignore', 'whois', 'chat', 'help', 'h', 'list'],
        match           = message.match(/^\/(\w+)/),
        command         = (match) ? match[1] : false,
        success         = false;

      // Execute existing command
      if (command && _.indexOf(commands, command) != -1) {
        switch(true) {

          // /CLEAR - clear content from chat window
          case command == 'clear' :
            var
              channel_elm       = this.getUserChannelContainerElm(channel_name),
              chat_window       = channel_elm.find('.pc-window');
            chat_window.html('');
            break;

          // /JOIN - Join/switch to a channel
          case command == 'join' :
            var
              match         = message.match(/#(\w+)/),
              channel       = (match) ? match[1] : false;
            if (channel) {
              this.router.navigate(channel, {trigger: true, replace: true});
            } else {
              return false;
            }
            break;

          // /ME - Sends an "action" message
          case command == 'me' :
            this.addMessageToWindow({
              username: this.getClientModel().get('username'),
              message: message.replace('/me ', ''),
              id: this.client_id,
              channel_name: channel_name,
              template: 'userMessageAction'
            });
            this.sendMessageToAllPeers('group-message-me', channel_name, message);
            break;

          // /MSG /NOTICE /QUERY /CHAT - Send message to a peer at a specified name
          case command == 'msg' || command == 'notice' || command == 'query' || command == 'chat' :
            var
              self                    = this,
              match                   = message.split(/\s+/),
              username                = (match) ? (match.length > 1) ? match[1] : false : false,
              peer_objs               = this.getPeerConnections(),
              peer_obj_w_name         = _.filter(peer_objs, function(po) {
                if (po.username == username) {
                  //po.client_id = id;    // @todo - is this being set upon peer registration?
                  return true;
                }
              }),
              clean_message           = message.replace(/\/msg |\/notice |\/query/, '').replace(username, '');

            // Add message to window
            this.addMessageToWindow({
              username: this.getClientModel().get('username'),
              message: clean_message,
              id: this.client_id,
              channel_name: channel_name,
              template: 'userMessagePrivate'
            });

            // Send message to peers w/ the choosen user name
            _.each(peer_obj_w_name, function(po) {
              self.sendMessageToPeer('group-message-msg', po.client_id, channel_name, clean_message);
            });
            break;

          // /LIST - Shows available channels, number of people in those channels
          // @todo - should get an error message when attempts are made to show a users channels that "doesn't exist"
          case command == 'list' :
            var
              match                   = message.split(/\s+/),
              username                = (match) ? (match.length > 1) ? match[1] : false : false,
              peer_objs               = this.getPeerConnections(),
              peer_obj_w_name         = _.filter(peer_objs, function(po, id) {
                if (po.username == username) {
                  //po.client_id = id;    // @todo - is this being set upon peer registration?
                  return true;
                }
              }),
              peer_obj                = peer_obj_w_name.length ? peer_obj_w_name : [
                {client_id: this.client_id}
              ];

            // Request a user's channel list
            if (username) {
              this.socket.emit('list_user_channels', {
                id: peer_obj[0].client_id,
                username: username,
                channel_name: channel_name
              });
            }

            // Request all channels list
            else if (!username) {
              this.socket.emit('list_channels', {
                channel_name: channel_name
              });
            }
            break;

          // /NICK - Changes a users name
          case command == 'nick' :
            var
              match               = message.split(/\s+/),
              username            = (match) ? (match.length > 1) ? match[1] : false : false,
              client_model        = this.getClientModel(),
              old_username        = client_model.get('username');
            if (username) {
              this.updateUsername(old_username, username);
            } else {
              return false;
            }
            break;

          // /PART - Leave a channel (UI button should send the same message to peers)
          case command == 'part' || command == 'close' :
            var
              channel_label_elm       = this.getUserChannelLabelContainerElm(channel_name),
              channel_button          = channel_label_elm.find('.button');
            channel_button.trigger('click');
            break;

          // /PARTALL - Leaves all open channels
          case command == 'partall' || command == 'closeall' :
            $('.pc-channel-label').each(function(id, elm) {
              $(elm).find('.button').trigger('click');
            });
            break;

          // /PING - Send a ping request to peer
          case command == 'ping' :
            var
              self                    = this,
              match                   = message.split(/\s+/),
              username                = (match) ? (match.length > 1) ? match[1] : false : false,
              peer_objs               = this.getPeerConnections(),
              peer_obj_w_name         = _.filter(peer_objs, function(po, id) {
                if (po.username == username) {
                  //po.client_id = id;    // @todo - is this being set upon peer registration?
                  return true;
                }
              });

            // Add message to window
            this.addMessageToWindow({
              username: this.getClientModel().get('username'),
              message: username,
              id: this.client_id,
              channel_name: channel_name,
              template: 'userMessagePingRequest'
            });

            //// Send message to peers w/ the specified user name
            _.each(peer_obj_w_name, function(po) {
              self.sendMessageToPeer('peer-message-ping', po.client_id, channel_name, 'request');
            });
            break;

          // /IGNORE - Ignore/un-ignore a peer
          case command == 'ignore' :
            var
              match                   = message.split(/\s+/),
              username                = (match) ? (match.length > 1) ? match[1] : false : false,
              peer_objs               = this.getPeerConnections(),
              peer_obj_w_name         = _.filter(peer_objs, function(po, id) {
                if (po.username == username) {
                  //po.client_id = id;    // @todo - is this being set upon peer registration?
                  return true;
                }
              });

            // Proceed if a peer w/ username exists
            if (peer_obj_w_name.length) {
              var
                peer_obj        = peer_obj_w_name[0];

              // Peer ignored
              if (peer_obj.ignore) {
                peer_obj.ignore = false;
                this.addMessageToWindow({
                  username: this.getClientModel().get('username'),
                  message: username,
                  id: this.client_id,
                  channel_name: channel_name,
                  template: 'userMessageIgnoreRemove'
                });
                this.sendMessageToAllPeers('peer-message-ignore', channel_name, 'remove|' + username);
              }

              // Peer not ignored
              else {
                peer_obj.ignore = true;
                this.addMessageToWindow({
                  username: this.getClientModel().get('username'),
                  message: username,
                  id: this.client_id,
                  channel_name: channel_name,
                  template: 'userMessageIgnoreAdd'
                });
                this.sendMessageToAllPeers('peer-message-ignore', channel_name, 'add|' + username);
              }
            }

            // Peer by that username doesn't exist
            else {
              return false;
            }
            break;

          // /WHOIS - @todo - implement this
          case command == 'whois' :
            console.log('polling whois information...');
            break;

          // /HELP - Loads a help message
          case command == 'help' || command == 'h' || command == '?' :
            this.addMessageToWindow({
              username: this.getClientModel().get('username'),
              message: '',
              id: this.client_id,
              channel_name: channel_name,
              template: 'userMessageHelp'
            });
            break;
        }
        return true;
      }

      // No command to execute
      else {
        return false;
      }
    }

  });

  return UsersView;
});
