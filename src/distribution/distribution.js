export function bindNewDistributionUi(state, deps) {
  const root = document.querySelector(".newdist-root");
  if (!root) return;

  root.addEventListener("click", deps.handleDistributionClick);
  root.addEventListener("input", deps.handleDistributionInput);
  root.addEventListener("change", deps.handleDistributionChange);

  document.getElementById("newdistResetBtn")?.addEventListener("click", deps.handleDistributionReset);
  document.getElementById("newdistLoadBtn")?.addEventListener("click", deps.handleDistributionLoadExcel);
  document.getElementById("newdistOpenBossManageBtn")?.addEventListener("click", () => deps.openDistributionModal("newdistBossManageModal"));
  document.getElementById("newdistOpenNameRuleBtn")?.addEventListener("click", () => deps.openDistributionModal("newdistNameRuleModal"));
  document.getElementById("newdistBossAddBtn")?.addEventListener("click", deps.handleDistributionAddBossRule);
  document.getElementById("newdistBossSaveBtn")?.addEventListener("click", deps.handleDistributionSaveBossRules);
  document.getElementById("newdistNameRuleAddBtn")?.addEventListener("click", deps.handleDistributionAddNameRule);
  document.getElementById("newdistNameRuleSaveBtn")?.addEventListener("click", deps.handleDistributionSaveNameRules);
  document.getElementById("newdistLogEditApplyBtn")?.addEventListener("click", deps.handleDistributionApplyLogEdit);
  bindDistributionButtonIds(["distributionSaveBtn", "distributionExportBtn", "newdistExportBtn"], deps.handleDistributionExport);
  bindDistributionButtonIds(["distributionFinalSaveBtn", "newdistFinalSaveBtn"], deps.handleDistributionFinalSave);

  ["mainland", "world"].forEach((groupKey) => {
    const upper = groupKey === "mainland" ? "Mainland" : "World";
    document.getElementById(`newdist${upper}AddDeductionBtn`)?.addEventListener("click", () => deps.handleDistributionAddDeduction(groupKey));
    document.getElementById(`newdist${upper}ApplyDeductionBtn`)?.addEventListener("click", () => deps.handleDistributionApplyDeductions(groupKey));
    document.getElementById(`newdist${upper}RefreshBtn`)?.addEventListener("click", () => deps.handleDistributionRefreshGroup(groupKey));
    document.getElementById(`newdist${upper}CalcBtn`)?.addEventListener("click", () => deps.handleDistributionCalculate(groupKey));
    document.getElementById(`newdist${upper}ClearBtn`)?.addEventListener("click", () => deps.handleDistributionClearResults(groupKey));
  });

  root.querySelectorAll(".newdist-subtab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.distribution.activeSubtab = tab.dataset.newdistTab || "mainland";
      deps.updateDistributionSubtabs();
    });
  });

  root.querySelectorAll("[data-newdist-close]").forEach((button) => {
    button.addEventListener("click", () => deps.closeDistributionModal(button.dataset.newdistClose));
  });

  deps.updateDistributionSubtabs();
}

function bindDistributionButtonIds(ids, handler) {
  ids.forEach((id) => {
    const button = document.getElementById(id);
    if (!button || button.dataset.distributionBound === "true") return;
    button.dataset.distributionBound = "true";
    button.addEventListener("click", handler);
  });
}

export function renderDistributionTab(deps) {
  renderDistributionCommonInputs(deps);
  renderDistributionCommonSummary(deps);
  renderDistributionGroup(deps, "mainland");
  renderDistributionGroup(deps, "world");
  renderDistributionBossRules(deps);
  renderDistributionNameRules(deps);
  deps.updateDistributionSubtabs();
}

export function renderDistributionCommonInputs({ state, setValueIfNeeded }) {
  const distribution = state.distribution;
  setValueIfNeeded("newdistTotalDiamondInput", distribution.totalDiamond || distribution.totalDiamond === 0 ? String(distribution.totalDiamond) : "");
  setValueIfNeeded("newdistMainlandRatioInput", String(distribution.mainlandRatio));
  setValueIfNeeded("newdistWorldRatioInput", String(distribution.worldRatio));
}

export function renderDistributionCommonSummary({
  state,
  getDistributionAssignedAmounts,
  setText,
  formatNumber
}) {
  const distribution = state.distribution;
  const assigned = getDistributionAssignedAmounts();
  setText("newdistSummaryTotalDiamond", formatNumber(distribution.totalDiamond));
  setText("newdistSummaryMainlandAssigned", formatNumber(assigned.mainland));
  setText("newdistSummaryWorldAssigned", formatNumber(assigned.world));

  const loadedCount = distribution.loadedLogs.length;
  const unknownCount = distribution.unknownBosses.length;
  let statusText = "대기";
  if (distribution.workbookName && loadedCount === 0) {
    statusText = "엑셀 로드 완료";
  }
  if (loadedCount > 0) {
    statusText = `작업 로그 ${loadedCount}건`;
  }
  if (unknownCount > 0) {
    statusText += ` / 미분류 ${unknownCount}건`;
  }
  setText("newdistSummaryStatus", statusText);
}

