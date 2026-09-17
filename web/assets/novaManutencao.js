let vehiclesCache = [];
let editingId = null;

function vehicleLabel(v) {
  if (!v) return "—";
  return `${TIPO_VEICULO_LABELS[v.tipo] || v.tipo} — ${v.identificador}${v.nome ? " (" + v.nome + ")" : ""}`;
}

async function loadVehiclesIntoSelect() {
  const client = requireSupabase();
  const { data, error } = await client.from("vehicles").select("*").order("identificador");
  if (error) throw error;
  vehiclesCache = data || [];
  const options = vehiclesCache.map((v) => `<option value="${v.id}">${escapeHtml(vehicleLabel(v))}</option>`).join("");
  qs("#f-vehicle").innerHTML = `<option value="">Selecione...</option>${options}`;
}

function updateFieldsForTipo() {
  const tipo = qs("#f-tipo").value;
  const isOleo = tipo === "oleo";
  const isManutencao = tipo === "preventiva" || tipo === "corretiva";
  qs("#fields-manutencao").hidden = !isManutencao;
  qs("#fields-oleo").hidden = !isOleo;
}

function resetForm() {
  qs("#record-form").reset();
  updateFieldsForTipo();
  renderErrors(qs("#form-errors"), []);
  renderInfo(qs("#form-info"), "");
}

async function loadRecordForEdit(id) {
  const client = requireSupabase();
  const { data, error } = await client.from("maintenance_records").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) {
    renderErrors(qs("#form-errors"), ["Registro não encontrado."]);
    return;
  }

  editingId = data.id;
  qs("h1").textContent = "Editar Manutenção";
  qs(".subtitle").textContent = "Alterando um registro existente do Histórico";

  const tipoOleoOption = qs('#f-tipo option[value="oleo"]');
  if (tipoOleoOption) tipoOleoOption.disabled = true;

  qs("#f-vehicle").value = data.vehicle_id;
  qs("#f-tipo").value = data.tipo_manutencao;
  qs("#f-data").value = data.data_manutencao;
  qs("#f-observacoes").value = data.servico || "";
  qs("#f-km-horas").value = data.km_horas;
  qs("#f-unidade").value = data.unidade_medida;
  qs("#f-custo").value = data.custo;
  qs("#f-responsavel").value = data.responsavel;
  qs("#f-proxima").value = data.proxima_manutencao_data || "";
  qs("#f-horimetro-manutencao").value = data.horimetro ?? "";
  updateFieldsForTipo();

  qs('button[type="submit"]').textContent = "Salvar alterações";
}

async function submitForm(evt) {
  evt.preventDefault();
  const errorsBox = qs("#form-errors");
  const infoBox = qs("#form-info");
  renderInfo(infoBox, "");
  const v = new FormValidator();

  const vehicleId = qs("#f-vehicle").value;
  const tipo = qs("#f-tipo").value;
  const data = qs("#f-data").value;
  const observacoes = qs("#f-observacoes").value.trim();

  v.requireText(vehicleId, "Veículo/equipamento");
  v.requireText(tipo, "Tipo de manutenção");
  v.requireDate(data, "Data");

  try {
    const client = requireSupabase();

    if (tipo === "oleo") {
      const localTroca = qs("#f-local-troca").value.trim();
      const condutor = qs("#f-condutor").value.trim();
      const kmAtual = qs("#f-km-atual").value;
      const horimetro = qs("#f-horimetro").value;

      v.requireText(localTroca, "Local da troca");
      v.requireText(condutor, "Condutor");
      v.requireNonNegativeNumber(kmAtual, "Km atual");
      v.optionalNonNegativeNumber(horimetro, "Horímetro atual");

      renderErrors(errorsBox, v.errors);
      if (!v.isValid()) return;

      const payload = {
        vehicle_id: vehicleId,
        local_troca: localTroca,
        condutor,
        km_atual: Number(kmAtual),
        horimetro_atual: horimetro === "" ? null : Number(horimetro),
        data_ultima_troca: data,
        observacoes: observacoes || null,
      };
      const { error } = await client.from("oil_changes").insert(payload);
      if (error) throw error;
    } else {
      const kmHoras = qs("#f-km-horas").value;
      const unidade = qs("#f-unidade").value;
      const custo = qs("#f-custo").value;
      const responsavel = qs("#f-responsavel").value.trim();
      const proxima = qs("#f-proxima").value;
      const horimetroManutencao = qs("#f-horimetro-manutencao").value;

      v.requireNonNegativeNumber(kmHoras, "Km ou horas de uso");
      v.requireNonNegativeNumber(custo, "Custo");
      v.requireText(responsavel, "Responsável pela execução");
      v.requireText(observacoes, "Observações");
      v.optionalDate(proxima, "Data prevista da próxima manutenção");
      v.optionalNonNegativeNumber(horimetroManutencao, "Horímetro");

      renderErrors(errorsBox, v.errors);
      if (!v.isValid()) return;

      const payload = {
        vehicle_id: vehicleId,
        tipo_manutencao: tipo,
        data_manutencao: data,
        km_horas: Number(kmHoras),
        unidade_medida: unidade,
        custo: Number(custo),
        servico: observacoes,
        responsavel,
        proxima_manutencao_data: proxima || null,
        horimetro: horimetroManutencao === "" ? null : Number(horimetroManutencao),
      };
      const { error } = editingId
        ? await client.from("maintenance_records").update(payload).eq("id", editingId)
        : await client.from("maintenance_records").insert(payload);
      if (error) throw error;
    }

    if (editingId) {
      window.location.href = "manutencoes.html";
      return;
    }
    resetForm();
    renderInfo(infoBox, "Registro salvo com sucesso.");
  } catch (err) {
    renderErrors(errorsBox, [err.message || String(err)]);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadVehiclesIntoSelect();
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (editId) {
      await loadRecordForEdit(editId);
    }
  } catch (err) {
    renderErrors(qs("#form-errors"), [err.message || String(err)]);
  }
  updateFieldsForTipo();
  qs("#f-tipo").addEventListener("change", updateFieldsForTipo);
  qs("#record-form").addEventListener("submit", submitForm);
});
