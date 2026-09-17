// Tela somente leitura: manutenções (revisão/geral) das betoneiras,
// separada do histórico geral (que agora só mostra caminhões). Reaproveita
// o card de assets/maintenanceList.js.
let vehiclesCache = [];

function vehicleLabel(v) {
  if (!v) return "—";
  return `${TIPO_VEICULO_LABELS[v.tipo] || v.tipo} — ${v.identificador}${v.nome ? " (" + v.nome + ")" : ""}`;
}

async function loadVehiclesIntoSelect() {
  const client = requireSupabase();
  const { data, error } = await client.from("vehicles").select("*").eq("tipo", "betoneira").order("identificador");
  if (error) throw error;
  vehiclesCache = data || [];
  const options = vehiclesCache.map((v) => `<option value="${v.id}">${escapeHtml(vehicleLabel(v))}</option>`).join("");
  qs("#filter-vehicle").innerHTML = `<option value="">Betoneira: Todas</option>${options}`;
}

async function loadRecordList() {
  const container = qs("#record-list");
  const listMsg = qs("#list-msg");
  try {
    const client = requireSupabase();
    let query = client
      .from("maintenance_records_status")
      .select("*")
      .eq("vehicle_tipo", "betoneira")
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
    container.innerHTML = data.map((r) => maintenanceCardHtml(r, vehicleById)).join("");
  } catch (err) {
    renderInfo(listMsg, err.message || String(err));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadVehiclesIntoSelect();
  } catch (err) {
    renderInfo(qs("#list-msg"), err.message || String(err));
  }
  loadRecordList();
  qs("#filter-vehicle").addEventListener("change", loadRecordList);
  qs("#filter-tipo").addEventListener("change", loadRecordList);
  qs("#filter-status").addEventListener("change", loadRecordList);
});
