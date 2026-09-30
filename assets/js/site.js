(function () {
  var path = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav a').forEach(function (a) {
    if (a.getAttribute('href') === path) a.setAttribute('aria-current', 'page');
  });

  var subnav = document.querySelector('.subnav .container');
  if (subnav) {
    var sections = Array.prototype.filter.call(
      document.querySelectorAll('main section[id]'),
      function (s) { return s.querySelector('h2'); }
    );
    var links = sections.map(function (s) {
      var a = document.createElement('a');
      a.href = '#' + s.id;
      a.textContent = s.querySelector('h2').textContent.trim();
      subnav.appendChild(a);
      return a;
    });
    if (!links.length) subnav.parentNode.remove();

    if ('IntersectionObserver' in window && links.length) {
      var visible = new Map();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible.set(e.target, e.isIntersecting); });
        var current = sections.find(function (s) { return visible.get(s); });
        links.forEach(function (a, i) { a.classList.toggle('active', sections[i] === current); });
      }, { rootMargin: '-130px 0px -55% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
  }

  document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var addr = a.getAttribute('href').slice(7);
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(addr).then(function () {
        var label = a.textContent;
        a.textContent = 'Copied: ' + addr;
        setTimeout(function () { a.textContent = label; }, 2000);
      }).catch(function () {});
    });
  });
})();
