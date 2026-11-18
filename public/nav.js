// Bottom tab navigation (Phase 2). Friends, Inbox, Ranks and Me reuse the existing dialogs,
// shown non-modally as full screens beside the tab bar instead of as blocking pop-ups.
const $ = id => document.getElementById(id);
const screens = { 'friends-dialog': null, 'leaderboard-dialog': 'leaderboard-button', 'profile-dialog': 'profile-button' };
const tabs = ['tab-play', 'home-friends-open', 'tab-inbox', 'leaderboard-button', 'profile-button'];

function setCurrent(id) {
  const title = $('friends-title');
  const inbox = $('friends-dialog')?.dataset.view === 'inbox';
  if (title) title.textContent = inbox ? 'Inbox' : 'Friends';
  const guestLine = $('friends-guest')?.querySelector?.('p');
  if (guestLine) guestLine.textContent = inbox ? 'Sign in to get invitations.' : 'Sign in to add friends.';
  for (const tab of tabs) {
    const el = $(tab);
    if (!el) continue;
    if (tab === id) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  }
}
function currentTab() {
  const open = Object.keys(screens).find(id => $(id)?.open && $(id).classList.contains('screen'));
  if (!open) return 'tab-play';
  if (open === 'friends-dialog') return $('friends-dialog').dataset.view === 'inbox' ? 'tab-inbox' : 'home-friends-open';
  return screens[open];
}
function closeScreens(except) {
  for (const id of Object.keys(screens)) {
    const d = $(id);
    if (id !== except && d?.open && d.classList.contains('screen')) d.close();
  }
}
for (const id of Object.keys(screens)) {
  const dialog = $(id);
  if (!dialog) continue;
  const modal = dialog.showModal.bind(dialog);
  dialog.showModal = () => {
    // During a match there is no tab bar: keep the original pop-up behaviour.
    if (document.body.classList.contains('playing')) { dialog.classList.remove('screen'); return modal(); }
    closeScreens(id);
    dialog.classList.add('screen');
    if (!dialog.open) dialog.show();
    dialog.scrollTop = 0;
    document.body.classList.add('screen-open');
    setCurrent(currentTab());
    const heading = dialog.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  };
  dialog.addEventListener('close', () => {
    dialog.classList.remove('screen');
    if (!Object.keys(screens).some(x => $(x)?.open)) document.body.classList.remove('screen-open');
    setCurrent(currentTab());
  });
}

$('tab-play')?.addEventListener('click', () => { closeScreens(); setCurrent('tab-play'); });
$('home-friends-open')?.addEventListener('click', () => { $('friends-dialog').dataset.view = 'friends'; setCurrent(currentTab()); }, true);
$('tab-inbox')?.addEventListener('click', () => {
  $('friends-dialog').dataset.view = 'inbox';
  if ($('friends-dialog').open && $('friends-dialog').classList.contains('screen')) { setCurrent('tab-inbox'); return; }
  $('home-friends-open').onclick?.();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = Object.keys(screens).map($).find(d => d?.open && d.classList.contains('screen'));
  if (open && !document.querySelector('dialog:modal')) { e.preventDefault(); open.close(); $('tab-play')?.focus(); }
});

// The inbox count lives on the Inbox tab; Friends and Me no longer repeat it.
const source = $('friends-alert'), mirror = $('inbox-alert');
if (source && mirror) {
  const copy = () => {
    mirror.hidden = source.hidden;
    mirror.textContent = source.textContent;
    $('tab-inbox').setAttribute('aria-label', source.hidden ? 'Inbox' : `Inbox, ${source.textContent} waiting`);
  };
  new MutationObserver(copy).observe(source, { attributes: true, childList: true, characterData: true, subtree: true });
  copy();
}
