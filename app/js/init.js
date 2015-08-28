/**
 * App initialization module
 */
define([
  'devgrid',
  'modernizr-tests',
  'ux',
  'router'
], function(
  Devgrid,
  ModernizrTests,
  UX,
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
        UX.initialize();

        // Router initializations
        Router.initialize({pushState: true});
      }
    };
  };

  return Init;
});
