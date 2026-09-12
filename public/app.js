import { setupAccount } from "./account.js";
import { setupSocial } from "./social.js";
import { normalize, botDelay } from "./engine.js";
import { settings, makeRoom, begin, ready, guess, giveUp, expire, leave, rematch, view, botWord, onlineSettings } from "./game.js";
const $ = (id) => document.getElementById(id), tr = (en, pt) => lang === "pt" ? pt : en;
let lang = "en", mode = "duel", opponent = "bot", dictionaries = {}, state = null, local = null, remote = false, code = "", draft = "", busy = false, polling = false, syncGeneration = 0, offset = 0, botDue = 0, botRound = "", lastBoard = "", lastAnnouncement = "", lastKeys = "", revision = -1, connectionOk = true;
let resultDismissed = false;
let accountRender = () => {
}, social = null, step = "modes", signedAccount = null, loaded = false, search = null, searchBusy = false, cancelling = false;
const preferences = (() => {
  try {
    const value = JSON.parse(localStorage.getItem("lexivanto-preferences"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
})();
const onlinePreferences = preferences.online && typeof preferences.online === "object" ? preferences.online : {};
const matchPreferences = preferences.matches && typeof preferences.matches === "object" ? preferences.matches : {};
function remember() {
  preferences.lang = lang;
  preferences.mode = mode;
  preferences.opponent = opponent;
  preferences.name = $("nickname").value;
  preferences.matches = matchPreferences;
  preferences.online = onlinePreferences;
  matchPreferences[mode] = config(false);
  try {
    localStorage.setItem("lexivanto-preferences", JSON.stringify(preferences));
  } catch {
  }
}
const practiceResults = /* @__PURE__ */ new Set();
let practiceWins = 0, practicePlayed = 0;
const errors = { rate_limited: ["Too many requests. Wait one minute and try again.", "Demasiados pedidos. Aguarda um minuto e tenta novamente."], opponent_left: ["Your opponent left. Choose a new game.", "O advers\xE1rio saiu. Escolhe outro jogo."], stale_match: ["The match changed. Check the current game and try again.", "A partida mudou. Verifica o jogo atual e tenta novamente."], five_letters: ["Enter a five-letter word.", "Escreve uma palavra com cinco letras."], unknown_word: ["Not in this preview\u2019s dictionary. Try another word.", "N\xE3o est\xE1 no dicion\xE1rio desta vers\xE3o. Experimenta outra palavra."], repeated: ["That word is already on your board.", "Essa palavra j\xE1 est\xE1 no teu tabuleiro."], locked: ["Your guess is locked. Wait for the reveal.", "A tua tentativa est\xE1 confirmada. Aguarda a revela\xE7\xE3o."], not_turn: ["It\u2019s your partner\u2019s turn.", "\xC9 a vez do teu parceiro."], room_full: ["This room already has two players or has started.", "Esta sala j\xE1 tem dois jogadores ou j\xE1 come\xE7ou."], room_expired: ["Room not found or expired. Check the code or create a new room.", "Sala n\xE3o encontrada ou expirada. Verifica o c\xF3digo ou cria outra sala."], room_access: ["Join using the room code to take a player seat.", "Entra com o c\xF3digo da sala para ocupar um lugar."], session: ["The browser session could not be restored. Rejoin the room.", "N\xE3o foi poss\xEDvel restaurar a sess\xE3o. Volta a entrar na sala."], busy: ["The room changed at the same time. Please try again.", "A sala foi alterada ao mesmo tempo. Tenta novamente."], not_playing: ["This match is no longer in progress.", "Esta partida j\xE1 n\xE3o est\xE1 em curso."], not_waiting: ["The match has already started.", "A partida j\xE1 come\xE7ou."], storage_unavailable: ["Room service is temporarily unavailable. Your word is kept; try again.", "O servi\xE7o de salas est\xE1 temporariamente indispon\xEDvel. A tua palavra foi mantida; tenta novamente."] };
function message(where, e) {
  $(where).textContent = errors[e] ? tr(...errors[e]) : e;
  if (where === "game-error") $("result-error").textContent = $(where).textContent;
}
function stored(key2) {
  try {
    return sessionStorage.getItem(key2);
  } catch {
    return null;
  }
}
function save(key2, value) {
  try {
    value === null ? sessionStorage.removeItem(key2) : sessionStorage.setItem(key2, value);
  } catch {
  }
}
let token = stored("cw-player-token");
if (!token) {
  token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((n) => n.toString(16).padStart(2, "0")).join("");
  save("cw-player-token", token);
}
function modeName(m = mode) {
  return { duel: tr("Duel", "Duelo"), race: tr("Race", "Corrida"), coop: tr("Co-op", "Coopera\xE7\xE3o"), swap: tr("Word Swap", "Troca de palavras") }[m];
}
function config(forPlay = true) {
  return settings({ mode, lang, clockMode: mode === "duel" ? "response" : "round", difficulty: $("difficulty").value, seconds: forPlay && opponent === "bot" ? 0 : Number($("clock").value), sudden: false, attempts: Number($("attempts").value) });
}
function onlineRules() {
  return onlineSettings(mode, lang, onlinePreferences[mode]);
}
function onlineTiming() {
  $("online-description").textContent = tr("Find a player \xB7 ", "Encontrar jogador \xB7 ") + clockText(onlineRules());
}
function applyTheme(value) {
  const theme = value === "light" ? "light" : "dark";
  preferences.theme = theme;
  document.documentElement.dataset.theme = theme;
  $("theme-button").textContent = theme === "dark" ? tr("Light mode", "Modo claro") : tr("Dark mode", "Modo escuro");
  $("theme-button").setAttribute("aria-pressed", String(theme === "dark"));
}
function clockText(s) {
  if (!s.seconds) return tr("No time limit", "Sem limite de tempo");
  if (s.mode === "duel" && s.clockMode === "response") return tr(s.seconds + " s to reply", s.seconds + " s para responder");
  const unit = ["race", "swap"].includes(s.mode) ? tr("match", "partida") : s.mode === "coop" ? tr("turn", "turno") : tr("round", "ronda");
  const time = s.seconds >= 60 && ["race", "swap"].includes(s.mode) ? s.seconds / 60 + " min" : s.seconds + " s";
  return time + " / " + unit + (s.sudden ? tr(" \xB7 after round 6", " \xB7 ap\xF3s a ronda 6") : "");
}
function ruleText(s) {
  if (s.mode === "swap") return tr("Privately choose a five-letter word for your friend. When both words are locked, race to solve the word chosen for you.", "Escolhe em privado uma palavra de cinco letras para o teu amigo. Quando ambas estiverem confirmadas, tentem descobrir a palavra escolhida para cada um.");
  if (s.mode === "duel" && s.clockMode === "response" && !s.seconds) return tr("Both choose a word with no time limit. Lock your guess, then reveal both words together.", "Ambos escolhem uma palavra sem limite de tempo. Confirma a tentativa e revelem as duas palavras em conjunto.");
  if (s.mode === "duel" && s.clockMode === "response") return tr("Both choose a word. The first locked guess starts the other player\u2019s response timer. Both guesses reveal after the reply. If you do not reply in time, your opponent wins.", "Ambos escolhem uma palavra. A primeira confirma\xE7\xE3o inicia o tempo de resposta do outro jogador. As tentativas s\xE3o reveladas ap\xF3s a resposta. Se n\xE3o responderes a tempo, ganha o advers\xE1rio.") + (s.seconds ? "" : tr(" This match has no time limit.", " Esta partida n\xE3o tem limite de tempo."));
  if (s.mode === "duel") return tr("Both players submit once per round. Both guesses reveal together. The first correct submission wins; equal server timestamps draw. No six-round limit.", "Ambos enviam uma tentativa por ronda. As duas s\xE3o reveladas em conjunto. Ganha a primeira resposta certa; se o servidor registar tempos iguais, h\xE1 empate. Sem limite de seis rondas.");
  if (s.mode === "race") return tr("Same word, separate boards. Fewest guesses wins; equal guesses are decided by solving time. After one solves, the other can still win using fewer guesses.", "A mesma palavra, tabuleiros separados. Ganha quem usar menos tentativas; em caso de igualdade, decide o tempo. Quando um acerta, o outro ainda pode ganhar com menos tentativas.");
  return tr("Take turns on one shared board. Find the word together. ", "Joguem \xE0 vez no mesmo tabuleiro. Descubram a palavra juntos. ") + (s.attempts ? tr(`${s.attempts} total attempts.`, `${s.attempts} tentativas no total.`) : tr("Unlimited attempts.", "Tentativas sem limite.")) + (s.seconds ? tr(" A timeout ends the team game.", " Se o tempo acabar, termina o jogo da equipa.") : "");
}
function translate() {
  document.documentElement.lang = lang === "pt" ? "pt-PT" : "en";
  document.querySelectorAll("[data-en]").forEach((el) => el.textContent = el.dataset[lang === "pt" ? "pt" : "en"]);
  $("language").value = lang;
  $("help").ariaLabel = tr("How to play", "Como jogar");
  $("close-help").ariaLabel = tr("Close", "Fechar");
  $("close-profile").ariaLabel = tr("Close profile", "Fechar perfil");
  $("join-code").ariaLabel = tr("Room code", "C\xF3digo da sala");
  $("board").ariaLabel = tr("Word board", "Tabuleiro de palavras");
  $("keyboard").ariaLabel = tr("Keyboard", "Teclado");
  $("nickname").placeholder = tr("Your name", "O teu nome");
  setup(false);
  applyTheme(preferences.theme);
  accountRender();
  if (state) render();
  else showStep(step, false);
}
function setup(reset = true) {
  const options = mode === "race" ? [0, 60, 300, 600] : [0, 15, 30, 60, 120];
  if (reset) {
    const prior = matchPreferences[mode] || {};
    $("clock").value = options.includes(prior.seconds) ? prior.seconds : mode === "race" ? 300 : ["coop", "swap"].includes(mode) ? 0 : 30;
    $("sudden").value = prior.sudden === false ? "no" : "yes";
    $("attempts").value = [0, 6, 10].includes(prior.attempts) ? prior.attempts : 6;
    $("difficulty").value = ["easy", "normal", "expert"].includes(prior.difficulty) ? prior.difficulty : "easy";
  }
  $("clock-buttons").replaceChildren();
  for (const sec of options) {
    const button = document.createElement("button");
    button.textContent = sec === 0 ? tr("No limit", "Sem limite") : mode === "race" ? `${sec / 60} min` : `${sec} s`;
    button.dataset.clock = String(sec);
    button.onclick = () => {
      $("clock").value = sec;
      updateSummary();
      remember();
    };
    $("clock-buttons").append(button);
  }
  $("clock-label").textContent = ["race", "swap"].includes(mode) ? tr("Match time", "Tempo da partida") : mode === "coop" ? tr("Time per turn", "Tempo por turno") : tr("Time to reply", "Tempo para responder");
  $("attempt-field").hidden = mode !== "coop";
  $("sudden-field").hidden = true;
  onlineTiming();
  updateSummary();
}
function difficultyName(value) {
  return { easy: tr("Easy", "F\xE1cil"), normal: tr("Medium", "M\xE9dio"), expert: tr("Hard", "Dif\xEDcil") }[value] || tr("Easy", "F\xE1cil");
}
function updateSummary() {
  const s = config(false);
  $("sudden-field").hidden = true;
  $("rules-summary").textContent = clockText(s) + (mode === "coop" ? " \xB7 " + (s.attempts ? tr(s.attempts + " attempts", s.attempts + " tentativas") : tr("Unlimited attempts", "Tentativas sem limite")) : "");
  document.querySelectorAll("[data-clock]").forEach((el) => el.setAttribute("aria-pressed", String(Number(el.dataset.clock) === s.seconds)));
  document.querySelectorAll("[data-setting]").forEach((el) => el.setAttribute("aria-pressed", String($(el.dataset.setting).value === el.dataset.value)));
}
function menuControls() {
  const blocked = busy || cancelling || !loaded;
  document.querySelectorAll("[data-mode],[data-level],#choose-online,#choose-friend,#choose-bot,#create,#join").forEach((el) => el.disabled = blocked);
  $("lang-en").disabled = !!state || !!search || busy;
  $("lang-pt").disabled = $("lang-en").disabled;
  $("lang-en").setAttribute("aria-pressed", String(lang === "en"));
  $("lang-pt").setAttribute("aria-pressed", String(lang === "pt"));
  $("profile-button").disabled = !!search || busy;
  $("back-button").hidden = !!state || ["modes", "search"].includes(step);
  $("menu-button").hidden = !state && ["modes", "opponent", "invite"].includes(step);
  $("back-button").textContent = ["bot", "friend"].includes(step) ? tr("\u2190 Change opponent", "\u2190 Mudar advers\xE1rio") : tr("\u2190 Game modes", "\u2190 Modos de jogo");
  $("menu-button").textContent = state && state.status !== "finished" ? remote ? tr("Leave match", "Sair da partida") : tr("End practice", "Terminar treino") : search ? tr("Cancel & go to modes", "Cancelar e ver modos") : tr("Game modes", "Modos de jogo");
  $("search-bot").disabled = cancelling;
  $("cancel-search").textContent = cancelling ? tr("Cancelling\u2026", "A cancelar\u2026") : tr("Cancel \xB7 Change opponent", "Cancelar \xB7 Mudar advers\xE1rio");
  $("back-button").disabled = busy || cancelling;
  $("menu-button").disabled = busy || cancelling;
}
function showStep(next, focus = true) {
  resultDismissed = false;
  if ($("result").open) $("result").close();
  document.body.classList.remove("playing");
  step = next;
  $("menu").hidden = false;
  $("game-layout").hidden = true;
  for (const page of ["modes", "opponent", "bot", "friend", "search"]) $("step-" + page).hidden = step === "invite" ? !["opponent", "friend"].includes(page) : page !== step;
  $("opponent-options").hidden = step === "invite";
  $("online-settings").hidden = true;
  $("friend-create").hidden = step === "invite";
  $("friend-heading").hidden = step === "invite";
  $("opponent-heading").textContent = step === "invite" ? tr("Join your friend", "Junta-te ao teu amigo") : modeName() + tr(" \xB7 Play with\u2026", " \xB7 Jogar com\u2026");
  $("bot-heading").textContent = modeName() + tr(" \xB7 Choose a bot", " \xB7 Escolhe um bot");
  $("friend-heading").textContent = modeName() + tr(" \xB7 Invite a friend", " \xB7 Convida um amigo");
  $("online-description").textContent = tr("Find a player \xB7 ", "Encontrar jogador \xB7 ") + clockText(onlineRules());
  $("guest-name-field").hidden = !!signedAccount;
  $("signed-name").hidden = !signedAccount;
  $("signed-name").textContent = tr("Playing as ", "A jogar como ") + (signedAccount?.name || "");
  menuControls();
  if (focus) {
    const heading = $(step === "modes" ? "modes-heading" : ["opponent", "invite"].includes(step) ? "opponent-heading" : step === "bot" ? "bot-heading" : step === "friend" ? "friend-heading" : "search-heading");
    heading.focus();
  }
}
function chooseMode(value) {
  if (busy || !loaded) return;
  remember();
  mode = value;
  setup();
  $("choose-online").hidden = value === "swap";
  $("choose-bot").hidden = value === "swap";
  message("menu-error", "");
  showStep("opponent");
}
function validName() {
  if (signedAccount) $("nickname").value = signedAccount.name;
  if (!$("nickname").value.trim()) {
    message("menu-error", tr("Choose a name to play.", "Escolhe um nome para jogar."));
    $("nickname").focus();
    return false;
  }
  remember();
  message("menu-error", "");
  return true;
}
function chooseOpponent(value) {
  if (busy || !loaded || !validName()) return;
  opponent = value;
  remember();
  if (value === "online") {
    startSearch();
    return;
  }
  showStep(value === "bot" ? "bot" : "friend");
}
async function queueApi(action2, body) {
  const r = await fetch("/api/matchmaking/" + action2, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(12e3) });
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error("storage_unavailable");
  }
  if (!r.ok) throw Error(data.error || "storage_unavailable");
  return data;
}
function startSearch(restored) {
  if (search || busy) return;
  search = restored || { seconds: onlineRules().seconds, searchId: Array.from(crypto.getRandomValues(new Uint8Array(16))).map((x) => x.toString(16).padStart(2, "0")).join(""), mode, lang, name: $("nickname").value.trim(), started: Date.now() };
  save("lexivanto-search", JSON.stringify(search));
  showStep("search");
  $("search-detail").textContent = modeName(search.mode) + " \xB7 " + (search.lang === "pt" ? "Portugu\xEAs" : "English") + " \xB7 " + clockText(onlineRules());
  searchPoll();
}
async function searchPoll() {
  if (!search || searchBusy || cancelling) return;
  searchBusy = true;
  const current = search;
  try {
    const data = await queueApi("search", current);
    if (search !== current || cancelling) return;
    message("menu-error", "");
    if (data.status === "matched") {
      search = null;
      save("lexivanto-search", null);
      remote = true;
      connectionOk = true;
      revision = -1;
      code = data.room.code;
      save("cw-room", code);
      draft = "";
      adopt(data.room);
      startSync();
      translate();
      if (state.status === "waiting") await action("ready");
    } else if (data.status === "cancelled") {
      search = null;
      save("lexivanto-search", null);
      showStep("opponent");
    }
  } catch (e) {
    if (search === current && !cancelling) message("menu-error", tr("Search connection interrupted. Retrying\u2026 You can cancel below.", "A liga\xE7\xE3o foi interrompida. A tentar novamente\u2026 Podes cancelar abaixo."));
  } finally {
    searchBusy = false;
  }
}
async function cancelSearch(destination = "opponent") {
  if (!search || cancelling) return;
  cancelling = true;
  const current = search;
  $("cancel-search").disabled = true;
  menuControls();
  try {
    const data = await queueApi("cancel", current);
    if (data.status === "matched") {
      const r = await fetch("/api/rooms/" + data.room.code + "/leave", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ match: data.room.match }), signal: AbortSignal.timeout(12e3) });
      if (!r.ok) throw Error("storage_unavailable");
    }
    search = null;
    save("lexivanto-search", null);
    message("menu-error", "");
    showStep(destination);
  } catch {
    message("menu-error", tr("Could not confirm cancellation. Try Cancel search again.", "N\xE3o foi poss\xEDvel confirmar o cancelamento. Tenta cancelar novamente."));
  } finally {
    cancelling = false;
    $("cancel-search").disabled = false;
    menuControls();
  }
}
function back() {
  if (search) {
    cancelSearch("opponent");
    return;
  }
  if (state) {
    requestMenu();
    return;
  }
  if (busy) return;
  if (step === "invite") history.replaceState(null, "", location.pathname);
  message("menu-error", "");
  showStep(["bot", "friend"].includes(step) ? "opponent" : "modes");
}
async function api(action2 = "", body) {
  const response = await fetch(action2 === "create" ? "/api/rooms" : `/api/rooms/${code}${action2 ? "/" + action2 : ""}`, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token, ...body ? { "content-type": "application/json" } : {} }, signal: AbortSignal.timeout(12e3), ...body ? { body: JSON.stringify({ ...["guess", "giveup", "ready", "leave", "rematch"].includes(action2) ? { match: state?.match } : {}, ...body }) } : {} });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("storage_unavailable");
  }
  if (!response.ok) {
    if (data.error === "stale_match" && data.room) adopt(data.room);
    throw Error(data.error || "storage_unavailable");
  }
  return data;
}
function adopt(data) {
  if (remote && data.revision !== void 0 && data.revision < revision) return;
  revision = data.revision ?? revision;
  offset = data.now - Date.now();
  state = data;
  code = data.code || code;
  mode = data.settings.mode;
  lang = data.settings.lang;
  $("language").value = lang;
  render();
}
async function syncRoom(generation) {
  while (remote && code && generation === syncGeneration) {
    const active = code;
    try {
      const response = await fetch(`/api/rooms/${active}/sync?since=${revision}`, { headers: { authorization: "Bearer " + token }, signal: AbortSignal.timeout(15e3) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "storage_unavailable");
      if (remote && code === active && generation === syncGeneration) {
        connectionOk = true;
        adopt(data);
      }
    } catch (e) {
      if (!remote || code !== active || generation !== syncGeneration) return;
      connectionOk = false;
      if (["room_expired", "room_access"].includes(e.message)) {
        message("game-error", e.message);
        render();
        return;
      }
      render();
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
}
function startSync() {
  if (!remote || !code) return;
  const generation = ++syncGeneration;
  syncRoom(generation);
}
function chooseAnswer(s, old) {
  const list = dictionaries[s.lang].answers.filter((x) => x !== old);
  return list[Math.floor(Math.random() * list.length)];
}
async function create() {
  if (busy || !validName()) return;
  remember();
  busy = true;
  menuControls();
  $("create").disabled = true;
  message("menu-error", "");
  try {
    const s = config();
    draft = "";
    lastBoard = "";
    revision = -1;
    if (opponent === "bot") {
      remote = false;
      code = "";
      save("cw-room", null);
      local = makeRoom(s, $("nickname").value.trim() || tr("You", "Tu"), "local", chooseAnswer(s));
      local.players[1] = { name: "Milo", auth: "bot", ready: true };
      begin(local, Date.now());
      state = view(local, 0);
      offset = 0;
      botRound = "";
      render();
    } else {
      remote = true;
      const data = await api("create", { settings: s, name: $("nickname").value });
      code = data.code;
      save("cw-room", code);
      adopt(data);
      startSync();
    }
    translate();
    $("board").focus();
  } catch (e) {
    remote = false;
    message("menu-error", e.message);
  } finally {
    busy = false;
    $("create").disabled = false;
    if (state) render();
    menuControls();
  }
}
async function joinRoom(value) {
  if (busy || !validName()) return;
  remember();
  const room = value.trim().replace(/\s/g, "").toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(room)) {
    message("menu-error", tr("Enter the 12-character room code.", "Introduz o c\xF3digo de 12 caracteres."));
    return;
  }
  busy = true;
  menuControls();
  $("join").disabled = true;
  try {
    remote = true;
    code = room;
    revision = -1;
    const data = await api("join", { name: $("nickname").value });
    draft = "";
    save("cw-room", code);
    adopt(data);
    startSync();
    translate();
    history.replaceState(null, "", location.pathname);
  } catch (e) {
    remote = false;
    code = "";
    message("menu-error", e.message);
  } finally {
    busy = false;
    $("join").disabled = false;
    if (state) render();
    menuControls();
  }
}
function canType() {
  if (!state || state.status !== "playing" || busy) return false;
  if (remote && !connectionOk) return false;
  if (state.settings.mode === "swap" && state.phase === "choosing") return !state.selectionSubmitted[state.me];
  if (state.settings.mode === "duel") return !state.submitted[state.me];
  if (state.settings.mode === "coop") return state.turn === state.me;
  return !state.solved[state.me];
}
function shownRows() {
  return ["race", "swap"].includes(state.settings.mode) ? state.boards[state.me] : state.rows;
}
function statusText() {
  if (state.status === "waiting") return tr("Waiting in the room", "\xC0 espera na sala");
  if (state.status === "finished") return resultTitle();
  if (state.settings.mode === "swap") {
    const other = state.players[1 - state.me]?.name || tr("Your friend", "O teu amigo");
    if (state.phase === "choosing") return state.selectionSubmitted[state.me] ? tr("Word locked. Waiting for " + other + ".", "Palavra confirmada. \xC0 espera de " + other + ".") : tr("Choose a secret word for " + other + ".", "Escolhe uma palavra secreta para " + other + ".");
    return tr("Solve the word " + other + " chose for you.", "Descobre a palavra que " + other + " escolheu para ti.");
  }
  if (state.settings.mode === "duel") {
    const other = state.players[1 - state.me]?.name || tr("Opponent", "Advers\xE1rio");
    if (state.submitted[state.me]) return tr("Word locked. Waiting for " + other + ".", "Palavra confirmada. \xC0 espera de " + other + ".");
    if (state.submitted[1 - state.me]) return state.deadline ? tr(other + " locked a word. Reply before time runs out!", other + " confirmou. Responde antes de o tempo acabar!") : tr(other + " locked a word. Your turn to reply.", other + " confirmou. \xC9 a tua vez de responder.");
    return tr("Both choosing a word.", "Ambos a escolher uma palavra.");
  }
  if (state.settings.mode === "coop") return state.turn === state.me ? tr("Your turn. Solve it together.", "A tua vez. Descubram juntos.") : tr("Your partner\u2019s turn.", "\xC9 a vez do teu parceiro.");
  return state.solved[state.me] ? tr("Solved! Waiting for the final result.", "Acertaste! Aguarda o resultado final.") : tr("Fewer guesses. Better finish.", "Menos tentativas. Melhor resultado.");
}
function resultTitle() {
  if (state.winner === "team") return tr("You solved it together!", "Descobriram juntos!");
  if (state.winner === state.me) return tr("You win!", "Ganhaste!");
  if (state.winner === null) return state.settings.mode === "coop" ? tr("One for your next game.", "Fica para a pr\xF3xima partida.") : tr("It\u2019s a draw.", "Empate.");
  return tr(`${state.players[1 - state.me]?.name || "Opponent"} wins.`, `${state.players[1 - state.me]?.name || "Advers\xE1rio"} ganhou.`);
}
function render() {
  if (!state) return;
  document.body.classList.toggle("playing", state.status === "playing" || state.status === "finished");
  if (!remote && local && state.status === "finished" && state.reason !== "cancelled") {
    const key2 = local.created + ":" + local.match;
    if (!practiceResults.has(key2)) {
      practiceResults.add(key2);
      practicePlayed++;
      if (state.winner === state.me || state.winner === "team") practiceWins++;
    }
  }
  $("practice-stats").textContent = tr(`${practiceWins} wins \xB7 ${practicePlayed} played`, `${practiceWins} vit\xF3rias \xB7 ${practicePlayed} jogos`);
  $("menu").hidden = true;
  $("game-layout").hidden = false;
  $("language").disabled = true;
  const s = state.settings, p = state.me, other = 1 - p, waiting = state.status === "waiting", finished = state.status === "finished";
  $("game-title").textContent = modeName(s.mode);
  $("game-rules").textContent = ruleText(s);
  $("game-opponent").textContent = remote ? state.online ? tr("Online match", "Partida online") : tr("Friend room", "Sala de amigos") : tr("Practice with Milo \xB7 ", "Treino com o Milo \xB7 ") + difficultyName(s.difficulty);
  $("game-clock").textContent = clockText(s);
  $("game-language").textContent = s.lang === "pt" ? "Portugu\xEAs (Portugal)" : "English";
  $("board-title").textContent = ["race", "swap"].includes(s.mode) ? tr("YOUR BOARD", "O TEU TABULEIRO") : tr("SHARED BOARD", "TABULEIRO PARTILHADO");
  $("round").textContent = s.mode === "race" ? tr("RACE", "CORRIDA") : s.mode === "swap" ? state.phase === "choosing" ? tr("CHOOSE", "ESCOLHE") : tr("SOLVE", "DESCOBRE") : tr("ROUND ", "RONDA ") + state.round;
  $("you-name").textContent = state.players[p]?.name || tr("You", "Tu");
  $("other-name").textContent = state.players[other]?.name || tr("Your friend", "O teu amigo");
  $("you-status").textContent = waiting ? state.players[p]?.ready ? tr("Ready", "Pronto") : tr("Not ready", "Por confirmar") : finished ? tr("Finished", "Terminou") : s.mode === "swap" ? state.phase === "choosing" ? state.selectionSubmitted[p] ? tr("Word locked", "Palavra confirmada") : tr("Choosing for friend", "A escolher para o amigo") : state.solved[p] ? tr("Solved", "Acertou") : tr("Solving", "A descobrir") : s.mode === "duel" ? state.submitted[p] ? tr("Submitted", "Enviou") : tr("Choosing a word", "A escolher") : s.mode === "race" ? state.solved[p] ? tr("Solved", "Acertou") : tr("Playing", "A jogar") : state.turn === p ? tr("Your turn", "A tua vez") : tr("Watching", "A observar");
  $("other-status").textContent = waiting ? state.players[other] ? state.players[other].ready ? tr("Ready", "Pronto") : tr("Not ready", "Por confirmar") : tr("Not joined yet", "Ainda n\xE3o entrou") : finished ? tr("Finished", "Terminou") : s.mode === "swap" ? state.phase === "choosing" ? state.selectionSubmitted[other] ? tr("Word locked", "Palavra confirmada") : tr("Choosing for you\u2026", "A escolher para ti\u2026") : state.solved[other] ? tr("Solved", "Acertou") : tr("Solving\u2026", "A descobrir\u2026") : s.mode === "duel" ? state.submitted[other] ? tr("Word locked", "Palavra confirmada") : tr("Choosing a word\u2026", "A escolher\u2026") : s.mode === "coop" ? state.turn === other ? tr("Their turn", "A vez do parceiro") : tr("Waiting for you", "\xC0 tua espera") : state.solved[other] ? tr("Solved", "Acertou") : tr("Choosing a word\u2026", "A escolher\u2026");
  $("you-player").classList.toggle("active", canType());
  $("other-player").classList.toggle("active", state.status === "playing" && (s.mode === "duel" ? !state.submitted[other] : s.mode === "coop" ? state.turn === other : !state.solved[other]));
  $("lobby").hidden = !waiting;
  $("play-area").hidden = waiting;
  $("room-share").hidden = !remote || state.online;
  $("lobby-title").textContent = state.players[other] ? tr("Ready when you are.", "Prontos para come\xE7ar.") : state.online ? tr("Opponent found.", "Jogador encontrado.") : tr("Invite your friend.", "Convida o teu amigo.");
  $("lobby-summary").textContent = modeName(s.mode) + " \xB7 " + clockText(s) + ". " + ruleText(s);
  $("room-code").textContent = code;
  $("ready").disabled = busy || !state.players[other] || state.players[p]?.ready;
  $("ready").textContent = state.players[p]?.ready ? tr("You\u2019re ready \xB7 Waiting for your friend", "Est\xE1s pronto \xB7 \xC0 espera do teu amigo") : tr("I\u2019m ready", "Estou pronto");
  $("turn-label").textContent = statusText();
  $("turn-label").classList.toggle("needs-reply", s.mode === "duel" && state.submitted[other] && !state.submitted[p]);
  $("mode-tip").textContent = ruleText(s);
  $("race-progress").hidden = !["race", "swap"].includes(s.mode) || s.mode === "swap" && state.phase === "choosing";
  $("race-progress").textContent = tr(`Your guesses: ${state.counts[p]} \xB7 Opponent: ${state.counts[other]}`, `As tuas tentativas: ${state.counts[p]} \xB7 Advers\xE1rio: ${state.counts[other]}`);
  const rows = shownRows();
  const boardKey = JSON.stringify([rows, lang]);
  if (boardKey !== lastBoard) {
    const changedCount = !lastBoard || JSON.parse(lastBoard)[0].length !== rows.length;
    lastBoard = boardKey;
    const scroll = $("board-scroll"), nearBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
    $("board").replaceChildren();
    let all = [...rows];
    while (all.length < 2) all.push({ word: "" });
    for (const row of all) $("board").append(wordRow(row, p));
    if (changedCount && (nearBottom || rows.length <= 2)) scroll.scrollTop = scroll.scrollHeight;
  }
  $("swap-instruction").hidden = s.mode !== "swap" || waiting || finished;
  $("swap-instruction").textContent = statusText();
  $("swap-give-up").hidden = s.mode !== "swap" || state.phase !== "solving" || waiting || finished;
  $("draft-row").hidden = finished || waiting || ["race", "swap"].includes(s.mode) && state.solved[p];
  const draftKey = JSON.stringify([draft, state.ownPending, canType(), lang]);
  if ($("draft-row").dataset.key !== draftKey) {
    $("draft-row").dataset.key = draftKey;
    $("draft-row").replaceChildren(wordRow({ word: state.ownPending || draft, pending: true }, p));
  }
  $("history-hint").hidden = rows.length < 4;
  $("locked-message").hidden = true;
  $("locked-message").textContent = statusText();
  if (!finished) resultDismissed = false;
  $("view-result").hidden = !finished;
  if (!finished && $("result").open) $("result").close();
  if (finished) {
    $("result-title").textContent = resultTitle();
    const answerLabel = s.mode === "swap" ? tr("Your word was ", "A tua palavra era ") : tr("The word was ", "A palavra era ");
    $("result-detail").textContent = (state.reason === "timeout" ? tr("Time ran out. ", "O tempo acabou. ") : state.reason === "left" ? tr("A player left. ", "Um jogador saiu. ") : state.reason === "gave_up" ? tr("A player gave up. ", "Um jogador desistiu. ") : "") + answerLabel + String(state.answer || "").toUpperCase() + ".";
    $("rematch").disabled = busy || state.reason === "cancelled" || state.players.some((x) => x?.departed);
    if (state.players.some((x) => x?.departed)) $("result-detail").textContent += tr(" Your opponent left. Choose a new game.", " O advers\xE1rio saiu. Escolhe outro jogo.");
  }
  if (finished && !resultDismissed && !$("result").open) {
    $("result").showModal();
    $("rematch").disabled ? $("result-menu").focus() : $("rematch").focus();
  }
  renderKeys(rows);
  $("connection").textContent = remote ? connectionOk ? state.online ? tr("Online \xB7 Connected", "Online \xB7 Ligado") : tr("Friend room \xB7 Connected", "Sala de amigos \xB7 Ligado") : tr("Reconnecting\u2026 Clock continues.", "A voltar a ligar\u2026 O rel\xF3gio continua.") : tr("Practice bot \xB7 Unrated", "Bot de treino \xB7 Sem classifica\xE7\xE3o");
  $("leave").disabled = busy;
  $("leave").textContent = finished ? tr("Game modes", "Modos de jogo") : tr("Leave match", "Sair da partida");
  const last = rows.at(-1);
  const announce = (last ? last.word.toUpperCase() + ". " + last.colors.map((c, i) => last.word[i].toUpperCase() + " " + tr({ exact: "correct", present: "misplaced", absent: "absent" }[c], { exact: "certa", present: "noutra posi\xE7\xE3o", absent: "ausente" }[c])).join(", ") + ". " : "") + statusText();
  if (announce !== lastAnnouncement) {
    lastAnnouncement = announce;
    $("announcement").textContent = announce;
  }
  tickClock();
  menuControls();
}
function wordRow(row, p) {
  const line = document.createElement("div");
  line.className = "guess-row" + (row.pending ? " pending" : "");
  if (row.player !== void 0) {
    const owner = document.createElement("span");
    owner.className = "row-owner";
    owner.textContent = row.player === p ? tr("Y", "T") : (state.players[row.player]?.name || "F")[0].toUpperCase();
    owner.title = state.players[row.player]?.name;
    line.append(owner);
  }
  for (let i = 0; i < 5; i++) {
    const tile = document.createElement("span"), c = row.colors?.[i];
    tile.className = "tile " + (c || (row.word[i] ? "filled" : ""));
    tile.textContent = (row.word[i] || "").toUpperCase();
    tile.ariaLabel = tile.textContent ? tile.textContent + ", " + (c ? tr({ exact: "correct position", present: "wrong position", absent: "absent" }[c], { exact: "posi\xE7\xE3o certa", present: "posi\xE7\xE3o errada", absent: "ausente" }[c]) : tr("not revealed", "por revelar")) : tr("Empty", "Vazio");
    if (c) {
      const symbol = document.createElement("span");
      symbol.className = "symbol";
      symbol.ariaHidden = "true";
      symbol.textContent = { exact: "\u25CF", present: "\u2194", absent: "\xD7" }[c];
      tile.append(symbol);
    }
    line.append(tile);
  }
  return line;
}
function renderKeys(rows) {
  const known = {}, rank = { absent: 1, present: 2, exact: 3 };
  rows.forEach((r) => r.word.split("").forEach((c, i) => {
    if ((rank[known[c]] || 0) < rank[r.colors[i]]) known[c] = r.colors[i];
  }));
  const signature = JSON.stringify([known, canType(), state.status, lang]);
  if (signature === lastKeys) return;
  lastKeys = signature;
  $("keyboard").hidden = state.status !== "playing";
  $("keyboard").replaceChildren();
  for (const keys of ["q,w,e,r,t,y,u,i,o,p", "a,s,d,f,g,h,j,k,l", "ENTER,z,x,c,v,b,n,m,BACKSPACE"]) {
    const line = document.createElement("div");
    line.className = "key-row";
    for (const k of keys.split(",")) {
      const b = document.createElement("button");
      b.className = "key " + (known[k] || "") + (k.length > 1 ? " wide" : "");
      b.textContent = k === "ENTER" ? tr("ENTER", "ENVIAR") : k === "BACKSPACE" ? "\u232B" : k.toUpperCase();
      b.ariaLabel = k === "BACKSPACE" ? tr("Delete letter", "Apagar letra") : k === "ENTER" ? tr("Submit word", "Enviar palavra") : k.toUpperCase();
      b.disabled = !canType();
      b.onclick = () => key(k);
      line.append(b);
    }
    $("keyboard").append(line);
  }
}
function key(k) {
  if (!canType()) return;
  if (k === "ENTER") {
    submit();
    return;
  }
  if (k === "BACKSPACE") draft = draft.slice(0, -1);
  else {
    const n = normalize(k);
    if (/^[a-z]$/.test(n) && draft.length < 5) draft += n;
  }
  message("game-error", "");
  render();
}
async function submit() {
  if (!canType()) return;
  if (draft.length !== 5) {
    message("game-error", "five_letters");
    return;
  }
  if (!dictionaries[state.settings.lang].set.has(draft)) {
    message("game-error", "unknown_word");
    return;
  }
  busy = true;
  try {
    if (remote) {
      const data = await api("guess", { word: draft });
      draft = "";
      adopt(data);
    } else {
      guess(local, 0, draft, dictionaries[local.settings.lang].set, Date.now());
      draft = "";
      state = view(local, 0);
    }
  } catch (e) {
    message("game-error", e.message);
  } finally {
    busy = false;
    render();
  }
}
async function action(name) {
  if (busy) return;
  busy = true;
  try {
    if (remote) {
      const data = await api(name, {});
      draft = "";
      adopt(data);
    } else if (name === "giveup") {
      giveUp(local, 0);
      state = view(local, 0);
    } else if (name === "rematch") {
      rematch(local, 0, chooseAnswer(local.settings, local.answer));
      local.players[1].ready = true;
      ready(local, 0, Date.now());
      draft = "";
      lastBoard = "";
      botRound = "";
      state = view(local, 0);
    }
  } catch (e) {
    message("game-error", e.message);
  } finally {
    busy = false;
    render();
  }
}
function menu() {
  if (busy) return;
  if (search) {
    cancelSearch("modes");
    return;
  }
  state = null;
  local = null;
  remote = false;
  syncGeneration++;
  code = "";
  draft = "";
  lastBoard = "";
  lastKeys = "";
  revision = -1;
  connectionOk = true;
  save("cw-room", null);
  $("language").disabled = false;
  message("menu-error", "");
  history.replaceState(null, "", location.pathname);
  showStep("modes");
}
async function returnToModes() {
  if (busy) return false;
  if (remote && state) {
    busy = true;
    menuControls();
    try {
      await api("leave", {});
    } catch (e) {
      if (!["room_expired", "room_access"].includes(e.message)) {
        message("game-error", e.message);
        return false;
      }
    } finally {
      busy = false;
      menuControls();
    }
  }
  menu();
  return true;
}
function requestMenu() {
  if (busy) return;
  if (search) {
    cancelSearch("modes");
    return;
  }
  if (!state || state.status === "finished") {
    returnToModes();
    return;
  }
  const practice = !remote, waiting = state.status === "waiting";
  $("leave-title").textContent = practice ? tr("End practice?", "Terminar treino?") : waiting ? tr("Leave this room?", "Sair desta sala?") : tr("Leave this match?", "Sair desta partida?");
  $("leave-detail").textContent = practice ? tr("This practice ends. You\u2019ll return to the three game modes.", "O treino termina. Voltas aos tr\xEAs modos de jogo.") : waiting ? tr("You\u2019ll leave the room and return to game modes.", "Vais sair da sala e voltar aos modos de jogo.") : state.settings.mode === "coop" ? tr("This ends the team game for both players. You\u2019ll return to game modes.", "O jogo termina para ambos. Voltas aos modos de jogo.") : tr("Your opponent wins if you leave now. You\u2019ll return to game modes.", "O advers\xE1rio ganha se sa\xEDres agora. Voltas aos modos de jogo.");
  $("confirm-leave").textContent = practice ? tr("End practice", "Terminar treino") : tr("Leave match", "Sair da partida");
  $("cancel-leave").textContent = waiting ? tr("Stay in room", "Ficar na sala") : tr("Keep playing", "Continuar a jogar");
  $("leave-dialog").showModal();
}
async function confirmLeave() {
  if (busy) return;
  busy = true;
  try {
    if (remote) await api("leave", {});
    else if (local) leave(local, 0);
    $("leave-dialog").close();
    busy = false;
    menu();
  } catch (e) {
    $("leave-dialog").close();
    if (["room_expired", "room_access"].includes(e.message)) {
      busy = false;
      menu();
    } else message("game-error", e.message);
  } finally {
    busy = false;
  }
}
function tickClock() {
  if (!state) return;
  const left = state.deadline ? Math.max(0, Math.ceil((state.deadline - Date.now() - offset) / 1e3)) : null;
  const response = state.settings.mode === "duel" && state.settings.clockMode === "response";
  $("timer").textContent = state.status === "finished" ? tr("Finished", "Terminou") : left === null ? response && state.settings.seconds ? tr("Clock starts on lock", "Rel\xF3gio ap\xF3s confirma\xE7\xE3o") : tr("No clock", "Sem rel\xF3gio") : Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
  $("timer").classList.toggle("counting", left !== null);
  $("timer").classList.toggle("urgent", left !== null && left <= 10);
  $("timer").ariaLabel = left === null ? $("timer").textContent : tr(left + " seconds remaining", left + " segundos restantes");
  $("time-fill").style.width = left === null ? "0%" : Math.min(100, left / state.settings.seconds * 100) + "%";
  $("time-fill").style.background = left !== null && left <= 10 ? "var(--danger)" : "var(--blue)";
}
async function poll() {
  if (!remote || !code || polling || busy) return;
  polling = true;
  const active = code;
  try {
    const data = await api();
    if (remote && code === active) {
      connectionOk = true;
      adopt(data);
    }
  } catch (e) {
    if (remote && code === active) {
      connectionOk = false;
      if (["room_expired", "room_access"].includes(e.message)) message("game-error", e.message);
      render();
    }
  } finally {
    polling = false;
  }
}
function tick() {
  tickClock();
  if (search) {
    const seconds = Math.max(0, Math.floor((Date.now() - search.started) / 1e3));
    $("search-elapsed").textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    $("search-wait").textContent = seconds < 20 ? tr("Waiting for another player\u2026", "\xC0 espera de outro jogador\u2026") : tr("Still searching. Another player must choose the same mode and language.", "Ainda \xE0 procura. Outro jogador tem de escolher o mesmo modo e l\xEDngua.");
  }
  if (remote || !local || local.status !== "playing") return;
  const now = Date.now();
  if (expire(local, now)) {
    state = view(local, 0);
    render();
    return;
  }
  const stamp = local.match + "-" + local.round + "-" + local.phase + "-" + Number(Boolean(local.swapWords?.[1])) + "-" + local.boards[1].length;
  if (stamp !== botRound) {
    botRound = stamp;
    botDue = now + botDelay(local.settings.difficulty);
  }
  const botTurn = local.settings.mode === "duel" ? !local.pending[1] : local.settings.mode === "coop" ? local.turn === 1 : !local.solved[1];
  if (botTurn && now >= botDue) {
    const word = botWord(local, 1, dictionaries[local.settings.lang].botWords || dictionaries[local.settings.lang].allowed);
    if (word) {
      try {
        guess(local, 1, word, dictionaries[local.settings.lang].set, now);
      } catch {
        botDue = now + 2e3;
      }
      state = view(local, 0);
      render();
    }
  }
}
function setLanguage(value) {
  if (state || search || busy) return;
  lang = value;
  translate();
  remember();
}
$("theme-button").onclick = () => {
  applyTheme(preferences.theme === "dark" ? "light" : "dark");
  try {
    localStorage.setItem("lexivanto-preferences", JSON.stringify(preferences));
  } catch {
  }
};
$("lang-en").onclick = () => setLanguage("en");
$("lang-pt").onclick = () => setLanguage("pt");
document.querySelectorAll("[data-mode]").forEach((el) => el.onclick = () => chooseMode(el.dataset.mode));
for (const value of ["online", "friend", "bot"]) $("choose-" + value).onclick = () => chooseOpponent(value);
document.querySelectorAll("[data-level]").forEach((el) => el.onclick = () => {
  if (busy) return;
  $("difficulty").value = el.dataset.level;
  opponent = "bot";
  create();
});
document.querySelectorAll("[data-setting]").forEach((el) => el.onclick = () => {
  $(el.dataset.setting).value = el.dataset.value;
  updateSummary();
  remember();
});
$("nickname").onchange = remember;
$("create").onclick = () => {
  opponent = "friend";
  create();
};
$("join-form").onsubmit = (e) => {
  e.preventDefault();
  joinRoom($("join-code").value);
};
$("ready").onclick = () => action("ready");
$("swap-give-up").onclick = () => action("giveup");
function reviewBoard() {
  resultDismissed = true;
  $("result").close();
  $("board-scroll").focus();
}
$("review-board").onclick = reviewBoard;
$("view-result").onclick = () => {
  resultDismissed = false;
  render();
};
$("result").addEventListener("cancel", (e) => {
  e.preventDefault();
  reviewBoard();
});
$("rematch").onclick = () => action("rematch");
$("change-settings").onclick = async () => {
  if (busy) return;
  const oldMode = state.settings.mode, oldOpponent = state.online ? "online" : remote ? "friend" : "bot";
  if (!await returnToModes()) return;
  mode = oldMode;
  opponent = oldOpponent;
  setup();
  showStep(oldOpponent === "online" ? "opponent" : oldOpponent === "bot" ? "bot" : "friend");
};
$("result-menu").onclick = requestMenu;
$("menu-button").onclick = requestMenu;
$("brand-home").onclick = requestMenu;
$("back-button").onclick = back;
$("cancel-search").onclick = () => cancelSearch();
$("search-bot").onclick = () => {
  opponent = "bot";
  cancelSearch("bot");
};
$("leave").onclick = requestMenu;
$("confirm-leave").onclick = confirmLeave;
$("cancel-leave").onclick = () => $("leave-dialog").close();
$("help").onclick = () => {
  $("help-content").textContent = ruleText(state?.settings || config());
  $("help-dialog").showModal();
};
$("close-help").onclick = () => $("help-dialog").close();
["help-dialog", "leave-dialog"].forEach((id) => $(id).addEventListener("close", () => {
  if (state) $("board").focus();
  else $(id === "help-dialog" ? "help" : "menu-button").focus();
}));
$("copy-link").onclick = async () => {
  const link = location.origin + location.pathname + "?room=" + code;
  try {
    await navigator.clipboard.writeText(link);
    $("copy-link").textContent = tr("Link copied", "Liga\xE7\xE3o copiada");
  } catch {
    $("invitation-link").hidden = false;
    $("invitation-link").value = link;
    $("invitation-link").select();
  }
};
$("profile-button").onclick = () => $("profile-dialog").showModal();
$("close-profile").onclick = () => $("profile-dialog").close();
$("profile-dialog").addEventListener("close", () => $("profile-button").focus());
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName) || ["help-dialog", "leave-dialog", "privacy-dialog", "delete-dialog", "profile-dialog"].some((id) => $(id).open) || !canType()) return;
  if (e.key === "Enter" && e.target.tagName === "BUTTON" && !draft) return;
  const k = e.key === "Enter" ? "ENTER" : e.key === "Backspace" ? "BACKSPACE" : e.key;
  if (k === "ENTER" || k === "BACKSPACE" || /^[a-zA-ZÀ-ÿ]$/.test(k)) {
    e.preventDefault();
    key(k);
  }
});
document.addEventListener("visibilitychange", () => {
  tick();
  if (!document.hidden && remote) startSync();
  searchPoll();
});
setInterval(tick, 150);
setInterval(searchPoll, 800);
$("privacy").onclick = () => $("privacy-dialog").showModal();
$("close-privacy").onclick = () => $("privacy-dialog").close();
$("privacy-dialog").addEventListener("close", () => $("privacy").focus());
$("retry-load").onclick = () => location.reload();
function canChallenge(challengeMode) {
  if (busy || search) return false;
  if (!state) return true;
  return remote && state.status === "waiting" && !state.players[1 - state.me] && state.settings.mode === challengeMode;
}
async function createChallengeRoom(targetId, challengeMode) {
  if (state) return { roomCode: code };
  mode = challengeMode;
  opponent = "friend";
  setup();
  await create();
  if (!remote || !state || state.status !== "waiting") throw Error("Could not create the invitation room.");
  return { roomCode: code };
}
async function acceptChallengeRoom(roomCode) {
  if (state || search || busy) throw Error("Finish or leave the current match before accepting.");
  opponent = "friend";
  await joinRoom(roomCode);
  if (!state) throw Error("Could not join the invitation room.");
  mode = state.settings.mode;
  if (state.status === "waiting" && !state.players[state.me].ready) await action("ready");
}
async function boot() {
  lang = preferences.lang === "pt" ? "pt" : "en";
  if (typeof preferences.name === "string" && !["Player", "Jogador"].includes(preferences.name)) $("nickname").value = preferences.name.slice(0, 24);
  busy = true;
  setup();
  translate();
  social = setupSocial({account:()=>signedAccount,token,canChallenge,canAccept:()=>!state&&!search&&!busy,onChallenge:createChallengeRoom,onAccept:acceptChallengeRoom});
  accountRender = setupAccount({ language: () => lang, onName: () => {
  }, onChange: (user) => {
    const accountChanged = signedAccount?.csrf !== user?.csrf;
    signedAccount = user;
    if (accountChanged) social.accountChanged();
    if (user && !state && !search && !busy) {
      $("nickname").value = user.name;
      remember();
    }
    if (!state) showStep(step, false);
  } });
  try {
    for (const l of ["en", "pt"]) {
      const r = await fetch("words-" + l + ".json");
      if (!r.ok) throw Error();
      dictionaries[l] = await r.json();
      dictionaries[l].set = new Set(dictionaries[l].allowed);
    }
    loaded = true;
    const invite = new URLSearchParams(location.search).get("room");
    if (invite) {
      if (stored("lexivanto-search")) {
        const old = JSON.parse(stored("lexivanto-search"));
        const cancelled = await queueApi("cancel", old);
        if (cancelled.status === "matched") {
          const r = await fetch("/api/rooms/" + cancelled.room.code + "/leave", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ match: cancelled.room.match }), signal: AbortSignal.timeout(12e3) });
          if (!r.ok) throw Error();
        }
        save("lexivanto-search", null);
      }
      if (stored("cw-room")) {
        remote = true;
        code = stored("cw-room");
        try {
          const existing = await api();
          if (["playing", "waiting"].includes(existing.status)) {
            adopt(existing);
            startSync();
            translate();
            message("game-error", tr("Leave this match before opening another invitation.", "Sai desta partida antes de abrir outro convite."));
            return;
          }
        } catch {
        }
        remote = false;
        code = "";
        save("cw-room", null);
      }
      $("join-code").value = invite;
      opponent = "friend";
      showStep("invite", false);
      try {
        const r = await fetch("/api/rooms/" + encodeURIComponent(invite.toUpperCase()) + "/info", { headers: { authorization: "Bearer " + token } });
        const info = await r.json();
        if (!r.ok) throw Error(info.error || "room_expired");
        if (!info.available) throw Error("room_full");
        mode = info.settings.mode;
        lang = info.settings.lang;
        translate();
        message("menu-error", modeName() + " \xB7 " + (lang === "pt" ? "Portugu\xEAs" : "English") + " \xB7 " + clockText(info.settings));
      } catch (e) {
        message("menu-error", e.message);
      }
    } else if (stored("cw-room")) {
      remote = true;
      code = stored("cw-room");
      try {
        const data = await api();
        connectionOk = true;
        adopt(data);
        startSync();
        translate();
      } catch {
        remote = false;
        code = "";
        save("cw-room", null);
        message("menu-error", tr("Previous room unavailable. Start a new game.", "A sala anterior est\xE1 indispon\xEDvel. Come\xE7a outra partida."));
      }
    } else if (stored("lexivanto-search")) {
      try {
        const prior = JSON.parse(stored("lexivanto-search"));
        if (/^[a-f0-9]{32}$/.test(prior.searchId) && ["duel", "race", "coop"].includes(prior.mode)) {
          mode = prior.mode;
          onlinePreferences[mode] = prior.seconds;
          lang = prior.lang === "pt" ? "pt" : "en";
          busy = false;
          startSearch(prior);
        }
      } catch {
        save("lexivanto-search", null);
      }
    }
  } catch {
    loaded = false;
    message("menu-error", tr("Could not load the game. Try again.", "N\xE3o foi poss\xEDvel carregar o jogo. Tenta novamente."));
    $("retry-load").hidden = false;
  } finally {
    busy = false;
    if (signedAccount && !state && !search) $("nickname").value = signedAccount.name;
    menuControls();
    if (state) {
      render();
      if (remote) startSync();
      if (state.online && state.match === 1 && state.status === "waiting" && !state.players[state.me].ready) action("ready");
    }
  }
}
boot();
