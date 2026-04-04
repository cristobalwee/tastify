import { mount, mountPlaybackBar, mountPlaybackToast } from '@tastify/vanilla';
import type { MountedWidget, MountOptions, PlaybackWidget } from '@tastify/vanilla';
import '@tastify/vanilla/styles';
import { startOAuthFlow, handleOAuthCallback, getSavedClientId } from './oauth';
import './styles.css';

type ToastPosition = 'top-left' | 'top-center' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
type Section = 'now-playing' | 'top-tracks' | 'top-artists' | 'recently-played' | 'playback';
type TimeRange = 'short_term' | 'medium_term' | 'long_term';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'now-playing', label: 'NowPlaying' },
  { id: 'top-tracks', label: 'TopTracks' },
  { id: 'top-artists', label: 'TopArtists' },
  { id: 'recently-played', label: 'RecentlyPlayed' },
  { id: 'playback', label: 'Playback' },
];

const app = document.getElementById('app')!;
let activeToken = '';
let activeSection: Section = 'now-playing';

// Currently mounted widget and playback widget
let currentWidget: MountedWidget | null = null;
let playbackWidget: PlaybackWidget | null = null;
let playbackUi: 'bar' | 'toast' = 'bar';
let toastPosition: ToastPosition = 'bottom-right';

/* ── Helpers ─────────────────────────────────────── */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') elem.className = v;
      else elem.setAttribute(k, v);
    }
  }
  for (const child of children) {
    elem.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return elem;
}

function toggleControl(label: string, checked: boolean, onChange: (v: boolean) => void): HTMLLabelElement {
  const lbl = el('label', { className: 'control' });
  lbl.append(el('span', { className: 'control__label' }, label));
  const input = el('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  lbl.append(input);
  return lbl;
}

function selectControl<T extends string>(
  label: string,
  value: T,
  options: { value: T; label: string }[],
  onChange: (v: T) => void,
): HTMLLabelElement {
  const lbl = el('label', { className: 'control' });
  lbl.append(el('span', { className: 'control__label' }, label));
  const select = el('select', { className: 'control__select' });
  for (const o of options) {
    const opt = el('option', { value: o.value }, o.label);
    if (o.value === value) opt.selected = true;
    select.append(opt);
  }
  select.addEventListener('change', () => onChange(select.value as T));
  lbl.append(select);
  return lbl;
}

function numberControl(
  label: string,
  value: number,
  min: number,
  max: number,
  onChange: (v: number) => void,
): HTMLLabelElement {
  const lbl = el('label', { className: 'control' });
  lbl.append(el('span', { className: 'control__label' }, label));
  const input = el('input', {
    type: 'number',
    className: 'control__number',
    value: String(value),
    min: String(min),
    max: String(max),
  });
  input.addEventListener('change', () => onChange(Number(input.value)));
  lbl.append(input);
  return lbl;
}

/* ── Login Page ──────────────────────────────────── */

function renderLogin(oauthError?: string) {
  app.innerHTML = '';

  let mode: 'oauth' | 'token' = 'oauth';

  const card = el('div', { className: 'login__card' });
  const brand = el('div', { className: 'login__brand' },
    el('div', { className: 'login__logo' }, 'tastify'),
    el('p', { className: 'login__tagline' }, 'Spotify components — vanilla JS'),
  );
  card.append(brand);

  const desc = el('p', { className: 'login__description' },
    'Connect with Spotify to explore the vanilla component showcase. Full-track streaming requires a Spotify Premium account.',
  );
  card.append(desc);

  if (oauthError) {
    card.append(el('p', { className: 'login__error' }, oauthError));
  }

  // Tabs
  const tabs = el('div', { className: 'login__tabs' });
  const oauthTab = el('button', { className: 'login__tab login__tab--active' }, 'Spotify Login');
  const tokenTab = el('button', { className: 'login__tab' }, 'Paste Token');
  tabs.append(oauthTab, tokenTab);
  card.append(tabs);

  // Forms
  const oauthForm = createOAuthForm();
  const tokenForm = createTokenForm();
  tokenForm.style.display = 'none';
  card.append(oauthForm, tokenForm);

  oauthTab.addEventListener('click', () => {
    if (mode === 'oauth') return;
    mode = 'oauth';
    oauthTab.classList.add('login__tab--active');
    tokenTab.classList.remove('login__tab--active');
    oauthForm.style.display = '';
    tokenForm.style.display = 'none';
  });

  tokenTab.addEventListener('click', () => {
    if (mode === 'token') return;
    mode = 'token';
    tokenTab.classList.add('login__tab--active');
    oauthTab.classList.remove('login__tab--active');
    tokenForm.style.display = '';
    oauthForm.style.display = 'none';
  });

  const help = el('p', { className: 'login__help' });
  help.innerHTML = `Need a Client ID? <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Create an app</a> in the Spotify Developer Dashboard.`;
  card.append(help);

  const container = el('div', { className: 'login' });
  container.append(card);
  app.append(container);
}

function createOAuthForm(): HTMLDivElement {
  const form = el('div', { className: 'login__form' });
  const label = el('label', { className: 'login__label' }, 'Spotify Client ID');
  const input = el('input', {
    className: 'login__input',
    type: 'text',
    placeholder: "Your app's Client ID from the Spotify Dashboard",
  });
  input.value = getSavedClientId();

  const btn = el('button', { className: 'login__submit' }, 'Login with Spotify');
  btn.disabled = !input.value.trim();

  input.addEventListener('input', () => {
    btn.disabled = !input.value.trim();
  });

  const doOAuth = async () => {
    const trimmed = input.value.trim();
    if (!trimmed) return;
    btn.disabled = true;
    btn.textContent = 'Redirecting...';
    try {
      await startOAuthFlow(trimmed);
    } catch {
      btn.disabled = false;
      btn.textContent = 'Login with Spotify';
    }
  };

  btn.addEventListener('click', doOAuth);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doOAuth(); });

  const info = el('p', { className: 'login__scope-info' });
  info.innerHTML = `Requests scopes: <code>user-read-currently-playing</code> <code>user-top-read</code> <code>streaming</code> and more. Add <code>${window.location.origin}</code> as a Redirect URI in your <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify app settings</a>.`;

  form.append(label, input, btn, info);
  return form;
}

