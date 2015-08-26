/**
 * Backbone module collection template
 */
define([
  'backbone',
  '../models/UsersModel'
], function(Backbone, UsersModel) {
  var UsersCollection = Backbone.Collection.extend({
    model: UsersModel
  });

  return UsersCollection;
});
