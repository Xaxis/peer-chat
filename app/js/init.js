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

        // Module initializations
        Devgrid.initialize();
        ModernizrTests.initialize();

        // Router initializations
        Router.initialize();
      }
    };
  };

  return Init;
});
