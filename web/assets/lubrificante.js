let vehiclesCache = [];

const BETONEIRA_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="13" width="14" height="6" rx="2"/><circle cx="15" cy="9" r="5"/></svg>';

function vehicleLabel(v) {
  if (!v) return "—";
  return `${v.identificador}${v.nome ? " (" + v.nome + ")" : ""}`;
}

async function loadVehiclesIntoSelects() {
  const client = requireSupabase();
  const { data, error } = await client.from("vehicles").select("*").eq("tipo", "betoneira").order("identificador");
  if (error) throw error;
  vehiclesCache = data || [];
  const options = vehiclesCache.map((v) => `<option value="${v.id}">${escapeHtml(vehicleLabel(v))}</option>`).join("");
  qs("#f-vehicle").innerHTML = `<option value="">Selecione...</option>${options}`;
  qs("#filter-vehicle").innerHTML = `<option value="">Betoneira: Todas</option>${options}`;
}

function proximaTrocaLubHtml(r) {
  const parts = [];
  if (r.proxima_troca_data) parts.push(formatDateBR(r.proxima_troca_data));
  if (r.proxima_troca_horas) parts.push(`${formatNumber(r.proxima_troca_horas)} h`);
  return parts.length ? parts.join(" / ") : "—";
}

async function loadRecordList() {
  const container = qs("#record-list");
  const listMsg = qs("#list-msg");
  try {
    const client = requireSupabase();
    let query = client.from("lubricant_changes_status").select("*").order("data_ultima_troca", { ascending: false });

    const vehicleFilter = qs("#filter-vehicle").value;
    const statusFilter = qs("#filter-status").value;
    if (vehicleFilter) query = query.eq("vehicle_id", vehicleFilter);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw error;

    const records = data || [];
    const vehicleById = Object.fromEntries(vehiclesCache.map((v) => [v.id, v]));

    const recordCards = records.map((r) => {
      const v = vehicleById[r.vehicle_id];
      return `
        <div class="card">
          <div class="entity-title-row" style="margin-bottom:14px">
            <div class="entity-icon">${BETONEIRA_ICON}</div>
            <div>
              <div class="entity-label">Equipamento</div>
              <div class="entity-name">${escapeHtml(vehicleLabel(v))}</div>
            </div>
          </div>
          <div class="detail-grid">
            <div><div class="detail-label">Local da troca</div><div class="detail-value">${escapeHtml(r.local_troca)}</div></div>
            <div><div class="detail-label">Horímetro atual</div><div class="detail-value">${formatNumber(r.horimetro_atual)}</div></div>
            <div><div class="detail-label">Data da última troca</div><div class="detail-value">${formatDateBR(r.data_ultima_troca)}</div></div>
            <div><div class="detail-label">Próxima troca</div><div class="detail-value">${proximaTrocaLubHtml(r)}</div></div>
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
    });

    // Betoneiras sem nenhum lançamento de lubrificante não aparecem em
    // lubricant_changes_status (é uma view que parte dos registros
    // existentes). Sem filtro de status ativo, listamos essas betoneiras
    // à parte, para não passar a impressão de que faltam no cadastro.
    let missingCards = [];
    if (!statusFilter) {
      const vehiclesWithRecord = new Set(records.map((r) => r.vehicle_id));
      const vehiclesToCheck = vehicleFilter
        ? vehiclesCache.filter((v) => v.id === vehicleFilter)
        : vehiclesCache;
      missingCards = vehiclesToCheck
        .filter((v) => !vehiclesWithRecord.has(v.id))
        .map(
          (v) => `
        <div class="card">
          <div class="entity-title-row" style="margin-bottom:14px">
            <div class="entity-icon">${BETONEIRA_ICON}</div>
            <div>
              <div class="entity-label">Equipamento</div>
              <div class="entity-name">${escapeHtml(vehicleLabel(v))}</div>
            </div>
          </div>
          <p class="empty-state">Sem registro de troca de lubrificante.</p>
          <div class="row-actions">
            <button type="button" class="secondary" data-new-for="${v.id}">Editar</button>
          </div>
        </div>`
        );
    }

    if (recordCards.length === 0 && missingCards.length === 0) {
      container.innerHTML = `<p class="empty-state">Nenhum registro encontrado.</p>`;
      return;
    }

    container.innerHTML = recordCards.join("") + missingCards.join("");

    qsa("[data-edit]", container).forEach((btn) =>
      btn.addEventListener("click", () => startEditRecord(records.find((r) => r.id === btn.dataset.edit)))
    );
    qsa("[data-delete]", container).forEach((btn) =>
      btn.addEventListener("click", () => deleteRecord(btn.dataset.delete))
    );
    qsa("[data-new-for]", container).forEach((btn) =>
      btn.addEventListener("click", () => startNewRecordForVehicle(btn.dataset.newFor))
    );
  } catch (err) {
    renderInfo(listMsg, err.message || String(err));
  }
}

function startNewRecordForVehicle(vehicleId) {
  resetRecordForm();
  qs("#f-vehicle").value = vehicleId;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startEditRecord(record) {
  if (!record) return;
  qs("#form-title").textContent = "Editar troca de lubrificante";
  qs("#record-id").value = record.id;
  qs("#f-vehicle").value = record.vehicle_id;
  qs("#f-local").value = record.local_troca;
  qs("#f-horimetro").value = record.horimetro_atual;
  qs("#f-data").value = record.data_ultima_troca;
  qs("#f-proxima-data").value = record.proxima_troca_data || "";
  qs("#f-proxima-horas").value = record.proxima_troca_horas ?? "";
  qs("#cancel-edit").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetRecordForm() {
  qs("#form-title").textContent = "Nova troca de lubrificante";
  qs("#record-form").reset();
  qs("#record-id").value = "";
  qs("#cancel-edit").style.display = "none";
  renderErrors(qs("#form-errors"), []);
}

async function deleteRecord(id) {
  if (!confirm("Excluir este registro de troca de lubrificante?")) return;
  try {
    const client = requireSupabase();
    const { error } = await client.from("lubricant_changes").delete().eq("id", id);
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
  const horimetro = qs("#f-horimetro").value;
  const data = qs("#f-data").value;
  const proximaData = qs("#f-proxima-data").value;
  const proximaHoras = qs("#f-proxima-horas").value;
  const id = qs("#record-id").value;

  v.requireText(vehicleId, "Betoneira");
  v.requireText(local, "Local da troca");
  v.optionalNonNegativeNumber(horimetro, "Horímetro atual");
  v.requireDate(data, "Data da última troca");
  v.optionalDate(proximaData, "Próxima troca (data)");
  v.optionalNonNegativeNumber(proximaHoras, "Próxima troca (horímetro)");
  if (!proximaData && !proximaHoras) {
    v.errors.push("Informe a próxima troca por data ou por horímetro.");
  }

  renderErrors(errorsBox, v.errors);
  if (!v.isValid()) return;

  const payload = {
    equipamento_id: vehicleId,
    local_troca: local,
    horimetro_atual: horimetro === "" ? null : Number(horimetro),
    data_ultima_troca: data,
    proxima_troca_data: proximaData || null,
    proxima_troca_horas: proximaHoras === "" ? null : Number(proximaHoras),
  };

  try {
    const client = requireSupabase();
    const { error } = id
      ? await client.from("lubricant_changes").update(payload).eq("id", id)
      : await client.from("lubricant_changes").insert(payload);
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
