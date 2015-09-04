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
  'text!../templates/UserMessageItem.tpl.html'
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
  tplUserMessageItem
) {
  var UsersView = Backbone.View.extend({
    el: $('body'),

    templates: {
      userChannel: _.template(tplUserChannel),
      userChannelLabel: _.template(tplUserChannelLabel),
      userListItem: _.template(tplUserListItem),
      userMessageItem: _.template(tplUserMessageItem)
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

    router: null,

    /**
     * View initialization method.
     *
     * @param router {Object}       Reference to backbone router
     */
    initialize: function( router ) {

      // Bind methods
      _.bindAll(this,
        'addUserChannelElm',
        'addUserChannelLabel',
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
        'messageCommandParser',
        'sendMessageToPeer',
        'sendMessageToAllPeers',
        'chatWindowTextInputHandler',
        'userListItemNameChange',
        'userListItemNameChangeConfirm'
      );

      // Reference the app router
      this.router = router;

      // Initialize model collection
      this.collection = new UsersCollection();
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
        channel_to_load     = '';

      // Remove channel elements
      this.removeUserChannelElms(channel);

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
        channel_label       = $('[data-channel-label-id="' +
        channel + '"]');
      chat_window.remove();
      channel_label.remove();
    },

    /**
     * Creates client model and references client/socket id "globally".
     *
     * @param socket {Object}           Socket.io object
     * @param client_id {String}        Socket id from server
     */
    registerClient: function( socket, client_id ) {

      // Proceed if not already registered
      if (!this.client_id) {

        // Register client in collection
        this.collection.add({
          socket: socket,
          client_id: client_id
        });

        // Reference client id "globally"
        this.client_id = client_id;
      }
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
        peers               = this.getPeerConnections(client_id);

      // Proceed when peer isn't already registered
      if (!(peer_id in peers)) {

        // Configure a new PeerSock object
        ps[peer_id] = PeerSock({
          socket: client_model.get('socket'),
          debug: true
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
                  peer_id: client_id,
                  username: client_model.get('username'),
                  channel_name: channel_name
                }
              }));
            }
          }
        });
      }
    },

    /**
     * Initializes p2p connection with peer, builds data channel, establishes default data channel event listeners, and
     * starts channel keep alive pings for each channel.
     *
     * @param client_id {String}        The socket id of the client
     * @param peer_id {String}          The socket id of the peer
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
              peer_id: client_id,
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
     */
    removeFromUserList: function( peer_id ) {
      var peers = this.getPeerConnections(this.client_id);
      _.each(peers[peer_id].channels, function(channel) {
        channel.channel.close();
      });
      clearInterval(peers[peer_id].keep_alive);
      delete peers[peer_id];
      $('.user-list [data-peer-id="'+ peer_id +'"]').remove();
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
     * Appends a user message to the chat window.
     *
     * @param username {String}           User name of peer
     * @param message {String}            Message from peer
     * @param id {String}                 The socket id of message source
     * @param channel_name {String}       The channel name
     */
    addMessageToWindow: function( username, message, id, channel_name ) {
      var
        channel_elm       = $('.pc-channel[data-channel-id="' + channel_name + '"]');
      channel_elm.find('.pc-window').append($(this.templates.userMessageItem({
        username: username,
        message: message,
        peer_id: id
      })).addClass(id == this.client_id ? 'me' : ''));
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
          this.addUserToList(data.peer_id, data.username, data.channel_name);
          break;

        // Channel keep-alive ping
        case 'ping' :
          return false;
          break;

        // Broadcast message to peers
        case 'group-message' :
          this.addMessageToWindow(data.username, data.message, data.id, data.channel_name);
          break;

        // A user has changed their name
        case 'name-change' :
          $('.user-list-item[data-peer-id="' + data.id + '"]').html(data.username);
          $('.user-message-item[data-peer-id="' + data.id + '"]').find('.user-name').html(data.username);
          break;
      }
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
        client_model        = this.getClientModel(),
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

        // Send message
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
     * Handles text input to send to peers.
     *
     * @param e {Object}      The 'keypress' event object
     */
    chatWindowTextInputHandler: function( e ) {
      var
        target              = $(e.target),
        channel_name        = target.closest('.pc-channel').attr('data-channel-id'),
        message             = target.val(),
        key_code            = e.keyCode;
      switch (true) {
        case key_code == 13 :
          this.addMessageToWindow(this.getClientModel().get('username'), message, this.client_id, channel_name);
          this.sendMessageToAllPeers('group-message', channel_name, message);
          target.val('');
          return false;
          break;
      }
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
        target        = $(e.target),
        parent        = target.parent(),
        client_model  = this.getClientModel(),
        username      = target.val();
      if (e.keyCode == 13 && username.length > 0 && username.length < 128) {
        parent.data('name-change-active', false);
        parent.html(username);
        client_model.set('username', username);
        target.remove();
        // @todo - add all parameters to sendMessageToAllPeers - missing channel_name ... ?
        this.sendMessageToAllPeers('name-change', client_model.get('username'));
      }
    }

  });

  return UsersView;
});
