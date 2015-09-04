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
       * @param col1 {String|Object}
       * @param col2 {String|Object}
       */
      equalizeColumnsHeights: function( col1, col2 ) {
        $(col1).eqheight(col2);
      }
    };
  };

  return new UX;
});
