// Barra de navegação inferior (6 abas). Páginas que não têm aba própria
// (Alertas, Veículos, Troca de Óleo) marcam a aba "pai" como ativa através
// de `match`.
const NAV_ICONS = {
  inicio: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h5v-5h2v5h5v-9"/></svg>',
  historico: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  novaManutencao: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 2h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3l1-2z"/><path d="M12 11v6M9 14h6"/></svg>',
  pneus: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>',
  betoneira: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="13" width="14" height="6" rx="2"/><circle cx="15" cy="9" r="5"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
};

const NAV_LINKS = [
  { href: "index.html", label: "Início", icon: "inicio", match: ["index.html", "betoneiras-manutencoes.html"] },
  { href: "manutencoes.html", label: "Histórico", icon: "historico", match: ["manutencoes.html"] },
  { href: "nova-manutencao.html", label: "Nova", icon: "novaManutencao", match: ["nova-manutencao.html"] },
  { href: "pneus.html", label: "Pneus", icon: "pneus", match: ["pneus.html"] },
  { href: "lubrificante.html", label: "Betoneira", icon: "betoneira", match: ["lubrificante.html"] },
  { href: "mais.html", label: "Mais", icon: "mais", match: ["mais.html", "veiculos.html", "oleo.html", "alertas.html"] },
];

function renderNav() {
  const nav = document.getElementById("app-nav");
  if (!nav) return;
  const current = location.pathname.split("/").pop() || "index.html";
  nav.innerHTML = NAV_LINKS.map((link) => {
    const isActive = link.match.includes(current);
    return `<a href="${link.href}" class="${isActive ? "active" : ""}">${NAV_ICONS[link.icon]}<span>${link.label}</span></a>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", renderNav);
