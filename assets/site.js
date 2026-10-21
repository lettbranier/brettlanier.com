// brettlanier.com: shared behaviour for every page

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
