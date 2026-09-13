export function getBossParticipationExportFileName(state) {
  const rows = state.bossParticipation?.rows || [];
  const rowDates = rows
    .map((row) => getBossParticipationKstDateTimeParts(row.cutTime).date)
    .filter(Boolean)
    .sort();
  const startDate = state.bossParticipation?.startDate || rowDates[0] || "0000-00-00";
  const endDate = state.bossParticipation?.endDate || rowDates[rowDates.length - 1] || "0000-00-00";
  return `보스로그 ${formatBossParticipationFileDate(startDate)}-${formatBossParticipationFileDate(endDate)}`;
}

export function formatBossParticipationFileDate(value) {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return digits || "00000000";
}

export function getBossParticipationKstDateTimeParts(value) {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    map[part.type] = part.value;
  });

  const hour = map.hour === "24" ? "00" : map.hour;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${hour}:${map.minute}:${map.second}`
  };
}

export function getBossParticipationRecordTypeText(recordType) {
  if (recordType === "cut") return "컷";
  if (recordType === "mung") return "멍";
  return recordType || "-";
}

export function formatBossParticipationDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    map[part.type] = part.value;
  });

  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.month}-${map.day} ${hour}:${map.minute}`;
}

export function normalizeBossParticipationTime(value, fallback) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;

  const hour = Math.min(23, Math.max(0, Number(match[1]) || 0));
  const minute = Math.min(59, Math.max(0, Number(match[2]) || 0));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatBossParticipationTimeInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;

  const hour = Math.min(23, Number(digits.slice(0, 2)) || 0);
  const minuteText = digits.slice(2);
  if (minuteText.length < 2) {
    return `${String(hour).padStart(2, "0")}:${minuteText}`;
  }

  const minute = Math.min(59, Number(minuteText) || 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function kstDateTimeToIso(dateText, timeText, fallbackTime, endOfMinute = false) {
  const [year, month, day] = String(dateText).split("-").map(Number);
  const normalizedTime = normalizeBossParticipationTime(timeText, fallbackTime);
  const [hour, minute] = normalizedTime.split(":").map(Number);
  const second = endOfMinute ? 59 : 0;
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, second)).toISOString();
}

export function escapeSupabaseLike(value) {
  return String(value ?? "").replace(/[%_]/g, "");
}

export async function loadBossParticipationRows({ bossSupabase, tabState, normalizeSearchText }) {
  if (!bossSupabase) {
    throw new Error("보스봇 Supabase URL과 ANON KEY를 script 파일에 설정해주세요.");
  }

  const records = [];
  const recordPageSize = 1000;
  let recordFrom = 0;

  while (true) {
    let query = bossSupabase
      .from("boss_kill_records")
      .select("id, boss_id, boss_name, record_type, cut_time, cut_by_nickname, cut_by_discord_id, cut_source, next_spawn_time, created_at")
      .order("cut_time", { ascending: false })
      .range(recordFrom, recordFrom + recordPageSize - 1);

    if (tabState.startDate) {
      query = query.gte("cut_time", kstDateTimeToIso(tabState.startDate, tabState.startTime, "00:00"));
    }

    if (tabState.endDate) {
      query = query.lte("cut_time", kstDateTimeToIso(tabState.endDate, tabState.endTime, "23:59", true));
    }

    if (tabState.bossKeyword) {
      query = query.ilike("boss_name", `%${escapeSupabaseLike(tabState.bossKeyword)}%`);
    }

    const recordRes = await query;
    if (recordRes.error) {
      throw new Error(`보스 컷 기록 조회 중 오류가 발생했습니다.\n${recordRes.error.message}`);
    }

    const pageRecords = recordRes.data ?? [];
    records.push(...pageRecords);

    if (pageRecords.length < recordPageSize) {
      break;
    }

    recordFrom += recordPageSize;
  }

  const recordIds = records.map((row) => row.id).filter(Boolean);
  const participants = await loadBossParticipantsByRecordIds(bossSupabase, recordIds);
  const participantMap = groupBossParticipantsByRecordId(participants);
  const participantKeyword = normalizeSearchText(tabState.participantKeyword);

  let rows = records.map((record) => {
    const rowParticipants = participantMap.get(record.id) || [];
    return {
      id: record.id,
      bossName: record.boss_name || "-",
      recordType: record.record_type || "-",
      cutTime: record.cut_time || "",
      cutByNickname: record.cut_by_nickname || "-",
      cutSource: record.cut_source || "-",
      nextSpawnTime: record.next_spawn_time || "",
      participants: rowParticipants
    };
  });

  if (participantKeyword) {
    rows = rows.filter((row) => row.participants.some((participant) => {
      return normalizeSearchText(participant.discord_nickname).includes(participantKeyword);
    }));
  }

  return rows;
}

