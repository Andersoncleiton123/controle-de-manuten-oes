let vehiclesCache = [];

const OIL_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z"/></svg>';

function vehicleLabel(v) {
  if (!v) return "—";
  return `${TIPO_VEICULO_LABELS[v.tipo] || v.tipo} — ${v.identificador}${v.nome ? " (" + v.nome + ")" : ""}`;
}

async function loadVehiclesIntoSelects() {
  const client = requireSupabase();
  const { data, error } = await client.from("vehicles").select("*").order("identificador");
  if (error) throw error;
  vehiclesCache = data || [];
  const options = vehiclesCache.map((v) => `<option value="${v.id}">${escapeHtml(vehicleLabel(v))}</option>`).join("");
  qs("#f-vehicle").innerHTML = `<option value="">Selecione...</option>${options}`;
  qs("#filter-vehicle").innerHTML = `<option value="">Veículo: Todos</option>${options}`;
}

function proximaTrocaOleoTexto(r) {
  return `${formatDateBR(r.proxima_troca_data)} ou ${formatNumber(r.proxima_troca_km)} km${r.proxima_troca_horas ? " / " + formatNumber(r.proxima_troca_horas) + " h" : ""}`;
}

async function loadRecordList() {
  const container = qs("#record-list");
  const listMsg = qs("#list-msg");
  try {
    const client = requireSupabase();
    let query = client.from("oil_changes_status").select("*").order("data_ultima_troca", { ascending: false });

    const vehicleFilter = qs("#filter-vehicle").value;
    const statusFilter = qs("#filter-status").value;
    if (vehicleFilter) query = query.eq("vehicle_id", vehicleFilter);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p class="empty-state">Nenhum registro encontrado.</p>`;
      return;
    }

    const vehicleById = Object.fromEntries(vehiclesCache.map((v) => [v.id, v]));

    container.innerHTML = data
      .map((r) => {
        const v = vehicleById[r.vehicle_id];
        return `
        <div class="card">
          <div class="entity-title-row" style="margin-bottom:14px">
            <div class="entity-icon">${OIL_ICON}</div>
            <div>
              <div class="entity-label">Veículo/equipamento</div>
              <div class="entity-name">${escapeHtml(vehicleLabel(v))}</div>
            </div>
          </div>
          <div class="detail-grid">
            <div><div class="detail-label">Local da troca</div><div class="detail-value">${escapeHtml(r.local_troca)}</div></div>
            <div><div class="detail-label">Condutor</div><div class="detail-value">${escapeHtml(r.condutor)}</div></div>
            <div><div class="detail-label">Km atual</div><div class="detail-value">${formatNumber(r.km_atual)}</div></div>
            <div><div class="detail-label">Horímetro atual</div><div class="detail-value">${formatNumber(r.horimetro_atual)}</div></div>
            <div><div class="detail-label">Data da última troca</div><div class="detail-value">${formatDateBR(r.data_ultima_troca)}</div></div>
            <div><div class="detail-label">Próxima troca</div><div class="detail-value">${proximaTrocaOleoTexto(r)}</div></div>
          </div>
          <div class="status-row">
            <span class="status-dot ${r.status}"></span>
            <span class="status-text ${r.status}">${escapeHtml(STATUS_LABELS[r.status])}</span>
          </div>
          <div class="row-actions">
            <button type="button" class="secondary" data-edit="${r.id}">Editar</button>
            <button type="button" class="danger" data-delete="${r.id}">Excluir</button>
          </div>
        </div>`;
      })
      .join("");

    qsa("[data-edit]", container).forEach((btn) =>
      btn.addEventListener("click", () => startEditRecord(data.find((r) => r.id === btn.dataset.edit)))
    );
    qsa("[data-delete]", container).forEach((btn) =>
      btn.addEventListener("click", () => deleteRecord(btn.dataset.delete))
    );
  } catch (err) {
    renderInfo(listMsg, err.message || String(err));
  }
}

function startEditRecord(record) {
  if (!record) return;
  qs("#form-title").textContent = "Editar troca de óleo";
  qs("#record-id").value = record.id;
  qs("#f-vehicle").value = record.vehicle_id;
  qs("#f-local").value = record.local_troca;
  qs("#f-condutor").value = record.condutor;
  qs("#f-km").value = record.km_atual;
  qs("#f-horimetro").value = record.horimetro_atual;
  qs("#f-data").value = record.data_ultima_troca;
  qs("#cancel-edit").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetRecordForm() {
  qs("#form-title").textContent = "Nova troca de óleo";
  qs("#record-form").reset();
  qs("#record-id").value = "";
  qs("#cancel-edit").style.display = "none";
  renderErrors(qs("#form-errors"), []);
}

async function deleteRecord(id) {
  if (!confirm("Excluir este registro de troca de óleo?")) return;
  try {
    const client = requireSupabase();
    const { error } = await client.from("oil_changes").delete().eq("id", id);
    if (error) throw error;
    loadRecordList();
  } catch (err) {
    renderInfo(qs("#list-msg"), err.message || String(err));
  }
}

async function submitRecordForm(evt) {
  evt.preventDefault();
  const errorsBox = qs("#form-errors");
  const v = new FormValidator();

  const vehicleId = qs("#f-vehicle").value;
  const local = qs("#f-local").value.trim();
  const condutor = qs("#f-condutor").value.trim();
  const km = qs("#f-km").value;
  const horimetro = qs("#f-horimetro").value;
  const data = qs("#f-data").value;
  const id = qs("#record-id").value;

  v.requireText(vehicleId, "Veículo/equipamento");
  v.requireText(local, "Local da troca");
  v.requireText(condutor, "Condutor");
  v.requireNonNegativeNumber(km, "Km atual");
  v.optionalNonNegativeNumber(horimetro, "Horímetro atual");
  v.requireDate(data, "Data da última troca");

  renderErrors(errorsBox, v.errors);
  if (!v.isValid()) return;

  const payload = {
    vehicle_id: vehicleId,
    local_troca: local,
    condutor,
    km_atual: Number(km),
    horimetro_atual: horimetro === "" ? null : Number(horimetro),
    data_ultima_troca: data,
  };

  try {
    const client = requireSupabase();
    const { error } = id
      ? await client.from("oil_changes").update(payload).eq("id", id)
      : await client.from("oil_changes").insert(payload);
    if (error) throw error;
    resetRecordForm();
    loadRecordList();
  } catch (err) {
    renderErrors(errorsBox, [err.message || String(err)]);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadVehiclesIntoSelects();
  } catch (err) {
    renderInfo(qs("#list-msg"), err.message || String(err));
  }
  loadRecordList();
  qs("#record-form").addEventListener("submit", submitRecordForm);
  qs("#cancel-edit").addEventListener("click", resetRecordForm);
  qs("#filter-vehicle").addEventListener("change", loadRecordList);
  qs("#filter-status").addEventListener("change", loadRecordList);
});
