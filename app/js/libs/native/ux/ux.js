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
        var
          elm       = $(elm);
        if (elm.length) {
          elm.animate({ scrollTop: elm[0].scrollHeight}, 1000);
        }
      },

      /**
       * Returns a human friendly string indicating how much time has passed since a unix timestamp.
       *
       * @param timestamp {Number}        Time in seconds since Unix epoch.
       */
      getTimePassed: function( timestamp ) {
        var
          diff            = Math.abs(Date.now() - timestamp) / 1000,
          secs            = Math.round(diff),
          mins            = Math.round(secs / 60),
          hours           = Math.round(mins / 60),
          days            = Math.round(hours / 24),
          years           = Math.round(days / 365),
          dt_string       = '';
        if (secs < 60) dt_string = secs + ' seconds';
        else if (mins == 1) dt_string = '1 minute';
        else if (mins > 1) dt_string = mins + ' minutes';
        else if (hours == 1) dt_string = '1 hour';
        else if (hours > 1) dt_string = hours + ' hours';
        else if (days == 1) dt_string = '1 day';
        else if (days > 1) dt_string = days + ' days';
        else if (years == 1) dt_string = '1 year';
        else if (years > 1) dt_string = years + ' years';
        return dt_string;
      }
    };
  };

  return new UX;
});
