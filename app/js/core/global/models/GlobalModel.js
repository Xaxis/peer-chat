/**
 * Backbone module model template
 */
define([
  'backbone'
], function(Backbone) {
  var GlobalModel = Backbone.Model.extend({
    defaults: function() {
      return {
        id: 0
      };
    }
  });

  return GlobalModel;
});
