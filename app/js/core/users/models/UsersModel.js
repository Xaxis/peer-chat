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
        connections: {}
      };
    }
  });

  return UsersModel;
});
