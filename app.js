const TEAM_NAMES = {
  "00": "Abertura",
  FWC: "FIFA World Cup",
  MEX: "Mexico",
  RSA: "Africa do Sul",
  KOR: "Coreia do Sul",
  CZE: "Tchequia",
  CAN: "Canada",
  BIH: "Bosnia e Herzegovina",
  QAT: "Catar",
  SUI: "Suica",
  BRA: "Brasil",
  MAR: "Marrocos",
  HAI: "Haiti",
  SCO: "Escocia",
  USA: "Estados Unidos",
  PAR: "Paraguai",
  AUS: "Australia",
  TUR: "Turquia",
  GER: "Alemanha",
  CUW: "Curacao",
  CIV: "Costa do Marfim",
  ECU: "Equador",
  NED: "Holanda",
  JPN: "Japao",
  SWE: "Suecia",
  TUN: "Tunisia",
  BEL: "Belgica",
  EGY: "Egito",
  IRN: "Ira",
  NZL: "Nova Zelandia",
  ESP: "Espanha",
  CPV: "Cabo Verde",
  KSA: "Arabia Saudita",
  URU: "Uruguai",
  FRA: "Franca",
  SEN: "Senegal",
  IRQ: "Iraque",
  NOR: "Noruega",
  ARG: "Argentina",
  ALG: "Argelia",
  AUT: "Austria",
  JOR: "Jordania",
  POR: "Portugal",
  COD: "RD Congo",
  UZB: "Uzbequistao",
  COL: "Colombia",
  ENG: "Inglaterra",
  CRO: "Croacia",
  GHA: "Gana",
  PAN: "Panama",
  CC: "Especiais CC"
};

const TEAM_PREFIXES = [
  "MEX", "RSA", "KOR", "CZE", "CAN", "BIH", "QAT", "SUI", "BRA", "MAR", "HAI", "SCO",
  "USA", "PAR", "AUS", "TUR", "GER", "CUW", "CIV", "ECU", "NED", "JPN", "SWE", "TUN",
  "BEL", "EGY", "IRN", "NZL", "ESP", "CPV", "KSA", "URU", "FRA", "SEN", "IRQ", "NOR",
  "ARG", "ALG", "AUT", "JOR", "POR", "COD", "UZB", "COL", "ENG", "CRO", "GHA", "PAN"
];

const SPECIAL_GROUPS = [
  { prefix: "00", codes: ["00"] },
  { prefix: "FWC", codes: Array.from({ length: 19 }, (_, index) => `FWC${index + 1}`) },
  { prefix: "CC", codes: Array.from({ length: 14 }, (_, index) => `CC${index + 1}`) }
];

const STORAGE_KEY = "album-figurinhas-2026-state-v1";
const stickerImages = window.STICKER_IMAGES || {};
const supabaseConfig = window.SUPABASE_CONFIG || {};
const SUPABASE_TABLE = "album_stickers";

const stickers = [
  ...SPECIAL_GROUPS[0].codes.map(code => makeSticker(code, "00")),
  ...SPECIAL_GROUPS[1].codes.map(code => makeSticker(code, "FWC")),
  ...TEAM_PREFIXES.flatMap(prefix => Array.from({ length: 20 }, (_, index) => makeSticker(`${prefix}${index + 1}`, prefix))),
  ...SPECIAL_GROUPS[2].codes.map(code => makeSticker(code, "CC"))
];

const state = {
  quantities: loadState(),
  filter: "all",
  group: "all",
  query: ""
};

const syncState = {
  client: null,
  user: null,
  enabled: false,
  ready: false,
  albumId: "",
  timer: null,
  pendingCodes: new Set(),
  fullSync: false,
  pushing: false,
  channel: null
};