export function renderDistributionGroup(deps, groupKey) {
  const group = deps.state.distribution[groupKey];
  const summary = deps.calculateDistributionGroupSummary(groupKey);

  group.summary = summary;

  const prefix = groupKey === "mainland" ? "newdistMainland" : "newdistWorld";
  deps.setText(`${prefix}Assigned`, deps.formatNumber(summary.assignedDiamond));
  deps.setText(`${prefix}DeductionTotal`, deps.formatNumber(summary.deductionTotal));
  deps.setText(`${prefix}ActualDiamond`, deps.formatNumber(summary.actualDiamond));
  deps.setText(`${prefix}TotalPoints`, deps.formatNumber(summary.totalPoints));
  deps.setText(`${prefix}PerPoint`, deps.formatDecimal(summary.perPoint, 1));
  deps.setText(`${prefix}Remaining`, deps.formatNumber(summary.remainingDiamond));
  deps.setText(`${prefix}DeductionChip`, deps.formatNumber(summary.deductionTotal));
  deps.setText(`${prefix}ActualChip`, deps.formatNumber(summary.actualDiamond));

  renderDistributionDeductionTable(deps, groupKey);
  renderDistributionLogs(deps, groupKey);
  renderDistributionResults(deps, groupKey);
}

export function renderDistributionDeductionTable(deps, groupKey) {
  const body = document.getElementById(groupKey === "mainland" ? "newdistMainlandDeductionBody" : "newdistWorldDeductionBody");
  if (!body) return;

  const rows = deps.state.distribution[groupKey].deductions;
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="5" class="distribution-empty-row">등록된 공제 항목이 없습니다.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((row) => {
    const appliedRow = deps.findAppliedDistributionDeductionRow(groupKey, row.id);
    const deductionAmount = appliedRow ? deps.getDistributionDeductionAmount(groupKey, appliedRow) : 0;

    return `
    <tr>
      <td><input class="newdist-input-sm" type="text" data-role="newdist-deduction-name" data-group="${groupKey}" data-id="${row.id}" value="${deps.escapeAttr(row.name)}"></td>
      <td>
        <select class="newdist-select-sm" data-role="newdist-deduction-mode" data-group="${groupKey}" data-id="${row.id}">
          <option value="percent" ${row.mode === "percent" ? "selected" : ""}>%</option>
          <option value="amount" ${row.mode === "amount" ? "selected" : ""}>직접금액</option>
        </select>
      </td>
      <td><input class="newdist-input-sm" type="number" min="0" step="0.01" data-role="newdist-deduction-value" data-group="${groupKey}" data-id="${row.id}" value="${deps.escapeAttr(row.value ?? "")}"></td>
      <td class="right">${deps.formatNumber(deductionAmount)}</td>
      <td class="center"><button class="btn btn-outline" type="button" data-role="newdist-delete-deduction" data-group="${groupKey}" data-id="${row.id}">삭제</button></td>
    </tr>
  `;
  }).join("");
}

