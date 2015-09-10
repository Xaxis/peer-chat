/**
 * App initialization module
 */
define([
  'devgrid',
  'modernizr-tests',
  'router'
], function(
  Devgrid,
  ModernizrTests,
  Router
) {
  var Init = function() {
    return {

      /**
       * Initialize modules
       */
      initialize: function() {
        Devgrid.initialize();
        ModernizrTests.initialize();
        Router.initialize();
      }
    };
  };

  return Init;
});
