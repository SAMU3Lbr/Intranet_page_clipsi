/* --- DOM helpers --- */
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const categoryForm = document.getElementById("categoryForm");
const linkForm = document.getElementById("linkForm");
const categoryNameInput = document.getElementById("categoryName");
const linkNameInput = document.getElementById("linkName");
const linkURLInput = document.getElementById("linkURL");
const linkDescInput = document.getElementById("linkDesc");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const openAddCategoryBtn = document.getElementById("openAddCategoryBtn");
const openAddLinkBtn = document.getElementById("openAddLinkBtn");
const catsContainer = document.getElementById("catsContainer");
const linksListEl = document.getElementById("linksList");
const noLinksText = document.getElementById("noLinksText");
const clearBtn = document.getElementById("clearBtn");
const searchInput = document.getElementById("searchInput");
const currentCategoryTitle = document.getElementById("currentCategoryTitle");

const STORAGE_KEY = "intranet_clipsi_categories_v1";

/* estado */
let categories = []; // [{ name, links: [{name,url,desc}] }]
let currentCategory = null; // null => show all

/* --- storage --- */
function loadCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    categories = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Erro ao ler storage", e);
    categories = [];
  }
}
function saveCategories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

/* --- render sidebar/category buttons --- */
function renderCategories() {
  catsContainer.innerHTML = "";
  if (categories.length === 0) {
    const p = document.createElement("div");
    p.style.color = "var(--muted)";
    p.style.fontSize = "13px";
    p.textContent = "Nenhuma categoria. Crie uma!";
    catsContainer.appendChild(p);
    return;
  }

  // botão "Geral"
  const allBtn = document.createElement("button");
  allBtn.className = "btn cat-btn";
  allBtn.textContent = "Geral";
  allBtn.style.background = currentCategory === null ? "var(--accent-dark)" : "";
  allBtn.addEventListener("click", () => {
    currentCategory = null;
    renderAll();
  });
  catsContainer.appendChild(allBtn);

  categories.forEach(cat => {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";

    const btn = document.createElement("button");
    btn.className = "btn cat-btn";
    btn.textContent = cat.name;
    btn.style.background = currentCategory === cat.name ? "var(--accent-dark)" : "";
    btn.addEventListener("click", () => {
      currentCategory = cat.name;
      renderAll();
    });

    const del = document.createElement("button");
    del.className = "trash";
    del.title = "Remover categoria";
    del.textContent = "✕";
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!confirm(`Remover a categoria "${cat.name}" e todos os links nela?`)) return;
      categories = categories.filter(c => c.name !== cat.name);
      if (currentCategory === cat.name) currentCategory = null;
      saveCategories();
      renderAll();
    });

    wrap.appendChild(btn);
    wrap.appendChild(del);
    catsContainer.appendChild(wrap);
  });
}

