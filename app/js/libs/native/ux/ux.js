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
       * Scrolls the y-axis of a scrollable element to the bottom of the scrollable height. Will not scroll if the
       * element is in state focused. Attaches a scroll event listener which removes focus when the scroll bar reaches
       * the bottom and gives focus otherwise.
       *
       * @param elm {Object}               Element to scroll
       * @param focus_elm {Object}         Element to focus when reaching bottom
       */
      scrollToBottom: function( elm, focus_elm ) {
        var
          scroll      = elm.data('scroll-attached'),
          focus       = elm.is(':focus');
        if (elm.length && !focus) {
          elm.animate({ scrollTop: elm[0].scrollHeight}, 1000);
        }
        if (!scroll) {
          elm.data('scroll-attached', true);
          elm.on('scroll', function() {
            var
              scroll_dist       = elm.outerHeight() + elm.scrollTop();
            if (scroll_dist == elm[0].scrollHeight) {
              elm.blur();
              focus_elm.focus();
            } else {
              elm.focus();
            }
          });
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
      },

      /**
       * Creates a data "stack" on an element. If the stack grows longer than a limit value the first in element that is
       * over the limit is removed. Works well in conjunction with 'unixTerminalHistoryOnInputElm'.
       *
       * @param elm {String|Object}       Selector/jObject
       * @param name {String}             The stack reference name
       * @param value {*}                 The value to add to the stack
       * @param limit {Number}            The maximum number of elements to allow in the stack
       */
      pushOnElmStack: function( elm, name, value, limit ) {
        var
          target        = $(elm),
          stack         = target.data(name);
        target.data('stack-pointer', -1);
        if (!target.data(name)) {
          target.data(name, []);
          stack = target.data(name);
        }
        stack.unshift(value);
        if (stack.length > limit) {
          stack.pop();
        }
      },

      /**
       * Toggles through an array in a given direction, displaying the value at that position in the target input
       * element like what happens when cycling through a unix command history in the terminal when pressing the up or
       * down keys.
       *
       * @param target {Object}               Target element
       * @param history_stack {Array}         The terminal history stack
       * @param stack_pointer {Number}        The location of the history to display
       * @param direction {String}            The up/down direction (of the key pressed)
       */
      unixTerminalHistoryOnInputElm: function( target, history_stack, stack_pointer, direction ) {
        if (history_stack) {
          if (history_stack.length) {
            if (direction == 'up') {
              target.data('stack-pointer', stack_pointer + 1);
              if (target.data('stack-pointer') > (history_stack.length - 1)) {
                target.data('stack-pointer', 0);
              }
            } else if (direction == 'down') {
              target.data('stack-pointer', stack_pointer - 1);
              if (target.data('stack-pointer') < 0) {
                target.data('stack-pointer', history_stack.length - 1);
              }
            }
            var history_val = history_stack[target.data('stack-pointer')];
            target.val(history_val);
            setTimeout(function() {
              target.focus();
              target[0].setSelectionRange(history_val.length, history_val.length);
            }, 50);
          }
        }
      }
    };
  };

  return new UX;
});
