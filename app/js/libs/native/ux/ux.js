/**
 * UX Module
 * Initializes UX related code and run time.
 */
define([
  'underscore',
  'jquery',
  'jquery.eqheight'
], function(
  _,
  $,
  $eqheight
) {
  var UX = function() {
    return {
      initialize: function() {
      },

      /**
       * Makes col1 the same height as col2.
       *
       * @param col1 {String|Object}        Selector/jObject
       * @param col2 {String|Object}        Selector/jObject
       */
      equalizeColumnsHeights: function( col1, col2 ) {
        $(col1).eqheight(col2);
      },

      /**
       * Scrolls the y-axis of a scrollable element to the bottom.
       *
       * @param elm {String|Object}         Selector/jObject
       */
      scrollToBottom: function( elm ) {
        $(elm).animate({ scrollTop: $(elm)[0].scrollHeight}, 1000);
      }
    };
  };

  return new UX;
});
