export function initializeHistoryState(state) {
  state.history = {
    filterDate: "",
    sortKey: "saved_desc",
    selectedId: null,
    items: [],
    detailCache: {},
    loadingDetailId: null
  };
}

export function getFilteredHistoryItems(state) {
  const filterDate = String(state.history.filterDate || "").trim();
  const sortKey = state.history.sortKey || "saved_desc";
  let items = [...(state.history.items || [])];

  if (filterDate) {
    items = items.filter((item) => item.startDate <= filterDate && item.endDate >= filterDate);
  }

  items.sort((left, right) => {
    if (sortKey === "saved_asc") return String(left.savedAt).localeCompare(String(right.savedAt));
    if (sortKey === "period_desc") return String(right.endDate).localeCompare(String(left.endDate));
    if (sortKey === "period_asc") return String(left.startDate).localeCompare(String(right.startDate));
    return String(right.savedAt).localeCompare(String(left.savedAt));
  });

  return items;
}

export function getSelectedHistoryDetail(state) {
  const selectedId = String(state.history?.selectedId || "").trim();
  if (!selectedId) return null;
  return state.history?.detailCache?.[selectedId] ?? null;
}

export function getSelectedHistoryItem(state) {
  const items = getFilteredHistoryItems(state);
  if (!state.history.selectedId) return null;
  return items.find((item) => item.id === state.history.selectedId) || null;
}

export async function loadHistoryData({ state, supabase, fetchPagedRows, formatDateTime, alert }) {
  const sortKey = state.history?.sortKey || "saved_desc";
  const filterDate = String(state.history?.filterDate || "").trim();

  let historyRows = [];

  try {
    historyRows = await fetchPagedRows(() => {
      let query = supabase
        .from("distribution_histories")
        .select("id, period_start, period_end, total_diamond, mainland_ratio, world_ratio, total_actual_diamond, total_points, total_remaining_diamond, workbook_name, saved_at, created_at, updated_at");

      if (filterDate) {
        query = query.lte("period_start", filterDate).gte("period_end", filterDate);
      }

      if (sortKey === "saved_asc") {
        query = query.order("saved_at", { ascending: true });
      } else if (sortKey === "period_desc") {
        query = query.order("period_end", { ascending: false }).order("period_start", { ascending: false });
      } else if (sortKey === "period_asc") {
        query = query.order("period_start", { ascending: true }).order("period_end", { ascending: true });
      } else {
        query = query.order("saved_at", { ascending: false });
      }

      return query;
    }, "분배 이력 조회");
  } catch (error) {
    alert(error.message || "분배 이력 조회 중 오류가 발생했습니다.");
    return;
  }

  const nextItems = historyRows.map((row) => ({
    id: row.id,
    savedAt: formatDateTime(row.saved_at),
    startDate: row.period_start,
    endDate: row.period_end,
    totalDiamond: Number(row.total_diamond ?? 0),
    guildFeePercent: Number(row.mainland_ratio ?? 0),
    guildMasterPercent: Number(row.world_ratio ?? 0),
    managerPercent: 0,
    actualDiamond: Number(row.total_actual_diamond ?? 0),
    totalPoints: Number(row.total_points ?? 0),
    diamondPerPoint: Number(row.total_points ?? 0) > 0
      ? Number(row.total_actual_diamond ?? 0) / Number(row.total_points ?? 0)
      : 0,
    remainingDiamond: Number(row.total_remaining_diamond ?? 0),
    workbookName: row.workbook_name || ""
  }));

  const visibleIds = new Set(nextItems.map((item) => item.id));
  const nextCache = {};
  Object.entries(state.history?.detailCache || {}).forEach(([historyId, detail]) => {
    if (visibleIds.has(historyId)) {
      nextCache[historyId] = detail;
    }
  });

  state.history.items = nextItems;
  state.history.detailCache = nextCache;

  if (state.history.selectedId && !visibleIds.has(state.history.selectedId)) {
    state.history.selectedId = null;
  }
}

