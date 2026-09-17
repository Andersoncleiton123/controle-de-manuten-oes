let vehiclesCache = [];

function vehicleLabel(v) {
  if (!v) return "—";
  return `${TIPO_VEICULO_LABELS[v.tipo] || v.tipo} — ${v.identificador}${v.nome ? " (" + v.nome + ")" : ""}`;
}

async function loadVehiclesIntoFilter() {
  const client = requireSupabase();
  const { data, error } = await client.from("vehicles").select("*").order("identificador");
  if (error) throw error;
  vehiclesCache = data || [];
  const options = vehiclesCache.map((v) => `<option value="${v.id}">${escapeHtml(vehicleLabel(v))}</option>`).join("");
  qs("#filter-vehicle").innerHTML = `<option value="">Veículo: Todos</option>${options}`;
}

function diasAtraso(dataReferencia) {
  const ref = new Date(`${dataReferencia}T00:00:00`);
  const hoje = new Date(`${todayISO()}T00:00:00`);
  return Math.max(0, Math.round((hoje - ref) / 86400000));
}

async function loadOverdueAlert() {
  const container = qs("#overdue-alert");
  if (!container) return;
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from("alerts_view")
      .select("*")
      .eq("origem", "geral")
      .eq("status", "atrasado");
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = "";
      return;
    }

    const sorted = [...data].sort(
      (a, b) => new Date(a.data_referencia) - new Date(b.data_referencia)
    );

    container.innerHTML = `
      <div class="card" style="border-color:#f2c6c1;background:#fdf5f4">
        <h3 style="color:var(--color-danger);margin-bottom:10px">⚠ Manutenção atrasada</h3>
        ${sorted
          .map(
            (a) => `
          <div class="status-row" style="border-top:1px solid var(--color-border);padding-top:10px;margin-top:10px;justify-content:space-between;flex-wrap:wrap;gap:6px">
            <span><strong>${escapeHtml(vehicleLabel({ tipo: a.vehicle_tipo, identificador: a.vehicle_identificador, nome: a.vehicle_nome }))}</strong> — ${escapeHtml(a.descricao)}</span>
            <span class="badge atrasado"><span class="status-dot atrasado"></span>Atrasada há ${diasAtraso(a.data_referencia)} dia(s)</span>
          </div>`
          )
          .join("")}
      </div>`;
  } catch (err) {
    container.innerHTML = "";
  }
}

async function loadRecordList() {
  const container = qs("#record-list");
  const listMsg = qs("#list-msg");
  try {
    const client = requireSupabase();
    let query = client
      .from("maintenance_records_status")
      .select("*")
      .order("data_manutencao", { ascending: false });

    const vehicleFilter = qs("#filter-vehicle").value;
    const tipoFilter = qs("#filter-tipo").value;
    const statusFilter = qs("#filter-status").value;

    if (vehicleFilter) query = query.eq("vehicle_id", vehicleFilter);
    if (tipoFilter) query = query.eq("tipo_manutencao", tipoFilter);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p class="empty-state">Nenhum registro encontrado.</p>`;
      return;
    }

    const vehicleById = Object.fromEntries(vehiclesCache.map((v) => [v.id, v]));

    container.innerHTML = data
      .map((r) => maintenanceCardHtml(r, vehicleById, { showEdit: true, showDelete: true }))
      .join("");

    qsa("[data-delete]", container).forEach((btn) =>
      btn.addEventListener("click", () => deleteRecord(btn.dataset.delete))
    );
  } catch (err) {
    renderInfo(listMsg, err.message || String(err));
  }
}

async function deleteRecord(id) {
  if (!confirm("Excluir este registro de manutenção?")) return;
  try {
    const client = requireSupabase();
    const { error } = await client.from("maintenance_records").delete().eq("id", id);
    if (error) throw error;
    loadRecordList();
    loadOverdueAlert();
  } catch (err) {
    renderInfo(qs("#list-msg"), err.message || String(err));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadVehiclesIntoFilter();
  } catch (err) {
    renderInfo(qs("#list-msg"), err.message || String(err));
  }
  loadOverdueAlert();
  loadRecordList();
  qs("#filter-vehicle").addEventListener("change", loadRecordList);
  qs("#filter-tipo").addEventListener("change", loadRecordList);
  qs("#filter-status").addEventListener("change", loadRecordList);
});