const elements = {
  ownedCount: document.querySelector("#ownedCount"),
  missingCount: document.querySelector("#missingCount"),
  duplicatesCount: document.querySelector("#duplicatesCount"),
  progressPercent: document.querySelector("#progressPercent"),
  progressFill: document.querySelector("#progressFill"),
  totalCount: document.querySelector("#totalCount"),
  lastSaved: document.querySelector("#lastSaved"),
  groupList: document.querySelector("#groupList"),
  clearFiltersBtn: document.querySelector("#clearFiltersBtn"),
  searchInput: document.querySelector("#searchInput"),
  quickInput: document.querySelector("#quickInput"),
  addOneBtn: document.querySelector("#addOneBtn"),
  removeOneBtn: document.querySelector("#removeOneBtn"),
  stickerGrid: document.querySelector("#stickerGrid"),
  stickerTemplate: document.querySelector("#stickerTemplate"),
  currentTitle: document.querySelector("#currentTitle"),
  visibleCount: document.querySelector("#visibleCount"),
  emptyState: document.querySelector("#emptyState"),
  exportTextBtn: document.querySelector("#exportTextBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  importJsonInput: document.querySelector("#importJsonInput"),
  syncStatus: document.querySelector("#syncStatus"),
  syncLogin: document.querySelector(".sync-login"),
  syncEmail: document.querySelector("#syncEmail"),
  syncPassword: document.querySelector("#syncPassword"),
  signInBtn: document.querySelector("#signInBtn"),
  signUpBtn: document.querySelector("#signUpBtn"),
  signOutBtn: document.querySelector("#signOutBtn"),
  syncNowBtn: document.querySelector("#syncNowBtn"),
  authGateStatus: document.querySelector("#authGateStatus"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSignInBtn: document.querySelector("#authSignInBtn"),
  authSignUpBtn: document.querySelector("#authSignUpBtn")
};

function makeSticker(code, prefix) {
  const info = stickerImages[code];
  return {
    code,
    prefix,
    team: TEAM_NAMES[prefix] || prefix,
    name: info?.player || ""
  };
}

function normalizeCode(value) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function getQuantity(code) {
  return Number(state.quantities[code] || 0);
}

function setQuantity(code, quantity) {
  const next = Math.max(0, Math.min(99, quantity));
  if (next === 0) {
    delete state.quantities[code];
  } else {
    state.quantities[code] = next;
  }
  saveState([code]);
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quantities));
}

