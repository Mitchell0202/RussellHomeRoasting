/* rhr-header.js — sizes the moka pot to match the title's height.
   Needs the .brand-lockup / .brand-mark rules already in rhr.css. */
(function () {
  var lockup = document.querySelector('.brand-lockup');
  var title = lockup && lockup.querySelector('.brand');
  if (!title) return;
  var sub = title.querySelector('span');

  function fit() {
    var h = title.getBoundingClientRect().height;
    // The empty <span> under the title adds a small top margin; don't count it
    if (sub && !sub.textContent.trim()) {
      h -= sub.getBoundingClientRect().height + (parseFloat(getComputedStyle(sub).marginTop) || 0);
    }
    var size = Math.round(h);
    if (size > 0) lockup.style.setProperty('--mark-size', size + 'px');
  }

  // Re-fit a few times so a wrap change caused by the pot's own width settles
  function settle() {
    var n = 0;
    (function step() { fit(); if (++n < 3) requestAnimationFrame(step); })();
  }

  settle();
  window.addEventListener('load', settle);
  window.addEventListener('resize', settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
})();
