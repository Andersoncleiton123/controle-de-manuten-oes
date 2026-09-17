let vehiclesCache = [];

const TIRE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>';

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

function setActiveTab(tabName) {
  qsa(".form-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  qsa(".tab-panel").forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tabName;
  });
}

function setupFormTabs() {
  qsa(".form-tab").forEach((btn) =>
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab))
  );
}

async function loadRecordList() {
  const container = qs("#record-list");
  const listMsg = qs("#list-msg");
  try {
    const client = requireSupabase();
    let query = client.from("tire_changes_status").select("*").order("data_troca", { ascending: false });

    const vehicleFilter = qs("#filter-vehicle").value;
    const posicaoFilter = qs("#filter-posicao").value;
    const statusFilter = qs("#filter-status").value;
    if (vehicleFilter) query = query.eq("vehicle_id", vehicleFilter);
    if (posicaoFilter) query = query.eq("posicao", posicaoFilter);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw error;

    const records = data || [];
    const vehicleById = Object.fromEntries(vehiclesCache.map((v) => [v.id, v]));

    const recordCards = records.map((r) => {
      const v = vehicleById[r.vehicle_id];
      return `
        <div class="card">
          <div class="entity-card-head">
            <div class="entity-title-row">
              <div class="entity-icon">${TIRE_ICON}</div>
              <div>
                <div class="entity-label">${escapeHtml(vehicleLabel(v))}</div>
                <div class="entity-name">${escapeHtml(POSICAO_PNEU_LABELS[r.posicao] || r.posicao)}</div>
              </div>
            </div>
          </div>
          <div class="detail-grid">
            <div><div class="detail-label">Data última troca</div><div class="detail-value">${formatDateBR(r.data_troca)}</div></div>
            <div><div class="detail-label">Km na troca</div><div class="detail-value">${formatNumber(r.km_troca)}</div></div>
            <div><div class="detail-label">Fabricante</div><div class="detail-value">${escapeHtml(r.fabricante)}</div></div>
            <div><div class="detail-label">Local de aquisição</div><div class="detail-value">${escapeHtml(r.local_aquisicao)}</div></div>
            <div><div class="detail-label">Observações</div><div class="detail-value">${r.observacoes ? escapeHtml(r.observacoes) : "—"}</div></div>
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

    // Veículos sem nenhuma troca de pneu lançada não aparecem em
    // tire_changes_status. Sem filtro de posição/status ativo, listamos
    // esses veículos à parte, para deixar claro o que ainda falta lançar.
    let missingCards = [];
    if (!statusFilter && !posicaoFilter) {
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
            <div class="entity-icon">${TIRE_ICON}</div>
            <div>
              <div class="entity-label">Veículo/equipamento</div>
              <div class="entity-name">${escapeHtml(vehicleLabel(v))}</div>
            </div>
          </div>
          <p class="empty-state">Sem registro de troca de pneu.</p>
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
  qs("#form-title").textContent = "Editar troca de pneu";
  qs("#record-id").value = record.id;
  qs("#f-vehicle").value = record.vehicle_id;
  qs("#f-posicao").value = record.posicao;
  qs("#f-fabricante").value = record.fabricante;
  qs("#f-local-aquisicao").value = record.local_aquisicao;
  qs("#f-data").value = record.data_troca;
  qs("#f-km").value = record.km_troca;
  qs("#f-observacoes").value = record.observacoes || "";
  qs("#cancel-edit").style.display = "inline-block";
  setActiveTab("principal");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetRecordForm() {
  qs("#form-title").textContent = "Nova troca de pneu";
  qs("#record-form").reset();
  qs("#record-id").value = "";
  qs("#cancel-edit").style.display = "none";
  setActiveTab("principal");
  renderErrors(qs("#form-errors"), []);
}

async function deleteRecord(id) {
  if (!confirm("Excluir este registro de troca de pneu?")) return;
  try {
    const client = requireSupabase();
    const { error } = await client.from("tire_changes").delete().eq("id", id);
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
  const posicao = qs("#f-posicao").value;
  const fabricante = qs("#f-fabricante").value.trim();
  const localAquisicao = qs("#f-local-aquisicao").value.trim();
  const data = qs("#f-data").value;
  const km = qs("#f-km").value;
  const observacoes = qs("#f-observacoes").value.trim();
  const id = qs("#record-id").value;

  v.requireText(vehicleId, "Veículo");
  v.requireText(posicao, "Posição do pneu");
  v.requireText(fabricante, "Fabricante");
  v.requireText(localAquisicao, "Local de aquisição");
  v.requireDate(data, "Data da troca");
  v.requireNonNegativeNumber(km, "Km na troca");

  renderErrors(errorsBox, v.errors);
  if (!v.isValid()) return;

  const payload = {
    vehicle_id: vehicleId,
    posicao,
    fabricante,
    local_aquisicao: localAquisicao,
    data_troca: data,
    km_troca: Number(km),
    observacoes: observacoes || null,
  };

  try {
    const client = requireSupabase();
    const { error } = id
      ? await client.from("tire_changes").update(payload).eq("id", id)
      : await client.from("tire_changes").insert(payload);
    if (error) throw error;
    resetRecordForm();
    loadRecordList();
  } catch (err) {
    renderErrors(errorsBox, [err.message || String(err)]);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupFormTabs();
  try {
    await loadVehiclesIntoSelects();
  } catch (err) {
    renderInfo(qs("#list-msg"), err.message || String(err));
  }
  loadRecordList();
  qs("#record-form").addEventListener("submit", submitRecordForm);
  qs("#cancel-edit").addEventListener("click", resetRecordForm);
  qs("#filter-vehicle").addEventListener("change", loadRecordList);
  qs("#filter-posicao").addEventListener("change", loadRecordList);
  qs("#filter-status").addEventListener("change", loadRecordList);
});
