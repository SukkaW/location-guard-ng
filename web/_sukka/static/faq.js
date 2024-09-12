/* global $ */
$.mobile.ajaxEnabled = false;
$.mobile.linkBindingEnabled = false;

function openHash() {
  $('#faq-' + location.hash.slice(1)).collapsible('expand');
}

$(document).ready(() => {
  $('#left-panel').panel().enhanceWithin(); // initialize panel

  // open panel on swipe
  $(document).on('swiperight', () => {
    if ($('#left-panel').css('visibility') !== 'visible') {
      // check if already open (manually or due to large screen)
      $('#left-panel').panel('open');
    }
  });

  // animate collapsibles in the faq
  $('#faq [data-role=\'collapsible\']').collapsible({
    collapse() {
      $(this).children().next().slideUp(150);
    },
    expand() {
      location.hash = '#' + $(this).attr('id').slice(4);

      $(this).children().next().hide();
      $(this).children().next().slideDown(150);
    }
  });

  $('#lgIcon').addClass('lg-icon-pageaction');

  $(window).on('hashchange', openHash);

  if (location.hash) openHash();
  else location.hash = '#general';
});
