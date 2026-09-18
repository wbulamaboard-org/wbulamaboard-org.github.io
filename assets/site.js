(() => {
  const nav = document.querySelector('header .nav nav');
  let button = document.querySelector('header .menu-btn');
  if (nav && !button) {
    button = document.createElement('button');
    button.className = 'menu-btn';
    button.innerHTML = '☰ <span>মেনু</span>';
    button.setAttribute('aria-label', 'নেভিগেশন মেনু খুলুন');
    nav.parentElement.append(button);
  }
  if (nav && button) {
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'primary-navigation');
    nav.id = 'primary-navigation';
    button.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(link => {
      if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
      link.addEventListener('click', () => { nav.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); });
    });
  }
})();
