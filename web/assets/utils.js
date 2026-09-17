// Funções utilitárias compartilhadas entre as páginas.

const STATUS_LABELS = {
  em_dia: "Em dia",
  proximo: "Próximo do prazo",
  atrasado: "Atrasado",
};

const TIPO_VEICULO_LABELS = {
  caminhao: "Caminhão",
  betoneira: "Betoneira",
};

const TIPO_MANUTENCAO_LABELS = {
  preventiva: "Revisão",
  corretiva: "Manutenção geral",
};

const POSICAO_PNEU_LABELS = {
  dianteiro_esquerdo: "Dianteiro esquerdo",
  dianteiro_direito: "Dianteiro direito",
  traseiro_esquerdo: "Traseiro esquerdo (eixo único)",
  traseiro_direito: "Traseiro direito (eixo único)",
  traseiro_eixo1_esquerdo_externo: "Traseiro 1º eixo — esquerdo externo",
  traseiro_eixo1_esquerdo_interno: "Traseiro 1º eixo — esquerdo interno",
  traseiro_eixo1_direito_interno: "Traseiro 1º eixo — direito interno",
  traseiro_eixo1_direito_externo: "Traseiro 1º eixo — direito externo",
  traseiro_eixo2_esquerdo_externo: "Traseiro 2º eixo — esquerdo externo",
  traseiro_eixo2_esquerdo_interno: "Traseiro 2º eixo — esquerdo interno",
  traseiro_eixo2_direito_interno: "Traseiro 2º eixo — direito interno",
  traseiro_eixo2_direito_externo: "Traseiro 2º eixo — direito externo",
};

function statusBadgeHtml(status) {
  if (!status) return "";
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateBR(isoDate) {
  if (!isoDate) return "—";
  const [year, month, day] = String(isoDate).slice(0, 10).split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}

function qs(selector, root) {
  return (root || document).querySelector(selector);
}

function qsa(selector, root) {
  return Array.from((root || document).querySelectorAll(selector));
}

// --- Validação de formulários -------------------------------------------

class FormValidator {
  constructor() {
    this.errors = [];
  }

  requireText(value, label) {
    if (!value || !String(value).trim()) {
      this.errors.push(`${label} é obrigatório.`);
      return false;
    }
    return true;
  }

  requireDate(value, label) {
    if (!value) {
      this.errors.push(`${label} é obrigatório.`);
      return false;
    }
    if (Number.isNaN(Date.parse(value))) {
      this.errors.push(`${label} não é uma data válida.`);
      return false;
    }
    return true;
  }

  optionalDate(value, label) {
    if (!value) return true;
    if (Number.isNaN(Date.parse(value))) {
      this.errors.push(`${label} não é uma data válida.`);
      return false;
    }
    return true;
  }

  requireNonNegativeNumber(value, label) {
    if (value === "" || value === null || value === undefined) {
      this.errors.push(`${label} é obrigatório.`);
      return false;
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
      this.errors.push(`${label} deve ser um número.`);
      return false;
    }
    if (n < 0) {
      this.errors.push(`${label} não pode ser negativo.`);
      return false;
    }
    return true;
  }

  optionalNonNegativeNumber(value, label) {
    if (value === "" || value === null || value === undefined) return true;
    return this.requireNonNegativeNumber(value, label);
  }

  isValid() {
    return this.errors.length === 0;
  }
}

function renderErrors(container, errors) {
  if (!errors || errors.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  container.style.display = "block";
  container.innerHTML =
    `<strong>Corrija os campos abaixo:</strong><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`;
}

function renderInfo(container, message) {
  if (!message) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  container.style.display = "block";
  container.textContent = message;
}

// Ordem de urgência para ordenação de alertas.
const STATUS_URGENCY = { atrasado: 0, proximo: 1, em_dia: 2 };
