// brettlanier.com: shared behaviour for every page

// GitHub Pages lets browsers reuse a page and its CSS/JS for 10 minutes without asking, and a
// normal reload only re-checks the page, not its CSS. So when any of them came from that stored
// copy, compare it with the server's current one (which also refreshes the stored copy) and, if
// something changed, reload once. Nothing extra is fetched when everything came fresh.
(async () => {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    const timing = (path) => performance.getEntriesByName(new URL(path, location.href).href)[0];
    const stored = [
      [location.href.split('#')[0], nav],
      ['/assets/site.css', timing('/assets/site.css')],
      ['/assets/site.js', timing('/assets/site.js')],
    ].filter(([, entry]) => !entry || entry.transferSize === 0);   // no timing info: check anyway
    if (!stored.length) return;

    let changed = false;
    for (const [url] of stored) {
      const held = await fetch(url, { cache: 'force-cache' }).then((r) => r.text());
      const fresh = await fetch(url, { cache: 'reload' }).then((r) => r.text());
      if (held !== fresh) changed = true;
    }
    if (!changed) return;

    // At most one automatic reload a minute, so a slow deploy can't cause a reload loop.
    const last = Number(sessionStorage.getItem('bl-refreshed') || 0);
    if (Date.now() - last < 60000) return;
    sessionStorage.setItem('bl-refreshed', String(Date.now()));
    location.reload();
  } catch { /* offline, private mode or an old browser: keep showing what we have */ }
})();

// Old one-page links (brettlanier.com/#credits and so on) go to the page that replaced them.
const movedTo = { '#credits': '/sessions/', '#sessions': '/sessions/', '#repair': '/repair/' };
if (location.pathname === '/' && movedTo[location.hash]) location.replace(movedTo[location.hash]);

// Photo strip arrows: page sideways, dim at either end, hide when everything fits.
const strip = document.querySelector('.strip');
const stripNav = document.querySelector('.strip-nav');
if (strip && stripNav) {
  const [prev, next] = stripNav.querySelectorAll('button');
  const updateArrows = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    stripNav.hidden = max < 4;
    prev.disabled = strip.scrollLeft < 4;
    next.disabled = strip.scrollLeft > max - 4;
  };
  stripNav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    strip.scrollBy({ left: Number(b.dataset.dir) * strip.clientWidth * 0.8, behavior: 'smooth' });
  }));
  strip.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  strip.querySelectorAll('img').forEach((img) => img.addEventListener('load', updateArrows));
  updateArrows();
}

// Click any photo to see it large. Inside a strip or photo row, the arrows (or a swipe, or the arrow keys) step
// through that strip; Esc, the × or a click outside the photo closes it. The photo already on the
// page shows at once, then the largest file in its srcset replaces it when it arrives.
const photos = [...document.querySelectorAll('main img')];
if (photos.length) {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo');
  box.innerHTML = '<img alt="">'
    + '<button class="lb-close" type="button" aria-label="Close">×</button>'
    + '<button class="lb-prev" type="button" aria-label="Previous photo">←</button>'
    + '<button class="lb-next" type="button" aria-label="Next photo">→</button>';
  document.body.append(box);
  const big = box.querySelector('img');
  const [closeBtn, prevBtn, nextBtn] = box.querySelectorAll('button');
  let group = [], at = 0, opener = null;

  const largest = (img) => {
    const set = img.getAttribute('srcset');
    if (!set) return img.currentSrc || img.src;
    return set.split(',').map((s) => s.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1], 10) - parseInt(a[1], 10))[0][0];
  };
  const show = (i) => {
    at = (i + group.length) % group.length;
    const img = group[at];
    big.alt = img.alt;
    big.src = img.currentSrc || img.src;
    const full = largest(img);
    if (full && !big.src.endsWith(full)) {
      const pre = new Image();
      pre.onload = () => { if (group[at] === img) big.src = full; };
      pre.src = full;
    }
  };
  const open = (img) => {
    const strip = img.closest('.strip, .photo-row');
    group = strip ? [...strip.querySelectorAll('img')] : [img];
    opener = img;
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
    show(group.indexOf(img));
    box.hidden = false;
    document.documentElement.classList.add('lb-open');
    closeBtn.focus();
  };
  const close = () => {
    box.hidden = true;
    big.removeAttribute('src');
    document.documentElement.classList.remove('lb-open');
    if (opener) opener.focus({ preventScroll: true });
  };

  photos.forEach((img) => {
    img.tabIndex = 0;                                   // reachable and openable from the keyboard
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });
  prevBtn.addEventListener('click', () => show(at - 1));
  nextBtn.addEventListener('click', () => show(at + 1));
  closeBtn.addEventListener('click', close);
  box.addEventListener('click', (e) => { if (!e.target.closest('button')) close(); });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && group.length > 1) show(at - 1);
    else if (e.key === 'ArrowRight' && group.length > 1) show(at + 1);
    else if (e.key === 'Tab') {                         // keep focus on the viewer's buttons
      const btns = [closeBtn, prevBtn, nextBtn].filter((b) => !b.hidden);
      const i = btns.indexOf(document.activeElement);
      e.preventDefault();
      btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
    }
  });
  let startX = null;                                    // swipe left/right on a phone
  box.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (startX === null || group.length < 2) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });
}

// Click-to-load YouTube: show the thumbnail, load the player only on click.
document.querySelectorAll('a.yt[data-id]').forEach((el) => {
  const id = el.dataset.id;
  el.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    f.allow = 'autoplay; encrypted-media; picture-in-picture';
    f.allowFullscreen = true;
    f.title = el.textContent.trim() || 'Video';
    el.replaceChildren(f);
  });
});
