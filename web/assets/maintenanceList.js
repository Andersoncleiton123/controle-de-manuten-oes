// Renderização do card de manutenção, compartilhada entre o histórico de
// caminhões (manutencoes.js) e o de betoneiras (betoneirasManutencoes.js) —
// mesma estrutura de dados (maintenance_records_status), só muda o filtro
// de vehicle_tipo na query de cada tela.
const MAINTENANCE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="14" height="7" rx="2"/><path d="M17 11h3l1 3v2h-4"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/></svg>';

function maintenanceCardHtml(r, vehicleById, { showEdit = false, showDelete = false } = {}) {
  const v = vehicleById[r.vehicle_id];
  return `
    <div class="card">
      <div class="entity-card-head">
        <div class="entity-title-row">
          <div class="entity-icon">${MAINTENANCE_ICON}</div>
          <div>
            <div class="entity-label">Veículo/equipamento</div>
            <div class="entity-name">${escapeHtml(v ? `${TIPO_VEICULO_LABELS[v.tipo] || v.tipo} — ${v.identificador}${v.nome ? " (" + v.nome + ")" : ""}` : "—")}</div>
          </div>
        </div>
        <span class="pill pill-${escapeHtml(r.tipo_manutencao)}">${escapeHtml(TIPO_MANUTENCAO_LABELS[r.tipo_manutencao] || r.tipo_manutencao)}</span>
      </div>
      <div class="detail-grid">
        <div><div class="detail-label">Data da manutenção</div><div class="detail-value">${formatDateBR(r.data_manutencao)}</div></div>
        <div><div class="detail-label">Km / horas de uso</div><div class="detail-value">${formatNumber(r.km_horas)} ${escapeHtml(r.unidade_medida)}</div></div>
        <div><div class="detail-label">Horímetro</div><div class="detail-value">${r.horimetro !== null && r.horimetro !== undefined ? formatNumber(r.horimetro) + " h" : "—"}</div></div>
        <div><div class="detail-label">Peça ou serviço realizado</div><div class="detail-value">${escapeHtml(r.servico)}</div></div>
        <div><div class="detail-label">Custo</div><div class="detail-value">${formatCurrency(r.custo)}</div></div>
        <div><div class="detail-label">Responsável</div><div class="detail-value">${escapeHtml(r.responsavel)}</div></div>
        <div><div class="detail-label">Próxima manutenção prevista</div><div class="detail-value">${formatDateBR(r.proxima_manutencao_data)}</div></div>
      </div>
      <div class="status-row">
        <span class="status-dot ${r.status}"></span>
        <span class="status-text ${r.status}">${escapeHtml(STATUS_LABELS[r.status])}</span>
      </div>
      ${
        showEdit || showDelete
          ? `<div class="row-actions">
        ${showEdit ? `<a class="secondary" href="nova-manutencao.html?edit=${r.id}">Editar</a>` : ""}
        ${showDelete ? `<button type="button" class="danger" data-delete="${r.id}">Excluir</button>` : ""}
      </div>`
          : ""
      }
    </div>`;
}
