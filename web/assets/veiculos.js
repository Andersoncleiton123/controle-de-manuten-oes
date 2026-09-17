const VEHICLE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="14" height="7" rx="2"/><path d="M17 11h3l1 3v2h-4"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/></svg>';

async function loadVehicleList() {
  const container = qs("#vehicle-list");
  const listMsg = qs("#list-msg");
  try {
    const client = requireSupabase();
    const { data, error } = await client.from("vehicles").select("*").order("nome", { nullsFirst: false }).order("identificador");
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p class="empty-state">Nenhum veículo cadastrado ainda.</p>`;
      return;
    }

    container.innerHTML = data
      .map(
        (v) => `
        <div class="card">
          <div class="entity-title-row">
            <div class="entity-icon">${VEHICLE_ICON}</div>
            <div>
              <div class="entity-label">${escapeHtml(TIPO_VEICULO_LABELS[v.tipo] || v.tipo)}</div>
              <div class="entity-name">${escapeHtml(v.identificador)}${v.nome ? " — " + escapeHtml(v.nome) : ""}</div>
            </div>
          </div>
          <div class="row-actions">
            <button type="button" class="secondary" data-edit="${v.id}">Editar</button>
            <button type="button" class="danger" data-delete="${v.id}">Excluir</button>
          </div>
        </div>`
      )
      .join("");

    qsa("[data-edit]", container).forEach((btn) =>
      btn.addEventListener("click", () => startEditVehicle(data.find((v) => v.id === btn.dataset.edit)))
    );
    qsa("[data-delete]", container).forEach((btn) =>
      btn.addEventListener("click", () => deleteVehicle(btn.dataset.delete))
    );
  } catch (err) {
    renderInfo(listMsg, err.message || String(err));
  }
}

function startEditVehicle(vehicle) {
  if (!vehicle) return;
  qs("#form-title").textContent = "Editar veículo/equipamento";
  qs("#vehicle-id").value = vehicle.id;
  qs("#vehicle-tipo").value = vehicle.tipo;
  qs("#vehicle-identificador").value = vehicle.identificador;
  qs("#vehicle-nome").value = vehicle.nome || "";
  qs("#cancel-edit").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetVehicleForm() {
  qs("#form-title").textContent = "Novo veículo/equipamento";
  qs("#vehicle-form").reset();
  qs("#vehicle-id").value = "";
  qs("#cancel-edit").style.display = "none";
  renderErrors(qs("#form-errors"), []);
}

async function deleteVehicle(id) {
  if (!confirm("Excluir este veículo? Todos os registros de manutenção, óleo, pneu e lubrificante associados também serão excluídos.")) return;
  try {
    const client = requireSupabase();
    const { error } = await client.from("vehicles").delete().eq("id", id);
    if (error) throw error;
    loadVehicleList();
  } catch (err) {
    renderInfo(qs("#list-msg"), err.message || String(err));
  }
}

async function submitVehicleForm(evt) {
  evt.preventDefault();
  const errorsBox = qs("#form-errors");
  const v = new FormValidator();

  const tipo = qs("#vehicle-tipo").value;
  const identificador = qs("#vehicle-identificador").value.trim();
  const nome = qs("#vehicle-nome").value.trim();
  const id = qs("#vehicle-id").value;

  v.requireText(tipo, "Tipo");
  v.requireText(identificador, "Placa / número de identificação");

  renderErrors(errorsBox, v.errors);
  if (!v.isValid()) return;

  const payload = { tipo, identificador, nome: nome || null };

  try {
    const client = requireSupabase();
    const { error } = id
      ? await client.from("vehicles").update(payload).eq("id", id)
      : await client.from("vehicles").insert(payload);
    if (error) throw error;
    resetVehicleForm();
    loadVehicleList();
  } catch (err) {
    renderErrors(errorsBox, [err.message || String(err)]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadVehicleList();
  qs("#vehicle-form").addEventListener("submit", submitVehicleForm);
  qs("#cancel-edit").addEventListener("click", resetVehicleForm);
});
