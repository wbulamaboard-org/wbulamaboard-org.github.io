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
    const closeMenu = () => {
      nav.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'নেভিগেশন মেনু খুলুন');
    };
    const toggleMenu = () => {
      const isOpen = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
      button.setAttribute('aria-label', isOpen ? 'নেভিগেশন মেনু বন্ধ করুন' : 'নেভিগেশন মেনু খুলুন');
    };
    button.addEventListener('click', toggleMenu);
    nav.querySelectorAll('a').forEach(link => {
      if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        closeMenu();
        button.focus();
      }
    });
    document.addEventListener('click', event => {
      if (nav.classList.contains('open') && !nav.contains(event.target) && !button.contains(event.target)) closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100) closeMenu();
    });
  }
})();