function saveState(changedCodes = null, options = {}) {
  persistLocalState();
  elements.lastSaved.textContent = `Salvo ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  queueSupabaseSync(changedCodes, options.full);
}

function getGroups() {
  return [
    { prefix: "all", name: "Todas", total: stickers.length },
    ...["00", "FWC", ...TEAM_PREFIXES, "CC"].map(prefix => ({
      prefix,
      name: TEAM_NAMES[prefix],
      total: stickers.filter(sticker => sticker.prefix === prefix).length
    }))
  ];
}

function getStats(scope = stickers) {
  const owned = scope.filter(sticker => getQuantity(sticker.code) > 0).length;
  const duplicates = scope.reduce((sum, sticker) => sum + Math.max(0, getQuantity(sticker.code) - 1), 0);
  const percent = scope.length ? (owned / scope.length) * 100 : 0;
  return {
    owned,
    missing: scope.length - owned,
    duplicates,
    total: scope.length,
    percent: Number(percent.toFixed(percent > 0 && percent < 10 ? 1 : 0))
  };
}

function matchesFilter(sticker) {
  const quantity = getQuantity(sticker.code);
  if (state.filter === "missing") return quantity === 0;
  if (state.filter === "owned") return quantity > 0;
  if (state.filter === "duplicates") return quantity > 1;
  return true;
}

function getVisibleStickers() {
  const query = state.query.toLowerCase();
  return stickers.filter(sticker => {
    const inGroup = state.group === "all" || sticker.prefix === state.group;
    const inQuery = !query ||
      sticker.code.toLowerCase().includes(query) ||
      sticker.team.toLowerCase().includes(query) ||
      sticker.name.toLowerCase().includes(query);
    return inGroup && inQuery && matchesFilter(sticker);
  });
}

function renderSummary() {
  const stats = getStats();
  elements.ownedCount.textContent = stats.owned;
  elements.missingCount.textContent = stats.missing;
  elements.duplicatesCount.textContent = stats.duplicates;
  elements.progressPercent.textContent = `${stats.percent}%`;
  elements.progressFill.style.width = `${stats.percent}%`;
  elements.totalCount.textContent = `${stats.total} figurinhas`;
}

function renderGroups() {
  elements.groupList.innerHTML = "";
  getGroups().forEach(group => {
    const scope = group.prefix === "all" ? stickers : stickers.filter(sticker => sticker.prefix === group.prefix);
    const stats = getStats(scope);
    const button = document.createElement("button");
    button.className = `group-button${state.group === group.prefix ? " active" : ""}`;
    button.type = "button";
    button.dataset.group = group.prefix;
    button.innerHTML = `
      <strong>${group.name}</strong>
      <span>${stats.owned}/${stats.total}</span>
      <div class="group-mini-track"><div class="group-mini-fill" style="width: ${stats.percent}%"></div></div>
    `;
    button.addEventListener("click", () => {
      state.group = group.prefix;
      render();
    });
    elements.groupList.appendChild(button);
  });
}

function renderGrid() {
  const visible = getVisibleStickers();
  elements.stickerGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  visible.forEach(sticker => {
    const quantity = getQuantity(sticker.code);
    const imageInfo = stickerImages[sticker.code];
    const node = elements.stickerTemplate.content.firstElementChild.cloneNode(true);
    node.classList.toggle("owned", quantity === 1);
    node.classList.toggle("duplicate", quantity > 1);
    node.classList.toggle("show-photo", quantity > 0 && Boolean(imageInfo?.image));
    node.querySelector(".sticker-code").textContent = sticker.code;
    node.querySelector(".sticker-team").textContent = sticker.team;
    node.querySelector(".sticker-player").textContent = imageInfo?.player || "";
    if (imageInfo?.image) {
      const photo = node.querySelector(".sticker-photo img");
      photo.src = imageInfo.image;
      photo.alt = sticker.code;
    }
    node.querySelector(".qty-value").textContent = quantity;
    node.querySelector(".status-pill").textContent = quantity > 1 ? `+${quantity - 1}` : quantity === 1 ? "OK" : "0";
    node.querySelector(".minus").addEventListener("click", () => setQuantity(sticker.code, quantity - 1));
    node.querySelector(".plus").addEventListener("click", () => setQuantity(sticker.code, quantity + 1));
    fragment.appendChild(node);
  });
  elements.stickerGrid.appendChild(fragment);
  elements.visibleCount.textContent = `${visible.length} resultado${visible.length === 1 ? "" : "s"}`;
  elements.emptyState.style.display = visible.length ? "none" : "block";
}

function renderTitle() {
  const groupName = state.group === "all" ? "Todas as figurinhas" : TEAM_NAMES[state.group];
  const filterLabel = {
    all: "",
    missing: "faltando",
    owned: "no album",
    duplicates: "repetidas"
  }[state.filter];
  elements.currentTitle.textContent = filterLabel ? `${groupName} - ${filterLabel}` : groupName;
}

function renderSegments() {
  document.querySelectorAll(".segment").forEach(segment => {
    segment.classList.toggle("active", segment.dataset.filter === state.filter);
  });
}

function render() {
  renderSummary();
  renderGroups();
  renderTitle();
  renderSegments();
  renderGrid();
}

function parseQuickCodes() {
  return elements.quickInput.value
    .split(/[,;\n ]+/)
    .map(normalizeCode)
    .filter(Boolean);
}

function updateQuickCodes(delta) {
  const codes = parseQuickCodes();
  const known = new Set(stickers.map(sticker => sticker.code));
  const missing = codes.filter(code => !known.has(code));
  const changed = [];
  codes.filter(code => known.has(code)).forEach(code => {
    const next = getQuantity(code) + delta;
    const bounded = Math.max(0, Math.min(99, next));
    if (bounded === 0) {
      delete state.quantities[code];
    } else {
      state.quantities[code] = bounded;
    }
    changed.push(code);
  });
  saveState(changed);
  render();
  if (missing.length) {
    showToast(`Nao encontrei: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "..." : ""}`);
  } else if (codes.length) {
    elements.quickInput.value = "";
    showToast(delta > 0 ? "Figurinhas adicionadas." : "Figurinhas removidas.");
  }
}

function buildTextExport() {
  const missing = stickers.filter(sticker => getQuantity(sticker.code) === 0).map(sticker => sticker.code);
  const duplicates = stickers
    .filter(sticker => getQuantity(sticker.code) > 1)
    .map(sticker => `${sticker.code} (${getQuantity(sticker.code) - 1})`);
  return [
    "FALTANDO",
    missing.join(", ") || "Nenhuma",
    "",
    "REPETIDAS",
    duplicates.join(", ") || "Nenhuma"
  ].join("\n");
}

async function copyTextExport() {
  const text = buildTextExport();
  try {
    await navigator.clipboard.writeText(text);
    showToast("Listas copiadas.");
  } catch {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, "listas-figurinhas-2026.txt");
    showToast("Arquivo de listas criado.");
  }
}

function exportJson() {
  const payload = {
    name: "album-figurinhas-2026",
    exportedAt: new Date().toISOString(),
    quantities: state.quantities
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, "backup-album-figurinhas-2026.json");
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const quantities = parsed.quantities || parsed;
      const known = new Set(stickers.map(sticker => sticker.code));
      state.quantities = {};
      Object.entries(quantities).forEach(([code, quantity]) => {
        const normalized = normalizeCode(code);
        const numeric = Number(quantity);
        if (known.has(normalized) && numeric > 0) {
          state.quantities[normalized] = Math.min(99, Math.floor(numeric));
        }
      });
      saveState(null, { full: true });
      render();
      showToast("Backup importado.");
    } catch {
      showToast("Nao consegui importar esse arquivo.");
    }
  });
  reader.readAsText(file);
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function setSyncStatus(message) {
  if (elements.syncStatus) {
    elements.syncStatus.textContent = message;
  }
  if (elements.authGateStatus && document.body.classList.contains("auth-required")) {
    elements.authGateStatus.textContent = message;
  }
}

function setAuthUi(isSignedIn) {
  elements.syncEmail?.classList.toggle("hidden", isSignedIn);
  elements.syncPassword?.classList.toggle("hidden", isSignedIn);
  elements.signInBtn?.classList.toggle("hidden", isSignedIn);
  elements.signUpBtn?.classList.toggle("hidden", isSignedIn);
  elements.signOutBtn?.classList.toggle("hidden", !isSignedIn);
  elements.syncNowBtn?.classList.toggle("hidden", !isSignedIn);
  document.body.classList.toggle("auth-required", syncState.enabled && !isSignedIn);
}

function setSyncControlsVisible(isVisible) {
  elements.syncLogin?.classList.toggle("hidden", !isVisible);
}

function getAuthCredentials() {
  const gateEmail = elements.authEmail?.value.trim() || "";
  const gatePassword = elements.authPassword?.value || "";
  const inlineEmail = elements.syncEmail?.value.trim() || "";
  const inlinePassword = elements.syncPassword?.value || "";
  return {
    email: gateEmail || inlineEmail,
    password: gatePassword || inlinePassword
  };
}

function mirrorAuthFields() {
  const email = elements.authEmail?.value || elements.syncEmail?.value || "";
  const password = elements.authPassword?.value || elements.syncPassword?.value || "";
  if (elements.authEmail) elements.authEmail.value = email;
  if (elements.syncEmail) elements.syncEmail.value = email;
  if (elements.authPassword) elements.authPassword.value = password;
  if (elements.syncPassword) elements.syncPassword.value = password;
}

function getSupabaseSettings() {
  return {
    url: String(supabaseConfig.url || "").trim(),
    key: String(supabaseConfig.publishableKey || supabaseConfig.anonKey || "").trim(),
    albumId: String(supabaseConfig.albumId || "").trim()
  };
}

function initSupabase() {
  const settings = getSupabaseSettings();
  if (!settings.url || !settings.key || !settings.albumId) {
    setSyncStatus("Modo local");
    setSyncControlsVisible(false);
    setAuthUi(false);
    return;
  }

  syncState.enabled = true;
  document.body.classList.add("auth-required");
  setSyncStatus("Preparando login...");

  if (!window.supabase?.createClient) {
    setSyncStatus("Supabase indisponivel");
    setSyncControlsVisible(false);
    setAuthUi(false);
    return;
  }

  setSyncControlsVisible(true);
  syncState.client = window.supabase.createClient(settings.url, settings.key);
  syncState.albumId = settings.albumId;
  setSyncStatus("Conectando...");

  syncState.client.auth.getSession().then(({ data }) => {
    syncState.user = data.session?.user || null;
    setAuthUi(Boolean(syncState.user));
    if (syncState.user) {
      loadRemoteState();
    } else {
      setSyncStatus("Entre para sincronizar");
    }
  });

  syncState.client.auth.onAuthStateChange((_event, session) => {
    syncState.user = session?.user || null;
    setAuthUi(Boolean(syncState.user));
    if (syncState.user) {
      loadRemoteState();
    } else {
      syncState.ready = false;
      setSyncStatus("Entre para sincronizar");
    }
  });
}

async function signIn() {
  if (!syncState.client) return;
  mirrorAuthFields();
  const { email, password } = getAuthCredentials();
  if (!email || !password) {
    showToast("Informe email e senha.");
    return;
  }
  setSyncStatus("Entrando...");
  const { error } = await syncState.client.auth.signInWithPassword({ email, password });
  if (error) {
    setSyncStatus("Falha no login");
    showToast("Nao consegui entrar. Confira email e senha.");
  }
}

async function signUp() {
  if (!syncState.client) return;
  mirrorAuthFields();
  const { email, password } = getAuthCredentials();
  if (!email || !password) {
    showToast("Informe email e senha.");
    return;
  }
  if (password.length < 6) {
    showToast("Use uma senha com pelo menos 6 caracteres.");
    return;
  }
  setSyncStatus("Criando conta...");
  const { error } = await syncState.client.auth.signUp({ email, password });
  if (error) {
    setSyncStatus("Falha ao criar");
    showToast("Nao consegui criar a conta.");
    return;
  }
  setSyncStatus("Conta criada");
  showToast("Conta criada. Se o Supabase pedir confirmacao, confira o email.");
}

async function signOut() {
  if (!syncState.client) return;
  if (syncState.channel) {
    await syncState.client.removeChannel(syncState.channel);
    syncState.channel = null;
  }
  await syncState.client.auth.signOut();
  syncState.user = null;
  syncState.ready = false;
  setAuthUi(false);
  setSyncStatus("Entre para sincronizar");
}

async function loadRemoteState() {
  if (!syncState.client || !syncState.user || !syncState.albumId) return;
  setSyncStatus("Carregando nuvem...");
  const { data, error } = await syncState.client
    .from(SUPABASE_TABLE)
    .select("sticker_code, quantity")
    .eq("album_id", syncState.albumId);

  if (error) {
    syncState.ready = false;
    setSyncStatus("Erro ao carregar");
    showToast("Nao consegui carregar do Supabase.");
    return;
  }

  const remoteQuantities = {};
  const known = new Set(stickers.map(sticker => sticker.code));
  (data || []).forEach(row => {
    const code = normalizeCode(row.sticker_code || "");
    const quantity = Number(row.quantity);
    if (known.has(code) && quantity > 0) {
      remoteQuantities[code] = Math.min(99, Math.floor(quantity));
    }
  });

  if ((data || []).length) {
    state.quantities = remoteQuantities;
    persistLocalState();
    render();
    syncState.ready = true;
    elements.lastSaved.textContent = "Dados carregados da nuvem";
    setSyncStatus(`Online: ${syncState.user.email}`);
    subscribeToRemoteChanges();
  } else {
    syncState.ready = true;
    setSyncStatus(`Online: ${syncState.user.email}`);
    subscribeToRemoteChanges();
    if (Object.keys(state.quantities).length) {
      syncState.fullSync = true;
      await pushRemoteState();
    }
  }
}

function subscribeToRemoteChanges() {
  if (!syncState.client || !syncState.albumId || syncState.channel) return;

  syncState.channel = syncState.client
    .channel(`album-${syncState.albumId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SUPABASE_TABLE,
        filter: `album_id=eq.${syncState.albumId}`
      },
      payload => {
        applyRemoteChange(payload);
      }
    )
    .subscribe(status => {
      if (status === "SUBSCRIBED" && syncState.user) {
        setSyncStatus(`Online: ${syncState.user.email}`);
      }
    });
}