export function renderDistributionLogs(deps, groupKey) {
  const body = document.getElementById(groupKey === "mainland" ? "newdistMainlandLogBody" : "newdistWorldLogBody");
  if (!body) return;

  const logs = deps.state.distribution[groupKey].logs;
  if (!logs.length) {
    body.innerHTML = `<tr><td colspan="9" class="distribution-empty-row">표시할 작업 로그가 없습니다.</td></tr>`;
    return;
  }

  body.innerHTML = logs.map((log, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>${deps.escapeHtml(log.dateText || "-")}</td>
      <td>${deps.escapeHtml(log.timeText || "-")}</td>
      <td>${deps.escapeHtml(log.boss || "-")}</td>
      <td class="center"><span class="newdist-badge ${groupKey === "mainland" ? "newdist-badge-mainland" : "newdist-badge-world"}">${groupKey === "mainland" ? "본토" : "월드"}</span></td>
      <td>${deps.escapeHtml(log.cutter || "-")}</td>
      <td class="newdist-log-participants-cell">${deps.escapeHtml(log.rawParticipants.join(", ")) || "-"}</td>
      <td class="newdist-log-participants-cell">${deps.escapeHtml(log.workingParticipants.join(", ")) || "-"}</td>
      <td class="center"><button class="btn btn-outline newdist-log-edit-btn" type="button" data-role="newdist-edit-log" data-group="${groupKey}" data-log-key="${log.key}">수정</button></td>
    </tr>
  `).join("");
}

export function renderDistributionResults(deps, groupKey) {
  const body = document.getElementById(groupKey === "mainland" ? "newdistMainlandResultBody" : "newdistWorldResultBody");
  if (!body) return;

  const rows = deps.state.distribution[groupKey].results;
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7" class="distribution-empty-row">계산 결과가 없습니다.</td></tr>`;
    return;
  }

  const sortedRows = [...rows].sort((left, right) => {
    const leftRetired = left.note === "탈퇴한 길드원";
    const rightRetired = right.note === "탈퇴한 길드원";
    if (leftRetired !== rightRetired) return leftRetired ? 1 : -1;

    const pointDiff = Number(right.points ?? 0) - Number(left.points ?? 0);
    if (pointDiff !== 0) return pointDiff;
    return String(left.memberName ?? "").localeCompare(String(right.memberName ?? ""), "ko");
  });

  body.innerHTML = sortedRows.map((row, index) => `
    <tr class="${row.note === "탈퇴한 길드원" ? "newdist-danger-soft" : ""}">
      <td class="center">${index + 1}</td>
      <td>${deps.escapeHtml(row.memberName)}</td>
      <td class="right">${deps.formatNumber(row.points)}</td>
      <td class="right">${deps.formatPercent(row.ratio)}</td>
      <td class="right">${deps.formatDecimal(row.rawDiamond, 1)}</td>
      <td class="right">${deps.formatNumber(row.finalDiamond)}</td>
      <td>${deps.escapeHtml(row.note || "-")}</td>
    </tr>
  `).join("");
}

export function renderDistributionBossRules({ state, escapeAttr }) {
  const body = document.getElementById("newdistBossRuleBody");
  if (!body) return;
  const rows = state.distribution.bossRules;
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="5" class="distribution-empty-row">등록된 분배 보스가 없습니다.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((row, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td><input class="newdist-input-sm" type="text" data-role="newdist-boss-name" data-id="${row.id}" value="${escapeAttr(row.name)}"></td>
      <td class="right"><input class="newdist-input-sm" type="number" min="0" step="1" data-role="newdist-boss-score" data-id="${row.id}" value="${escapeAttr(row.score)}"></td>
      <td class="center">
        <select class="newdist-select-sm" data-role="newdist-boss-group" data-id="${row.id}">
          <option value="mainland" ${row.group === "mainland" ? "selected" : ""}>본토</option>
          <option value="world" ${row.group === "world" ? "selected" : ""}>월드</option>
        </select>
      </td>
      <td class="center"><button class="btn btn-outline" type="button" data-role="newdist-delete-boss" data-id="${row.id}">삭제</button></td>
    </tr>
  `).join("");
}

export function renderDistributionNameRules({ state, escapeAttr }) {
  const body = document.getElementById("newdistNameRuleBody");
  if (!body) return;
  const rows = state.distribution.nameRules;
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="4" class="distribution-empty-row">등록된 이름 정리 규칙이 없습니다.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((row, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td><input class="newdist-input-sm" type="text" data-role="newdist-name-source" data-id="${row.id}" value="${escapeAttr(row.source)}"></td>
      <td><input class="newdist-input-sm" type="text" data-role="newdist-name-target" data-id="${row.id}" value="${escapeAttr(row.target)}"></td>
      <td class="center"><button class="btn btn-outline" type="button" data-role="newdist-delete-name" data-id="${row.id}">삭제</button></td>
    </tr>
  `).join("");
}

export function calculateDistributionGroupSummary(state, groupKey) {
  const distribution = state.distribution;
  const assigned = getDistributionAssignedAmounts(state)[groupKey];
  const deductions = distribution[groupKey].appliedDeductions;
  const deductionTotal = deductions.reduce((sum, row) => sum + getDistributionDeductionAmount(state, groupKey, row), 0);
  const actualDiamond = Math.max(0, assigned - deductionTotal);

  const activePointTotal = distribution[groupKey].results
    .filter((row) => row.note !== "탈퇴한 길드원")
    .reduce((sum, row) => sum + row.points, 0);

  const perPoint = activePointTotal > 0 ? actualDiamond / activePointTotal : 0;
  const distributedDiamond = distribution[groupKey].results
    .filter((row) => row.note !== "탈퇴한 길드원")
    .reduce((sum, row) => sum + row.finalDiamond, 0);

  return {
    assignedDiamond: assigned,
    deductionTotal,
    actualDiamond,
    totalPoints: activePointTotal,
    perPoint,
    remainingDiamond: Math.max(0, actualDiamond - distributedDiamond)
  };
}

export function sanitizeDistributionBossRules(state) {
  state.distribution.bossRules = state.distribution.bossRules
    .map((row) => ({
      ...row,
      name: String(row.name || "").trim(),
      score: Math.max(0, Math.floor(Number(row.score) || 0)),
      group: row.group === "world" ? "world" : "mainland"
    }))
    .filter((row) => row.name);
}

export function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

export async function loadDistributionBossRulesFromDb({
  state,
  supabase,
  distributionBossRulesTable
}, forceReload = false) {
  if (state.distribution.bossRulesLoaded && !forceReload) return;

  const res = await supabase
    .from(distributionBossRulesTable)
    .select("id, name, score, group_type, display_order, updated_at")
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  if (res.error) {
    throw new Error(`분배 보스 목록 조회 중 오류가 발생했습니다.
${res.error.message}`);
  }

  const rows = Array.isArray(res.data) ? res.data : [];
  state.distribution.bossRules = rows.map((row) => ({
    id: row.id,
    name: String(row.name || "").trim(),
    score: Math.max(0, Math.floor(Number(row.score) || 0)),
    group: row.group_type === "world" ? "world" : "mainland"
  }));
  state.distribution.bossRulesLoaded = true;
  state.distribution.bossRuleDbIds = rows.map((row) => row.id).filter(Boolean);
}

export async function ensureDistributionBossRulesLoaded(deps) {
  if (deps.state.distribution.bossRulesLoaded) return;
  await loadDistributionBossRulesFromDb(deps);
}

export async function saveDistributionBossRulesToDb({
  state,
  supabase,
  distributionBossRulesTable
}) {
  const rows = state.distribution.bossRules;
  const existingIds = new Set((state.distribution.bossRuleDbIds || []).filter(Boolean));
  const keptIds = new Set(rows.map((row) => row.id).filter((id) => isUuidLike(id)));
  const deleteIds = Array.from(existingIds).filter((id) => !keptIds.has(id));

  if (deleteIds.length) {
    const deleteRes = await supabase
      .from(distributionBossRulesTable)
      .delete()
      .in("id", deleteIds);

    if (deleteRes.error) {
      throw new Error(`분배 보스 삭제 중 오류가 발생했습니다.
${deleteRes.error.message}`);
    }
  }

  const now = new Date().toISOString();

  const normalizedRows = rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    score: Math.max(0, Math.floor(Number(row.score) || 0)),
    group_type: row.group === "world" ? "world" : "mainland",
    display_order: index + 1,
    updated_at: now
  }));

  const updateRows = normalizedRows.filter((row) => isUuidLike(row.id));
  const insertRows = normalizedRows
    .filter((row) => !isUuidLike(row.id))
    .map(({ name, score, group_type, display_order, updated_at }) => ({
      name,
      score,
      group_type,
      display_order,
      updated_at
    }));

  for (const row of updateRows) {
    const updateRes = await supabase
      .from(distributionBossRulesTable)
      .update({
        name: row.name,
        score: row.score,
        group_type: row.group_type,
        display_order: row.display_order,
        updated_at: row.updated_at
      })
      .eq("id", row.id);

    if (updateRes.error) {
      throw new Error(`분배 보스 수정 중 오류가 발생했습니다.
${updateRes.error.message}`);
    }
  }

  if (insertRows.length) {
    const insertRes = await supabase
      .from(distributionBossRulesTable)
      .insert(insertRows);

    if (insertRes.error) {
      throw new Error(`분배 보스 저장 중 오류가 발생했습니다.
${insertRes.error.message}`);
    }
  }

  await loadDistributionBossRulesFromDb({ state, supabase, distributionBossRulesTable }, true);
}

