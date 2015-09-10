/**
 * Require.js initialization
 */
(function(window, require) {

  /**
   * Configure require.js
   */
  require.config({
    baseUrl: 'js',
    paths: {

      // Vendor dependencies
      jquery:               'libs/vendor/jquery/dist/jquery.min',
      'jquery.devgrid':     'libs/vendor/jquery.devgrid/dist/jquery.devgrid.min',
      'jquery.eqheight':    'libs/vendor/jquery.eqheight/src/jquery.eqheight',
      text:                 'libs/vendor/requirejs-text/text',
      underscore:           'libs/vendor/underscore/underscore',
      backbone:             'libs/vendor/backbone/backbone',
      socketio:             '//localhost:9222/socket.io/socket.io',
      //socketio:             'http://vcdn.io:9222/socket.io/socket.io.js',
      peersock:             'libs/vendor/peer-sock/src/peer-sock',

      // Native modules
      devgrid:              'libs/native/devgrid/devgrid',
      'modernizr-tests':    'libs/native/modernizr-tests/modernizr-tests',
      ux:                   'libs/native/ux/ux',
      status:               'libs/native/status/status'
    },
    shim: {
      'jquery.devgrid': ['jquery'],
      'jquery.eqheight': ['jquery'],
      peersock: {
        exports: "PeerSock"
      }
    }
  });

  /**
   * Bootstrap app JavaScript
   */
  require(['init'], function(Init) {
    var app = new Init();
    app.initialize();
  });

})(window, require);
