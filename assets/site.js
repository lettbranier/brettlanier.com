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
const movedTo = { '#credits': '/credits/', '#sessions': '/sessions/', '#repair': '/repair/', '#contact': '/contact/' };
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