/* --- render lista de links conforme categoria e pesquisa --- */
function renderLinksList(filteredLinks) {
  linksListEl.innerHTML = "";

  if (!filteredLinks || filteredLinks.length === 0) {
    const div = document.createElement("div");
    div.textContent = "Nenhum link encontrado.";
    div.style.color = "#222";
    linksListEl.appendChild(div);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "links-grid";

  filteredLinks.forEach((l, idx) => {
    const card = document.createElement("div");
    card.className = "link-card";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div style="font-weight:600">${escapeHtml(l.name)}</div>
      <div class="url" style="margin-top:6px">${escapeHtml(l.url)}</div>
      ${l.desc ? `<div class="desc">${escapeHtml(l.desc)}</div>` : ''}
    `;
    meta.title = `${l.name} — ${l.url}`;

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "card-actions";
    actionsWrap.style.marginTop = "6px";

    const openBtn = document.createElement("button");
    openBtn.className = "btn";
    openBtn.style.padding = "6px 10px";
    openBtn.textContent = "Abrir";
    openBtn.onclick = () => {
      let url = l.url || "";
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      window.open(url, "_blank");
    };

    const delBtn = document.createElement("button");
    delBtn.className = "trash";
    delBtn.textContent = "✕";
    delBtn.title = "Remover";
    delBtn.onclick = () => {
      if (!confirm(`Remover o link "${l.name}"?`)) return;
      removeLinkById(l._id);
    };

    actionsWrap.appendChild(openBtn);
    actionsWrap.appendChild(delBtn);

    card.appendChild(meta);
    card.appendChild(actionsWrap);
    grid.appendChild(card);
  });

  linksListEl.appendChild(grid);
}

/* --- util: search + selection --- */
function getAllLinksWithCategory() {
  // transforma categories em array de links com categoria
  return categories.flatMap(cat => (cat.links || []).map(link => ({...link, category: cat.name})));
}

function filterVisibleLinks() {
  const term = (searchInput.value || "").trim().toLowerCase();
  let base = [];
  if (currentCategory === null) base = getAllLinksWithCategory();
  else {
    const cat = categories.find(c => c.name === currentCategory);
    base = cat ? (cat.links || []).map(l => ({...l, category: cat.name})) : [];
  }

  if (!term) return base;
  return base.filter(l =>
    (l.name || "").toLowerCase().includes(term) ||
    (l.url || "").toLowerCase().includes(term) ||
    (l.desc || "").toLowerCase().includes(term) ||
    (l.category || "").toLowerCase().includes(term)
  );
}

/* --- render geral --- */
function renderAll() {
  loadCategories();
  renderCategories();
  const visibleLinks = filterVisibleLinks();
  currentCategoryTitle.textContent = currentCategory || "Todas";
  // mostrar botão adicionar link só quando uma categoria específica estiver selecionada
  openAddLinkBtn.style.display = currentCategory ? "inline-flex" : "none";
  renderLinksList(visibleLinks);
}

/* --- helpers CRUD --- */
function ensureId(obj) {
  if (!obj._id) obj._id = Math.random().toString(36).slice(2);
  return obj;
}

function addCategory(name) {
  name = String(name || "").trim();
  if (!name) { alert("Informe o nome da categoria."); return false; }
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { alert("Categoria já existe."); return false; }
  categories.push({ name, links: [] });
  saveCategories();
  return true;
}

function addLinkToCurrentCategory(linkObj) {
  if (!currentCategory) { alert("Selecione uma categoria antes de adicionar links."); return false; }
  const cat = categories.find(c => c.name === currentCategory);
  if (!cat) { alert("Categoria não encontrada."); return false; }
  ensureId(linkObj);
  cat.links.unshift(linkObj);
  saveCategories();
  return true;
}

function removeLinkById(id) {
  for (const cat of categories) {
    const idx = (cat.links || []).findIndex(l => l._id === id);
    if (idx >= 0) {
      cat.links.splice(idx, 1);
      saveCategories();
      renderAll();
      return;
    }
  }
}

/* --- modal handling (modes) --- */
let modalMode = null; // "category" | "link"

function openModalAsCategory() {
  modalMode = "category";
  modalTitle.textContent = "Criar nova categoria";
  categoryForm.style.display = "block";
  linkForm.style.display = "none";
  categoryNameInput.value = "";
  modal.classList.add("open");
  categoryNameInput.focus();
}

function openModalAsLink() {
  if (!currentCategory) { alert("Selecione uma categoria para adicionar um link."); return; }
  modalMode = "link";
  modalTitle.textContent = `Adicionar link em: ${currentCategory}`;
  categoryForm.style.display = "none";
  linkForm.style.display = "block";
  linkNameInput.value = "";
  linkURLInput.value = "";
  linkDescInput.value = "";
  modal.classList.add("open");
  linkNameInput.focus();
}

function closeModal() {
  modal.classList.remove("open");
  modalMode = null;
}

/* --- eventos UI --- */
openAddCategoryBtn.addEventListener("click", openModalAsCategory);
openAddLinkBtn.addEventListener("click", openModalAsLink);
cancelBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); });

saveBtn.addEventListener("click", () => {
  if (modalMode === "category") {
    const name = categoryNameInput.value.trim();
    if (!addCategory(name)) return;
    closeModal();
    renderAll();
  } else if (modalMode === "link") {
    const name = linkNameInput.value.trim();
    const url = linkURLInput.value.trim();
    const desc = linkDescInput.value.trim();
    if (!url) { alert("Informe a URL do link."); linkURLInput.focus(); return; }
    const linkObj = { name: name || url, url, desc };
    if (!addLinkToCurrentCategory(linkObj)) return;
    closeModal();
    renderAll();
  }
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Limpar todas as categorias e links salvos no navegador?")) return;
  localStorage.removeItem(STORAGE_KEY);
  categories = [];
  currentCategory = null;
  renderAll();
});

searchInput.addEventListener("input", () => renderAll());

/* keyboard: esc fecha modal */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* --- util --- */
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

/* init */
document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  // ensure default sample category for first run (optional)
  if (categories.length === 0) {
    // exemplo inicial (remova se não quiser)
    categories.push({ name: "TI", links: [ { _id: "l1", name: "Chamados TI", url: "https://www.jotform.com/form/240573217535657", desc: "Faça seu chamada aqui" } ] });
    saveCategories();
  }
  renderAll();
});

// ===== CONTADOR GLOBAL DE VISITAS (CountAPI) COM LOADER ANIMADO =====
document.addEventListener("DOMContentLoaded", () => {
  const visitCountEl = document.getElementById("visit-count");

  // função que mostra os 3 pontinhos animados
  function showLoadingDots() {
    visitCountEl.innerHTML = 'Visitantes: <span class="loading-text">' +
      '<span class="dot"></span><span class="dot"></span><span class="dot"></span>' +
      '</span>';
  }

  // função que mostra o número final
  function showCount(n) {
    visitCountEl.textContent = `Visitantes: ${n}`;
  }

  // função que mostra mensagem de erro
  function showError() {
    visitCountEl.textContent = 'Visitantes: erro ao carregar';
  }

  // inicializa loader
  showLoadingDots();

  // Substitua 'clipsi_portal'/'visitantes_totais' pelo seu namespace/key, se quiser.
  fetch("https://api.countapi.xyz/hit/clipsi_portal/visitantes_totais")
    .then(res => {
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    })
    .then(data => {
      if (data && typeof data.value !== "undefined") {
        showCount(data.value);
      } else showError();
    })
    .catch(err => {
      console.error("CountAPI error:", err);
      showError();
    });
});




/* Fim do código do script.js */