function createTokenForm(): HTMLDivElement {
  const form = el('div', { className: 'login__form' });
  const label = el('label', { className: 'login__label' }, 'Access Token');
  const input = el('input', {
    className: 'login__input',
    type: 'password',
    placeholder: 'Paste your Spotify access token...',
  });
  const btn = el('button', { className: 'login__submit' }, 'Connect');
  btn.disabled = true;

  input.addEventListener('input', () => {
    btn.disabled = !input.value.trim();
  });

  const doConnect = () => {
    const trimmed = input.value.trim();
    if (trimmed) connect(trimmed);
  };

  btn.addEventListener('click', doConnect);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConnect(); });

  const info = el('p', { className: 'login__scope-info' });
  info.innerHTML = `For full-track playback, your token must include the <code>streaming</code> and <code>user-modify-playback-state</code> scopes. Use <code>npx tastify init</code> or the Spotify Login tab to get a token with the right scopes.`;

  form.append(label, input, btn, info);
  return form;
}

/* ── Main Showcase Layout ────────────────────────── */

function connect(token: string) {
  activeToken = token;
  renderShowcase();
}

function renderShowcase() {
  app.innerHTML = '';
  destroyCurrentWidget();
  destroyPlaybackWidget();

  // Header bar
  const headerBar = el('div', { className: 'showcase__header-bar' });
  const header = el('div', { className: 'showcase__header' });
  const title = el('h1', { className: 'showcase__title' },
    el('span', { className: 'showcase__logo' }, 'tastify'),
    el('span', { className: 'showcase__subtitle' }, 'vanilla showcase'),
  );

  const headerRight = el('div', { className: 'showcase__header-right' });
  const status = el('span', { className: 'showcase__status' },
    el('span', { className: 'showcase__status-dot' }),
    'Connected',
  );

  const dropdownBtn = el('button', { className: 'showcase__dropdown-trigger' }, 'Update token');
  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('viewBox', '0 0 12 12');
  chevron.setAttribute('fill', 'none');
  chevron.setAttribute('stroke', 'currentColor');
  chevron.setAttribute('stroke-width', '1.5');
  chevron.setAttribute('stroke-linecap', 'round');
  chevron.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 4.5 L6 7.5 L9 4.5');
  chevron.append(path);
  dropdownBtn.append(chevron);

  // Flyout
  const flyout = el('div', { className: 'showcase__flyout' });
  flyout.hidden = true;
  const flyoutLabel = el('label', { className: 'showcase__flyout-label' }, 'New Access Token');
  const flyoutInput = el('input', {
    className: 'showcase__flyout-input',
    type: 'password',
    placeholder: 'Paste a new token...',
  });
  const flyoutBtn = el('button', { className: 'showcase__flyout-btn' }, 'Connect');
  flyoutBtn.disabled = true;
  flyoutInput.addEventListener('input', () => { flyoutBtn.disabled = !flyoutInput.value.trim(); });

  const overlay = el('div', { className: 'showcase__flyout-overlay' });
  overlay.style.display = 'none';

  const closeFlyout = () => {
    flyout.hidden = true;
    overlay.style.display = 'none';
    dropdownBtn.classList.remove('showcase__dropdown-trigger--open');
  };

  const openFlyout = () => {
    flyout.hidden = false;
    overlay.style.display = '';
    dropdownBtn.classList.add('showcase__dropdown-trigger--open');
    flyoutInput.value = '';
    flyoutBtn.disabled = true;
    setTimeout(() => flyoutInput.focus(), 50);
  };

  dropdownBtn.addEventListener('click', () => {
    flyout.hidden ? openFlyout() : closeFlyout();
  });

  overlay.addEventListener('click', closeFlyout);

  const doUpdateToken = () => {
    const trimmed = flyoutInput.value.trim();
    if (trimmed) {
      closeFlyout();
      connect(trimmed);
    }
  };
  flyoutBtn.addEventListener('click', doUpdateToken);
  flyoutInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doUpdateToken(); });

  flyout.append(flyoutLabel, flyoutInput, flyoutBtn);
  headerRight.append(status, dropdownBtn, overlay, flyout);
  header.append(title, headerRight);
  headerBar.append(header);

  // Body
  const body = el('div', { className: 'showcase__body' });
  const nav = el('nav', { className: 'showcase__nav' });
  const navButtons: HTMLButtonElement[] = [];

  for (const item of NAV_ITEMS) {
    const btn = el('button', {
      className: `showcase__nav-btn${activeSection === item.id ? ' showcase__nav-btn--active' : ''}`,
    }, item.label);
    btn.addEventListener('click', () => {
      if (activeSection === item.id) return;
      activeSection = item.id;
      for (const b of navButtons) b.classList.remove('showcase__nav-btn--active');
      btn.classList.add('showcase__nav-btn--active');
      renderSection();
    });
    navButtons.push(btn);
    nav.append(btn);
  }

  const mainWrapper = el('div', { className: 'showcase__main-wrapper' });
  const main = el('main', { className: 'showcase__main' });
  mainWrapper.append(main);
  body.append(nav, mainWrapper);

  const showcase = el('div', { className: 'showcase' });
  showcase.append(headerBar, body);
  app.append(showcase);

  // Mount playback widget
  mountPlayback();

  // Render active section
  renderSection();
}