export function handleDistributionExport({
  state,
  XLSX,
  getDistributionCombinedResults,
  getDistributionPeriodRange,
  formatPercent,
  formatBossParticipationFileDate,
  alertFn = alert
}) {
  const combinedResults = getDistributionCombinedResults();
  if (!combinedResults.length) {
    alertFn("엑셀 저장할 분배 계산 결과가 없습니다. 먼저 계산을 진행해주세요.");
    return;
  }

  const period = getDistributionPeriodRange();
  const workbook = XLSX.utils.book_new();

  const resultRows = combinedResults.map((row, index) => ({
    No: index + 1,
    길드원: row.memberName,
    참여점수: row.points,
    참여비율: formatPercent(row.ratio),
    계산다이아: Math.round(Number(row.rawDiamond ?? 0) * 10) / 10,
    최종분배다이아: row.finalDiamond,
    비고: row.note || ""
  }));

  const logRows = state.distribution.loadedLogs.map((log, index) => ({
    No: index + 1,
    날짜: log.dateText || "",
    시간: log.timeText || "",
    보스: log.boss || "",
    구분: log.group === "world" ? "월드" : "본토",
    점수: log.score ?? 0,
    컷자: log.cutter || "",
    참여자: (log.workingParticipants || []).join(", ")
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resultRows), "분배결과");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logRows), "보스로그");
  XLSX.writeFile(workbook, `분배결과 ${formatBossParticipationFileDate(period.startDate || "0000-00-00")}-${formatBossParticipationFileDate(period.endDate || "0000-00-00")}.xlsx`);
}

export function writeDistributionHistoryWorkbook({
  item,
  detail,
  XLSX,
  formatPercent,
  formatBossParticipationFileDate
}) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [{
    저장일시: item.savedAt,
    대상기간: `${item.startDate} ~ ${item.endDate}`,
    총분배다이아: item.totalDiamond,
    실제분배다이아: item.actualDiamond,
    전체참여점수: item.totalPoints,
    일점당다이아: item.diamondPerPoint,
    남은다이아: item.remainingDiamond,
    엑셀파일명: item.workbookName || ""
  }];

  const memberRows = (detail.memberRows || []).map((row, index) => ({
    No: index + 1,
    길드원: row.memberName,
    참여점수: row.points,
    참여비율: formatPercent(row.ratio),
    계산다이아: Math.round(Number(row.rawDiamond ?? 0) * 10) / 10,
    최종분배다이아: row.finalDiamond,
    비고: row.note || ""
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "분배요약");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(memberRows), "길드원별분배");
  XLSX.writeFile(workbook, `분배이력 ${formatBossParticipationFileDate(item.startDate)}-${formatBossParticipationFileDate(item.endDate)}.xlsx`);
}

export async function cleanupDistributionHistorySave(supabase, historyId) {
  if (!historyId) return;

  await supabase.from("distribution_history_members").delete().eq("distribution_history_id", historyId);
  await supabase.from("distribution_history_deductions").delete().eq("distribution_history_id", historyId);
  await supabase.from("distribution_history_groups").delete().eq("distribution_history_id", historyId);
  await supabase.from("distribution_histories").delete().eq("id", historyId);
}

export function setDistributionFinalSaveButtonsDisabled(disabled) {
  ["distributionFinalSaveBtn", "newdistFinalSaveBtn"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.disabled = Boolean(disabled);
  });
}