function applyRemoteChange(payload) {
  if (!syncState.ready || syncState.pushing) return;
  const row = payload.new || payload.old || {};
  const code = normalizeCode(row.sticker_code || "");
  if (!stickers.some(sticker => sticker.code === code)) return;

  if (payload.eventType === "DELETE") {
    delete state.quantities[code];
  } else {
    const quantity = Number(payload.new?.quantity);
    if (quantity > 0) {
      state.quantities[code] = Math.min(99, Math.floor(quantity));
    }
  }

  persistLocalState();
  render();
  elements.lastSaved.textContent = "Atualizado pela nuvem";
}

function queueSupabaseSync(changedCodes = undefined, fullSync = false) {
  if (!syncState.enabled || !syncState.user || !syncState.ready) return;
  if (fullSync || changedCodes === null) {
    syncState.fullSync = true;
  } else {
    (changedCodes || []).forEach(code => syncState.pendingCodes.add(code));
  }
  if (!syncState.fullSync && syncState.pendingCodes.size === 0) return;
  window.clearTimeout(syncState.timer);
  syncState.timer = window.setTimeout(() => {
    pushRemoteState();
  }, 700);
}

async function pushRemoteState() {
  if (!syncState.client || !syncState.user || !syncState.albumId || syncState.pushing) return;
  syncState.pushing = true;
  setSyncStatus("Sincronizando...");
  const isFullSync = syncState.fullSync;
  const changedCodes = Array.from(syncState.pendingCodes);
  syncState.fullSync = false;
  syncState.pendingCodes.clear();

  const makeRow = ([code, quantity]) => ({
    album_id: syncState.albumId,
    sticker_code: code,
    quantity,
    updated_by: syncState.user.id,
    updated_at: new Date().toISOString()
  });

  if (isFullSync) {
    const rows = Object.entries(state.quantities).map(makeRow);
    const deleteResult = await syncState.client
      .from(SUPABASE_TABLE)
      .delete()
      .eq("album_id", syncState.albumId);

    if (deleteResult.error) {
      syncState.pushing = false;
      syncState.fullSync = true;
      setSyncStatus("Erro ao salvar");
      showToast("Nao consegui salvar no Supabase.");
      return;
    }

    if (rows.length) {
      const insertResult = await syncState.client.from(SUPABASE_TABLE).insert(rows);
      if (insertResult.error) {
        syncState.pushing = false;
        syncState.fullSync = true;
        setSyncStatus("Erro ao salvar");
        showToast("Nao consegui salvar no Supabase.");
        return;
      }
    }
  } else if (changedCodes.length) {
    const rows = changedCodes
      .filter(code => getQuantity(code) > 0)
      .map(code => makeRow([code, getQuantity(code)]));
    const removedCodes = changedCodes.filter(code => getQuantity(code) === 0);

    if (rows.length) {
      const upsertResult = await syncState.client
        .from(SUPABASE_TABLE)
        .upsert(rows, { onConflict: "album_id,sticker_code" });
      if (upsertResult.error) {
        syncState.pushing = false;
        rows.forEach(row => syncState.pendingCodes.add(row.sticker_code));
        setSyncStatus("Erro ao salvar");
        showToast("Nao consegui salvar no Supabase.");
        return;
      }
    }

    if (removedCodes.length) {
      const deleteResult = await syncState.client
        .from(SUPABASE_TABLE)
        .delete()
        .eq("album_id", syncState.albumId)
        .in("sticker_code", removedCodes);
      if (deleteResult.error) {
        syncState.pushing = false;
        removedCodes.forEach(code => syncState.pendingCodes.add(code));
        setSyncStatus("Erro ao salvar");
        showToast("Nao consegui salvar no Supabase.");
        return;
      }
    }
  }

  syncState.pushing = false;
  const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  elements.lastSaved.textContent = `Nuvem atualizada ${time}`;
  setSyncStatus(`Online: ${syncState.user.email}`);
  if (syncState.fullSync || syncState.pendingCodes.size) {
    queueSupabaseSync();
  }
}