export async function loadBossParticipantsByRecordIds(bossSupabase, recordIds) {
  if (!recordIds.length) return [];

  const rows = [];
  const chunkSize = 500;
  const pageSize = 1000;

  for (let index = 0; index < recordIds.length; index += chunkSize) {
    const chunk = recordIds.slice(index, index + chunkSize);
    let from = 0;

    while (true) {
      const res = await bossSupabase
        .from("boss_participants")
        .select("kill_record_id, boss_id, boss_name, cut_time, discord_user_id, discord_nickname, created_at")
        .in("kill_record_id", chunk)
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (res.error) {
        throw new Error(`보스 참여자 조회 중 오류가 발생했습니다.\n${res.error.message}`);
      }

      const pageRows = res.data ?? [];
      rows.push(...pageRows);

      if (pageRows.length < pageSize) {
        break;
      }

      from += pageSize;
    }
  }

  return rows;
}

export function groupBossParticipantsByRecordId(participants) {
  const map = new Map();
  participants.forEach((participant) => {
    const key = participant.kill_record_id;
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(participant);
  });
  return map;
}

export function initializeBossParticipationState(state) {
  state.bossParticipation = {
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    bossKeyword: "",
    participantKeyword: "",
    rows: [],
    loading: false,
    loaded: false
  };
}

export async function handleBossParticipationSearch({ state, el, loadBossParticipationData, renderBossParticipationTab }) {
  state.bossParticipation.startDate = String(el.bossParticipationStartDateInput?.value || "").trim();
  state.bossParticipation.startTime = String(el.bossParticipationStartTimeInput?.value || "").trim();
  state.bossParticipation.endDate = String(el.bossParticipationEndDateInput?.value || "").trim();
  state.bossParticipation.endTime = String(el.bossParticipationEndTimeInput?.value || "").trim();
  state.bossParticipation.bossKeyword = String(el.bossParticipationBossInput?.value || "").trim();
  state.bossParticipation.participantKeyword = String(el.bossParticipationParticipantInput?.value || "").trim();
  await loadBossParticipationData();
  renderBossParticipationTab();
}

export async function handleBossParticipationReset({ state, el, renderBossParticipationTab }) {
  state.bossParticipation.startDate = "";
  state.bossParticipation.startTime = "";
  state.bossParticipation.endDate = "";
  state.bossParticipation.endTime = "";
  state.bossParticipation.bossKeyword = "";
  state.bossParticipation.participantKeyword = "";
  state.bossParticipation.rows = [];
  state.bossParticipation.loaded = false;
  state.bossParticipation.loading = false;
  if (el.bossParticipationStartDateInput) el.bossParticipationStartDateInput.value = "";
  if (el.bossParticipationStartTimeInput) el.bossParticipationStartTimeInput.value = "";
  if (el.bossParticipationEndDateInput) el.bossParticipationEndDateInput.value = "";
  if (el.bossParticipationEndTimeInput) el.bossParticipationEndTimeInput.value = "";
  if (el.bossParticipationBossInput) el.bossParticipationBossInput.value = "";
  if (el.bossParticipationParticipantInput) el.bossParticipationParticipantInput.value = "";
  renderBossParticipationTab();
}

export async function loadBossParticipationData({
  state,
  bossSupabase,
  normalizeSearchText,
  renderBossParticipationTab,
  alertFn = alert
}) {
  const tabState = state.bossParticipation;
  if (!tabState) return;

  tabState.loading = true;
  renderBossParticipationTab();

  try {
    tabState.rows = await loadBossParticipationRows({
      bossSupabase,
      tabState,
      normalizeSearchText
    });
    tabState.loaded = true;
  } catch (error) {
    tabState.rows = [];
    tabState.loaded = true;
    alertFn(error.message || "보스 참여 이력 조회 중 오류가 발생했습니다.");
  } finally {
    tabState.loading = false;
  }
}

export function handleBossParticipationExport({ state, XLSX, alertFn = alert }) {
  const rows = state.bossParticipation?.rows || [];
  if (!rows.length) {
    alertFn("엑셀 저장할 보스 참여 이력이 없습니다.");
    return;
  }

  const exportRows = rows.map((row) => {
    const dateTime = getBossParticipationKstDateTimeParts(row.cutTime);
    const participantNames = row.participants
      .map((participant) => String(participant.discord_nickname || "").trim())
      .filter(Boolean);

    return {
      날짜: dateTime.date,
      시간: dateTime.time,
      보스: row.bossName === "-" ? "" : row.bossName,
      컷자: row.cutByNickname === "-" ? "" : row.cutByNickname,
      참여자: participantNames.join(", ")
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: ["날짜", "시간", "보스", "컷자", "참여자"] });
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 50 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "보스로그");
  XLSX.writeFile(workbook, `${getBossParticipationExportFileName(state)}.xlsx`);
}

