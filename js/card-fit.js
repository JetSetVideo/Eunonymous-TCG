/**
 * js/card-fit.js — runtime text fitting for v2 cards (ui.renderCard).
 *
 * Cards are rendered as HTML strings in many places (collection, market, hand,
 * field, modals), so instead of hooking every caller this watches the DOM and,
 * for each newly visible .card.cv2, measures the real layout and steps the card
 * down a ladder of classes until nothing overflows:
 *
 *   name : cv2-name-l -> cv2-name-xl -> cv2-name-2l (two lines)
 *   text : fit-1 (flavor 1 line) -> fit-2 (no flavor) -> fit-3 (smaller effect)
 *          -> fit-4 (smaller) -> fit-5 (tightest leading)
 *          -> fit-6 / fit-7 (shorter art window, more text room)
 *
 * The full rules text always remains in the hover tooltip / detail modal.
 * ES5 on purpose (matches the codebase).
 */
(function () {
  var TEXT_STEPS = ['', 'fit-1', 'fit-2', 'fit-3', 'fit-4', 'fit-5', 'fit-6', 'fit-7'];
  var NAME_STEPS = ['', 'cv2-name-l', 'cv2-name-xl', 'cv2-name-2l'];

  function visible(el) {
    return el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
  }

  function nameOverflows(card) {
    var n = card.querySelector('.cv2-name');
    if (!visible(n)) return false;
    return n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1;
  }

  function textOverflows(card) {
    var box = card.querySelector('.cv2-text');
    if (!visible(box)) return false;
    var kids = box.children, i, k;
    for (i = 0; i < kids.length; i++) {
      k = kids[i];
      if (visible(k) && k.scrollHeight > k.clientHeight + 1) return true;
    }
    // last visible line must clear the stat badges
    var stats = card.querySelector('.cv2-stats');
    var bottomLimit = stats ? stats.getBoundingClientRect().top : box.getBoundingClientRect().bottom;
    for (i = kids.length - 1; i >= 0; i--) {
      if (visible(kids[i])) return kids[i].getBoundingClientRect().bottom > bottomLimit + 0.5;
    }
    return false;
  }

  function setStep(card, steps, idx) {
    for (var i = 1; i < steps.length; i++) card.classList.remove(steps[i]);
    if (steps[idx]) card.classList.add(steps[idx]);
  }

  function fitCard(card) {
    if (!visible(card) || card.getBoundingClientRect().width < 1) return false;
    var i;
    for (i = 0; i < NAME_STEPS.length; i++) {
      setStep(card, NAME_STEPS, i);
      if (!nameOverflows(card)) break;
    }
    for (i = 0; i < TEXT_STEPS.length; i++) {
      setStep(card, TEXT_STEPS, i);
      if (!textOverflows(card)) break;
    }
    card.setAttribute('data-fit', String(card.getBoundingClientRect().width | 0));
    return true;
  }

  function fitAll(root) {
    var list = (root || document).querySelectorAll('.card.cv2');
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var w = String(c.getBoundingClientRect().width | 0);
      if (c.getAttribute('data-fit') !== w) fitCard(c);
    }
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    (window.requestAnimationFrame || setTimeout)(function () {
      pending = false;
      fitAll(document);
    });
  }

  function start() {
    schedule();
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes.length || muts[i].attributeName === 'class') { schedule(); return; }
        }
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  }

  window.CardFit = { fitAll: fitAll, fitCard: fitCard };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