export async function loadHistoryDetail({
  state,
  supabase,
  fetchPagedRows,
  renderHistoryDetail,
  alert
}, historyId, forceReload = false) {
  const targetId = String(historyId || "").trim();
  if (!targetId) return null;

  if (!forceReload && state.history?.detailCache?.[targetId]) {
    return state.history.detailCache[targetId];
  }

  state.history.loadingDetailId = targetId;
  renderHistoryDetail();

  let memberRows = [];
  let groupRows = [];
  let deductionRows = [];

  try {
    [memberRows, groupRows, deductionRows] = await Promise.all([
      fetchPagedRows(() => supabase
        .from("distribution_history_members")
        .select("distribution_history_id, member_id, member_name, mainland_points, world_points, total_points, ratio, mainland_diamond, world_diamond, final_diamond, note, is_retired, display_order")
        .eq("distribution_history_id", targetId)
        .order("display_order", { ascending: true }), "분배 이력 길드원 결과 조회"),
      fetchPagedRows(() => supabase
        .from("distribution_history_groups")
        .select("distribution_history_id, group_type, group_name, assigned_diamond, deduction_total, actual_diamond, total_points, diamond_per_point, remaining_diamond, display_order")
        .eq("distribution_history_id", targetId)
        .order("display_order", { ascending: true }), "분배 이력 그룹 요약 조회"),
      fetchPagedRows(() => supabase
        .from("distribution_history_deductions")
        .select("distribution_history_id, group_type, name, mode, value, amount, display_order")
        .eq("distribution_history_id", targetId)
        .order("group_type", { ascending: true })
        .order("display_order", { ascending: true }), "분배 이력 공제 항목 조회")
    ]);
  } catch (error) {
    state.history.loadingDetailId = null;
    alert(error.message || "분배 이력 상세 조회 중 오류가 발생했습니다.");
    return null;
  }

  const detail = {
    groupRows: groupRows.map((row) => ({
      groupType: row.group_type === "world" ? "world" : "mainland",
      groupName: row.group_name || (row.group_type === "world" ? "월드" : "본토"),
      assignedDiamond: Number(row.assigned_diamond ?? 0),
      deductionTotal: Number(row.deduction_total ?? 0),
      actualDiamond: Number(row.actual_diamond ?? 0),
      totalPoints: Number(row.total_points ?? 0),
      diamondPerPoint: Number(row.diamond_per_point ?? 0),
      remainingDiamond: Number(row.remaining_diamond ?? 0)
    })),
    deductionRows: deductionRows.map((row) => ({
      groupType: row.group_type === "world" ? "world" : "mainland",
      name: row.name || "",
      mode: row.mode === "amount" ? "amount" : "percent",
      value: Number(row.value ?? 0),
      amount: Number(row.amount ?? 0),
      displayOrder: Number(row.display_order ?? 0)
    })),
    memberRows: memberRows.map((row) => ({
      memberId: row.member_id ?? null,
      memberName: row.member_name,
      mainlandPoints: Number(row.mainland_points ?? 0),
      worldPoints: Number(row.world_points ?? 0),
      points: Number(row.total_points ?? 0),
      ratio: Number(row.ratio ?? 0),
      mainlandDiamond: Number(row.mainland_diamond ?? 0),
      worldDiamond: Number(row.world_diamond ?? 0),
      rawDiamond: Number((row.mainland_diamond ?? 0) + (row.world_diamond ?? 0)),
      finalDiamond: Number(row.final_diamond ?? 0),
      note: row.note || (row.is_retired ? "탈퇴한 길드원" : "")
    })),
    logRows: []
  };

  state.history.detailCache[targetId] = detail;
  if (state.history.loadingDetailId === targetId) {
    state.history.loadingDetailId = null;
  }
  return detail;
}

export async function handleHistoryListClick({
  state,
  loadHistoryDetail,
  renderHistoryTab
}, event) {
  const row = event.target.closest('[data-role="history-select-row"]');
  if (!row) return;
  const historyId = row.dataset.historyId;
  if (!historyId) return;

  state.history.selectedId = historyId;
  renderHistoryTab();
  await loadHistoryDetail(historyId);
  renderHistoryTab();
}

export async function handleHistorySearch({
  state,
  el,
  loadHistoryData,
  renderHistoryTab
}) {
  state.history.filterDate = String(el.historyDateInput.value || "").trim();
  state.history.sortKey = String(el.historySortSelect.value || "saved_desc").trim();
  await loadHistoryData();
  renderHistoryTab();
}

