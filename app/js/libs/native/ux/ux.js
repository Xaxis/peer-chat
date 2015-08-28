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

        // Equalize chat interface column heights
        $('.pc-col-2').eqheight('.pc-col-1');
      }
    };
  };

  return new UX;
});