export async function handleDistributionFinalSave({
  state,
  supabase,
  getIsDistributionFinalSaving,
  setIsDistributionFinalSaving,
  getDistributionAssignedAmounts,
  getDistributionCombinedResults,
  getDistributionPeriodRange,
  getDistributionCombinedSummary,
  createDistributionSummary,
  getDistributionDeductionAmount,
  normalizeDistributionName,
  loadHistoryData,
  alertFn = alert,
  confirmFn = confirm,
  consoleRef = console
}) {
  if (getIsDistributionFinalSaving()) return;

  const mainlandResults = state.distribution.mainland.results || [];
  const worldResults = state.distribution.world.results || [];
  const assignedAmounts = getDistributionAssignedAmounts();
  const mainlandAssigned = Number(assignedAmounts.mainland ?? 0);
  const worldAssigned = Number(assignedAmounts.world ?? 0);
  const needsMainlandResults = mainlandAssigned > 0;
  const needsWorldResults = worldAssigned > 0;

  if ((needsMainlandResults && !mainlandResults.length) || (needsWorldResults && !worldResults.length)) {
    alertFn("배정 금액이 있는 그룹은 계산 완료 후 최종 저장해주세요.");
    return;
  }

  const combinedResults = getDistributionCombinedResults();
  if (!combinedResults.length) {
    alertFn("저장할 분배 계산 결과가 없습니다. 먼저 계산을 진행해주세요.");
    return;
  }

  const period = getDistributionPeriodRange();
  if (!period.startDate || !period.endDate) {
    alertFn("저장할 보스로그 날짜 정보가 없습니다.");
    return;
  }

  const confirmed = confirmFn(`${period.startDate} ~ ${period.endDate} 분배 결과를 최종 저장하시겠습니까?`);
  if (!confirmed) return;

  setIsDistributionFinalSaving(true);
  setDistributionFinalSaveButtonsDisabled(true);

  try {
    const duplicateRes = await supabase
      .from("distribution_histories")
      .select("id")
      .eq("period_start", period.startDate)
      .eq("period_end", period.endDate)
      .order("saved_at", { ascending: false });

    if (duplicateRes.error) {
      alertFn(`기존 분배 이력 확인 중 오류가 발생했습니다.\n${duplicateRes.error.message}`);
      return;
    }

    const hasDuplicatePeriod = (duplicateRes.data || [])
      .some((row) => String(row.id || "").trim());

    if (hasDuplicatePeriod) {
      alertFn("중복된 날짜 데이터가 있습니다.");
    }

    const summary = getDistributionCombinedSummary();
    const mainlandSummary = state.distribution.mainland.summary || createDistributionSummary();
    const worldSummary = state.distribution.world.summary || createDistributionSummary();
    const now = new Date().toISOString();

    const historyPayload = {
      period_start: period.startDate,
      period_end: period.endDate,
      total_diamond: Math.max(0, Math.floor(Number(state.distribution.totalDiamond) || 0)),
      mainland_ratio: Number(state.distribution.mainlandRatio || 0),
      world_ratio: Number(state.distribution.worldRatio || 0),
      total_actual_diamond: Math.floor(summary.actualDiamond),
      total_points: Math.floor(summary.totalPoints),
      total_remaining_diamond: Math.floor(summary.remainingDiamond),
      workbook_name: state.distribution.workbookName || "",
      saved_at: now,
      updated_at: now
    };

    const historyRes = await supabase
      .from("distribution_histories")
      .insert(historyPayload)
      .select("id")
      .single();

    if (historyRes.error) {
      alertFn(`분배 이력 저장 중 오류가 발생했습니다.
${historyRes.error.message}`);
      return;
    }

    const historyId = historyRes.data?.id;
    const groupRows = [
      {
        distribution_history_id: historyId,
        group_type: "mainland",
        group_name: "본토",
        assigned_diamond: Math.floor(Number(mainlandSummary.assignedDiamond ?? 0)),
        deduction_total: Math.floor(Number(mainlandSummary.deductionTotal ?? 0)),
        actual_diamond: Math.floor(Number(mainlandSummary.actualDiamond ?? 0)),
        total_points: Number(mainlandSummary.totalPoints ?? 0),
        diamond_per_point: Number(mainlandSummary.perPoint ?? 0),
        remaining_diamond: Math.floor(Number(mainlandSummary.remainingDiamond ?? 0)),
        display_order: 1
      },
      {
        distribution_history_id: historyId,
        group_type: "world",
        group_name: "월드",
        assigned_diamond: Math.floor(Number(worldSummary.assignedDiamond ?? 0)),
        deduction_total: Math.floor(Number(worldSummary.deductionTotal ?? 0)),
        actual_diamond: Math.floor(Number(worldSummary.actualDiamond ?? 0)),
        total_points: Number(worldSummary.totalPoints ?? 0),
        diamond_per_point: Number(worldSummary.perPoint ?? 0),
        remaining_diamond: Math.floor(Number(worldSummary.remainingDiamond ?? 0)),
        display_order: 2
      }
    ];

    const groupRes = await supabase
      .from("distribution_history_groups")
      .insert(groupRows);

    if (groupRes.error) {
      await cleanupDistributionHistorySave(supabase, historyId);
      alertFn(`분배 이력 그룹 요약 저장 중 오류가 발생했습니다.\n${groupRes.error.message}`);
      return;
    }

    const deductionRows = [];
    ["mainland", "world"].forEach((groupKey) => {
      const applied = state.distribution[groupKey]?.appliedDeductions || [];
      applied.forEach((row, index) => {
        deductionRows.push({
          distribution_history_id: historyId,
          group_type: groupKey,
          name: String(row.name || "").trim() || "공제 항목",
          mode: row.mode === "amount" ? "amount" : "percent",
          value: Number(row.value ?? 0),
          amount: Math.floor(getDistributionDeductionAmount(groupKey, row)),
          display_order: index + 1
        });
      });
    });

    if (deductionRows.length) {
      const deductionRes = await supabase
        .from("distribution_history_deductions")
        .insert(deductionRows);

      if (deductionRes.error) {
        await cleanupDistributionHistorySave(supabase, historyId);
        alertFn(`분배 이력 공제 항목 저장 중 오류가 발생했습니다.\n${deductionRes.error.message}`);
        return;
      }
    }

    const mainlandResultMap = new Map(
      (state.distribution.mainland.results || []).map((row) => [normalizeDistributionName(row.memberName), row])
    );
    const worldResultMap = new Map(
      (state.distribution.world.results || []).map((row) => [normalizeDistributionName(row.memberName), row])
    );

    const memberRows = combinedResults.map((row, index) => ({
      distribution_history_id: historyId,
      member_id: row.memberId,
      member_name: row.memberName,
      mainland_points: Number(mainlandResultMap.get(normalizeDistributionName(row.memberName))?.points ?? 0),
      world_points: Number(worldResultMap.get(normalizeDistributionName(row.memberName))?.points ?? 0),
      total_points: Number(row.points ?? 0),
      mainland_diamond: Math.floor(Number(mainlandResultMap.get(normalizeDistributionName(row.memberName))?.finalDiamond ?? 0)),
      world_diamond: Math.floor(Number(worldResultMap.get(normalizeDistributionName(row.memberName))?.finalDiamond ?? 0)),
      final_diamond: Math.floor(Number(row.finalDiamond ?? 0)),
      ratio: Number(row.ratio ?? 0),
      note: row.note || "",
      is_retired: Boolean(row.isRetired),
      display_order: index + 1
    }));

    if (memberRows.length) {
      const memberRes = await supabase
        .from("distribution_history_members")
        .insert(memberRows);

      if (memberRes.error) {
        await cleanupDistributionHistorySave(supabase, historyId);
        alertFn(`분배 이력 길드원 결과 저장 중 오류가 발생했습니다.
${memberRes.error.message}`);
        return;
      }
    }

    try {
      await loadHistoryData();
    } catch (error) {
      consoleRef.warn("분배 이력 새로고침 실패", error);
    }
    alertFn("분배 결과가 최종 저장되었습니다.");
  } finally {
    setIsDistributionFinalSaving(false);
    setDistributionFinalSaveButtonsDisabled(false);
  }
}