export async function handleHistoryDelete({
  state,
  supabase,
  getSelectedHistoryItem,
  loadHistoryData,
  renderHistoryTab,
  alert,
  confirm
}) {
  const selectedId = String(state.history?.selectedId || "").trim();
  if (!selectedId) {
    alert("삭제할 분배 이력을 먼저 선택해주세요.");
    return;
  }

  const selectedItem = getSelectedHistoryItem();
  const periodText = selectedItem ? `${selectedItem.startDate} ~ ${selectedItem.endDate}` : "선택 이력";
  const confirmed = confirm(`${periodText} 분배 이력을 삭제하시겠습니까?`);
  if (!confirmed) return;

  const deleteMemberRes = await supabase
    .from("distribution_history_members")
    .delete()
    .eq("distribution_history_id", selectedId);

  if (deleteMemberRes.error) {
    alert(`분배 이력 길드원 결과 삭제 중 오류가 발생했습니다.
${deleteMemberRes.error.message}`);
    return;
  }

  const deleteDeductionRes = await supabase
    .from("distribution_history_deductions")
    .delete()
    .eq("distribution_history_id", selectedId);

  if (deleteDeductionRes.error) {
    alert(`분배 이력 공제 항목 삭제 중 오류가 발생했습니다.
${deleteDeductionRes.error.message}`);
    return;
  }

  const deleteGroupRes = await supabase
    .from("distribution_history_groups")
    .delete()
    .eq("distribution_history_id", selectedId);

  if (deleteGroupRes.error) {
    alert(`분배 이력 그룹 요약 삭제 중 오류가 발생했습니다.
${deleteGroupRes.error.message}`);
    return;
  }

  const deleteRes = await supabase
    .from("distribution_histories")
    .delete()
    .eq("id", selectedId);

  if (deleteRes.error) {
    alert(`분배 이력 삭제 중 오류가 발생했습니다.
${deleteRes.error.message}`);
    return;
  }

  state.history.selectedId = null;
  delete state.history.detailCache[selectedId];
  await loadHistoryData();
  renderHistoryTab();
  alert("분배 이력이 삭제되었습니다.");
}

export async function handleHistoryExport({
  getSelectedHistoryItem,
  loadHistoryDetail,
  writeDistributionHistoryWorkbook,
  alert
}) {
  const selectedItem = getSelectedHistoryItem();
  if (!selectedItem) {
    alert("엑셀 저장할 분배 이력을 먼저 선택해주세요.");
    return;
  }

  const detail = await loadHistoryDetail(selectedItem.id);
  if (!detail) return;

  writeDistributionHistoryWorkbook(selectedItem, detail);
}

export function renderHistoryTab({ state, el, formatNumber, formatDecimal, escapeHtml }) {
  renderHistoryInputs({ state, el });
  renderHistoryListTable({ state, el, formatNumber, escapeHtml });
  renderHistoryDetail({ state, el, formatNumber, formatDecimal, escapeHtml });
}

export function renderHistoryInputs({ state, el }) {
  el.historyDateInput.value = state.history.filterDate || "";
  el.historySortSelect.value = state.history.sortKey || "saved_desc";
}

export function renderHistoryListTable({ state, el, formatNumber, escapeHtml }) {
  el.historyListTableHead.innerHTML = `
    <tr>
      <th class="is-center">No</th>
      <th>저장일시</th>
      <th>대상 기간</th>
      <th class="is-right">실제 분배 다이아</th>
      <th class="is-right">전체 참여점수</th>
      <th class="is-right">남은 다이아</th>
    </tr>
  `;

  const items = getFilteredHistoryItems(state);
  if (!items.length) {
    el.historyListTableBody.innerHTML = `<tr><td class="distribution-empty-row" colspan="6">조회된 분배 이력이 없습니다.</td></tr>`;
    return;
  }

  if (state.history.selectedId && !items.some((item) => item.id === state.history.selectedId)) {
    state.history.selectedId = null;
  }

  el.historyListTableBody.innerHTML = items.map((item, index) => `
    <tr class="${item.id === state.history.selectedId ? "history-selected-row" : ""}" data-role="history-select-row" data-history-id="${item.id}">
      <td class="is-center">${index + 1}</td>
      <td>${escapeHtml(item.savedAt)}</td>
      <td>${escapeHtml(`${item.startDate} ~ ${item.endDate}`)}</td>
      <td class="is-right">${formatNumber(item.actualDiamond)}</td>
      <td class="is-right">${formatNumber(item.totalPoints)}</td>
      <td class="is-right">${formatNumber(item.remainingDiamond)}</td>
    </tr>
  `).join("");
}