function forceFullSync() {
  syncState.fullSync = true;
  pushRemoteState();
}


elements.searchInput.addEventListener("input", event => {
  state.query = event.target.value;
  render();
});

elements.clearFiltersBtn.addEventListener("click", () => {
  state.group = "all";
  state.filter = "all";
  state.query = "";
  elements.searchInput.value = "";
  render();
});

document.querySelectorAll(".segment").forEach(segment => {
  segment.addEventListener("click", () => {
    state.filter = segment.dataset.filter;
    render();
  });
});

elements.addOneBtn.addEventListener("click", () => updateQuickCodes(1));
elements.removeOneBtn.addEventListener("click", () => updateQuickCodes(-1));
elements.quickInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    updateQuickCodes(1);
  }
});
elements.exportTextBtn.addEventListener("click", copyTextExport);
elements.exportJsonBtn.addEventListener("click", exportJson);
elements.importJsonInput.addEventListener("change", event => {
  const [file] = event.target.files || [];
  if (file) importJson(file);
  event.target.value = "";
});
elements.signInBtn?.addEventListener("click", signIn);
elements.signUpBtn?.addEventListener("click", signUp);
elements.signOutBtn?.addEventListener("click", signOut);
elements.syncNowBtn?.addEventListener("click", forceFullSync);
elements.syncPassword?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    signIn();
  }
});
elements.authSignInBtn?.addEventListener("click", signIn);
elements.authSignUpBtn?.addEventListener("click", signUp);
elements.authPassword?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    signIn();
  }
});

render();
initSupabase();