export function sanitizeDistributionNameRules(state) {
  state.distribution.nameRules = state.distribution.nameRules
    .map((row) => ({
      ...row,
      source: String(row.source || "").trim(),
      target: String(row.target || "").trim()
    }))
    .filter((row) => row.source && row.target);
}

export function rebuildDistributionWorkingLogs(state) {
  sanitizeDistributionBossRules(state);
  sanitizeDistributionNameRules(state);

  state.distribution.loadedLogs = [];
  state.distribution.unknownBosses = [];
  state.distribution.mainland.logs = [];
  state.distribution.world.logs = [];

  const bossRuleMap = new Map(state.distribution.bossRules.map((row) => [normalizeDistributionName(row.name), row]));
  const nameRuleMap = new Map(state.distribution.nameRules.map((row) => [normalizeDistributionName(row.source), row.target.trim()]));
  const memberNameMap = new Map(state.members.map((member) => [normalizeDistributionName(member.name), member.name]));

  state.distribution.rawLogs.forEach((rawLog) => {
    const bossRule = bossRuleMap.get(normalizeDistributionName(rawLog.boss));
    if (!bossRule) {
      state.distribution.unknownBosses.push(rawLog);
      return;
    }

    const baseParticipants = Array.isArray(rawLog.overrideParticipants) && rawLog.overrideParticipants !== null
      ? rawLog.overrideParticipants
      : rawLog.rawParticipants;

    const workingParticipants = dedupeStrings(baseParticipants.map((name) => {
      const normalized = normalizeDistributionName(name);
      const mappedName = nameRuleMap.get(normalized) || memberNameMap.get(normalized) || String(name).trim();
      return mappedName;
    }).filter(Boolean));

    const nextLog = {
      ...rawLog,
      group: bossRule.group,
      score: bossRule.score,
      workingParticipants
    };

    state.distribution.loadedLogs.push(nextLog);
    state.distribution[bossRule.group].logs.push(nextLog);
  });

  state.distribution.mainland.dirtyLogs = false;
  state.distribution.world.dirtyLogs = false;
}