/* ── Section rendering ───────────────────────────── */

function getMain(): HTMLElement {
  return app.querySelector('.showcase__main')!;
}

function destroyCurrentWidget() {
  if (currentWidget) {
    currentWidget.destroy();
    currentWidget = null;
  }
}

function destroyPlaybackWidget() {
  if (playbackWidget) {
    playbackWidget.destroy();
    playbackWidget = null;
  }
}

function mountPlayback() {
  destroyPlaybackWidget();
  if (playbackUi === 'bar') {
    playbackWidget = mountPlaybackBar({ embed: true });
  } else {
    playbackWidget = mountPlaybackToast({ position: toastPosition, embed: true });
  }
}

function renderSection() {
  destroyCurrentWidget();
  const main = getMain();
  main.innerHTML = '';

  switch (activeSection) {
    case 'now-playing':    renderNowPlayingSection(main); break;
    case 'top-tracks':     renderTopTracksSection(main); break;
    case 'top-artists':    renderTopArtistsSection(main); break;
    case 'recently-played': renderRecentlyPlayedSection(main); break;
    case 'playback':       renderPlaybackSection(main); break;
  }
}

function sectionLayout(
  main: HTMLElement,
  title: string,
  description: string,
  opts: { buildControls: (panel: HTMLElement) => void; codeText: string },
): HTMLElement {
  const section = el('section', { className: 'section' });
  const header = el('div', { className: 'section__header' });
  header.append(
    el('h2', { className: 'section__title' }, title),
    el('p', { className: 'section__desc' }, description),
  );
  section.append(header);

  const content = el('div', { className: 'section__content' });
  const left = el('div', { className: 'section__left' });
  const preview = el('div', { className: 'showcase__preview' });
  const previewTarget = el('div');
  preview.append(previewTarget);
  const codeBlock = el('pre', { className: 'showcase__code' });
  codeBlock.textContent = opts.codeText;
  left.append(preview, codeBlock);

  const right = el('div', { className: 'section__right' });
  const controls = el('div', { className: 'showcase__controls' });
  controls.append(el('h4', { className: 'showcase__controls-title' }, 'Options'));
  opts.buildControls(controls);
  right.append(controls);

  content.append(left, right);
  section.append(content);
  main.append(section);

  return previewTarget;
}