export function renderHistoryDetail({ state, el, formatNumber, formatDecimal, escapeHtml }) {
  const item = getSelectedHistoryItem(state);

  if (!item) {
    el.historySummaryPeriod.textContent = "-";
    el.historySummaryActualDiamond.textContent = "0";
    el.historySummaryTotalPoints.textContent = "0";
    el.historySummaryPerPoint.textContent = "0";
    el.historySummaryRemaining.textContent = "0";
    el.historySavedAt.textContent = "-";
    el.historyTotalDiamond.textContent = "0";
    el.historyGuildFeePercent.textContent = "0";
    el.historyGuildMasterPercent.textContent = "0";
    el.historyManagerPercent.textContent = "-";
    renderHistoryGroupSummaryTable({ el, formatNumber, formatDecimal, rows: [] });
    renderHistoryDeductionTable({ el, formatNumber, formatDecimal, escapeHtml, rows: [] });
    renderHistoryMemberTable({ el, formatNumber, escapeHtml, rows: [], activeGroupTypes: [] });
    return;
  }

  el.historySummaryPeriod.textContent = `${item.startDate} ~ ${item.endDate}`;
  el.historySummaryActualDiamond.textContent = formatNumber(item.actualDiamond);
  el.historySummaryTotalPoints.textContent = formatNumber(item.totalPoints);
  el.historySummaryPerPoint.textContent = formatDecimal(item.diamondPerPoint, 1);
  el.historySummaryRemaining.textContent = formatNumber(item.remainingDiamond);
  el.historySavedAt.textContent = item.savedAt;
  el.historyTotalDiamond.textContent = formatNumber(item.totalDiamond);
  el.historyGuildFeePercent.textContent = String(item.guildFeePercent);
  el.historyGuildMasterPercent.textContent = String(item.guildMasterPercent);
  el.historyManagerPercent.textContent = "-";

  const detail = getSelectedHistoryDetail(state);
  const isLoading = state.history?.loadingDetailId === item.id && !detail;

  if (isLoading) {
    renderHistoryGroupSummaryTable({ el, formatNumber, formatDecimal, rows: null });
    renderHistoryDeductionTable({ el, formatNumber, formatDecimal, escapeHtml, rows: null });
    renderHistoryMemberTable({ el, formatNumber, escapeHtml, rows: null, activeGroupTypes: [] });
    return;
  }

  const groupRows = (detail?.groupRows || []).filter((row) => Number(row.assignedDiamond ?? 0) > 0);
  renderHistoryGroupSummaryTable({ el, formatNumber, formatDecimal, rows: groupRows });

  const activeGroupTypes = groupRows.map((row) => row.groupType);
  const deductionRows = (detail?.deductionRows || []).filter((row) => activeGroupTypes.includes(row.groupType));
  renderHistoryDeductionTable({ el, formatNumber, formatDecimal, escapeHtml, rows: deductionRows });
  renderHistoryMemberTable({ el, formatNumber, escapeHtml, rows: detail?.memberRows || [], activeGroupTypes });
}

