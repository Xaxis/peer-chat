/**
 * Backbone module collection template
 */
define([
  'backbone',
  '../models/GlobalModel'
], function(Backbone, GlobalModel) {
  var GlobalCollection = Backbone.Collection.extend({
    model: GlobalModel
  });

  return GlobalCollection;
});
