(() => {
  const root = document.documentElement;
  const button = document.querySelector('#motion');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.querySelector('.reading-progress');
  let paused = preference.matches;
  let scheduled = false;

  function updateMotion() {
    root.classList.toggle('motion-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? '开启动画' : '暂停动画';
  }
  button.addEventListener('click', () => { paused = !paused; updateMotion(); });
  preference.addEventListener('change', event => { paused = event.matches; updateMotion(); });
  updateMotion();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    root.classList.add('motion-enabled');
  }

  function updateProgress() {
    const distance = root.scrollHeight - root.clientHeight;
    const ratio = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
    progress.style.transform = `scaleX(${ratio})`;
    scheduled = false;
  }
  function scheduleProgress() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
  }
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress);
  updateProgress();
})();