export function renderBossParticipationTab({
  state,
  el,
  setValueIfNeeded,
  normalizeSearchText,
  formatNumber,
  escapeHtml
}) {
  const tabState = state.bossParticipation;
  if (!tabState) return;

  renderBossParticipationInputs({ tabState, setValueIfNeeded });
  renderBossParticipationSummary({ state, el, normalizeSearchText, formatNumber });
  renderBossParticipationTable({ state, el, formatNumber, escapeHtml });
}

export function renderBossParticipationInputs({ tabState, setValueIfNeeded }) {
  setValueIfNeeded("bossParticipationStartDateInput", tabState.startDate || "");
  setValueIfNeeded("bossParticipationStartTimeInput", tabState.startTime || "");
  setValueIfNeeded("bossParticipationEndDateInput", tabState.endDate || "");
  setValueIfNeeded("bossParticipationEndTimeInput", tabState.endTime || "");
  setValueIfNeeded("bossParticipationBossInput", tabState.bossKeyword || "");
  setValueIfNeeded("bossParticipationParticipantInput", tabState.participantKeyword || "");
}

export function renderBossParticipationSummary({ state, el, normalizeSearchText, formatNumber }) {
  const rows = state.bossParticipation?.rows || [];
  const cutRows = rows.filter((row) => row.recordType === "cut");
  const mungRows = rows.filter((row) => row.recordType === "mung");
  const participantNames = rows.flatMap((row) => row.participants.map((participant) => String(participant.discord_nickname || "").trim()).filter(Boolean));
  const uniqueParticipants = new Set(participantNames.map((name) => normalizeSearchText(name)));

  el.bossParticipationSummaryTotalRecords.textContent = formatNumber(rows.length);
  el.bossParticipationSummaryCutRecords.textContent = formatNumber(cutRows.length);
  el.bossParticipationSummaryMungRecords.textContent = formatNumber(mungRows.length);
  el.bossParticipationSummaryParticipants.textContent = formatNumber(participantNames.length);
  el.bossParticipationSummaryUniqueParticipants.textContent = formatNumber(uniqueParticipants.size);
}

export function renderBossParticipationTable({ state, el, formatNumber, escapeHtml }) {
  el.bossParticipationTableHead.innerHTML = `
    <tr>
      <th class="is-center">No</th>
      <th>컷 시간</th>
      <th>보스명</th>
      <th class="is-center">기록</th>
      <th>컷자</th>
      <th class="is-right">참여자 수</th>
      <th>참여자</th>
    </tr>
  `;

  const tabState = state.bossParticipation;
  const rows = tabState?.rows || [];

  if (tabState?.loading) {
    el.bossParticipationTableBody.innerHTML = `<tr><td class="distribution-empty-row" colspan="7">보스 참여 이력을 불러오는 중입니다.</td></tr>`;
    return;
  }

  if (!rows.length) {
    const message = tabState?.loaded ? "조회된 보스 참여 이력이 없습니다." : "조회 버튼을 눌러 보스 참여 이력을 불러와주세요.";
    el.bossParticipationTableBody.innerHTML = `<tr><td class="distribution-empty-row" colspan="7">${message}</td></tr>`;
    return;
  }

  el.bossParticipationTableBody.innerHTML = rows.map((row, index) => {
    const participantNames = row.participants.map((participant) => participant.discord_nickname || "-").filter(Boolean);
    const recordClass = row.recordType === "mung" ? "boss-participation-mung-row" : "";
    return `
      <tr class="${recordClass}">
        <td class="is-center">${index + 1}</td>
        <td>${escapeHtml(formatBossParticipationDateTime(row.cutTime))}</td>
        <td>${escapeHtml(row.bossName)}</td>
        <td class="is-center"><span class="boss-participation-badge ${row.recordType === "mung" ? "is-mung" : "is-cut"}">${escapeHtml(getBossParticipationRecordTypeText(row.recordType))}</span></td>
        <td>${escapeHtml(row.cutByNickname)}</td>
        <td class="is-right">${formatNumber(participantNames.length)}</td>
        <td class="boss-participation-participants-cell">${escapeHtml(participantNames.length ? participantNames.join(", ") : "-")}</td>
      </tr>
    `;
  }).join("");
}