export function calculateDistributionResults(state, groupKey) {
  const group = state.distribution[groupKey];
  const memberMap = new Map(state.members.map((member) => [normalizeDistributionName(member.name), member]));
  const pointMap = new Map();

  group.logs.forEach((log) => {
    const parsedScore = Number(log.score);
    const score = Number.isFinite(parsedScore) && parsedScore >= 0 ? parsedScore : 0;
    log.workingParticipants.forEach((participant) => {
      const key = normalizeDistributionName(participant);
      const current = pointMap.get(key) || {
        memberName: participant,
        points: 0,
        isRetired: !memberMap.has(key)
      };
      current.memberName = memberMap.get(key)?.name || participant;
      current.points += score;
      current.isRetired = !memberMap.has(key);
      pointMap.set(key, current);
    });
  });

  const assigned = getDistributionAssignedAmounts(state)[groupKey];
  const deductionTotal = group.appliedDeductions.reduce((sum, row) => sum + getDistributionDeductionAmount(state, groupKey, row), 0);
  const actualDiamond = Math.max(0, assigned - deductionTotal);
  const activeTotalPoints = Array.from(pointMap.values()).filter((row) => !row.isRetired).reduce((sum, row) => sum + row.points, 0);
  const perPoint = activeTotalPoints > 0 ? actualDiamond / activeTotalPoints : 0;

  const rows = Array.from(pointMap.values())
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      return String(left.memberName).localeCompare(String(right.memberName), "ko");
    })
    .map((row) => {
      if (row.isRetired) {
        return {
          memberName: row.memberName,
          points: row.points,
          ratio: 0,
          rawDiamond: 0,
          finalDiamond: 0,
          note: "탈퇴한 길드원"
        };
      }

      const rawDiamond = row.points * perPoint;
      return {
        memberName: row.memberName,
        points: row.points,
        ratio: activeTotalPoints > 0 ? row.points / activeTotalPoints : 0,
        rawDiamond,
        finalDiamond: Math.floor(rawDiamond),
        note: ""
      };
    });

  group.results = rows;
  group.summary = calculateDistributionGroupSummary(state, groupKey);
}

export function initializeDistributionState(state, deps) {
  state.distribution = {
    activeSubtab: "mainland",
    totalDiamond: 0,
    mainlandRatio: 100,
    worldRatio: 0,
    workbookName: "",
    rawLogs: [],
    loadedLogs: [],
    unknownBosses: [],
    bossRules: [],
    nameRules: [],
    editingLogKey: null,
    bossRulesLoaded: false,
    bossRuleDbIds: [],
    mainland: deps.createDistributionGroupState("mainland"),
    world: deps.createDistributionGroupState("world")
  };
}

export function createDistributionGroupState(type, createDistributionSummary) {
  return {
    type,
    deductions: [],
    appliedDeductions: [],
    logs: [],
    results: [],
    summary: createDistributionSummary(),
    dirtyLogs: false
  };
}

export function createDistributionSummary() {
  return {
    assignedDiamond: 0,
    deductionTotal: 0,
    actualDiamond: 0,
    totalPoints: 0,
    perPoint: 0,
    remainingDiamond: 0
  };
}

export function createDistributionDeduction(createDistributionId, name = "", mode = "percent", value = "") {
  return {
    id: createDistributionId("ded"),
    name,
    mode,
    value: value === "" ? "" : Number(value)
  };
}

export function createBossRule(createDistributionId, name = "", score = 1, group = "mainland") {
  const parsedScore = Math.floor(Number(score));
  return {
    id: createDistributionId("boss"),
    name,
    score: Number.isFinite(parsedScore) && parsedScore >= 0 ? parsedScore : 1,
    group
  };
}

export function createNameRule(createDistributionId, source = "", target = "") {
  return {
    id: createDistributionId("name"),
    source,
    target
  };
}

export function createDistributionId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function getDistributionAssignedAmounts(state) {
  const totalDiamond = Math.max(0, Math.floor(Number(state.distribution.totalDiamond) || 0));
  let mainlandRatio = Number(state.distribution.mainlandRatio);
  let worldRatio = Number(state.distribution.worldRatio);

  if (!Number.isFinite(mainlandRatio)) mainlandRatio = 0;
  if (!Number.isFinite(worldRatio)) worldRatio = 0;

  mainlandRatio = Math.min(100, Math.max(0, mainlandRatio));
  worldRatio = Math.min(100, Math.max(0, worldRatio));

  const totalRatio = mainlandRatio + worldRatio;
  if (totalRatio <= 0) {
    return { mainland: 0, world: 0 };
  }

  const mainland = Math.floor(totalDiamond * (mainlandRatio / totalRatio));
  const world = Math.max(0, totalDiamond - mainland);
  return { mainland, world };
}

export function getDistributionDeductionAmount(state, groupKey, row) {
  const assigned = getDistributionAssignedAmounts(state)[groupKey];
  const value = Number(row.value);
  if (!Number.isFinite(value) || value < 0) return 0;
  if (row.mode === "amount") return Math.floor(value);
  return Math.floor(assigned * (value / 100));
}

export function getDistributionPeriodRange(state) {
  const dates = state.distribution.loadedLogs
    .map((log) => String(log.dateText || "").trim())
    .filter(Boolean)
    .sort();

  if (!dates.length) {
    return { startDate: "", endDate: "" };
  }

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1]
  };
}

