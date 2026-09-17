const ORIGEM_LABELS = {
  geral: "Manutenção geral",
  oleo: "Troca de óleo",
  pneu: "Troca de pneu",
  lubrificante: "Lubrificante",
};

function vehicleLabelFromAlert(row) {
  const tipo = TIPO_VEICULO_LABELS[row.vehicle_tipo] || row.vehicle_tipo;
  return `${tipo} — ${row.vehicle_identificador}${row.vehicle_nome ? " (" + row.vehicle_nome + ")" : ""}`;
}

async function loadAlerts() {
  const container = qs("#alerts-body");
  const listMsg = qs("#list-msg");
  try {
    const client = requireSupabase();
    let query = client.from("alerts_view").select("*");

    const origemFilter = qs("#filter-origem").value;
    const statusFilter = qs("#filter-status").value;
    if (origemFilter) query = query.eq("origem", origemFilter);
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    } else {
      query = query.in("status", ["proximo", "atrasado"]);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p class="empty-state">Nenhum alerta no momento.</p>`;
      return;
    }

    const sorted = [...data].sort((a, b) => {
      const urgencyDiff = STATUS_URGENCY[a.status] - STATUS_URGENCY[b.status];
      if (urgencyDiff !== 0) return urgencyDiff;
      const dateA = a.data_referencia ? new Date(a.data_referencia).getTime() : Infinity;
      const dateB = b.data_referencia ? new Date(b.data_referencia).getTime() : Infinity;
      return dateA - dateB;
    });

    container.innerHTML = sorted
      .map(
        (row) => `
        <div class="card">
          <div class="entity-card-head">
            <div class="entity-title-row">
              <div>
                <div class="entity-label">${escapeHtml(ORIGEM_LABELS[row.origem] || row.origem)}</div>
                <div class="entity-name">${escapeHtml(vehicleLabelFromAlert(row))}</div>
              </div>
            </div>
            <span class="badge ${row.status}"><span class="status-dot ${row.status}"></span>${escapeHtml(STATUS_LABELS[row.status])}</span>
          </div>
          <div class="detail-grid" style="grid-template-columns:1fr">
            <div><div class="detail-label">Descrição</div><div class="detail-value">${escapeHtml(row.descricao)}</div></div>
            <div><div class="detail-label">Data de referência</div><div class="detail-value">${formatDateBR(row.data_referencia)}</div></div>
          </div>
        </div>`
      )
      .join("");
  } catch (err) {
    renderInfo(listMsg, err.message || String(err));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadAlerts();
  qs("#filter-origem").addEventListener("change", loadAlerts);
  qs("#filter-status").addEventListener("change", loadAlerts);
});