function updateCode(main: HTMLElement, code: string) {
  const codeBlock = main.closest('.section')?.querySelector('.showcase__code');
  if (codeBlock) codeBlock.textContent = code;
}

/* ── NowPlaying Section ──────────────────────────── */

function renderNowPlayingSection(main: HTMLElement) {
  let showArt = true;
  let interactive = true;
  let compact = false;
  let contained = false;
  let pollInterval = 15;

  function getCode(): string {
    return `mount('#target', {
  type: 'now-playing',
  token: '...',
  showArt: ${showArt},
  interactive: ${interactive},
  compact: ${compact},
  contained: ${contained},
  pollInterval: ${pollInterval * 1000},
})`;
  }

  function getOpts(): Partial<MountOptions> {
    return { showArt, interactive, compact, contained, pollInterval: pollInterval * 1000 };
  }

  const target = sectionLayout(main, 'NowPlaying', 'Displays the currently playing track as a spinning vinyl record with album art; click to play in the built-in player.', {
    codeText: getCode(),
    buildControls(panel) {
      panel.append(
        toggleControl('showArt', showArt, (v) => { showArt = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('interactive', interactive, (v) => { interactive = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('compact', compact, (v) => { compact = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('contained', contained, (v) => { contained = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        numberControl('pollInterval (s)', pollInterval, 5, 120, (v) => { pollInterval = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
      );
    },
  });

  currentWidget = mount(target, {
    type: 'now-playing',
    token: activeToken,
    showArt,
    interactive,
    compact,
    contained,
    pollInterval: pollInterval * 1000,
    fallback: '<span style="padding: 0.75rem; color: #888;">Nothing playing right now</span>',
  });
}

/* ── TopTracks Section ───────────────────────────── */

function renderTopTracksSection(main: HTMLElement) {
  let layout: 'list' | 'grid' | 'compact-grid' = 'list';
  let timeRange: TimeRange = 'medium_term';
  let limit = 5;
  let showRank = true;
  let showArt = true;
  let showTimeRangeSelector = true;
  let columns = 3;

  function getCode(): string {
    return `mount('#target', {
  type: 'top-tracks',
  token: '...',
  layout: '${layout}',
  timeRange: '${timeRange}',
  limit: ${limit},
  showRank: ${showRank},
  showArt: ${showArt},
  showTimeRangeSelector: ${showTimeRangeSelector},${layout !== 'list' ? `\n  columns: ${columns},` : ''}
})`;
  }

  function getOpts(): Partial<MountOptions> {
    return { layout, timeRange, limit, showRank, showArt, showTimeRangeSelector, columns };
  }

  let columnsControl: HTMLLabelElement | null = null;

  const target = sectionLayout(main, 'TopTracks', 'Shows the user\'s most-played tracks over a selected time range, in list or grid layout.', {
    codeText: getCode(),
    buildControls(panel) {
      panel.append(
        selectControl('layout', layout, [
          { value: 'list', label: 'list' },
          { value: 'grid', label: 'grid' },
          { value: 'compact-grid', label: 'compact-grid' },
        ], (v) => {
          layout = v;
          currentWidget?.update(getOpts());
          updateCode(main, getCode());
          if (columnsControl) columnsControl.style.display = v !== 'list' ? '' : 'none';
        }),
        selectControl('timeRange', timeRange, [
          { value: 'short_term', label: 'short_term (4 weeks)' },
          { value: 'medium_term', label: 'medium_term (6 months)' },
          { value: 'long_term', label: 'long_term (all time)' },
        ], (v) => { timeRange = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        numberControl('limit', limit, 1, 50, (v) => { limit = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('showRank', showRank, (v) => { showRank = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('showArt', showArt, (v) => { showArt = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('showTimeRangeSelector', showTimeRangeSelector, (v) => { showTimeRangeSelector = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
      );
      columnsControl = numberControl('columns', columns, 1, 6, (v) => { columns = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); });
      columnsControl.style.display = layout !== 'list' ? '' : 'none';
      panel.append(columnsControl);
    },
  });

  currentWidget = mount(target, {
    type: 'top-tracks',
    token: activeToken,
    layout,
    timeRange,
    limit,
    showRank,
    showArt,
    showTimeRangeSelector,
    columns,
  });
}

/* ── TopArtists Section ──────────────────────────── */

function renderTopArtistsSection(main: HTMLElement) {
  let layout: 'grid' | 'list' | 'compact-grid' = 'grid';
  let timeRange: TimeRange = 'medium_term';
  let limit = 6;
  let showGenres = false;
  let showTimeRangeSelector = true;
  let columns = 3;

  function getCode(): string {
    return `mount('#target', {
  type: 'top-artists',
  token: '...',
  layout: '${layout}',
  timeRange: '${timeRange}',
  limit: ${limit},
  showGenres: ${showGenres},
  showTimeRangeSelector: ${showTimeRangeSelector},${layout !== 'list' ? `\n  columns: ${columns},` : ''}
})`;
  }

  function getOpts(): Partial<MountOptions> {
    return { layout, timeRange, limit, showGenres, showTimeRangeSelector, columns };
  }

  let columnsControl: HTMLLabelElement | null = null;

  const target = sectionLayout(main, 'TopArtists', 'Displays the user\'s top artists with optional genre tags, in grid or list layout.', {
    codeText: getCode(),
    buildControls(panel) {
      panel.append(
        selectControl('layout', layout, [
          { value: 'grid', label: 'grid' },
          { value: 'list', label: 'list' },
          { value: 'compact-grid', label: 'compact-grid' },
        ], (v) => {
          layout = v;
          currentWidget?.update(getOpts());
          updateCode(main, getCode());
          if (columnsControl) columnsControl.style.display = v !== 'list' ? '' : 'none';
        }),
        selectControl('timeRange', timeRange, [
          { value: 'short_term', label: 'short_term (4 weeks)' },
          { value: 'medium_term', label: 'medium_term (6 months)' },
          { value: 'long_term', label: 'long_term (all time)' },
        ], (v) => { timeRange = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        numberControl('limit', limit, 1, 50, (v) => { limit = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('showGenres', showGenres, (v) => { showGenres = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('showTimeRangeSelector', showTimeRangeSelector, (v) => { showTimeRangeSelector = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
      );
      columnsControl = numberControl('columns', columns, 1, 6, (v) => { columns = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); });
      columnsControl.style.display = layout !== 'list' ? '' : 'none';
      panel.append(columnsControl);
    },
  });

  currentWidget = mount(target, {
    type: 'top-artists',
    token: activeToken,
    layout,
    timeRange,
    limit,
    showGenres,
    showTimeRangeSelector,
    columns,
  });
}

/* ── RecentlyPlayed Section ──────────────────────── */

function renderRecentlyPlayedSection(main: HTMLElement) {
  let layout: 'list' | 'grid' | 'compact-grid' = 'list';
  let limit = 10;
  let columns = 3;
  let showTimestamp = true;
  let groupByDay = false;

  function getCode(): string {
    return `mount('#target', {
  type: 'recently-played',
  token: '...',
  layout: '${layout}',
  limit: ${limit},${layout !== 'list' ? `\n  columns: ${columns},` : ''}
  showTimestamp: ${showTimestamp},
  groupByDay: ${groupByDay},
})`;
  }

  function getOpts(): Partial<MountOptions> {
    return { layout, limit, columns, showTimestamp, groupByDay };
  }

  let columnsControl: HTMLLabelElement | null = null;

  const target = sectionLayout(main, 'RecentlyPlayed', 'Shows recently played tracks as a list or grid, with optional day grouping.', {
    codeText: getCode(),
    buildControls(panel) {
      panel.append(
        selectControl('layout', layout, [
          { value: 'list', label: 'list' },
          { value: 'grid', label: 'grid' },
          { value: 'compact-grid', label: 'compact-grid' },
        ], (v) => {
          layout = v;
          currentWidget?.update(getOpts());
          updateCode(main, getCode());
          if (columnsControl) columnsControl.style.display = v !== 'list' ? '' : 'none';
        }),
        numberControl('limit', limit, 1, 50, (v) => { limit = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('showTimestamp', showTimestamp, (v) => { showTimestamp = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
        toggleControl('groupByDay', groupByDay, (v) => { groupByDay = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); }),
      );
      columnsControl = numberControl('columns', columns, 1, 6, (v) => { columns = v; currentWidget?.update(getOpts()); updateCode(main, getCode()); });
      columnsControl.style.display = layout !== 'list' ? '' : 'none';
      panel.append(columnsControl);
    },
  });

  currentWidget = mount(target, {
    type: 'recently-played',
    token: activeToken,
    layout,
    limit,
    showTimestamp,
    groupByDay,
  });
}

/* ── Playback Section ────────────────────────────── */

function renderPlaybackSection(main: HTMLElement) {
  function getCode(): string {
    if (playbackUi === 'bar') {
      return `import { mountPlaybackBar } from '@tastify/vanilla'

const player = mountPlaybackBar({ embed: true })

// Click any track in the other tabs to see the bar in action.

// Clean up:
// player.destroy()`;
    }
    return `import { mountPlaybackToast } from '@tastify/vanilla'

const player = mountPlaybackToast({
  position: '${toastPosition}',
  embed: true,
})

// Click any track in the other tabs to see the toast in action.

// Clean up:
// player.destroy()`;
  }

  let toastPosControl: HTMLLabelElement | null = null;

  const target = sectionLayout(main, 'Playback', 'Spotify embed playback. Click a track in the other tabs to start playing, then use the controls in the playback bar or toast.', {
    codeText: getCode(),
    buildControls(panel) {
      panel.append(
        selectControl('ui', playbackUi, [
          { value: 'bar', label: 'bar' },
          { value: 'toast', label: 'toast' },
        ], (v) => {
          playbackUi = v;
          mountPlayback();
          updateCode(main, getCode());
          if (toastPosControl) toastPosControl.style.display = v === 'toast' ? '' : 'none';
        }),
      );
      toastPosControl = selectControl('toastPosition', toastPosition, [
        { value: 'top-left', label: 'top-left' },
        { value: 'top-center', label: 'top-center' },
        { value: 'top-right', label: 'top-right' },
        { value: 'bottom-left', label: 'bottom-left' },
        { value: 'bottom-center', label: 'bottom-center' },
        { value: 'bottom-right', label: 'bottom-right' },
      ], (v) => {
        toastPosition = v;
        mountPlayback();
        updateCode(main, getCode());
      });
      toastPosControl.style.display = playbackUi === 'toast' ? '' : 'none';
      panel.append(toastPosControl);
    },
  });

  target.append(el('p', { className: 'playback-hint' }, 'Click play on any track in the other tabs to see the player in action.'));
}

/* ── Init ────────────────────────────────────────── */

handleOAuthCallback()
  .then((token) => {
    if (token) {
      connect(token);
    } else {
      renderLogin();
    }
  })
  .catch((err) => {
    renderLogin(err instanceof Error ? err.message : String(err));
  });