export function getDistributionCombinedResults(state) {
  const resultMap = new Map();
  const memberMap = new Map(state.members.map((member) => [normalizeDistributionName(member.name), member]));

  ["mainland", "world"].forEach((groupKey) => {
    state.distribution[groupKey].results.forEach((row) => {
      const key = normalizeDistributionName(row.memberName);
      const current = resultMap.get(key) || {
        memberId: memberMap.get(key)?.id ?? null,
        memberName: memberMap.get(key)?.name || row.memberName,
        points: 0,
        rawDiamond: 0,
        finalDiamond: 0,
        note: row.note || "",
        isRetired: row.note === "탈퇴한 길드원"
      };

      current.points += Number(row.points ?? 0);
      current.rawDiamond += Number(row.rawDiamond ?? 0);
      current.finalDiamond += Number(row.finalDiamond ?? 0);
      if (row.note === "탈퇴한 길드원") {
        current.note = "탈퇴한 길드원";
        current.isRetired = true;
      }

      resultMap.set(key, current);
    });
  });

  const activeTotalPoints = Array.from(resultMap.values())
    .filter((row) => !row.isRetired)
    .reduce((sum, row) => sum + row.points, 0);

  return Array.from(resultMap.values())
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      return String(left.memberName).localeCompare(String(right.memberName), "ko");
    })
    .map((row) => ({
      ...row,
      ratio: !row.isRetired && activeTotalPoints > 0 ? row.points / activeTotalPoints : 0
    }));
}

export function getDistributionCombinedSummary(state, createDistributionSummary) {
  const mainlandSummary = state.distribution.mainland.summary || createDistributionSummary();
  const worldSummary = state.distribution.world.summary || createDistributionSummary();
  const totalPoints = Number(mainlandSummary.totalPoints ?? 0) + Number(worldSummary.totalPoints ?? 0);
  const actualDiamond = Number(mainlandSummary.actualDiamond ?? 0) + Number(worldSummary.actualDiamond ?? 0);
  const remainingDiamond = Number(mainlandSummary.remainingDiamond ?? 0) + Number(worldSummary.remainingDiamond ?? 0);

  return {
    actualDiamond,
    totalPoints,
    diamondPerPoint: totalPoints > 0 ? actualDiamond / totalPoints : 0,
    remainingDiamond
  };
}

export async function readWorkbookFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  return arrayBuffer;
}

export function readDistributionSheetRows(workbookData, XLSX) {
  const workbook = XLSX.read(workbookData, { type: "array", cellDates: true });
  const preferredSheet = workbook.SheetNames.find((name) => /보스|boss/i.test(name)) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[preferredSheet];
  if (!sheet) {
    throw new Error("읽을 수 있는 시트가 없습니다.");
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("엑셀에 읽을 데이터가 없습니다.");
  }
  return rows;
}

export function buildDistributionLogsFromRows(rows, createDistributionId) {
  const logs = [];

  rows.forEach((row, index) => {
    const keys = Object.keys(row);
    const dateKey = findDistributionHeaderKey(keys, ["날짜", "date"]);
    const timeKey = findDistributionHeaderKey(keys, ["시간", "time"]);
    const bossKey = findDistributionHeaderKey(keys, ["보스", "boss"]);
    const cutterKey = findDistributionHeaderKey(keys, ["컷", "막타", "cutter", "커터"]);
    const participantsKey = findDistributionHeaderKey(keys, ["참여", "인원", "멤버", "member", "participants"]);

    const dateText = normalizeDistributionDateText(row[dateKey]);
    const timeText = normalizeDistributionTimeText(row[timeKey]);
    const boss = String(row[bossKey] ?? "").trim();
    const cutter = String(row[cutterKey] ?? "").trim();

    let participantText = participantsKey ? row[participantsKey] : "";
    if (!String(participantText ?? "").trim()) {
      const excludedKeys = new Set([dateKey, timeKey, bossKey, cutterKey].filter(Boolean));
      const remainingValues = keys
        .filter((key) => !excludedKeys.has(key))
        .map((key) => String(row[key] ?? "").trim())
        .filter(Boolean);
      participantText = remainingValues.join(", ");
    }

    const participants = dedupeStrings(splitParticipantText(participantText));
    if (!boss && participants.length === 0 && !dateText && !timeText) return;

    logs.push({
      key: createDistributionId(`log_${index}`),
      dateText,
      timeText,
      boss,
      cutter,
      rawParticipants: participants,
      overrideParticipants: null
    });
  });

  return logs;
}

export function findDistributionHeaderKey(keys, words) {
  const lowered = keys.map((key) => ({ key, lowered: String(key).toLowerCase() }));
  const exact = lowered.find((entry) => words.some((word) => entry.lowered.includes(String(word).toLowerCase())));
  return exact?.key || "";
}

export function normalizeDistributionDateText(value) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return text.replace(/\./g, "-").replace(/\//g, "-");
}

export function normalizeDistributionTimeText(value) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  if (!text) return "";
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
  }
  return text;
}

export function splitParticipantText(text) {
  return String(text ?? "")
    .replace(/\n/g, ",")
    .split(/[,\|\/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function dedupeStrings(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const key = String(value).trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(key);
  });
  return result;
}

export function normalizeDistributionName(value) {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}
