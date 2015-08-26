/**
 * Backbone module view template
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'text!../templates/global.tpl.html',
  '../collections/GlobalCollection',
  'jquery.eqheight'
], function(
  $,
  _,
  Backbone,
  GlobalTemplate,
  GlobalCollection,
  $eqHeight
) {
  var GlobalView = Backbone.View.extend({
    el: $('body'),

    module_template: _.template(GlobalTemplate),

    events: {
      'keyup .pc-text-input': 'textInputHandler'
    },

    /**
     *
     */
    initialize: function() {
      var
        _this             = this;

      // Bind methods
      _.bindAll(this,
        'textInputHandler'
      );

      // Initialize equal heights plugin
      $('.pc-col-2').eqheight('.pc-col-1');

      // Initialize model collection
      this.collection = new GlobalCollection();
    },

    /**
     * Process chat text input.
     * @param e
     */
    textInputHandler: function(e) {
      console.log('happening');
    }

  });

  return GlobalView;
});
