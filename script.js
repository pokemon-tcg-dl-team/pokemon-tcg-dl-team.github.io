(() => {
  const cfg = Object.assign({ autoplay: true, tilt: true }, window.POKEAGENT_CONFIG || {});
  const $ = id => document.getElementById(id);

  const el = {
    device: $('device'), liveDot: $('liveDot'), led: $('led'), screen: $('screen'),
    titleScreen: $('titleScreen'), battleScreen: $('battleScreen'),
    logo: $('logo'), sub: $('sub'), press: $('pressStart'),
    enemyCard: $('enemyCard'), playerCard: $('playerCard'),
    enemyHp: $('enemyHp'), playerHp: $('playerHp'),
    enemyHpBar: $('enemyHpBar'), playerHpBar: $('playerHpBar'),
    enemyEnergy: $('enemyEnergy'), playerEnergy: $('playerEnergy'),
    prizesA: $('prizesA'), prizesB: $('prizesB'),
    typed: $('typed'), caret: $('caret'), startBtn: $('startBtn')
  };

  let s = {
    phase: 'off', logoIn: false, subIn: false, blink: true, enemyIn: false, playerIn: false,
    fainted: false, flash: null, hpA: 120, hpB: 90, enA: 1, enB: 2, prA: 2, prB: 4,
    msg: '', n: 0, startDown: false
  };
  let timers = [];
  let typer = null;

  const set = patch => { s = Object.assign({}, s, typeof patch === 'function' ? patch(s) : patch); render(); };
  const at = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; clearInterval(typer); };
  const pips = n => '<span></span>'.repeat(Math.max(0, n));

  function setHpBar(bar, pct) {
    bar.style.width = pct + '%';
    bar.classList.toggle('low', pct < 30);
  }

  function render() {
    const on = s.phase !== 'off';
    el.device.classList.toggle('tilt', !!cfg.tilt);
    el.liveDot.classList.toggle('on', s.blink);
    el.led.classList.toggle('on', on);
    el.screen.classList.toggle('on', on);

    el.titleScreen.hidden = !(s.phase === 'boot' || s.phase === 'title');
    el.battleScreen.hidden = s.phase !== 'battle';

    el.logo.classList.toggle('in', s.logoIn);
    el.sub.classList.toggle('in', s.subIn);
    el.press.classList.toggle('on', s.phase === 'title' && s.blink);

    el.enemyCard.style.transform = `translateY(${s.enemyIn ? 0 : -120}px) translateY(${s.fainted ? 30 : 0}px)`;
    el.enemyCard.style.opacity = s.fainted ? 0 : 1;
    el.enemyCard.classList.toggle('flash', s.flash === 'enemy');
    el.playerCard.style.transform = `translateY(${s.playerIn ? 0 : 180}px)`;
    el.playerCard.classList.toggle('flash', s.flash === 'player');

    el.enemyHp.textContent = s.hpB;
    el.playerHp.textContent = s.hpA;
    setHpBar(el.enemyHpBar, s.hpB / 90 * 100);
    setHpBar(el.playerHpBar, s.hpA / 120 * 100);

    el.enemyEnergy.innerHTML = pips(s.enB);
    el.playerEnergy.innerHTML = pips(s.enA);
    el.prizesA.innerHTML = pips(s.prA);
    el.prizesB.innerHTML = pips(s.prB);

    el.typed.textContent = s.msg.slice(0, s.n);
    el.caret.classList.toggle('on', !!s.msg && s.n >= s.msg.length && s.blink);
    el.startBtn.classList.toggle('down', s.startDown);
  }

  function boot() {
    clear();
    set({ phase: 'off', logoIn: false, subIn: false });
    at(() => set({ phase: 'boot' }), 700);
    at(() => set({ logoIn: true }), 900);
    at(() => set({ subIn: true }), 2900);
    at(toTitle, 3400);
  }

  function toTitle() {
    clear();
    set({ phase: 'title', logoIn: true, subIn: true });
    if (cfg.autoplay) at(start, 4500);
  }

  function type(msg, then) {
    clearInterval(typer);
    set({ msg, n: 0 });
    typer = setInterval(() => {
      if (s.n >= msg.length) { clearInterval(typer); at(then, 950); return; }
      set({ n: s.n + 1 });
    }, 34);
  }

  function hit(who, hp) {
    const key = who === 'enemy' ? 'hpB' : 'hpA';
    [0, 1, 2, 3].forEach(i => at(() => set({ flash: i % 2 ? null : who }), i * 110));
    at(() => set({ [key]: hp }), 300);
  }

  function start() {
    if (s.phase === 'battle' || s.phase === 'off' || s.phase === 'boot') return;
    clear();
    set({ startDown: true, phase: 'battle', enemyIn: false, playerIn: false, fainted: false,
          hpA: 120, hpB: 90, enA: 1, enB: 2, prA: 2, prB: 4, msg: '', n: 0 });
    at(() => set({ startDown: false }), 160);
    const script = [
      ['GREEDYBOT played its ACTIVE card.', () => {}, () => set({ enemyIn: true })],
      ['POKEAGENT drew a card.', () => {}, () => set({ playerIn: true })],
      ['Attached 1 ENERGY.', () => set({ enA: 2 })],
      ['POKEAGENT attacked! 60 damage.', () => hit('enemy', 30)],
      ['GREEDYBOT attacked! 30 damage.', () => hit('player', 90)],
      ['POKEAGENT attacked again!', () => hit('enemy', 0)],
      ['Knocked out! Took a PRIZE card.', () => set({ prA: 1 }), () => set({ fainted: true })],
      ['Last prize. POKEAGENT wins!', () => {}]
    ];
    const run = i => {
      if (i >= script.length) { at(toTitle, 2200); return; }
      const [msg, after, before] = script[i];
      if (before) before();
      at(() => type(msg, () => { after(); at(() => run(i + 1), 500); }), before ? 500 : 0);
    };
    at(() => run(0), 400);
  }

  // Wire up controls
  el.screen.addEventListener('click', start);
  document.querySelectorAll('.js-start').forEach(b => b.addEventListener('click', start));
  window.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target === document.body) { e.preventDefault(); start(); }
    }
  });
  setInterval(() => set(prev => ({ blink: !prev.blink })), 480);

  render();
  boot();
})();
