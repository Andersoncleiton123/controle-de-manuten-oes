const VEHICLE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="14" height="7" rx="2"/><path d="M17 11h3l1 3v2h-4"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/></svg>';

function vehicleLabel(v) {
  if (!v) return "—";
  return `${TIPO_VEICULO_LABELS[v.vehicle_tipo] || v.vehicle_tipo} — ${v.identificador}${v.nome ? " (" + v.nome + ")" : ""}`;
}

function formatDateOrSemRegistro(value) {
  return value ? formatDateBR(value) : "Sem registro";
}

async function loadVehicleList() {
  const container = qs("#vehicle-list");
  const infoMsg = qs("#info-msg");
  try {
    const client = requireSupabase();
    const { data, error } = await client.from("vehicle_last_dates").select("*");
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhum veículo cadastrado.</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (v) => `
        <div class="card">
          <div class="entity-title-row" style="margin-bottom:14px">
            <div class="entity-icon">${VEHICLE_ICON}</div>
            <div>
              <div class="entity-label">Veículo/equipamento</div>
              <div class="entity-name">${escapeHtml(vehicleLabel(v))}</div>
            </div>
          </div>
          <div class="detail-grid">
            <div><div class="detail-label">Última revisão</div><div class="detail-value">${formatDateOrSemRegistro(v.ultima_revisao)}</div></div>
            <div><div class="detail-label">Última manutenção</div><div class="detail-value">${formatDateOrSemRegistro(v.ultima_manutencao)}</div></div>
            <div><div class="detail-label">Última troca de óleo</div><div class="detail-value">${formatDateOrSemRegistro(v.ultima_troca_oleo)}</div></div>
          </div>
        </div>`
      )
      .join("");
  } catch (err) {
    renderInfo(infoMsg, err.message || String(err));
    container.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadVehicleList();
});