export function renderHistoryGroupSummaryTable({ el, formatNumber, formatDecimal, rows }) {
  if (!el.historyGroupSummarySection || !el.historyGroupSummaryBody) return;

  if (rows === null) {
    el.historyGroupSummarySection.classList.remove("hidden");
    el.historyGroupSummaryBody.innerHTML = `<tr><td class="distribution-empty-row" colspan="7">상세 데이터를 불러오는 중입니다.</td></tr>`;
    return;
  }

  if (!rows.length) {
    el.historyGroupSummarySection.classList.add("hidden");
    el.historyGroupSummaryBody.innerHTML = "";
    return;
  }

  el.historyGroupSummarySection.classList.remove("hidden");
  el.historyGroupSummaryBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.groupType === "world" ? "월드" : "본토"}</td>
      <td class="is-right">${formatNumber(row.assignedDiamond)}</td>
      <td class="is-right">${formatNumber(row.deductionTotal)}</td>
      <td class="is-right">${formatNumber(row.actualDiamond)}</td>
      <td class="is-right">${formatNumber(row.totalPoints)}</td>
      <td class="is-right">${formatDecimal(row.diamondPerPoint, 1)}</td>
      <td class="is-right">${formatNumber(row.remainingDiamond)}</td>
    </tr>
  `).join("");
}

export function renderHistoryDeductionTable({ el, formatNumber, formatDecimal, escapeHtml, rows }) {
  if (!el.historyDeductionSection || !el.historyDeductionBody) return;

  if (rows === null) {
    el.historyDeductionSection.classList.remove("hidden");
    el.historyDeductionBody.innerHTML = `<tr><td class="distribution-empty-row" colspan="6">상세 데이터를 불러오는 중입니다.</td></tr>`;
    return;
  }

  if (!rows.length) {
    el.historyDeductionSection.classList.add("hidden");
    el.historyDeductionBody.innerHTML = "";
    return;
  }

  el.historyDeductionSection.classList.remove("hidden");
  el.historyDeductionBody.innerHTML = rows.map((row, index) => `
    <tr>
      <td class="is-center">${index + 1}</td>
      <td>${row.groupType === "world" ? "월드" : "본토"}</td>
      <td>${escapeHtml(row.name || "-")}</td>
      <td>${row.mode === "amount" ? "금액" : "비율"}</td>
      <td class="is-right">${row.mode === "amount" ? formatNumber(row.value) : `${formatDecimal(row.value, 2)}%`}</td>
      <td class="is-right">${formatNumber(row.amount)}</td>
    </tr>
  `).join("");
}

export function renderHistoryMemberTable({ el, formatNumber, escapeHtml, rows, activeGroupTypes = [] }) {
  const showMainland = activeGroupTypes.includes("mainland");
  const showWorld = activeGroupTypes.includes("world");

  const headCells = [
    '<th class="is-center">No</th>',
    "<th>길드원</th>"
  ];
  if (showMainland) headCells.push('<th class="is-right">본토 점수</th>');
  if (showWorld) headCells.push('<th class="is-right">월드 점수</th>');
  headCells.push('<th class="is-right">총점</th>');
  if (showMainland) headCells.push('<th class="is-right">본토 다이아</th>');
  if (showWorld) headCells.push('<th class="is-right">월드 다이아</th>');
  headCells.push('<th class="is-right">최종 분배 다이아</th>');
  headCells.push("<th>비고</th>");

  el.historyMemberTableHead.innerHTML = `
    <tr>
      ${headCells.join("")}
    </tr>
  `;

  if (rows === null) {
    el.historyMemberTableBody.innerHTML = `<tr><td class="distribution-empty-row" colspan="${headCells.length}">상세 데이터를 불러오는 중입니다.</td></tr>`;
    return;
  }

  if (!rows.length) {
    el.historyMemberTableBody.innerHTML = `<tr><td class="distribution-empty-row" colspan="${headCells.length}">표시할 길드원별 분배 결과가 없습니다.</td></tr>`;
    return;
  }

  el.historyMemberTableBody.innerHTML = rows.map((row, index) => `
    <tr class="${row.note === "탈퇴한 길드원" ? "distribution-retired-row" : ""}">
      <td class="is-center">${index + 1}</td>
      <td>${escapeHtml(row.memberName)}</td>
      ${showMainland ? `<td class="is-right">${formatNumber(row.mainlandPoints)}</td>` : ""}
      ${showWorld ? `<td class="is-right">${formatNumber(row.worldPoints)}</td>` : ""}
      <td class="is-right">${formatNumber(row.points)}</td>
      ${showMainland ? `<td class="is-right">${formatNumber(row.mainlandDiamond)}</td>` : ""}
      ${showWorld ? `<td class="is-right">${formatNumber(row.worldDiamond)}</td>` : ""}
      <td class="is-right">${formatNumber(row.finalDiamond)}</td>
      <td>${escapeHtml(row.note || "-")}</td>
    </tr>
  `).join("");
}
