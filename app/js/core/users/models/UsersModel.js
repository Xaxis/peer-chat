/**
 * Backbone module model template
 */
define([
  'backbone'
], function(Backbone) {
  var UsersModel = Backbone.Model.extend({
    defaults: function() {
      return {
        socket: null,
        client_id: 0,
        username_set: false,
        username: 'anonymous',
        connections: {},
        connection_time: '',
        channels: {}
      };
    }
  });

  return UsersModel;
});
