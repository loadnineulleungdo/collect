import {
  escapeAttr,
  escapeHtml,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatPercent,
  formatUpdatedAt,
  normalizeSearchText
} from "./core/formatters.js";
import {
  ADMIN_PASSWORD_KEY,
  APP_SETTINGS_TABLE,
  bossSupabase,
  DISTRIBUTION_BOSS_RULES_TABLE,
  supabase
} from "./core/supabaseClient.js";
import {
  bindNewDistributionUi as bindDistributionUiModule,
  createBossRule as createBossRuleModule,
  createDistributionDeduction as createDistributionDeductionModule,
  createDistributionGroupState as createDistributionGroupStateModule,
  createDistributionId as createDistributionIdModule,
  createDistributionSummary as createDistributionSummaryModule,
  createNameRule as createNameRuleModule,
  buildDistributionLogsFromRows as buildDistributionLogsFromRowsModule,
  calculateDistributionGroupSummary as calculateDistributionGroupSummaryModule,
  calculateDistributionResults as calculateDistributionResultsModule,
  cleanupDistributionHistorySave as cleanupDistributionHistorySaveModule,
  dedupeStrings as dedupeStringsModule,
  findDistributionHeaderKey as findDistributionHeaderKeyModule,
  getDistributionAssignedAmounts as getDistributionAssignedAmountsModule,
  getDistributionCombinedResults as getDistributionCombinedResultsModule,
  getDistributionCombinedSummary as getDistributionCombinedSummaryModule,
  getDistributionDeductionAmount as getDistributionDeductionAmountModule,
  getDistributionPeriodRange as getDistributionPeriodRangeModule,
  handleDistributionExport as handleDistributionExportModule,
  handleDistributionFinalSave as handleDistributionFinalSaveModule,
  initializeDistributionState as initializeDistributionStateModule,
  ensureDistributionBossRulesLoaded as ensureDistributionBossRulesLoadedModule,
  isUuidLike as isUuidLikeModule,
  loadDistributionBossRulesFromDb as loadDistributionBossRulesFromDbModule,
  normalizeDistributionName as normalizeDistributionNameModule,
  normalizeDistributionDateText as normalizeDistributionDateTextModule,
  normalizeDistributionTimeText as normalizeDistributionTimeTextModule,
  readDistributionSheetRows as readDistributionSheetRowsModule,
  readWorkbookFile as readWorkbookFileModule,
  rebuildDistributionWorkingLogs as rebuildDistributionWorkingLogsModule,
  renderDistributionBossRules as renderDistributionBossRulesModule,
  renderDistributionCommonInputs as renderDistributionCommonInputsModule,
  renderDistributionCommonSummary as renderDistributionCommonSummaryModule,
  renderDistributionDeductionTable as renderDistributionDeductionTableModule,
  renderDistributionGroup as renderDistributionGroupModule,
  renderDistributionLogs as renderDistributionLogsModule,
  renderDistributionNameRules as renderDistributionNameRulesModule,
  renderDistributionResults as renderDistributionResultsModule,
  renderDistributionTab as renderDistributionTabModule,
  sanitizeDistributionBossRules as sanitizeDistributionBossRulesModule,
  sanitizeDistributionNameRules as sanitizeDistributionNameRulesModule,
  saveDistributionBossRulesToDb as saveDistributionBossRulesToDbModule,
  setDistributionFinalSaveButtonsDisabled as setDistributionFinalSaveButtonsDisabledModule,
  splitParticipantText as splitParticipantTextModule,
  writeDistributionHistoryWorkbook as writeDistributionHistoryWorkbookModule
} from "./distribution/distribution.js";
import {
  formatBossParticipationFileDate,
  formatBossParticipationTimeInput,
  handleBossParticipationExport as handleBossParticipationExportModule,
  handleBossParticipationReset as handleBossParticipationResetModule,
  handleBossParticipationSearch as handleBossParticipationSearchModule,
  initializeBossParticipationState as initializeBossParticipationStateModule,
  loadBossParticipationData as loadBossParticipationDataModule,
  renderBossParticipationTab as renderBossParticipationTabModule
} from "./bossParticipation/bossParticipation.js";
import {
  getFilteredHistoryItems as getFilteredHistoryItemsModule,
  getSelectedHistoryDetail as getSelectedHistoryDetailModule,
  getSelectedHistoryItem as getSelectedHistoryItemModule,
  handleHistoryDelete as handleHistoryDeleteModule,
  handleHistoryExport as handleHistoryExportModule,
  handleHistoryListClick as handleHistoryListClickModule,
  handleHistorySearch as handleHistorySearchModule,
  initializeHistoryState as initializeHistoryStateModule,
  loadHistoryData as loadHistoryDataModule,
  loadHistoryDetail as loadHistoryDetailModule,
  renderHistoryDeductionTable as renderHistoryDeductionTableModule,
  renderHistoryDetail as renderHistoryDetailModule,
  renderHistoryGroupSummaryTable as renderHistoryGroupSummaryTableModule,
  renderHistoryInputs as renderHistoryInputsModule,
  renderHistoryListTable as renderHistoryListTableModule,
  renderHistoryMemberTable as renderHistoryMemberTableModule,
  renderHistoryTab as renderHistoryTabModule
} from "./history/history.js";

function openModal(backdrop) {
  backdrop?.classList.remove("hidden");
}

function closeModal(backdrop) {
  backdrop?.classList.add("hidden");
}

let adminPassword = "";
let adminPasswordLoadError = "";
const ACCESSORY_PARTS = [
  { key: "necklace_count", label: "목걸이" },
  { key: "earring_count", label: "귀걸이" },
  { key: "ring_count", label: "반지" },
  { key: "bracelet_count", label: "팔찌" },
  { key: "belt_count", label: "허리띠" }
];

const WEAPON_OPTIONS = [
  "맨손",
  "오른손",
  "왼손",
  "검과 방패",
  "워드럼",
  "전투봉",
  "전투 방패",
  "대검",
  "사이드",
  "지팡이",
  "단검",
  "활",
  "석궁"
];
const WEAPON_ICON_FILES = {
  "맨손": "unarmed.png",
  "오른손": "right-hand.png",
  "왼손": "left-hand.png",
  "검과 방패": "sword-shield.png",
  "워드럼": "war-drum.png",
  "전투봉": "combat-staff.png",
  "전투 방패": "combat-shield.png",
  "대검": "greatsword.png",
  "사이드": "scythe.png",
  "지팡이": "staff.png",
  "단검": "dagger.png",
  "활": "bow.png",
  "석궁": "crossbow.png"
};
const MEMBER_SELECT_COLUMNS = "id, name, power, specialization_power, anti_magic_power, main_weapon, sub_weapon, updated_at, can_edit";
const TAB_GROUPS = {
  guild: ["power", "mount", "accessory", "boss"],
  distribution: ["distribution", "history", "bossParticipation"]
};

const state = {
  activeTab: "power",
  distribution: null,
  history: null,
  bossParticipation: null,
  pendingManageType: null,
  pendingEditMemberId: null,
  itemManageTarget: null,
  members: [],
  mountItems: [],
  memberMounts: [],
  bossItems: [],
  memberBossCollections: [],
  accessoryGroups: [],
  memberAccessories: [],
  searchTerm: "",
  bossSearchTerm: "",
  selectedMemberId: null,
  rowEditMemberId: null,
  draftMemberId: null,
  draftTab: null,
  draftPower: "",
  draftSpecializationPower: "",
  draftAntiMagicPower: "",
  draftMainWeapon: "",
  draftSubWeapon: "",
  draftOwnedMap: {},
  draftAccessoryMap: {},
  draftAllRows: {},
  overallEditMode: false,
  powerSortDirection: "desc",
  updatedAtSortDirection: null,
  hiddenAccessoryGroupIds: {},
  isBulkSaving: false,
  bulkSaveProgress: 0,
  importPreview: null
};

const el = {};
let isDistributionFinalSaving = false;

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  bindEvents();
  initializeDistributionState();
  initializeHistoryState();
  initializeBossParticipationState();
  bindNewDistributionUi();
  await loadAdminPassword();
  updateTabUi();
  await loadActiveTabData();
  renderAll();
});

function bindElements() {
  el.tabs = Array.from(document.querySelectorAll(".tab"));
  el.tabCategories = Array.from(document.querySelectorAll(".tab-category"));
  el.tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  el.adminModeBtn = document.getElementById("adminModeBtn");
  el.guildManageBtn = document.getElementById("guildManageBtn");
  el.bulkEditBtn = document.getElementById("bulkEditBtn");
  el.bulkSaveBtn = document.getElementById("bulkSaveBtn");
  el.bulkCancelBtn = document.getElementById("bulkCancelBtn");
  el.itemManageBtn = document.getElementById("itemManageBtn");
  el.mountManageBtn = document.getElementById("mountManageBtn");
  el.accessoryManageBtn = document.getElementById("accessoryManageBtn");
  el.bossManageBtn = document.getElementById("bossManageBtn");
  el.importOpenBtn = document.getElementById("importOpenBtn");
  el.tableGuideText = document.getElementById("tableGuideText");
  el.searchInput = document.getElementById("searchInput");
  el.bossSearchInput = document.getElementById("bossSearchInput");
  el.searchBtn = document.getElementById("searchBtn");
  el.resetBtn = document.getElementById("resetBtn");
  el.summaryTableHead = document.getElementById("summaryTableHead");
  el.summaryTableBody = document.getElementById("summaryTableBody");

  el.searchSelectModalBackdrop = document.getElementById("searchSelectModalBackdrop");
  el.searchSelectGuideText = document.getElementById("searchSelectGuideText");
  el.searchSelectList = document.getElementById("searchSelectList");
  el.searchSelectCloseBtn = document.getElementById("searchSelectCloseBtn");
  el.searchSelectCancelBtn = document.getElementById("searchSelectCancelBtn");

  el.adminModeModalBackdrop = document.getElementById("adminModeModalBackdrop");
  el.adminModeCloseBtn = document.getElementById("adminModeCloseBtn");
  el.adminPasswordChangeBtn = document.getElementById("adminPasswordChangeBtn");
  el.adminPasswordChangeModalBackdrop = document.getElementById("adminPasswordChangeModalBackdrop");
  el.adminPasswordChangeCloseBtn = document.getElementById("adminPasswordChangeCloseBtn");
  el.adminNewPasswordInput = document.getElementById("adminNewPasswordInput");
  el.adminNewPasswordConfirmInput = document.getElementById("adminNewPasswordConfirmInput");
  el.adminPasswordChangeErrorText = document.getElementById("adminPasswordChangeErrorText");
  el.adminPasswordChangeCancelBtn = document.getElementById("adminPasswordChangeCancelBtn");
  el.adminPasswordChangeSaveBtn = document.getElementById("adminPasswordChangeSaveBtn");

  el.passwordModalBackdrop = document.getElementById("passwordModalBackdrop");
  el.passwordInput = document.getElementById("passwordInput");
  el.passwordErrorText = document.getElementById("passwordErrorText");
  el.passwordCancelBtn = document.getElementById("passwordCancelBtn");
  el.passwordConfirmBtn = document.getElementById("passwordConfirmBtn");

  el.guildManageModalBackdrop = document.getElementById("guildManageModalBackdrop");
  el.guildManageTableBody = document.getElementById("guildManageTableBody");
  el.addMemberBtn = document.getElementById("addMemberBtn");
  el.guildManageCloseBtn = document.getElementById("guildManageCloseBtn");

  el.itemManageModalBackdrop = document.getElementById("itemManageModalBackdrop");
  el.itemManageTitle = document.getElementById("itemManageTitle");
  el.itemNameHeader = document.getElementById("itemNameHeader");
  el.itemMaxHeader = document.getElementById("itemMaxHeader");
  el.itemManageTableBody = document.getElementById("itemManageTableBody");
  el.addItemBtn = document.getElementById("addItemBtn");
  el.itemManageCloseBtn = document.getElementById("itemManageCloseBtn");
  el.importModalBackdrop = document.getElementById("importModalBackdrop");
  el.importModalTitle = document.getElementById("importModalTitle");
  el.importModalGuideText = document.getElementById("importModalGuideText");
  el.importTextarea = document.getElementById("importTextarea");
  el.importPreviewBox = document.getElementById("importPreviewBox");
  el.importCancelBtn = document.getElementById("importCancelBtn");
  el.importPreviewBtn = document.getElementById("importPreviewBtn");
  el.importApplyBtn = document.getElementById("importApplyBtn");
  el.importCloseBtn = document.getElementById("importCloseBtn");
  el.mainCard = document.getElementById("mainCard");
  el.mainCardTitle = document.getElementById("mainCardTitle");
  el.mainActions = document.getElementById("mainActions");
  el.mainTableSearch = document.getElementById("mainTableSearch");
  el.summaryTableWrap = document.getElementById("summaryTableWrap");
  el.distributionContent = document.getElementById("distributionContent");
  el.distributionHeaderActions = document.getElementById("distributionHeaderActions");
  el.historyContent = document.getElementById("historyContent");
  el.historyHeaderActions = document.getElementById("historyHeaderActions");
  el.historyDeleteBtn = document.getElementById("historyDeleteBtn");
  el.historyExportBtn = document.getElementById("historyExportBtn");
  el.historyDateInput = document.getElementById("historyDateInput");
  el.historySortSelect = document.getElementById("historySortSelect");
  el.historySearchBtn = document.getElementById("historySearchBtn");
  el.historyListTableHead = document.getElementById("historyListTableHead");
  el.historyListTableBody = document.getElementById("historyListTableBody");
  el.historyMemberTableHead = document.getElementById("historyMemberTableHead");
  el.historyMemberTableBody = document.getElementById("historyMemberTableBody");
  el.historyGroupSummarySection = document.getElementById("historyGroupSummarySection");
  el.historyGroupSummaryBody = document.getElementById("historyGroupSummaryBody");
  el.historyDeductionSection = document.getElementById("historyDeductionSection");
  el.historyDeductionBody = document.getElementById("historyDeductionBody");
  el.historySummaryPeriod = document.getElementById("historySummaryPeriod");
  el.historySummaryActualDiamond = document.getElementById("historySummaryActualDiamond");
  el.historySummaryTotalPoints = document.getElementById("historySummaryTotalPoints");
  el.historySummaryPerPoint = document.getElementById("historySummaryPerPoint");
  el.historySummaryRemaining = document.getElementById("historySummaryRemaining");
  el.historySavedAt = document.getElementById("historySavedAt");
  el.historyTotalDiamond = document.getElementById("historyTotalDiamond");
  el.historyGuildFeePercent = document.getElementById("historyGuildFeePercent");
  el.historyGuildMasterPercent = document.getElementById("historyGuildMasterPercent");
  el.historyManagerPercent = document.getElementById("historyManagerPercent");
  el.bossParticipationContent = document.getElementById("bossParticipationContent");
  el.bossParticipationStartDateInput = document.getElementById("bossParticipationStartDateInput");
  el.bossParticipationStartTimeInput = document.getElementById("bossParticipationStartTimeInput");
  el.bossParticipationEndDateInput = document.getElementById("bossParticipationEndDateInput");
  el.bossParticipationEndTimeInput = document.getElementById("bossParticipationEndTimeInput");
  el.bossParticipationBossInput = document.getElementById("bossParticipationBossInput");
  el.bossParticipationParticipantInput = document.getElementById("bossParticipationParticipantInput");
  el.bossParticipationSearchBtn = document.getElementById("bossParticipationSearchBtn");
  el.bossParticipationResetBtn = document.getElementById("bossParticipationResetBtn");
  el.bossParticipationExportBtn = document.getElementById("bossParticipationExportBtn");
  el.bossParticipationSummaryTotalRecords = document.getElementById("bossParticipationSummaryTotalRecords");
  el.bossParticipationSummaryCutRecords = document.getElementById("bossParticipationSummaryCutRecords");
  el.bossParticipationSummaryMungRecords = document.getElementById("bossParticipationSummaryMungRecords");
  el.bossParticipationSummaryParticipants = document.getElementById("bossParticipationSummaryParticipants");
  el.bossParticipationSummaryUniqueParticipants = document.getElementById("bossParticipationSummaryUniqueParticipants");
  el.bossParticipationTableHead = document.getElementById("bossParticipationTableHead");
  el.bossParticipationTableBody = document.getElementById("bossParticipationTableBody");
  el.bulkSaveOverlay = document.getElementById("bulkSaveOverlay");
  el.bulkSavePercent = document.getElementById("bulkSavePercent");
  el.bulkSaveBarFill = document.getElementById("bulkSaveBarFill");
}

function bindEvents() {
  el.tabCategories.forEach((button) => {
    button.addEventListener("click", async () => {
      const groupKey = button.dataset.tabGroup;
      const nextTab = TAB_GROUPS[groupKey]?.[0];
      if (!nextTab || nextTab === state.activeTab) return;
      await switchTab(nextTab);
    });
  });

  el.tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const nextTab = tab.dataset.tab;
      if (nextTab === state.activeTab) return;
      await switchTab(nextTab);
    });
  });

  el.searchBtn.addEventListener("click", handleSearch);
  el.resetBtn.addEventListener("click", handleResetSearch);

  el.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  });

  el.bossSearchInput.addEventListener("input", handleBossSearchInput);
  el.bossSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleBossSearchInput();
    }
  });

  el.searchSelectCloseBtn.addEventListener("click", closeSearchSelectModal);
  el.searchSelectCancelBtn.addEventListener("click", closeSearchSelectModal);
  el.searchSelectList.addEventListener("click", handleSearchSelectClick);

  el.summaryTableHead.addEventListener("click", handleSummaryTableHeadClick);
  el.summaryTableBody.addEventListener("click", handleSummaryTableClick);
  el.summaryTableBody.addEventListener("input", handleSummaryTableInput);
  el.historyListTableBody?.addEventListener("click", handleHistoryListClick);

  el.adminModeBtn.addEventListener("click", () => openModal(el.adminModeModalBackdrop));
  el.adminModeCloseBtn.addEventListener("click", () => closeModal(el.adminModeModalBackdrop));
  el.adminPasswordChangeBtn.addEventListener("click", openAdminPasswordChangeAuth);
  el.adminPasswordChangeCloseBtn.addEventListener("click", closeAdminPasswordChangeModal);
  el.adminPasswordChangeCancelBtn.addEventListener("click", closeAdminPasswordChangeModal);
  el.adminPasswordChangeSaveBtn.addEventListener("click", handleAdminPasswordChangeSave);
  el.adminNewPasswordConfirmInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdminPasswordChangeSave();
    }
  });
  el.guildManageBtn.addEventListener("click", openAdminGuildManage);
  el.mountManageBtn.addEventListener("click", () => openAdminItemManage("mount"));
  el.accessoryManageBtn.addEventListener("click", () => openAdminItemManage("accessory"));
  el.bossManageBtn.addEventListener("click", () => openAdminItemManage("boss"));
  el.bulkEditBtn.addEventListener("click", handleBulkEditButtonClick);
  el.bulkSaveBtn.addEventListener("click", handleBulkSaveButtonClick);
  el.bulkCancelBtn.addEventListener("click", handleBulkCancelButtonClick);
  el.itemManageBtn?.addEventListener("click", () => openPasswordModal("item"));
  el.importOpenBtn.addEventListener("click", () => openPasswordModal("import"));

  el.passwordCancelBtn.addEventListener("click", closePasswordModal);
  el.passwordConfirmBtn.addEventListener("click", confirmPassword);
  el.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmPassword();
    }
  });

  el.guildManageCloseBtn.addEventListener("click", () => closeModal(el.guildManageModalBackdrop));
  el.itemManageCloseBtn.addEventListener("click", closeItemManageModal);
  el.importCloseBtn.addEventListener("click", closeImportModal);
  el.importCancelBtn.addEventListener("click", closeImportModal);
  el.importPreviewBtn.addEventListener("click", handleImportPreview);
  el.importApplyBtn.addEventListener("click", handleImportApply);
  el.historySearchBtn.addEventListener("click", handleHistorySearch);
  el.historyDeleteBtn.addEventListener("click", handleHistoryDelete);
  el.historyExportBtn.addEventListener("click", handleHistoryExport);
  el.bossParticipationStartTimeInput?.addEventListener("input", handleBossParticipationTimeInput);
  el.bossParticipationEndTimeInput?.addEventListener("input", handleBossParticipationTimeInput);
  el.bossParticipationSearchBtn?.addEventListener("click", handleBossParticipationSearch);
  el.bossParticipationResetBtn?.addEventListener("click", handleBossParticipationReset);
  el.bossParticipationExportBtn?.addEventListener("click", handleBossParticipationExport);

  el.addMemberBtn.addEventListener("click", addMember);
  el.addItemBtn.addEventListener("click", addItem);

  el.guildManageTableBody.addEventListener("click", handleGuildManageTableClick);
  el.itemManageTableBody.addEventListener("click", handleItemManageTableClick);

  // 모달 닫기는 각 모달의 닫기 버튼(X/취소/닫기)에서만 처리한다.
}

async function switchTab(nextTab) {
  state.activeTab = nextTab;
  resetOverallEditMode();
  updateTabUi();

  if (nextTab === "distribution") {
    renderAll();
    return;
  }

  if (nextTab === "history") {
    await loadHistoryData();
    renderAll();
    return;
  }

  if (nextTab === "bossParticipation") {
    renderAll();
    return;
  }

  await loadActiveTabData();
  renderAll();
}

function updateTabUi() {
  const activeTabGroup = Object.entries(TAB_GROUPS).find(([, tabs]) => tabs.includes(state.activeTab))?.[0] || "guild";

  el.tabCategories.forEach((button) => {
    const active = button.dataset.tabGroup === activeTabGroup;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  el.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === activeTabGroup);
  });

  el.tabs.forEach((tab) => {
    const active = tab.dataset.tab === state.activeTab;
    tab.classList.toggle("active", active);
    tab.classList.remove("disabled");
  });

  const isDistribution = state.activeTab === "distribution";
  const isHistory = state.activeTab === "history";
  const isBossParticipation = state.activeTab === "bossParticipation";
  const isAccessory = state.activeTab === "accessory";
  const isBoss = state.activeTab === "boss";
  const isPower = state.activeTab === "power";
  const isBusy = state.isBulkSaving;

  el.mainCard.classList.remove("hidden");
  el.mainActions.classList.toggle("hidden", isDistribution || isHistory || isBossParticipation);
  el.summaryTableWrap.classList.toggle("hidden", isDistribution || isHistory || isBossParticipation);
  el.distributionContent.classList.toggle("hidden", !isDistribution);
  el.historyContent.classList.toggle("hidden", !isHistory);
  el.bossParticipationContent?.classList.toggle("hidden", !isBossParticipation);
  el.mainTableSearch.classList.toggle("hidden", isDistribution || isHistory || isBossParticipation);
  el.distributionHeaderActions?.classList.toggle("hidden", !isDistribution);
  el.historyHeaderActions.classList.toggle("hidden", !isHistory);

  if (isDistribution) {
    el.mainCardTitle.textContent = "분배";
    el.tableGuideText.textContent = "보스로그 엑셀을 기준으로 기간 내 참여 점수를 집계하여 분배 다이아를 계산합니다.";
  } else if (isHistory) {
    el.mainCardTitle.textContent = "분배 이력";
    el.tableGuideText.textContent = "저장된 분배 이력을 날짜 기준으로 조회하는 화면입니다.";
  } else if (isBossParticipation) {
    el.mainCardTitle.textContent = "보스 참여 이력";
    el.tableGuideText.textContent = "보스봇 DB의 컷 기록과 참여자 정보를 조회하는 화면입니다.";
  } else {
    el.mainCardTitle.textContent = "전체 현황";
  }

  el.bulkEditBtn.classList.toggle("hidden", state.overallEditMode);
  el.bulkSaveBtn.classList.toggle("hidden", !state.overallEditMode);
  el.bulkCancelBtn.classList.toggle("hidden", !state.overallEditMode);

  el.guildManageBtn.disabled = isBusy;
  el.mountManageBtn.disabled = isBusy;
  el.accessoryManageBtn.disabled = isBusy;
  el.bossManageBtn.disabled = isBusy;
  if (el.itemManageBtn) el.itemManageBtn.disabled = isDistribution || isHistory || isBossParticipation || isPower || isBusy;
  el.bulkEditBtn.disabled = isDistribution || isHistory || isBossParticipation || isBusy;
  el.bulkSaveBtn.disabled = isBusy;
  el.bulkCancelBtn.disabled = isBusy;
  el.searchBtn.disabled = isDistribution || isHistory || isBossParticipation || isBusy;
  el.resetBtn.disabled = isDistribution || isHistory || isBossParticipation || isBusy;
  el.searchInput.disabled = isDistribution || isHistory || isBossParticipation || isBusy;
  el.bossSearchInput.disabled = !isBoss || isDistribution || isHistory || isBossParticipation || isBusy;
  el.importOpenBtn.disabled = isHistory || isDistribution || isBossParticipation || isPower || isBusy;

  el.bossSearchInput.classList.toggle("hidden", !isBoss);
  if (el.itemManageBtn) el.itemManageBtn.classList.toggle("hidden", isPower || isDistribution || isHistory || isBossParticipation);
  el.importOpenBtn.classList.toggle("hidden", !(state.activeTab === "mount" || state.activeTab === "boss" || state.activeTab === "accessory"));

  updateItemManageUi();
}

async function loadActiveTabData() {
  if (state.activeTab === "power") {
    await loadPowerData();
    return;
  }

  if (state.activeTab === "accessory") {
    await loadAccessoryData();
    return;
  }

  if (state.activeTab === "boss") {
    await loadBossData();
    return;
  }

  await loadMountData();
}

async function loadPowerData() {
  const membersRes = await supabase.from("guild_members").select(MEMBER_SELECT_COLUMNS).order("name", { ascending: true });

  if (membersRes.error) {
    alert(`길드원 조회 중 오류가 발생했습니다.\n${membersRes.error.message}`);
    return;
  }

  state.members = membersRes.data ?? [];
  syncDraftState();
}

async function loadMountData() {
  const [membersRes, itemsRes] = await Promise.all([
    supabase.from("guild_members").select(MEMBER_SELECT_COLUMNS).order("name", { ascending: true }),
    supabase.from("mounts").select("id, name, display_order").order("display_order", { ascending: true })
  ]);

  if (membersRes.error) {
    alert(`길드원 조회 중 오류가 발생했습니다.\n${membersRes.error.message}`);
    return;
  }

  if (itemsRes.error) {
    alert(`탈것 조회 중 오류가 발생했습니다.\n${itemsRes.error.message}`);
    return;
  }

  let memberMountRows = [];
  try {
    memberMountRows = await fetchPagedRows(
      () => supabase.from("member_mounts").select("id, member_id, mount_id, owned, updated_at"),
      "보유 정보 조회"
    );
  } catch (error) {
    alert(error.message || "보유 정보 조회 중 오류가 발생했습니다.");
    return;
  }

  state.members = membersRes.data ?? [];
  state.mountItems = itemsRes.data ?? [];
  state.memberMounts = memberMountRows;
  syncDraftState();
}
async function loadBossData() {
  const [membersRes, itemsRes] = await Promise.all([
    supabase.from("guild_members").select(MEMBER_SELECT_COLUMNS).order("name", { ascending: true }),
    supabase
      .from("boss_collections")
      .select("id, name, display_order")
      .order("display_order", { ascending: true })
      .order("id", { ascending: true })
  ]);

  if (membersRes.error) {
    alert(`길드원 조회 중 오류가 발생했습니다.\n${membersRes.error.message}`);
    return;
  }

  if (itemsRes.error) {
    alert(`보스컬렉 조회 중 오류가 발생했습니다.\n${itemsRes.error.message}`);
    return;
  }

  const allBossRows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const memberBossRes = await supabase
      .from("member_boss_collections")
      .select("id, member_id, boss_collection_id, owned, updated_at")
      .range(from, from + pageSize - 1);

    if (memberBossRes.error) {
      alert(`보유 정보 조회 중 오류가 발생했습니다.\n${memberBossRes.error.message}`);
      return;
    }

    const rows = memberBossRes.data ?? [];
    allBossRows.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  state.members = membersRes.data ?? [];
  state.bossItems = itemsRes.data ?? [];
  state.memberBossCollections = allBossRows;
  syncDraftState();
}

async function loadAccessoryData() {
  const [membersRes, groupsRes] = await Promise.all([
    supabase.from("guild_members").select(MEMBER_SELECT_COLUMNS).order("name", { ascending: true }),
    supabase.from("accessory_groups").select("id, name, display_order, max_count").order("display_order", { ascending: true })
  ]);

  if (membersRes.error) {
    alert(`길드원 조회 중 오류가 발생했습니다.\n${membersRes.error.message}`);
    return;
  }

  if (groupsRes.error) {
    alert(`악세사리 조회 중 오류가 발생했습니다.\n${groupsRes.error.message}`);
    return;
  }

  let memberAccessoryRows = [];
  try {
    memberAccessoryRows = await fetchPagedRows(
      () => supabase.from("member_accessories").select("id, member_id, accessory_group_id, ring_count, necklace_count, earring_count, belt_count, bracelet_count, updated_at"),
      "악세사리 정보 조회"
    );
  } catch (error) {
    alert(error.message || "악세사리 정보 조회 중 오류가 발생했습니다.");
    return;
  }

  state.members = membersRes.data ?? [];
  state.accessoryGroups = groupsRes.data ?? [];
  state.memberAccessories = memberAccessoryRows;
  ensureAccessoryHiddenState();
  syncDraftState();
}

function ensureAccessoryHiddenState() {
  const nextHiddenMap = {};
  state.accessoryGroups.forEach((group) => {
    nextHiddenMap[group.id] = Boolean(state.hiddenAccessoryGroupIds[group.id]);
  });
  state.hiddenAccessoryGroupIds = nextHiddenMap;
}

function toggleAccessoryGroupHidden(groupId) {
  if (state.activeTab !== "accessory") return;
  state.hiddenAccessoryGroupIds[groupId] = !Boolean(state.hiddenAccessoryGroupIds[groupId]);
  renderSummaryTable();
}

function handleBossSearchInput() {
  state.bossSearchTerm = el.bossSearchInput.value.trim();
  renderSummaryTable();
}

function handleSearch() {
  const keyword = el.searchInput.value.trim();
  state.searchTerm = keyword;

  if (!keyword) {
    state.selectedMemberId = null;
    syncDraftState();
    renderAll();
    return;
  }

  const matchedMembers = getMatchedMembers(keyword);

  if (matchedMembers.length === 0) {
    state.selectedMemberId = null;
    state.rowEditMemberId = null;
    closeSearchSelectModal();
    syncDraftState();
    renderAll();
    return;
  }

  if (matchedMembers.length === 1) {
    selectMemberFromSearch(matchedMembers[0].id);
    return;
  }

  renderSearchSelectModal(matchedMembers);
  openModal(el.searchSelectModalBackdrop);
}

async function handleResetSearch() {
  state.searchTerm = "";
  state.bossSearchTerm = "";
  state.selectedMemberId = null;
  el.searchInput.value = "";
  el.bossSearchInput.value = "";
  closeSearchSelectModal();

  await loadActiveTabData();

  renderAll();
}

function getMatchedMembers(keyword) {
  const exactMatched = state.members.filter((member) => member.name === keyword);
  if (exactMatched.length > 0) return exactMatched;
  return state.members.filter((member) => member.name.includes(keyword));
}

function getFilteredMembers() {
  const keyword = state.searchTerm.trim();
  let filteredMembers;

  if (!keyword) {
    filteredMembers = [...state.members];
  } else if (!state.selectedMemberId) {
    const matchedMembers = getMatchedMembers(keyword);
    filteredMembers = matchedMembers.length === 0 ? [] : [...state.members];
  } else {
    filteredMembers = state.members.filter((member) => member.id === state.selectedMemberId);
  }

  return sortFilteredMembers(filteredMembers);
}

function sortFilteredMembers(members) {
  const updatedDirection = state.updatedAtSortDirection;
  const powerDirection = state.powerSortDirection;

  if (!updatedDirection && !powerDirection) return members;

  return [...members].sort((left, right) => {
    if (updatedDirection) {
      const leftTime = getComparableUpdatedAt(left);
      const rightTime = getComparableUpdatedAt(right);

      if (leftTime !== rightTime) {
        return updatedDirection === "asc" ? leftTime - rightTime : rightTime - leftTime;
      }
    }

    if (powerDirection) {
      const leftPower = Number(left.power ?? 0);
      const rightPower = Number(right.power ?? 0);

      if (leftPower !== rightPower) {
        return powerDirection === "asc" ? leftPower - rightPower : rightPower - leftPower;
      }
    }

    return String(left.name ?? "").localeCompare(String(right.name ?? ""), "ko");
  });
}

function getEditableMember() {
  if (state.overallEditMode) return null;
  if (!state.searchTerm.trim() || !state.selectedMemberId) return null;
  if (!state.rowEditMemberId || state.rowEditMemberId !== state.selectedMemberId) return null;
  return state.members.find((member) => member.id === state.selectedMemberId) ?? null;
}

function syncDraftState() {
  const editableMember = getEditableMember();

  if (!editableMember) {
    state.draftMemberId = null;
    state.draftTab = null;
    state.draftPower = "";
    state.draftSpecializationPower = "";
    state.draftAntiMagicPower = "";
    state.draftMainWeapon = "";
    state.draftSubWeapon = "";
    state.draftOwnedMap = {};
    state.draftAccessoryMap = {};
    return;
  }

  if (state.draftMemberId === editableMember.id && state.draftTab === state.activeTab) return;

  state.draftMemberId = editableMember.id;
  state.draftTab = state.activeTab;
  state.draftPower = String(editableMember.power ?? 0);
  state.draftSpecializationPower = String(editableMember.specialization_power ?? 0);
  state.draftAntiMagicPower = String(editableMember.anti_magic_power ?? 0);
  state.draftMainWeapon = String(editableMember.main_weapon ?? "");
  state.draftSubWeapon = String(editableMember.sub_weapon ?? "");
  state.draftOwnedMap = {};
  state.draftAccessoryMap = {};

  if (state.activeTab === "accessory") {
    state.accessoryGroups.forEach((group) => {
      const record = state.memberAccessories.find(
        (entry) => entry.member_id === editableMember.id && String(entry.accessory_group_id) === String(group.id)
      );

      state.draftAccessoryMap[group.id] = {};
      ACCESSORY_PARTS.forEach((part) => {
        state.draftAccessoryMap[group.id][part.key] = Number(record?.[part.key] ?? 0);
      });
    });
    return;
  }

  const simpleItems = getSimpleItems();
  const simpleRecords = getSimpleMemberRecords();
  const simpleItemKey = getSimpleItemForeignKey();

  simpleItems.forEach((item) => {
    const record = simpleRecords.find(
      (entry) => entry.member_id === editableMember.id && String(entry[simpleItemKey]) === String(item.id)
    );
    state.draftOwnedMap[item.id] = Boolean(record?.owned);
  });
}

function ensureDraftRow(memberId) {
  if (!memberId) return null;
  if (!state.draftAllRows[memberId]) {
    const member = state.members.find((entry) => entry.id === memberId);
    const row = {
      power: String(member?.power ?? 0),
      specializationPower: String(member?.specialization_power ?? 0),
      antiMagicPower: String(member?.anti_magic_power ?? 0),
      mainWeapon: String(member?.main_weapon ?? ""),
      subWeapon: String(member?.sub_weapon ?? ""),
      ownedMap: {},
      accessoryMap: {}
    };

    if (state.activeTab === "accessory") {
      state.accessoryGroups.forEach((group) => {
        const record = state.memberAccessories.find((entry) => entry.member_id === memberId && String(entry.accessory_group_id) === String(group.id));
        row.accessoryMap[group.id] = {};
        ACCESSORY_PARTS.forEach((part) => {
          row.accessoryMap[group.id][part.key] = Number(record?.[part.key] ?? 0);
        });
      });
    } else {
      const simpleItems = getSimpleItems();
      const simpleRecords = getSimpleMemberRecords();
      const simpleItemKey = getSimpleItemForeignKey();
      simpleItems.forEach((item) => {
        const record = simpleRecords.find((entry) => entry.member_id === memberId && String(entry[simpleItemKey]) === String(item.id));
        row.ownedMap[item.id] = Boolean(record?.owned);
      });
    }

    state.draftAllRows[memberId] = row;
  }
  return state.draftAllRows[memberId];
}

function getExistingDraftRow(memberId) {
  return state.draftAllRows[memberId] ?? null;
}

function isMemberEditable(memberId) {
  if (state.overallEditMode) return true;
  const editableMember = getEditableMember();
  return Boolean(editableMember && editableMember.id === memberId);
}

function getMemberDraftPower(member) {
  if (state.overallEditMode) {
    return getExistingDraftRow(member.id)?.power ?? String(member.power ?? 0);
  }
  return state.draftPower;
}

function getMemberDraftSpecializationPower(member) {
  if (state.overallEditMode) {
    return getExistingDraftRow(member.id)?.specializationPower ?? String(member.specialization_power ?? 0);
  }
  return state.draftSpecializationPower;
}

function getMemberDraftAntiMagicPower(member) {
  if (state.overallEditMode) {
    return getExistingDraftRow(member.id)?.antiMagicPower ?? String(member.anti_magic_power ?? 0);
  }
  return state.draftAntiMagicPower;
}

function getMemberDraftMainWeapon(member) {
  if (state.overallEditMode) {
    return getExistingDraftRow(member.id)?.mainWeapon ?? String(member.main_weapon ?? "");
  }
  return state.draftMainWeapon;
}

function getMemberDraftSubWeapon(member) {
  if (state.overallEditMode) {
    return getExistingDraftRow(member.id)?.subWeapon ?? String(member.sub_weapon ?? "");
  }
  return state.draftSubWeapon;
}

function getMemberDraftOwned(memberId, itemId) {
  if (state.overallEditMode) {
    const draftRow = getExistingDraftRow(memberId);
    if (draftRow) return Boolean(draftRow.ownedMap?.[itemId]);

    const record = getSimpleMemberRecords().find((entry) => {
      return entry.member_id === memberId && String(entry[getSimpleItemForeignKey()]) === String(itemId);
    });
    return Boolean(record?.owned);
  }
  return Boolean(state.draftOwnedMap[itemId]);
}

function getMemberDraftAccessory(memberId, groupId, partKey) {
  if (state.overallEditMode) {
    const draftRow = getExistingDraftRow(memberId);
    if (draftRow) return Number(draftRow.accessoryMap?.[groupId]?.[partKey] ?? 0);

    const record = getAccessoryRecord(memberId, groupId);
    return Number(record?.[partKey] ?? 0);
  }
  return Number(state.draftAccessoryMap[groupId]?.[partKey] ?? 0);
}

function resetOverallEditMode() {
  state.overallEditMode = false;
  state.draftAllRows = {};
}

function getItemManageType() {
  if (["mount", "accessory", "boss"].includes(state.itemManageTarget)) return state.itemManageTarget;
  if (["mount", "accessory", "boss"].includes(state.activeTab)) return state.activeTab;
  return "mount";
}

function updateItemManageUi() {
  const manageType = getItemManageType();
  const isAccessory = manageType === "accessory";
  const isBoss = manageType === "boss";

  if (el.itemManageBtn) {
    el.itemManageBtn.textContent = isAccessory ? "악세사리 관리" : isBoss ? "보스컬렉 관리" : "탈것 관리";
  }
  el.itemManageTitle.textContent = isAccessory ? "악세사리 관리" : isBoss ? "보스컬렉 관리" : "탈것 관리";
  el.itemNameHeader.textContent = isAccessory ? "악세사리명" : isBoss ? "보스컬렉명" : "탈것명";
  el.itemMaxHeader.classList.toggle("hidden", !isAccessory);
  el.addItemBtn.textContent = isAccessory ? "악세사리 추가" : isBoss ? "보스컬렉 추가" : "탈것 추가";
}

async function openAdminGuildManage() {
  closeModal(el.adminModeModalBackdrop);
  await loadPowerData();
  renderGuildManageTable();
  openPasswordModal("guild");
}

async function openAdminItemManage(type) {
  closeModal(el.adminModeModalBackdrop);
  state.itemManageTarget = type;

  if (type === "accessory") {
    await loadAccessoryData();
  } else if (type === "boss") {
    await loadBossData();
  } else {
    await loadMountData();
  }

  updateItemManageUi();
  renderItemManageTable();
  openPasswordModal("item");
}

function closeItemManageModal() {
  closeModal(el.itemManageModalBackdrop);
  state.itemManageTarget = null;
  updateItemManageUi();
}

function refreshItemManageModalIfNeeded() {
  if (!state.itemManageTarget) return false;
  updateItemManageUi();
  renderItemManageTable();
  return true;
}

function handleBulkEditButtonClick() {
  openPasswordModal("bulk-edit");
}

async function handleBulkSaveButtonClick() {
  await saveAllOverallEdits();
}

function handleBulkCancelButtonClick() {
  resetOverallEditMode();
  renderAll();
}

function setBulkSaveProgress(percent) {
  const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  state.bulkSaveProgress = safePercent;
  renderBulkSaveOverlay();
}

function renderBulkSaveOverlay() {
  if (!el.bulkSaveOverlay || !el.bulkSavePercent || !el.bulkSaveBarFill) return;

  el.bulkSaveOverlay.classList.toggle("hidden", !state.isBulkSaving);
  el.bulkSavePercent.textContent = `${state.bulkSaveProgress}%`;
  el.bulkSaveBarFill.style.width = `${state.bulkSaveProgress}%`;
}

function renderAll() {
  updateTabUi();

  if (state.activeTab === "distribution") {
    renderDistributionTab();
    return;
  }

  if (state.activeTab === "history") {
    renderHistoryTab();
    return;
  }

  if (state.activeTab === "bossParticipation") {
    renderBossParticipationTab();
    return;
  }

  syncDraftState();
  renderGuideText();
  renderSummaryTable();
  renderGuildManageTable();
  renderItemManageTable();
  renderBulkSaveOverlay();
}

function renderGuideText() {
  const keyword = state.searchTerm.trim();

  if (state.overallEditMode) {
    el.tableGuideText.textContent = state.activeTab === "power"
      ? "전체수정 모드입니다. 전체 목록에서 전투력, 전문화, 항마력을 수정한 뒤 하단 저장 버튼으로 저장할 수 있습니다."
      : state.activeTab === "accessory"
        ? "전체수정 모드입니다. 전체 목록에서 악세사리 수량을 수정한 뒤 하단 저장 버튼으로 저장할 수 있습니다."
        : "전체수정 모드입니다. 전체 목록에서 보유 상태를 수정한 뒤 하단 저장 버튼으로 저장할 수 있습니다.";
    return;
  }

  if (!keyword) {
    el.tableGuideText.textContent = "전체 목록 상태에서는 수정할 수 없습니다. 길드원을 검색해주세요.";
    return;
  }

  if (!state.selectedMemberId) {
    const matchedMembers = getMatchedMembers(keyword);
    el.tableGuideText.textContent = matchedMembers.length === 0
      ? "검색 결과가 없습니다."
      : "검색 결과 팝업에서 길드원을 선택해주세요.";
    return;
  }

  if (state.rowEditMemberId === state.selectedMemberId) {
    el.tableGuideText.textContent = state.activeTab === "power"
      ? "선택된 길드원 1명 수정 모드입니다. 이 행에서 전투력, 전문화, 항마력을 수정한 뒤 저장할 수 있습니다."
      : state.activeTab === "accessory"
        ? "선택된 길드원 1명 수정 모드입니다. 이 행에서 악세사리 수량을 수정한 뒤 저장할 수 있습니다."
        : "선택된 길드원 1명 수정 모드입니다. 이 행에서 보유 상태를 수정한 뒤 저장할 수 있습니다.";
    return;
  }

  const selectedMember = state.members.find((member) => member.id === state.selectedMemberId);
  el.tableGuideText.textContent = selectedMember?.can_edit !== false
    ? "선택된 길드원 1명만 표시됩니다. 수정 버튼을 누르면 바로 수정할 수 있습니다."
    : "선택된 길드원 1명만 표시됩니다. 수정 버튼에서 관리자 인증 후 수정할 수 있습니다.";
}

function renderSummaryTable() {
  if (state.activeTab === "power") {
    renderPowerSummaryTable();
    return;
  }

  if (state.activeTab === "accessory") {
    renderAccessorySummaryTable();
    return;
  }

  if (state.activeTab === "boss") {
    renderBossSummaryTable();
    return;
  }

  renderMountSummaryTable();
}

function getRowActionButtonHtml(memberId, saveRole) {
  if (state.overallEditMode) return `<span class="notice-text action-box">일괄</span>`;
  if (state.selectedMemberId !== memberId) return `<span class="notice-text action-box">불가</span>`;
  if (state.rowEditMemberId === memberId) return `<button class="btn btn-primary btn-sm" type="button" data-role="${saveRole}" data-member-id="${memberId}">저장</button>`;
  return `<button class="btn btn-outline btn-sm" type="button" data-role="edit-row" data-member-id="${memberId}">수정</button>`;
}

function renderPowerSummaryTable() {
  const powerSortText = state.powerSortDirection === "asc"
    ? "▲"
    : state.powerSortDirection === "desc"
      ? "▼"
      : "↕";

  const renderWeaponOptions = (selectedValue) => [
    `<option value="">미선택</option>`,
    ...WEAPON_OPTIONS.map((weapon) => (
      `<option value="${escapeAttr(weapon)}" ${weapon === selectedValue ? "selected" : ""}>${escapeHtml(weapon)}</option>`
    ))
  ].join("");

  const renderWeaponValue = (weapon) => {
    const normalizedWeapon = normalizeWeaponValue(weapon);
    if (!normalizedWeapon) return `<span class="weapon-value weapon-empty">-</span>`;

    return `<span class="weapon-value">
      <img class="weapon-icon" src="assets/weapons/${WEAPON_ICON_FILES[normalizedWeapon]}" alt="">
      <span>${escapeHtml(normalizedWeapon)}</span>
    </span>`;
  };

  const headers = [
    `<th>no</th>`,
    `<th class="power-member-col">길드원</th>`,
    `<th class="sortable-header ${state.powerSortDirection ? "active" : ""}" data-role="power-sort-header"><span class="sort-header-inner"><span>전투력</span><span class="sort-indicator">${powerSortText}</span></span></th>`,
    `<th class="power-extra-col">전문화</th>`,
    `<th class="power-extra-col">항마력</th>`,
    `<th class="weapon-col">주무기</th>`,
    `<th class="weapon-col">보조무기</th>`,
    `<th class="save-col">저장</th>`,
    `<th class="last-updated-col sortable-header ${state.updatedAtSortDirection ? "active" : ""}" data-role="updated-sort-header"><span class="sort-header-inner"><span class="last-updated-header-text">수정일</span><span class="sort-indicator">${getUpdatedSortText()}</span></span></th>`
  ];

  el.summaryTableHead.innerHTML = `<tr>${headers.join("")}</tr>`;

  const filteredMembers = getFilteredMembers();

  if (filteredMembers.length === 0) {
    el.summaryTableBody.innerHTML = `
      <tr>
        <td class="empty-row" colspan="9">표시할 길드원이 없습니다.</td>
      </tr>
    `;
    return;
  }

  el.summaryTableBody.innerHTML = filteredMembers.map((member, index) => {
    const isEditable = isMemberEditable(member.id);
    const rowClass = Number(member.power ?? 0) === 0 ? "power-zero-row" : "";

    const powerCell = isEditable
      ? `<input class="inline-power-input" type="number" min="0" step="1" data-role="power-input" data-member-id="${member.id}" value="${escapeAttr(getMemberDraftPower(member))}">`
      : `<span class="value-box">${member.power ?? 0}</span>`;
    const specializationPowerCell = isEditable
      ? `<input class="inline-power-input" type="number" min="0" step="1" data-role="specialization-power-input" data-member-id="${member.id}" value="${escapeAttr(getMemberDraftSpecializationPower(member))}">`
      : `<span class="value-box">${member.specialization_power ?? 0}</span>`;
    const antiMagicPowerCell = isEditable
      ? `<input class="inline-power-input" type="number" min="0" step="1" data-role="anti-magic-power-input" data-member-id="${member.id}" value="${escapeAttr(getMemberDraftAntiMagicPower(member))}">`
      : `<span class="value-box">${member.anti_magic_power ?? 0}</span>`;
    const mainWeaponCell = isEditable
      ? `<select class="inline-weapon-select" data-role="main-weapon-select" data-member-id="${member.id}">${renderWeaponOptions(getMemberDraftMainWeapon(member))}</select>`
      : renderWeaponValue(member.main_weapon);
    const subWeaponCell = isEditable
      ? `<select class="inline-weapon-select" data-role="sub-weapon-select" data-member-id="${member.id}">${renderWeaponOptions(getMemberDraftSubWeapon(member))}</select>`
      : renderWeaponValue(member.sub_weapon);

    const saveCell = getRowActionButtonHtml(member.id, "save-row-power");

    const lastUpdatedCell = `<span class="last-updated-box">${formatUpdatedAt(member.updated_at)}</span>`;

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td class="power-member-col">${escapeHtml(member.name)}</td>
        <td>${powerCell}</td>
        <td class="power-extra-col">${specializationPowerCell}</td>
        <td class="power-extra-col">${antiMagicPowerCell}</td>
        <td class="weapon-col">${mainWeaponCell}</td>
        <td class="weapon-col">${subWeaponCell}</td>
        <td class="save-col">${saveCell}</td>
        <td class="last-updated-col">${lastUpdatedCell}</td>
      </tr>
    `;
  }).join("");
}

function renderMountSummaryTable() {
  const powerSortText = state.powerSortDirection === "asc"
    ? "▲"
    : state.powerSortDirection === "desc"
      ? "▼"
      : "↕";

  const headers = [
    `<th>no</th>`,
    `<th>길드원</th>`,
    `<th class="sortable-header ${state.powerSortDirection ? "active" : ""}" data-role="power-sort-header"><span class="sort-header-inner"><span>전투력</span><span class="sort-indicator">${powerSortText}</span></span></th>`,
    ...state.mountItems.map((item) => `<th class="item-col-header">${escapeHtml(item.name)}</th>`),
    `<th class="save-col">저장</th>`,
    `<th class="last-updated-col sortable-header ${state.updatedAtSortDirection ? "active" : ""}" data-role="updated-sort-header"><span class="sort-header-inner"><span class="last-updated-header-text">수정일</span><span class="sort-indicator">${getUpdatedSortText()}</span></span></th>`
  ];

  el.summaryTableHead.innerHTML = `<tr>${headers.join("")}</tr>`;

  const filteredMembers = getFilteredMembers();

  if (filteredMembers.length === 0) {
    el.summaryTableBody.innerHTML = `
      <tr>
        <td class="empty-row" colspan="${state.mountItems.length + 5}">표시할 길드원이 없습니다.</td>
      </tr>
    `;
    return;
  }

  el.summaryTableBody.innerHTML = filteredMembers.map((member, index) => {
    const isEditable = isMemberEditable(member.id);
    const rowClass = Number(member.power ?? 0) === 0 ? "power-zero-row" : "";

    const powerCell = `<span class="value-box">${member.power ?? 0}</span>`;

    const itemCells = state.mountItems.map((item) => {
      const currentOwned = isEditable
        ? getMemberDraftOwned(member.id, item.id)
        : getOwnedValue(member.id, item.id);

      if (isEditable) {
        return `
          <td>
            <button class="toggle-single-btn ${currentOwned ? "owned" : "not-owned"}" type="button" data-role="owned-toggle" data-member-id="${member.id}" data-item-id="${item.id}">
              ${currentOwned ? "보유" : "미보유"}
            </button>
          </td>
        `;
      }

      return `<td><span class="badge ${currentOwned ? "badge-own" : "badge-not"}">${currentOwned ? "보유" : "미보유"}</span></td>`;
    }).join("");

    const saveCell = getRowActionButtonHtml(member.id, "save-row-mount");

    const lastUpdatedCell = `<span class="last-updated-box">${formatUpdatedAt(getMountLatestUpdatedAt(member.id))}</span>`;

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>${escapeHtml(member.name)}</td>
        <td>${powerCell}</td>
        ${itemCells}
        <td class="save-col">${saveCell}</td>
        <td class="last-updated-col">${lastUpdatedCell}</td>
      </tr>
    `;
  }).join("");
}

function getFilteredBossItems() {
  const keyword = state.bossSearchTerm.trim();
  if (!keyword) return state.bossItems;
  return state.bossItems.filter((item) => item.name.includes(keyword));
}

function renderBossSummaryTable() {
  const powerSortText = state.powerSortDirection === "asc"
    ? "▲"
    : state.powerSortDirection === "desc"
      ? "▼"
      : "↕";

  const filteredBossItems = getFilteredBossItems();

  const headers = [
    `<th>no</th>`,
    `<th>길드원</th>`,
    `<th class="sortable-header ${state.powerSortDirection ? "active" : ""}" data-role="power-sort-header"><span class="sort-header-inner"><span>전투력</span><span class="sort-indicator">${powerSortText}</span></span></th>`,
    ...filteredBossItems.map((item) => `<th class="item-col-header">${escapeHtml(item.name)}</th>`),
    `<th class="save-col">저장</th>`,
    `<th class="last-updated-col sortable-header ${state.updatedAtSortDirection ? "active" : ""}" data-role="updated-sort-header"><span class="sort-header-inner"><span class="last-updated-header-text">수정일</span><span class="sort-indicator">${getUpdatedSortText()}</span></span></th>`
  ];

  el.summaryTableHead.innerHTML = `<tr>${headers.join("")}</tr>`;

  const filteredMembers = getFilteredMembers();

  if (filteredMembers.length === 0) {
    el.summaryTableBody.innerHTML = `
      <tr>
        <td class="empty-row" colspan="${filteredBossItems.length + 5}">표시할 길드원이 없습니다.</td>
      </tr>
    `;
    return;
  }

  el.summaryTableBody.innerHTML = filteredMembers.map((member, index) => {
    const isEditable = isMemberEditable(member.id);
    const rowClass = Number(member.power ?? 0) === 0 ? "power-zero-row" : "";

    const powerCell = `<span class="value-box">${member.power ?? 0}</span>`;

    const itemCells = filteredBossItems.map((item) => {
      const currentOwned = isEditable
        ? getMemberDraftOwned(member.id, item.id)
        : getBossOwnedValue(member.id, item.id);

      if (isEditable) {
        return `
          <td>
            <button class="toggle-single-btn ${currentOwned ? "owned" : "not-owned"}" type="button" data-role="owned-toggle" data-member-id="${member.id}" data-item-id="${item.id}">
              ${currentOwned ? "보유" : "미보유"}
            </button>
          </td>
        `;
      }

      return `<td><span class="badge ${currentOwned ? "badge-own" : "badge-not"}">${currentOwned ? "보유" : "미보유"}</span></td>`;
    }).join("");

    const saveCell = getRowActionButtonHtml(member.id, "save-row-boss");

    const lastUpdatedCell = `<span class="last-updated-box">${formatUpdatedAt(getBossLatestUpdatedAt(member.id))}</span>`;

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>${escapeHtml(member.name)}</td>
        <td>${powerCell}</td>
        ${itemCells}
        <td class="save-col">${saveCell}</td>
        <td class="last-updated-col">${lastUpdatedCell}</td>
      </tr>
    `;
  }).join("");
}

function renderAccessorySummaryTable() {
  const powerSortText = state.powerSortDirection === "asc"
    ? "▲"
    : state.powerSortDirection === "desc"
      ? "▼"
      : "↕";

  const totalAccessoryColumnCount = state.accessoryGroups.reduce((sum, group) => {
    return sum + (state.hiddenAccessoryGroupIds[group.id] ? 1 : ACCESSORY_PARTS.length);
  }, 0);

  const topHeaders = [
    `<th rowspan="2">no</th>`,
    `<th rowspan="2">길드원</th>`,
    `<th rowspan="2" class="sortable-header ${state.powerSortDirection ? "active" : ""}" data-role="power-sort-header"><span class="sort-header-inner"><span>전투력</span><span class="sort-indicator">${powerSortText}</span></span></th>`,
    ...state.accessoryGroups.map((group) => {
      const isHidden = Boolean(state.hiddenAccessoryGroupIds[group.id]);
      const colSpan = isHidden ? 1 : ACCESSORY_PARTS.length;
      const hiddenClass = isHidden ? ' is-collapsed' : '';
      return `<th colspan="${colSpan}" class="group-header group-boundary-start group-boundary-end${hiddenClass}"><div class="group-header-inner"><span class="group-header-text">${escapeHtml(group.name)}</span><button class="group-hide-btn ${isHidden ? "is-hidden" : ""}" type="button" data-role="toggle-accessory-group-hidden" data-group-id="${group.id}">${isHidden ? "숨김해제" : "숨김"}</button></div></th>`;
    }),
    `<th rowspan="2" class="save-col">저장</th>`,
    `<th rowspan="2" class="last-updated-col sortable-header ${state.updatedAtSortDirection ? "active" : ""}" data-role="updated-sort-header"><span class="sort-header-inner"><span class="last-updated-header-text">수정일</span><span class="sort-indicator">${getUpdatedSortText()}</span></span></th>`
  ];

  const subHeaders = state.accessoryGroups.flatMap((group) => {
    const isHidden = Boolean(state.hiddenAccessoryGroupIds[group.id]);

    if (isHidden) {
      return [`<th class="accessory-sub-header accessory-collapsed-header group-boundary-start group-boundary-end">숨김</th>`];
    }

    return ACCESSORY_PARTS.map((part, partIndex) => {
      const classes = ['accessory-sub-header'];
      if (partIndex === 0) classes.push('group-boundary-start');
      if (partIndex === ACCESSORY_PARTS.length - 1) classes.push('group-boundary-end');
      return `<th class="${classes.join(' ')}">${part.label}</th>`;
    });
  });

  el.summaryTableHead.innerHTML = `
    <tr>${topHeaders.join("")}</tr>
    <tr>${subHeaders.join("")}</tr>
  `;

  const filteredMembers = getFilteredMembers();

  if (filteredMembers.length === 0) {
    el.summaryTableBody.innerHTML = `
      <tr>
        <td class="empty-row" colspan="${totalAccessoryColumnCount + 5}">표시할 길드원이 없습니다.</td>
      </tr>
    `;
    return;
  }

  el.summaryTableBody.innerHTML = filteredMembers.map((member, index) => {
    const isEditable = isMemberEditable(member.id);
    const rowClass = Number(member.power ?? 0) === 0 ? "power-zero-row" : "";

    const powerCell = `<span class="value-box">${member.power ?? 0}</span>`;

    const groupCells = state.accessoryGroups.map((group) => {
      const record = getAccessoryRecord(member.id, group.id);
      const isHidden = Boolean(state.hiddenAccessoryGroupIds[group.id]);

      if (isHidden) {
        return `<td class="accessory-collapsed-cell group-boundary-start group-boundary-end"${rowClass ? ` style="${getAccessoryZeroPowerCellStyle()}"` : ""}><span class="accessory-collapsed-text">숨김</span></td>`;
      }

      return ACCESSORY_PARTS.map((part, partIndex) => {
        const maxCount = Number(group.max_count ?? 0);
        const currentValue = isEditable
          ? getMemberDraftAccessory(member.id, group.id, part.key)
          : Number(record?.[part.key] ?? 0);
        const tdClasses = ['accessory-heat-cell'];
        if (partIndex === 0) tdClasses.push('group-boundary-start');
        if (partIndex === ACCESSORY_PARTS.length - 1) tdClasses.push('group-boundary-end');
        const tdClassAttr = ` class="${tdClasses.join(' ')}"`;
        const tdStyleAttr = ` style="${rowClass ? getAccessoryZeroPowerCellStyle() : getAccessoryHeatCellStyle(currentValue, maxCount)}"`;

        if (isEditable) {
          return `
            <td${tdClassAttr}${tdStyleAttr}>
              <input class="inline-qty-input accessory-heat-input" type="number" min="0" max="${escapeAttr(maxCount)}" step="1" data-role="accessory-qty-input" data-member-id="${member.id}" data-group-id="${group.id}" data-part-key="${part.key}" value="${escapeAttr(currentValue)}">
            </td>
          `;
        }

        return `<td${tdClassAttr}${tdStyleAttr}><span class="value-box qty-box accessory-heat-value">${currentValue}</span></td>`;
      }).join("");
    }).join("");

    const saveCell = getRowActionButtonHtml(member.id, "save-row-accessory");

    const lastUpdatedCell = `<span class="last-updated-box">${formatUpdatedAt(getAccessoryLatestUpdatedAt(member.id))}</span>`;

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>${escapeHtml(member.name)}</td>
        <td>${powerCell}</td>
        ${groupCells}
        <td class="save-col">${saveCell}</td>
        <td class="last-updated-col">${lastUpdatedCell}</td>
      </tr>
    `;
  }).join("");
}

function renderSearchSelectModal(members) {
  el.searchSelectGuideText.textContent = "검색 결과에서 길드원을 선택해주세요.";

  if (members.length === 0) {
    el.searchSelectList.innerHTML = '<div class="search-select-empty">검색 결과가 없습니다.</div>';
    return;
  }

  el.searchSelectList.innerHTML = members.map((member) => `
    <button class="search-select-item" type="button" data-role="search-select-item" data-member-id="${member.id}">
      ${escapeHtml(member.name)}
    </button>
  `).join("");
}

function handleSearchSelectClick(event) {
  const button = event.target.closest('[data-role="search-select-item"]');
  if (!button) return;
  selectMemberFromSearch(button.dataset.memberId);
}

function selectMemberFromSearch(memberId) {
  const member = state.members.find((entry) => entry.id === memberId);
  if (!member) return;

  state.searchTerm = member.name;
  state.selectedMemberId = member.id;
  state.rowEditMemberId = null;
  el.searchInput.value = member.name;
  closeSearchSelectModal();
  syncDraftState();
  renderAll();
}

function closeSearchSelectModal() {
  closeModal(el.searchSelectModalBackdrop);
}


function initializeDistributionState() {
  initializeDistributionStateModule(state, { createDistributionGroupState });
}

function createDistributionGroupState(type) {
  return createDistributionGroupStateModule(type, createDistributionSummary);
}

function createDistributionSummary() {
  return createDistributionSummaryModule();
}

function createDistributionDeduction(name = "", mode = "percent", value = "") {
  return createDistributionDeductionModule(createDistributionId, name, mode, value);
}

function createBossRule(name = "", score = 1, group = "mainland") {
  return createBossRuleModule(createDistributionId, name, score, group);
}

function createNameRule(source = "", target = "") {
  return createNameRuleModule(createDistributionId, source, target);
}

function createDistributionId(prefix) {
  return createDistributionIdModule(prefix);
}

function getDistributionRenderDeps() {
  return {
    state,
    setValueIfNeeded,
    setText,
    formatNumber,
    formatDecimal,
    formatPercent,
    escapeHtml,
    escapeAttr,
    getDistributionAssignedAmounts,
    calculateDistributionGroupSummary,
    findAppliedDistributionDeductionRow,
    getDistributionDeductionAmount,
    updateDistributionSubtabs
  };
}

function renderDistributionTab() {
  renderDistributionTabModule(getDistributionRenderDeps());
}

function renderDistributionCommonInputs() {
  renderDistributionCommonInputsModule(getDistributionRenderDeps());
}

function setValueIfNeeded(id, nextValue) {
  const input = document.getElementById(id);
  if (!input) return;
  if (document.activeElement === input) return;
  if (input.value !== String(nextValue ?? "")) {
    input.value = String(nextValue ?? "");
  }
}

function renderDistributionCommonSummary() {
  renderDistributionCommonSummaryModule(getDistributionRenderDeps());
}

function renderDistributionGroup(groupKey) {
  renderDistributionGroupModule(getDistributionRenderDeps(), groupKey);
}

function renderDistributionDeductionTable(groupKey) {
  renderDistributionDeductionTableModule(getDistributionRenderDeps(), groupKey);
}

function renderDistributionLogs(groupKey) {
  renderDistributionLogsModule(getDistributionRenderDeps(), groupKey);
}

function renderDistributionResults(groupKey) {
  renderDistributionResultsModule(getDistributionRenderDeps(), groupKey);
}

function renderDistributionBossRules() {
  renderDistributionBossRulesModule(getDistributionRenderDeps());
}

function renderDistributionNameRules() {
  renderDistributionNameRulesModule(getDistributionRenderDeps());
}

function calculateDistributionGroupSummary(groupKey) {
  return calculateDistributionGroupSummaryModule(state, groupKey);
}

function getDistributionAssignedAmounts() {
  return getDistributionAssignedAmountsModule(state);
}

function getDistributionDeductionAmount(groupKey, row) {
  return getDistributionDeductionAmountModule(state, groupKey, row);
}

function bindNewDistributionUi() {
  bindDistributionUiModule(state, {
    closeDistributionModal,
    handleDistributionAddBossRule,
    handleDistributionAddDeduction,
    handleDistributionAddNameRule,
    handleDistributionApplyDeductions,
    handleDistributionApplyLogEdit,
    handleDistributionCalculate,
    handleDistributionChange,
    handleDistributionClearResults,
    handleDistributionClick,
    handleDistributionExport,
    handleDistributionFinalSave,
    handleDistributionInput,
    handleDistributionLoadExcel,
    handleDistributionRefreshGroup,
    handleDistributionReset,
    handleDistributionSaveBossRules,
    handleDistributionSaveNameRules,
    openDistributionModal,
    updateDistributionSubtabs
  });
}

function updateDistributionSubtabs() {
  const activeKey = state.distribution.activeSubtab || "mainland";
  document.querySelectorAll(".newdist-subtab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.newdistTab === activeKey);
  });
  document.getElementById("newdistPanelMainland")?.classList.toggle("active", activeKey === "mainland");
  document.getElementById("newdistPanelWorld")?.classList.toggle("active", activeKey === "world");
}

function handleDistributionReset() {
  if (!window.confirm("분배 탭 데이터를 초기화하시겠습니까?")) return;
  initializeDistributionState();
  renderDistributionTab();
}

async function handleDistributionLoadExcel() {
  await ensureDistributionBossRulesLoaded();

  const fileInput = document.getElementById("newdistFileInput");
  const file = fileInput?.files?.[0];
  if (!file) {
    alert("보스로그 엑셀 파일을 선택해주세요.");
    return;
  }

  try {
    const workbook = await readWorkbookFile(file);
    const rows = readDistributionSheetRows(workbook);
    const parsedLogs = buildDistributionLogsFromRows(rows);

    state.distribution.workbookName = file.name;
    state.distribution.rawLogs = parsedLogs;
    rebuildDistributionWorkingLogs();
    renderDistributionTab();

    const loadedCount = state.distribution.loadedLogs.length;
    const unknownCount = state.distribution.unknownBosses.length;
    alert(`엑셀 로드가 완료되었습니다.\n작업 로그 ${loadedCount}건${unknownCount ? `\n미분류 보스 ${unknownCount}건` : ""}`);
  } catch (error) {
    alert(error.message || "엑셀 로드 중 오류가 발생했습니다.");
  }
}

function handleDistributionAddBossRule() {
  state.distribution.bossRules.push(createBossRule("", 1, "mainland"));
  renderDistributionBossRules();
}

async function handleDistributionSaveBossRules() {
  sanitizeDistributionBossRules();

  try {
    await saveDistributionBossRulesToDb();
    rebuildDistributionWorkingLogs();
    renderDistributionTab();
    closeDistributionModal("newdistBossManageModal");
    alert("분배 보스 관리가 저장되었습니다.");
  } catch (error) {
    alert(error.message || "분배 보스 관리 저장 중 오류가 발생했습니다.");
  }
}

function handleDistributionAddNameRule() {
  state.distribution.nameRules.push(createNameRule("", ""));
  renderDistributionNameRules();
}

function handleDistributionSaveNameRules() {
  sanitizeDistributionNameRules();
  rebuildDistributionWorkingLogs();
  renderDistributionTab();
  closeDistributionModal("newdistNameRuleModal");
  alert("참여자 이름 정리가 저장되었습니다.");
}

function handleDistributionAddDeduction(groupKey) {
  state.distribution[groupKey].deductions.push(createDistributionDeduction("", "percent", ""));
  renderDistributionGroup(groupKey);
}

function handleDistributionApplyDeductions(groupKey) {
  state.distribution[groupKey].appliedDeductions = state.distribution[groupKey].deductions.map((row) => ({ ...row }));
  renderDistributionGroup(groupKey);
}

function handleDistributionRefreshGroup(groupKey) {
  rebuildDistributionWorkingLogs();
  state.distribution[groupKey].results = [];
  renderDistributionTab();
}

function handleDistributionCalculate(groupKey) {
  rebuildDistributionWorkingLogs();
  calculateDistributionResults(groupKey);
  renderDistributionTab();
}

function handleDistributionClearResults(groupKey) {
  state.distribution[groupKey].results = [];
  renderDistributionGroup(groupKey);
}

function handleDistributionClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  const role = target.dataset.role;

  if (role === "newdist-delete-boss") {
    state.distribution.bossRules = state.distribution.bossRules.filter((row) => row.id !== target.dataset.id);
    renderDistributionBossRules();
    return;
  }

  if (role === "newdist-delete-name") {
    state.distribution.nameRules = state.distribution.nameRules.filter((row) => row.id !== target.dataset.id);
    renderDistributionNameRules();
    return;
  }

  if (role === "newdist-delete-deduction") {
    const groupKey = target.dataset.group;
    state.distribution[groupKey].deductions = state.distribution[groupKey].deductions.filter((row) => row.id !== target.dataset.id);
    state.distribution[groupKey].appliedDeductions = state.distribution[groupKey].appliedDeductions.filter((row) => row.id !== target.dataset.id);
    renderDistributionGroup(groupKey);
    return;
  }

  if (role === "newdist-edit-log") {
    openDistributionLogEdit(target.dataset.group, target.dataset.logKey);
  }
}

function handleDistributionInput(event) {
  const target = event.target;
  const distribution = state.distribution;
  const role = target.dataset.role;

  if (target.id === "newdistTotalDiamondInput") {
    distribution.totalDiamond = Math.max(0, Math.floor(Number(target.value) || 0));
    renderDistributionTab();
    return;
  }

  if (target.id === "newdistMainlandRatioInput") {
    const value = clampPercent(target.value);
    distribution.mainlandRatio = value;
    distribution.worldRatio = 100 - value;
    renderDistributionTab();
    return;
  }

  if (target.id === "newdistWorldRatioInput") {
    const value = clampPercent(target.value);
    distribution.worldRatio = value;
    distribution.mainlandRatio = 100 - value;
    renderDistributionTab();
    return;
  }

  if (role === "newdist-boss-name") {
    const row = distribution.bossRules.find((entry) => entry.id === target.dataset.id);
    if (row) row.name = target.value;
    return;
  }

  if (role === "newdist-boss-score") {
    const row = distribution.bossRules.find((entry) => entry.id === target.dataset.id);
    if (row) {
      const parsedScore = Math.floor(Number(target.value));
      row.score = Number.isFinite(parsedScore) && parsedScore >= 0 ? parsedScore : 0;
    }
    return;
  }

  if (role === "newdist-name-source") {
    const row = distribution.nameRules.find((entry) => entry.id === target.dataset.id);
    if (row) row.source = target.value;
    return;
  }

  if (role === "newdist-name-target") {
    const row = distribution.nameRules.find((entry) => entry.id === target.dataset.id);
    if (row) row.target = target.value;
    return;
  }

  if (role === "newdist-deduction-name") {
    const row = findDistributionDeductionRow(target.dataset.group, target.dataset.id);
    if (row) row.name = target.value;
    return;
  }

  if (role === "newdist-deduction-value") {
    const row = findDistributionDeductionRow(target.dataset.group, target.dataset.id);
    if (row) {
      row.value = target.value === "" ? "" : Math.max(0, Number(target.value) || 0);
    }
  }
}

function handleDistributionChange(event) {
  const target = event.target;
  const role = target.dataset.role;

  if (role === "newdist-boss-group") {
    const row = state.distribution.bossRules.find((entry) => entry.id === target.dataset.id);
    if (row) row.group = target.value === "world" ? "world" : "mainland";
    return;
  }

  if (role === "newdist-deduction-mode") {
    const row = findDistributionDeductionRow(target.dataset.group, target.dataset.id);
    if (row) {
      row.mode = target.value === "amount" ? "amount" : "percent";
    }
  }
}

async function openDistributionModal(id) {
  document.getElementById(id)?.classList.remove("hidden");
  if (id === "newdistBossManageModal") {
    try {
      await loadDistributionBossRulesFromDb();
    } catch (error) {
      alert(error.message || "분배 보스 목록 조회 중 오류가 발생했습니다.");
    }
    renderDistributionBossRules();
  }
  if (id === "newdistNameRuleModal") renderDistributionNameRules();
}

function closeDistributionModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

function openDistributionLogEdit(groupKey, logKey) {
  const log = state.distribution[groupKey].logs.find((entry) => entry.key === logKey);
  if (!log) return;
  state.distribution.editingLogKey = logKey;
  const current = document.getElementById("newdistLogEditCurrent");
  const edited = document.getElementById("newdistLogEditEdited");
  if (current) current.value = log.workingParticipants.join(", ");
  if (edited) edited.value = log.overrideParticipants ? log.overrideParticipants.join(", ") : log.workingParticipants.join(", ");
  openDistributionModal("newdistLogEditModal");
}

function handleDistributionApplyLogEdit() {
  const logKey = state.distribution.editingLogKey;
  if (!logKey) return;
  const edited = document.getElementById("newdistLogEditEdited");
  const nextParticipants = splitParticipantText(edited?.value || "");
  const targetLog = state.distribution.rawLogs.find((entry) => entry.key === logKey);
  if (!targetLog) return;

  targetLog.overrideParticipants = dedupeStrings(nextParticipants);
  rebuildDistributionWorkingLogs();
  renderDistributionTab();
  closeDistributionModal("newdistLogEditModal");
}

function findDistributionDeductionRow(groupKey, rowId) {
  return state.distribution[groupKey]?.deductions?.find((entry) => entry.id === rowId) || null;
}

function findAppliedDistributionDeductionRow(groupKey, rowId) {
  return state.distribution[groupKey]?.appliedDeductions?.find((entry) => entry.id === rowId) || null;
}

function clampPercent(value) {
  const num = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(100, num));
}

async function readWorkbookFile(file) {
  return readWorkbookFileModule(file);
}

function readDistributionSheetRows(workbook) {
  return readDistributionSheetRowsModule(workbook, XLSX);
}

function buildDistributionLogsFromRows(rows) {
  return buildDistributionLogsFromRowsModule(rows, createDistributionId);
}

function findDistributionHeaderKey(keys, words) {
  return findDistributionHeaderKeyModule(keys, words);
}

function normalizeDistributionDateText(value) {
  return normalizeDistributionDateTextModule(value);
}

function normalizeDistributionTimeText(value) {
  return normalizeDistributionTimeTextModule(value);
}

function splitParticipantText(text) {
  return splitParticipantTextModule(text);
}

function dedupeStrings(values) {
  return dedupeStringsModule(values);
}

function sanitizeDistributionBossRules() {
  sanitizeDistributionBossRulesModule(state);
}

function isUuidLike(value) {
  return isUuidLikeModule(value);
}

async function loadDistributionBossRulesFromDb(forceReload = false) {
  await loadDistributionBossRulesFromDbModule({
    state,
    supabase,
    distributionBossRulesTable: DISTRIBUTION_BOSS_RULES_TABLE
  }, forceReload);
}

async function ensureDistributionBossRulesLoaded() {
  await ensureDistributionBossRulesLoadedModule({
    state,
    supabase,
    distributionBossRulesTable: DISTRIBUTION_BOSS_RULES_TABLE
  });
}

async function saveDistributionBossRulesToDb() {
  await saveDistributionBossRulesToDbModule({
    state,
    supabase,
    distributionBossRulesTable: DISTRIBUTION_BOSS_RULES_TABLE
  });
}

function sanitizeDistributionNameRules() {
  sanitizeDistributionNameRulesModule(state);
}

function rebuildDistributionWorkingLogs() {
  rebuildDistributionWorkingLogsModule(state);
}

function calculateDistributionResults(groupKey) {
  calculateDistributionResultsModule(state, groupKey);
}

function normalizeDistributionName(value) {
  return normalizeDistributionNameModule(value);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value ?? "");
  }
}

async function fetchPagedRows(makeQuery, errorPrefix, pageSize = 1000) {
  const rows = [];
  let from = 0;

  while (true) {
    const res = await makeQuery().range(from, from + pageSize - 1);

    if (res.error) {
      throw new Error(`${errorPrefix} 중 오류가 발생했습니다.\n${res.error.message}`);
    }

    const pageRows = res.data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}


async function loadHistoryData() {
  await loadHistoryDataModule({ state, supabase, fetchPagedRows, formatDateTime, alert });
}

function initializeHistoryState() {
  initializeHistoryStateModule(state);
}

function renderHistoryTab() {
  renderHistoryTabModule({ state, el, formatNumber, formatDecimal, escapeHtml });
}

function renderHistoryInputs() {
  renderHistoryInputsModule({ state, el });
}

function getFilteredHistoryItems() {
  return getFilteredHistoryItemsModule(state);
}

function renderHistoryListTable() {
  renderHistoryListTableModule({ state, el, formatNumber, escapeHtml });
}

async function loadHistoryDetail(historyId, forceReload = false) {
  return loadHistoryDetailModule({
    state,
    supabase,
    fetchPagedRows,
    renderHistoryDetail,
    alert
  }, historyId, forceReload);
}

function getSelectedHistoryDetail() {
  return getSelectedHistoryDetailModule(state);
}

function getSelectedHistoryItem() {
  return getSelectedHistoryItemModule(state);
}

function renderHistoryDetail() {
  renderHistoryDetailModule({ state, el, formatNumber, formatDecimal, escapeHtml });
}

function renderHistoryGroupSummaryTable(rows) {
  renderHistoryGroupSummaryTableModule({ el, formatNumber, formatDecimal, rows });
}

function renderHistoryDeductionTable(rows) {
  renderHistoryDeductionTableModule({ el, formatNumber, formatDecimal, escapeHtml, rows });
}

function renderHistoryMemberTable(rows, activeGroupTypes = []) {
  renderHistoryMemberTableModule({ el, formatNumber, escapeHtml, rows, activeGroupTypes });
}

async function handleHistoryListClick(event) {
  await handleHistoryListClickModule({ state, loadHistoryDetail, renderHistoryTab }, event);
}

async function handleHistorySearch() {
  await handleHistorySearchModule({ state, el, loadHistoryData, renderHistoryTab });
}

async function handleHistoryDelete() {
  await handleHistoryDeleteModule({
    state,
    supabase,
    getSelectedHistoryItem,
    loadHistoryData,
    renderHistoryTab,
    alert,
    confirm: window.confirm.bind(window)
  });
}

async function handleHistoryExport() {
  await handleHistoryExportModule({
    getSelectedHistoryItem,
    loadHistoryDetail,
    writeDistributionHistoryWorkbook,
    alert
  });
}



function getDistributionPeriodRange() {
  return getDistributionPeriodRangeModule(state);
}

function getDistributionCombinedResults() {
  return getDistributionCombinedResultsModule(state);
}

function getDistributionCombinedSummary() {
  return getDistributionCombinedSummaryModule(state, createDistributionSummary);
}

function handleDistributionExport() {
  handleDistributionExportModule({
    state,
    XLSX,
    getDistributionCombinedResults,
    getDistributionPeriodRange,
    formatPercent,
    formatBossParticipationFileDate,
    alertFn: alert
  });
}

async function cleanupDistributionHistorySave(historyId) {
  await cleanupDistributionHistorySaveModule(supabase, historyId);
}

function setDistributionFinalSaveButtonsDisabled(disabled) {
  setDistributionFinalSaveButtonsDisabledModule(disabled);
}

async function handleDistributionFinalSave() {
  await handleDistributionFinalSaveModule({
    state,
    supabase,
    getIsDistributionFinalSaving: () => isDistributionFinalSaving,
    setIsDistributionFinalSaving: (value) => {
      isDistributionFinalSaving = Boolean(value);
    },
    getDistributionAssignedAmounts,
    getDistributionCombinedResults,
    getDistributionPeriodRange,
    getDistributionCombinedSummary,
    createDistributionSummary,
    getDistributionDeductionAmount,
    normalizeDistributionName,
    loadHistoryData,
    alertFn: alert,
    confirmFn: window.confirm.bind(window),
    consoleRef: console
  });
}

function writeDistributionHistoryWorkbook(item, detail) {
  writeDistributionHistoryWorkbookModule({
    item,
    detail,
    XLSX,
    formatPercent,
    formatBossParticipationFileDate
  });
}


function initializeBossParticipationState() {
  initializeBossParticipationStateModule(state);
}

async function handleBossParticipationSearch() {
  await handleBossParticipationSearchModule({
    state,
    el,
    loadBossParticipationData,
    renderBossParticipationTab
  });
}

async function handleBossParticipationReset() {
  await handleBossParticipationResetModule({
    state,
    el,
    renderBossParticipationTab
  });
}

function handleBossParticipationTimeInput(event) {
  const input = event.target;
  const formattedValue = formatBossParticipationTimeInput(input.value);
  if (input.value !== formattedValue) {
    input.value = formattedValue;
  }
}

async function loadBossParticipationData() {
  await loadBossParticipationDataModule({
    state,
    bossSupabase,
    normalizeSearchText,
    renderBossParticipationTab,
    alertFn: alert
  });
}

function renderBossParticipationTab() {
  renderBossParticipationTabModule({
    state,
    el,
    setValueIfNeeded,
    normalizeSearchText,
    formatNumber,
    escapeHtml
  });
}

function handleBossParticipationExport() {
  handleBossParticipationExportModule({ state, XLSX, alertFn: alert });
}

function renderGuildManageTable() {
  if (state.members.length === 0) {
    el.guildManageTableBody.innerHTML = `<tr><td colspan="4">등록된 길드원이 없습니다.</td></tr>`;
    return;
  }

  el.guildManageTableBody.innerHTML = state.members.map((member, index) => {
    const canEdit = member.can_edit !== false;

    return `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(member.name)}</td>
      <td>
        <button class="toggle-single-btn ${canEdit ? "owned" : "not-owned"}" type="button" data-action="toggle-member-editable" data-id="${member.id}">
          ${canEdit ? "수정 가능" : "수정 불가"}
        </button>
      </td>
      <td>
        <div class="row-actions">
          <button class="text-btn" type="button" data-action="edit-member" data-id="${member.id}">수정</button>
          <button class="text-btn danger" type="button" data-action="delete-member" data-id="${member.id}">삭제</button>
        </div>
      </td>
    </tr>
  `;
  }).join("");
}

function renderItemManageTable() {
  const manageType = getItemManageType();
  const items = manageType === "accessory" ? state.accessoryGroups : manageType === "boss" ? state.bossItems : state.mountItems;
  const emptyText = manageType === "accessory" ? "등록된 악세사리가 없습니다." : manageType === "boss" ? "등록된 보스컬렉이 없습니다." : "등록된 탈것이 없습니다.";

  if (items.length === 0) {
    el.itemManageTableBody.innerHTML = `<tr><td colspan="${manageType === "accessory" ? 4 : 3}">${emptyText}</td></tr>`;
    return;
  }

  el.itemManageTableBody.innerHTML = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name)}</td>
      ${manageType === "accessory" ? `<td>${Number(item.max_count ?? 0)}</td>` : ""}
      <td>
        <div class="row-actions">
          <button class="text-btn" type="button" data-action="edit-item" data-id="${item.id}">수정</button>
          <button class="text-btn danger" type="button" data-action="delete-item" data-id="${item.id}">삭제</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function handleSummaryTableInput(event) {
  const target = event.target;

  if (target.matches('[data-role="power-input"]')) {
    const memberId = target.dataset.memberId;
    if (state.overallEditMode) {
      ensureDraftRow(memberId).power = target.value;
    } else {
      state.draftPower = target.value;
    }
    return;
  }

  if (target.matches('[data-role="specialization-power-input"]')) {
    const memberId = target.dataset.memberId;
    if (state.overallEditMode) {
      ensureDraftRow(memberId).specializationPower = target.value;
    } else {
      state.draftSpecializationPower = target.value;
    }
    return;
  }

  if (target.matches('[data-role="anti-magic-power-input"]')) {
    const memberId = target.dataset.memberId;
    if (state.overallEditMode) {
      ensureDraftRow(memberId).antiMagicPower = target.value;
    } else {
      state.draftAntiMagicPower = target.value;
    }
    return;
  }

  if (target.matches('[data-role="main-weapon-select"]')) {
    const memberId = target.dataset.memberId;
    if (state.overallEditMode) {
      ensureDraftRow(memberId).mainWeapon = target.value;
    } else {
      state.draftMainWeapon = target.value;
    }
    return;
  }

  if (target.matches('[data-role="sub-weapon-select"]')) {
    const memberId = target.dataset.memberId;
    if (state.overallEditMode) {
      ensureDraftRow(memberId).subWeapon = target.value;
    } else {
      state.draftSubWeapon = target.value;
    }
    return;
  }

  if (target.matches('[data-role="accessory-qty-input"]')) {
    const memberId = target.dataset.memberId;
    const groupId = target.dataset.groupId;
    const partKey = target.dataset.partKey;
    if (!state.overallEditMode && memberId !== state.draftMemberId) return;

    const group = state.accessoryGroups.find((entry) => String(entry.id) === String(groupId));
    const maxCount = Number(group?.max_count ?? 0);
    const value = Math.min(maxCount, Math.max(0, Math.floor(Number(target.value) || 0)));
    if (state.overallEditMode) {
      const draftRow = ensureDraftRow(memberId);
      if (!draftRow.accessoryMap[groupId]) {
        draftRow.accessoryMap[groupId] = {};
      }
      draftRow.accessoryMap[groupId][partKey] = value;
    } else {
      if (!state.draftAccessoryMap[groupId]) {
        state.draftAccessoryMap[groupId] = {};
      }
      state.draftAccessoryMap[groupId][partKey] = value;
    }
    target.value = String(value);
  }
}

function getUpdatedSortText() {
  return state.updatedAtSortDirection === "asc"
    ? "▲"
    : state.updatedAtSortDirection === "desc"
      ? "▼"
      : "↕";
}

function getComparableUpdatedAt(member) {
  const value = state.activeTab === "accessory"
    ? getAccessoryLatestUpdatedAt(member.id)
    : state.activeTab === "boss"
      ? getBossLatestUpdatedAt(member.id)
      : state.activeTab === "mount"
        ? getMountLatestUpdatedAt(member.id)
        : member?.updated_at;

  if (!value) return -1;

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : -1;
}

function handleSummaryTableHeadClick(event) {
  const hideButton = event.target.closest('[data-role="toggle-accessory-group-hidden"]');
  if (hideButton) {
    toggleAccessoryGroupHidden(hideButton.dataset.groupId);
    return;
  }

  const updatedHeader = event.target.closest('[data-role="updated-sort-header"]');
  if (updatedHeader) {
    state.powerSortDirection = null;

    if (state.updatedAtSortDirection === "asc") {
      state.updatedAtSortDirection = "desc";
    } else if (state.updatedAtSortDirection === "desc") {
      state.updatedAtSortDirection = null;
    } else {
      state.updatedAtSortDirection = "asc";
    }

    renderSummaryTable();
    return;
  }

  const header = event.target.closest('[data-role="power-sort-header"]');
  if (!header) return;

  state.updatedAtSortDirection = null;

  if (state.powerSortDirection === "asc") {
    state.powerSortDirection = "desc";
  } else if (state.powerSortDirection === "desc") {
    state.powerSortDirection = null;
  } else {
    state.powerSortDirection = "asc";
  }

  renderSummaryTable();
}

function handleSummaryTableClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const role = button.dataset.role;

  if (role === "owned-toggle") {
    const memberId = button.dataset.memberId;
    const itemId = button.dataset.itemId;
    if (!state.overallEditMode && memberId !== state.draftMemberId) return;

    if (state.overallEditMode) {
      const draftRow = ensureDraftRow(memberId);
      draftRow.ownedMap[itemId] = !Boolean(draftRow.ownedMap[itemId]);
    } else {
      state.draftOwnedMap[itemId] = !Boolean(state.draftOwnedMap[itemId]);
    }
    renderSummaryTable();
    return;
  }

  if (role === "toggle-accessory-group-hidden") {
    toggleAccessoryGroupHidden(button.dataset.groupId);
    return;
  }

  if (role === "edit-row") {
    const member = state.members.find((entry) => entry.id === button.dataset.memberId);
    if (member?.can_edit !== false) {
      state.rowEditMemberId = button.dataset.memberId;
      renderAll();
      return;
    }

    openPasswordModal("row-edit", button.dataset.memberId);
    return;
  }

  if (role === "save-row-power") {
    savePowerEditableRow(button.dataset.memberId);
    return;
  }

  if (role === "save-row-mount") {
    saveMountEditableRow(button.dataset.memberId);
    return;
  }

  if (role === "save-row-accessory") {
    saveAccessoryEditableRow(button.dataset.memberId);
    return;
  }

  if (role === "save-row-boss") {
    saveBossEditableRow(button.dataset.memberId);
  }
}

function normalizePowerValue(value) {
  return Math.floor(Number(value) || 0);
}

function normalizeWeaponValue(value) {
  const normalizedValue = String(value ?? "").trim();
  return WEAPON_OPTIONS.includes(normalizedValue) ? normalizedValue : null;
}

function validatePowerValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0;
}

function getDraftPowerValues(draftRow) {
  return {
    power: normalizePowerValue(draftRow?.power),
    specializationPower: normalizePowerValue(draftRow?.specializationPower),
    antiMagicPower: normalizePowerValue(draftRow?.antiMagicPower),
    mainWeapon: normalizeWeaponValue(draftRow?.mainWeapon),
    subWeapon: normalizeWeaponValue(draftRow?.subWeapon)
  };
}

function validateDraftPowerValues(draftRow) {
  return validatePowerValue(draftRow?.power)
    && validatePowerValue(draftRow?.specializationPower)
    && validatePowerValue(draftRow?.antiMagicPower);
}

async function updateMemberPower(memberId, powerValues, updatedAt) {
  const values = getDraftPowerValues(powerValues);
  const updateMemberRes = await supabase
    .from("guild_members")
    .update({
      power: values.power,
      specialization_power: values.specializationPower,
      anti_magic_power: values.antiMagicPower,
      main_weapon: values.mainWeapon,
      sub_weapon: values.subWeapon,
      updated_at: updatedAt
    })
    .eq("id", memberId);

  if (updateMemberRes.error) {
    throw new Error(`전투력 저장 중 오류가 발생했습니다.\n${updateMemberRes.error.message}`);
  }
}

async function persistPowerRow(memberId, draftRow) {
  await updateMemberPower(memberId, draftRow, new Date().toISOString());
}

async function persistMountRow(memberId, draftRow) {
  const now = new Date().toISOString();

  const upsertPayload = state.mountItems.map((item) => ({
    member_id: memberId,
    mount_id: item.id,
    owned: Boolean(draftRow?.ownedMap?.[item.id]),
    updated_at: now
  }));

  const upsertRes = await supabase
    .from("member_mounts")
    .upsert(upsertPayload, { onConflict: "member_id,mount_id" });

  if (upsertRes.error) {
    throw new Error(`보유 상태 저장 중 오류가 발생했습니다.\n${upsertRes.error.message}`);
  }
}

async function persistAccessoryRow(memberId, draftRow) {
  const now = new Date().toISOString();

  const upsertPayload = state.accessoryGroups.map((group) => {
    const maxCount = Number(group.max_count ?? 0);
    const normalizeCount = (value) => Math.min(maxCount, Math.max(0, Math.floor(Number(value) || 0)));

    return {
      member_id: memberId,
      accessory_group_id: group.id,
      ring_count: normalizeCount(draftRow?.accessoryMap?.[group.id]?.ring_count),
      necklace_count: normalizeCount(draftRow?.accessoryMap?.[group.id]?.necklace_count),
      earring_count: normalizeCount(draftRow?.accessoryMap?.[group.id]?.earring_count),
      belt_count: normalizeCount(draftRow?.accessoryMap?.[group.id]?.belt_count),
      bracelet_count: normalizeCount(draftRow?.accessoryMap?.[group.id]?.bracelet_count),
      updated_at: now
    };
  });

  const upsertRes = await supabase
    .from("member_accessories")
    .upsert(upsertPayload, { onConflict: "member_id,accessory_group_id" });

  if (upsertRes.error) {
    throw new Error(`악세사리 저장 중 오류가 발생했습니다.\n${upsertRes.error.message}`);
  }
}

async function persistBossRow(memberId, draftRow) {
  const now = new Date().toISOString();

  const upsertPayload = state.bossItems.map((item) => ({
    member_id: memberId,
    boss_collection_id: item.id,
    owned: Boolean(draftRow?.ownedMap?.[item.id]),
    updated_at: now
  }));

  const upsertRes = await supabase
    .from("member_boss_collections")
    .upsert(upsertPayload, { onConflict: "member_id,boss_collection_id" });

  if (upsertRes.error) {
    throw new Error(`보스컬렉 저장 중 오류가 발생했습니다.\n${upsertRes.error.message}`);
  }
}

function isPowerDraftChanged(memberId, draftRow) {
  const member = state.members.find((entry) => entry.id === memberId);
  const values = getDraftPowerValues(draftRow);
  return values.power !== normalizePowerValue(member?.power)
    || values.specializationPower !== normalizePowerValue(member?.specialization_power)
    || values.antiMagicPower !== normalizePowerValue(member?.anti_magic_power)
    || values.mainWeapon !== normalizeWeaponValue(member?.main_weapon)
    || values.subWeapon !== normalizeWeaponValue(member?.sub_weapon);
}

function isSimpleDraftChanged(memberId, draftRow) {
  const simpleItems = getSimpleItems();
  const getCurrentValue = state.activeTab === "boss" ? getBossOwnedValue : getOwnedValue;

  return simpleItems.some((item) => {
    return Boolean(draftRow?.ownedMap?.[item.id]) !== getCurrentValue(memberId, item.id);
  });
}

function isAccessoryDraftChanged(memberId, draftRow) {
  return state.accessoryGroups.some((group) => {
    const record = getAccessoryRecord(memberId, group.id);
    const maxCount = Number(group.max_count ?? 0);
    const normalizeCount = (value) => Math.min(maxCount, Math.max(0, Math.floor(Number(value) || 0)));

    return ACCESSORY_PARTS.some((part) => {
      return normalizeCount(draftRow?.accessoryMap?.[group.id]?.[part.key]) !== normalizeCount(record?.[part.key]);
    });
  });
}

function isOverallDraftRowChanged(memberId, draftRow) {
  if (state.activeTab === "power") return isPowerDraftChanged(memberId, draftRow);
  if (state.activeTab === "accessory") return isAccessoryDraftChanged(memberId, draftRow);
  return isSimpleDraftChanged(memberId, draftRow);
}

async function saveAllOverallEdits() {
  if (!state.overallEditMode || state.isBulkSaving) return;

  const memberIds = Object.keys(state.draftAllRows);
  if (memberIds.length === 0) {
    alert("저장할 변경사항이 없습니다.");
    return;
  }

  state.isBulkSaving = true;
  setBulkSaveProgress(0);
  updateTabUi();

  try {
    let savedCount = 0;

    for (let index = 0; index < memberIds.length; index += 1) {
      const memberId = memberIds[index];
      const draftRow = state.draftAllRows[memberId];

      if (!isOverallDraftRowChanged(memberId, draftRow)) {
        setBulkSaveProgress(((index + 1) / memberIds.length) * 100);
        continue;
      }

      if (state.activeTab === "power") {
        if (!validateDraftPowerValues(draftRow)) {
          throw new Error("전투력, 전문화, 항마력을 올바르게 입력해주세요.");
        }
        await persistPowerRow(memberId, draftRow);
      } else if (state.activeTab === "accessory") {
        await persistAccessoryRow(memberId, draftRow);
      } else if (state.activeTab === "boss") {
        await persistBossRow(memberId, draftRow);
      } else {
        await persistMountRow(memberId, draftRow);
      }

      savedCount += 1;
      setBulkSaveProgress(((index + 1) / memberIds.length) * 100);
    }

    if (savedCount === 0) {
      alert("저장할 변경사항이 없습니다.");
      return;
    }

    resetOverallEditMode();

    if (state.activeTab === "power") {
      await loadPowerData();
    } else if (state.activeTab === "accessory") {
      await loadAccessoryData();
    } else if (state.activeTab === "boss") {
      await loadBossData();
    } else {
      await loadMountData();
    }

    renderAll();
    alert("저장되었습니다.");
  } catch (error) {
    alert(error.message);
  } finally {
    setBulkSaveProgress(100);
    state.isBulkSaving = false;
    renderAll();
  }
}

async function savePowerEditableRow(memberId) {
  if (!state.overallEditMode && memberId !== state.draftMemberId) return;

  const draftRow = state.overallEditMode
    ? ensureDraftRow(memberId)
    : {
      power: state.draftPower,
      specializationPower: state.draftSpecializationPower,
      antiMagicPower: state.draftAntiMagicPower,
      mainWeapon: state.draftMainWeapon,
      subWeapon: state.draftSubWeapon
    };
  if (!validateDraftPowerValues(draftRow)) {
    alert("전투력, 전문화, 항마력을 올바르게 입력해주세요.");
    return;
  }

  try {
    await persistPowerRow(memberId, draftRow);
  } catch (error) {
    alert(error.message);
    return;
  }

  if (!state.overallEditMode) {
    resetSearchState();
  }
  await loadPowerData();
  if (state.overallEditMode) {
    state.draftAllRows = {};
  }
  state.rowEditMemberId = null;
  renderAll();
  alert("저장되었습니다.");
}

async function saveMountEditableRow(memberId) {
  if (!state.overallEditMode && memberId !== state.draftMemberId) return;

  const draftRow = state.overallEditMode
    ? ensureDraftRow(memberId)
    : { power: state.draftPower, ownedMap: { ...state.draftOwnedMap } };
  try {
    await persistMountRow(memberId, draftRow);
  } catch (error) {
    alert(error.message);
    return;
  }

  if (!state.overallEditMode) {
    resetSearchState();
  }
  await loadMountData();
  if (state.overallEditMode) {
    state.draftAllRows = {};
  }
  state.rowEditMemberId = null;
  renderAll();
  alert("저장되었습니다.");
}

async function saveAccessoryEditableRow(memberId) {
  if (!state.overallEditMode && memberId !== state.draftMemberId) return;

  const draftRow = state.overallEditMode
    ? ensureDraftRow(memberId)
    : { power: state.draftPower, accessoryMap: structuredClone(state.draftAccessoryMap) };
  try {
    await persistAccessoryRow(memberId, draftRow);
  } catch (error) {
    alert(error.message);
    return;
  }

  if (!state.overallEditMode) {
    resetSearchState();
  }
  await loadAccessoryData();
  if (state.overallEditMode) {
    state.draftAllRows = {};
  }
  state.rowEditMemberId = null;
  renderAll();
  alert("저장되었습니다.");
}

async function saveBossEditableRow(memberId) {
  if (!state.overallEditMode && memberId !== state.draftMemberId) return;

  const draftRow = state.overallEditMode
    ? ensureDraftRow(memberId)
    : { power: state.draftPower, ownedMap: { ...state.draftOwnedMap } };
  try {
    await persistBossRow(memberId, draftRow);
  } catch (error) {
    alert(error.message);
    return;
  }

  if (!state.overallEditMode) {
    resetSearchState();
  }
  await loadBossData();
  if (state.overallEditMode) {
    state.draftAllRows = {};
  }
  state.rowEditMemberId = null;
  renderAll();
  alert("저장되었습니다.");
}

function resetSearchState() {
  state.searchTerm = "";
  state.selectedMemberId = null;
  state.rowEditMemberId = null;
  state.draftTab = null;
  el.searchInput.value = "";
}

async function loadAdminPassword() {
  adminPassword = "";
  adminPasswordLoadError = "";

  try {
    const res = await supabase
      .from(APP_SETTINGS_TABLE)
      .select("value")
      .eq("key", ADMIN_PASSWORD_KEY)
      .maybeSingle();

    if (res.error) {
      adminPasswordLoadError = "관리자 비밀번호 설정을 불러오지 못했습니다. DB 설정을 확인해주세요.";
      console.warn("관리자 비밀번호 설정 조회 실패", res.error.message);
      return;
    }

    if (res.data?.value) {
      adminPassword = String(res.data.value);
      return;
    }

    adminPasswordLoadError = "관리자 비밀번호가 설정되어 있지 않습니다. DB 설정을 확인해주세요.";
    console.warn("관리자 비밀번호가 설정되어 있지 않습니다.");
  } catch (error) {
    adminPasswordLoadError = "관리자 비밀번호 설정을 불러오지 못했습니다. DB 설정을 확인해주세요.";
    console.warn("관리자 비밀번호 설정 조회 실패", error);
  }
}

async function saveAdminPassword(nextPassword, silent = false) {
  const password = String(nextPassword || "").trim();
  if (!password) {
    throw new Error("새 비밀번호를 입력해주세요.");
  }

  const saveRes = await supabase
    .from(APP_SETTINGS_TABLE)
    .upsert({ key: ADMIN_PASSWORD_KEY, value: password, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (saveRes.error) {
    if (silent) {
      console.warn("관리자 비밀번호 기본값 저장 실패", saveRes.error.message);
      return;
    }
    throw new Error(`관리자 비밀번호 저장 중 오류가 발생했습니다.\n${saveRes.error.message}`);
  }

  adminPassword = password;
}

function openAdminPasswordChangeAuth() {
  closeModal(el.adminModeModalBackdrop);
  openPasswordModal("password-change");
}

function openAdminPasswordChangeModal() {
  el.adminNewPasswordInput.value = "";
  el.adminNewPasswordConfirmInput.value = "";
  el.adminPasswordChangeErrorText.classList.add("hidden");
  openModal(el.adminPasswordChangeModalBackdrop);
  setTimeout(() => el.adminNewPasswordInput.focus(), 0);
}

function closeAdminPasswordChangeModal() {
  el.adminNewPasswordInput.value = "";
  el.adminNewPasswordConfirmInput.value = "";
  el.adminPasswordChangeErrorText.classList.add("hidden");
  closeModal(el.adminPasswordChangeModalBackdrop);
}

async function handleAdminPasswordChangeSave() {
  const nextPassword = el.adminNewPasswordInput.value.trim();
  const confirmPasswordValue = el.adminNewPasswordConfirmInput.value.trim();

  if (!nextPassword || nextPassword !== confirmPasswordValue) {
    el.adminPasswordChangeErrorText.textContent = "새 비밀번호를 확인해주세요.";
    el.adminPasswordChangeErrorText.classList.remove("hidden");
    return;
  }

  try {
    await saveAdminPassword(nextPassword);
    closeAdminPasswordChangeModal();
    alert("관리자 비밀번호가 변경되었습니다.");
  } catch (error) {
    el.adminPasswordChangeErrorText.textContent = error.message || "관리자 비밀번호 저장 중 오류가 발생했습니다.";
    el.adminPasswordChangeErrorText.classList.remove("hidden");
  }
}

function openPasswordModal(type, memberId = null) {
  state.pendingManageType = type;
  state.pendingEditMemberId = memberId;
  el.passwordInput.value = "";
  el.passwordErrorText.textContent = "비밀번호가 올바르지 않습니다.";
  el.passwordErrorText.classList.add("hidden");
  openModal(el.passwordModalBackdrop);
  setTimeout(() => el.passwordInput.focus(), 0);
}

function closePasswordModal() {
  state.pendingManageType = null;
  state.pendingEditMemberId = null;
  closeModal(el.passwordModalBackdrop);
}

function confirmPassword() {
  if (!adminPassword) {
    el.passwordErrorText.textContent = adminPasswordLoadError || "관리자 비밀번호 설정을 불러오지 못했습니다. DB 설정을 확인해주세요.";
    el.passwordErrorText.classList.remove("hidden");
    return;
  }

  if (el.passwordInput.value !== adminPassword) {
    el.passwordErrorText.textContent = "비밀번호가 올바르지 않습니다.";
    el.passwordErrorText.classList.remove("hidden");
    return;
  }

  closeModal(el.passwordModalBackdrop);
  el.passwordErrorText.classList.add("hidden");

  if (state.pendingManageType === "guild") {
    openModal(el.guildManageModalBackdrop);
  }

  if (state.pendingManageType === "item") {
    updateItemManageUi();
    renderItemManageTable();
    openModal(el.itemManageModalBackdrop);
  }

  if (state.pendingManageType === "bulk-edit") {
    state.overallEditMode = true;
    state.draftAllRows = {};
    renderAll();
  }

  if (state.pendingManageType === "import") {
    openImportModal();
  }

  if (state.pendingManageType === "row-edit") {
    state.rowEditMemberId = state.pendingEditMemberId;
    renderAll();
  }

  if (state.pendingManageType === "password-change") {
    openAdminPasswordChangeModal();
  }

  state.pendingManageType = null;
  state.pendingEditMemberId = null;
}

function handleGuildManageTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "toggle-member-editable") {
    toggleMemberEditable(button.dataset.id);
    return;
  }

  if (button.dataset.action === "edit-member") {
    editMember(button.dataset.id);
    return;
  }

  if (button.dataset.action === "delete-member") {
    deleteMember(button.dataset.id);
  }
}

async function toggleMemberEditable(memberId) {
  const member = state.members.find((entry) => entry.id === memberId);
  if (!member) return;

  const nextCanEdit = member.can_edit === false;
  const updateRes = await supabase
    .from("guild_members")
    .update({ can_edit: nextCanEdit })
    .eq("id", memberId);

  if (updateRes.error) {
    alert(`수정가능 여부 저장 중 오류가 발생했습니다.\n${updateRes.error.message}`);
    return;
  }

  member.can_edit = nextCanEdit;
  renderGuildManageTable();
}

function handleItemManageTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "edit-item") {
    editItem(button.dataset.id);
    return;
  }

  if (button.dataset.action === "delete-item") {
    deleteItem(button.dataset.id);
  }
}

async function addMember() {
  const nameValue = prompt("추가할 길드원명을 입력해주세요.");
  if (nameValue === null) return;

  const name = nameValue.trim();
  if (!name) {
    alert("길드원명을 입력해주세요.");
    return;
  }

  if (state.members.some((member) => member.name === name)) {
    alert("이미 존재하는 길드원명입니다.");
    return;
  }

  const insertRes = await supabase
    .from("guild_members")
    .insert({ name })
    .select(MEMBER_SELECT_COLUMNS)
    .single();

  if (insertRes.error) {
    alert(`길드원 추가 중 오류가 발생했습니다.\n${insertRes.error.message}`);
    return;
  }

  const newMember = insertRes.data;
  const [mountItemsRes, accessoryGroupsRes, bossItemsRes] = await Promise.all([
    supabase.from("mounts").select("id, name, display_order"),
    supabase.from("accessory_groups").select("id, name, display_order, max_count"),
    supabase.from("boss_collections").select("id, name, display_order")
  ]);

  if (mountItemsRes.error) {
    alert(`탈것 목록 조회 중 오류가 발생했습니다.\n${mountItemsRes.error.message}`);
    return;
  }

  if (accessoryGroupsRes.error) {
    alert(`악세사리 목록 조회 중 오류가 발생했습니다.\n${accessoryGroupsRes.error.message}`);
    return;
  }

  if (bossItemsRes.error) {
    alert(`보스컬렉 목록 조회 중 오류가 발생했습니다.\n${bossItemsRes.error.message}`);
    return;
  }

  const mountItems = mountItemsRes.data ?? [];
  const accessoryGroups = accessoryGroupsRes.data ?? [];
  const bossItems = bossItemsRes.data ?? [];
  const now = new Date().toISOString();

  if (mountItems.length > 0) {
    const memberMountPayload = mountItems.map((item) => ({
      member_id: newMember.id,
      mount_id: item.id,
      owned: false,
      updated_at: now
    }));

    const memberMountRes = await supabase
      .from("member_mounts")
      .upsert(memberMountPayload, { onConflict: "member_id,mount_id" });

    if (memberMountRes.error) {
      alert(`길드원 기본 탈것 정보 생성 중 오류가 발생했습니다.\n${memberMountRes.error.message}`);
      return;
    }
  }

  if (accessoryGroups.length > 0) {
    const memberAccessoryPayload = accessoryGroups.map((group) => ({
      member_id: newMember.id,
      accessory_group_id: group.id,
      ring_count: Number(group.max_count ?? 0),
      necklace_count: Number(group.max_count ?? 0),
      earring_count: Number(group.max_count ?? 0),
      belt_count: Number(group.max_count ?? 0),
      bracelet_count: Number(group.max_count ?? 0),
      updated_at: now
    }));

    const memberAccessoryRes = await supabase
      .from("member_accessories")
      .upsert(memberAccessoryPayload, { onConflict: "member_id,accessory_group_id" });

    if (memberAccessoryRes.error) {
      alert(`길드원 기본 악세사리 정보 생성 중 오류가 발생했습니다.\n${memberAccessoryRes.error.message}`);
      return;
    }
  }

  if (bossItems.length > 0) {
    const memberBossPayload = bossItems.map((item) => ({
      member_id: newMember.id,
      boss_collection_id: item.id,
      owned: false,
      updated_at: now
    }));

    const memberBossRes = await supabase
      .from("member_boss_collections")
      .upsert(memberBossPayload, { onConflict: "member_id,boss_collection_id" });

    if (memberBossRes.error) {
      alert(`길드원 기본 보스컬렉 정보 생성 중 오류가 발생했습니다.\n${memberBossRes.error.message}`);
      return;
    }
  }

  await loadActiveTabData();
  renderAll();
}

async function editMember(memberId) {
  const member = state.members.find((entry) => entry.id === memberId);
  if (!member) return;

  const nextNameValue = prompt("길드원명을 수정해주세요.", member.name);
  if (nextNameValue === null) return;

  const nextName = nextNameValue.trim();
  if (!nextName) {
    alert("길드원명을 입력해주세요.");
    return;
  }

  if (state.members.some((entry) => entry.id !== memberId && entry.name === nextName)) {
    alert("이미 존재하는 길드원명입니다.");
    return;
  }

  const updateRes = await supabase
    .from("guild_members")
    .update({ name: nextName, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (updateRes.error) {
    alert(`길드원 수정 중 오류가 발생했습니다.\n${updateRes.error.message}`);
    return;
  }

  await loadActiveTabData();
  renderAll();
}

async function deleteMember(memberId) {
  const member = state.members.find((entry) => entry.id === memberId);
  if (!member) return;

  if (!confirm(`${member.name} 길드원을 삭제하시겠습니까?`)) return;

  const deleteRes = await supabase
    .from("guild_members")
    .delete()
    .eq("id", memberId);

  if (deleteRes.error) {
    alert(`길드원 삭제 중 오류가 발생했습니다.\n${deleteRes.error.message}`);
    return;
  }

  if (state.draftMemberId === memberId) {
    resetSearchState();
  }

  await loadActiveTabData();
  renderAll();
}

async function addItem() {
  const manageType = getItemManageType();

  if (manageType === "accessory") {
    await addAccessoryGroup();
    return;
  }

  if (manageType === "boss") {
    await addBossItem();
    return;
  }

  const nameValue = prompt("추가할 탈것명을 입력해주세요.");
  if (nameValue === null) return;

  const name = nameValue.trim();
  if (!name) {
    alert("탈것명을 입력해주세요.");
    return;
  }

  if (state.mountItems.some((item) => item.name === name)) {
    alert("이미 존재하는 탈것명입니다.");
    return;
  }

  const nextDisplayOrder = state.mountItems.length === 0
    ? 1
    : Math.max(...state.mountItems.map((item) => Number(item.display_order ?? 0))) + 1;

  const insertRes = await supabase
    .from("mounts")
    .insert({ name, display_order: nextDisplayOrder })
    .select("id, name, display_order")
    .single();

  if (insertRes.error) {
    alert(`탈것 추가 중 오류가 발생했습니다.\n${insertRes.error.message}`);
    return;
  }

  const newItem = insertRes.data;

  if (state.members.length > 0) {
    const now = new Date().toISOString();
    const memberMountPayload = state.members.map((member) => ({
      member_id: member.id,
      mount_id: newItem.id,
      owned: false,
      updated_at: now
    }));

    const memberMountRes = await supabase
      .from("member_mounts")
      .upsert(memberMountPayload, { onConflict: "member_id,mount_id" });

    if (memberMountRes.error) {
      alert(`탈것 기본 보유 정보 생성 중 오류가 발생했습니다.\n${memberMountRes.error.message}`);
      return;
    }
  }

  await loadMountData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function addBossItem() {
  const nameValue = prompt("추가할 보스컬렉명을 입력해주세요.");
  if (nameValue === null) return;

  const name = nameValue.trim();
  if (!name) {
    alert("보스컬렉명을 입력해주세요.");
    return;
  }

  if (state.bossItems.some((item) => item.name === name)) {
    alert("이미 존재하는 보스컬렉명입니다.");
    return;
  }

  const nextDisplayOrder = state.bossItems.length === 0
    ? 1
    : Math.max(...state.bossItems.map((item) => Number(item.display_order ?? 0))) + 1;

  const insertRes = await supabase
    .from("boss_collections")
    .insert({ name, display_order: nextDisplayOrder, updated_at: new Date().toISOString() })
    .select("id, name, display_order")
    .single();

  if (insertRes.error) {
    alert(`보스컬렉 추가 중 오류가 발생했습니다.\n${insertRes.error.message}`);
    return;
  }

  const newItem = insertRes.data;

  if (state.members.length > 0) {
    const now = new Date().toISOString();
    const memberBossPayload = state.members.map((member) => ({
      member_id: member.id,
      boss_collection_id: newItem.id,
      owned: false,
      updated_at: now
    }));

    const memberBossRes = await supabase
      .from("member_boss_collections")
      .upsert(memberBossPayload, { onConflict: "member_id,boss_collection_id" });

    if (memberBossRes.error) {
      alert(`보스컬렉 기본 보유 정보 생성 중 오류가 발생했습니다.\n${memberBossRes.error.message}`);
      return;
    }
  }

  await loadBossData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function addAccessoryGroup() {
  const nameValue = prompt("추가할 악세사리명을 입력해주세요.");
  if (nameValue === null) return;

  const name = nameValue.trim();
  if (!name) {
    alert("악세사리명을 입력해주세요.");
    return;
  }

  const maxCountValue = prompt("최대값을 입력해주세요.", "0");
  if (maxCountValue === null) return;

  const maxCount = Math.floor(Number(maxCountValue));
  if (!Number.isFinite(maxCount) || maxCount < 0) {
    alert("최대값을 올바르게 입력해주세요.");
    return;
  }

  if (state.accessoryGroups.some((item) => item.name === name)) {
    alert("이미 존재하는 악세사리명입니다.");
    return;
  }

  const nextDisplayOrder = state.accessoryGroups.length === 0
    ? 1
    : Math.max(...state.accessoryGroups.map((item) => Number(item.display_order ?? 0))) + 1;

  const insertRes = await supabase
    .from("accessory_groups")
    .insert({ name, display_order: nextDisplayOrder, max_count: maxCount, updated_at: new Date().toISOString() })
    .select("id, name, display_order, max_count")
    .single();

  if (insertRes.error) {
    alert(`악세사리 추가 중 오류가 발생했습니다.\n${insertRes.error.message}`);
    return;
  }

  const newGroup = insertRes.data;

  if (state.members.length > 0) {
    const now = new Date().toISOString();
    const memberAccessoryPayload = state.members.map((member) => ({
      member_id: member.id,
      accessory_group_id: newGroup.id,
      ring_count: Number(newGroup.max_count ?? 0),
      necklace_count: Number(newGroup.max_count ?? 0),
      earring_count: Number(newGroup.max_count ?? 0),
      belt_count: Number(newGroup.max_count ?? 0),
      bracelet_count: Number(newGroup.max_count ?? 0),
      updated_at: now
    }));

    const memberAccessoryRes = await supabase
      .from("member_accessories")
      .upsert(memberAccessoryPayload, { onConflict: "member_id,accessory_group_id" });

    if (memberAccessoryRes.error) {
      alert(`악세사리 기본 수량 생성 중 오류가 발생했습니다.\n${memberAccessoryRes.error.message}`);
      return;
    }
  }

  await loadAccessoryData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function editItem(itemId) {
  const manageType = getItemManageType();

  if (manageType === "accessory") {
    await editAccessoryGroup(itemId);
    return;
  }

  if (manageType === "boss") {
    await editBossItem(itemId);
    return;
  }

  const item = state.mountItems.find((entry) => String(entry.id) === String(itemId));
  if (!item) return;

  const nextNameValue = prompt("탈것명을 수정해주세요.", item.name);
  if (nextNameValue === null) return;

  const nextName = nextNameValue.trim();
  if (!nextName) {
    alert("탈것명을 입력해주세요.");
    return;
  }

  if (state.mountItems.some((entry) => String(entry.id) !== String(itemId) && entry.name === nextName)) {
    alert("이미 존재하는 탈것명입니다.");
    return;
  }

  const updateRes = await supabase
    .from("mounts")
    .update({ name: nextName })
    .eq("id", itemId);

  if (updateRes.error) {
    alert(`탈것 수정 중 오류가 발생했습니다.\n${updateRes.error.message}`);
    return;
  }

  await loadMountData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function editBossItem(itemId) {
  const item = state.bossItems.find((entry) => String(entry.id) === String(itemId));
  if (!item) return;

  const nextNameValue = prompt("보스컬렉명을 수정해주세요.", item.name);
  if (nextNameValue === null) return;

  const nextName = nextNameValue.trim();
  if (!nextName) {
    alert("보스컬렉명을 입력해주세요.");
    return;
  }

  if (state.bossItems.some((entry) => String(entry.id) !== String(itemId) && entry.name === nextName)) {
    alert("이미 존재하는 보스컬렉명입니다.");
    return;
  }

  const updateRes = await supabase
    .from("boss_collections")
    .update({ name: nextName, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (updateRes.error) {
    alert(`보스컬렉 수정 중 오류가 발생했습니다.\n${updateRes.error.message}`);
    return;
  }

  await loadBossData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function editAccessoryGroup(itemId) {
  const item = state.accessoryGroups.find((entry) => String(entry.id) === String(itemId));
  if (!item) return;

  const nextNameValue = prompt("악세사리명을 수정해주세요.", item.name);
  if (nextNameValue === null) return;

  const nextName = nextNameValue.trim();
  if (!nextName) {
    alert("악세사리명을 입력해주세요.");
    return;
  }

  const nextMaxCountValue = prompt("최대값을 수정해주세요.", String(Number(item.max_count ?? 0)));
  if (nextMaxCountValue === null) return;

  const nextMaxCount = Math.floor(Number(nextMaxCountValue));
  if (!Number.isFinite(nextMaxCount) || nextMaxCount < 0) {
    alert("최대값을 올바르게 입력해주세요.");
    return;
  }

  if (state.accessoryGroups.some((entry) => String(entry.id) !== String(itemId) && entry.name === nextName)) {
    alert("이미 존재하는 악세사리명입니다.");
    return;
  }

  const updateRes = await supabase
    .from("accessory_groups")
    .update({ name: nextName, max_count: nextMaxCount, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (updateRes.error) {
    alert(`악세사리 수정 중 오류가 발생했습니다.\n${updateRes.error.message}`);
    return;
  }

  await loadAccessoryData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function deleteItem(itemId) {
  const manageType = getItemManageType();

  if (manageType === "accessory") {
    await deleteAccessoryGroup(itemId);
    return;
  }

  if (manageType === "boss") {
    await deleteBossItem(itemId);
    return;
  }

  const item = state.mountItems.find((entry) => String(entry.id) === String(itemId));
  if (!item) return;

  if (!confirm(`${item.name} 탈것을 삭제하시겠습니까?`)) return;

  const deleteRes = await supabase
    .from("mounts")
    .delete()
    .eq("id", itemId);

  if (deleteRes.error) {
    alert(`탈것 삭제 중 오류가 발생했습니다.\n${deleteRes.error.message}`);
    return;
  }

  await loadMountData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function deleteBossItem(itemId) {
  const item = state.bossItems.find((entry) => String(entry.id) === String(itemId));
  if (!item) return;

  if (!confirm(`${item.name} 보스컬렉을 삭제하시겠습니까?`)) return;

  const deleteRes = await supabase
    .from("boss_collections")
    .delete()
    .eq("id", itemId);

  if (deleteRes.error) {
    alert(`보스컬렉 삭제 중 오류가 발생했습니다.\n${deleteRes.error.message}`);
    return;
  }

  await loadBossData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

async function deleteAccessoryGroup(itemId) {
  const item = state.accessoryGroups.find((entry) => String(entry.id) === String(itemId));
  if (!item) return;

  if (!confirm(`${item.name} 악세사리를 삭제하시겠습니까?`)) return;

  const deleteRes = await supabase
    .from("accessory_groups")
    .delete()
    .eq("id", itemId);

  if (deleteRes.error) {
    alert(`악세사리 삭제 중 오류가 발생했습니다.\n${deleteRes.error.message}`);
    return;
  }

  await loadAccessoryData();
  if (refreshItemManageModalIfNeeded()) return;
  renderAll();
}

function getOwnedValue(memberId, itemId) {
  const record = state.memberMounts.find(
    (entry) => entry.member_id === memberId && entry.mount_id === itemId
  );
  return Boolean(record?.owned);
}

function getMountLatestUpdatedAt(memberId) {
  const records = state.memberMounts.filter((entry) => entry.member_id === memberId);
  if (records.length === 0) return null;

  return records.reduce((latest, current) => {
    if (!current?.updated_at) return latest;
    if (!latest) return current.updated_at;
    return new Date(current.updated_at) > new Date(latest) ? current.updated_at : latest;
  }, null);
}

function getBossOwnedValue(memberId, itemId) {
  const record = state.memberBossCollections.find(
    (entry) => entry.member_id === memberId && String(entry.boss_collection_id) === String(itemId)
  );
  return Boolean(record?.owned);
}

function getBossLatestUpdatedAt(memberId) {
  const records = state.memberBossCollections.filter((entry) => entry.member_id === memberId);
  if (records.length === 0) return null;

  return records.reduce((latest, current) => {
    if (!current?.updated_at) return latest;
    if (!latest) return current.updated_at;
    return new Date(current.updated_at) > new Date(latest) ? current.updated_at : latest;
  }, null);
}

function getSimpleItems() {
  return state.activeTab === "boss" ? state.bossItems : state.mountItems;
}

function getSimpleMemberRecords() {
  return state.activeTab === "boss" ? state.memberBossCollections : state.memberMounts;
}

function getSimpleItemForeignKey() {
  return state.activeTab === "boss" ? "boss_collection_id" : "mount_id";
}

function getAccessoryZeroPowerCellStyle() {
  return "background-color: #fdecec;";
}

function getAccessoryZeroPowerHoverCellStyle() {
  return "background-color: #f9dede;";
}

function getAccessoryHeatCellStyle(value, maxCount) {
  const safeMax = Math.max(Number(maxCount ?? 0), 0);
  const safeValue = Math.max(0, Math.min(Number(value ?? 0), safeMax));

  if (safeMax <= 0 || safeValue <= 0) {
    return "background-color: #ffffff;";
  }

  const ratio = safeValue / safeMax;
  const saturation = 75;
  const lightness = 97 - (ratio * 14);

  return `background-color: hsl(215 ${saturation}% ${lightness}%);`;
}

function getAccessoryRecord(memberId, groupId) {
  return state.memberAccessories.find(
    (entry) => entry.member_id === memberId && String(entry.accessory_group_id) === String(groupId)
  ) ?? null;
}

function getAccessoryLatestUpdatedAt(memberId) {
  const records = state.memberAccessories.filter((entry) => entry.member_id === memberId);
  if (records.length === 0) return null;

  return records.reduce((latest, current) => {
    if (!latest) return current.updated_at;
    return new Date(current.updated_at) > new Date(latest) ? current.updated_at : latest;
  }, null);
}

function openImportModal() {
  state.importPreview = null;
  const isBoss = state.activeTab === "boss";
  const isAccessory = state.activeTab === "accessory";
  el.importModalTitle.textContent = isAccessory
    ? "악세사리 초기값 붙여넣기"
    : isBoss
      ? "보스컬렉 초기값 붙여넣기"
      : "탈것 초기값 붙여넣기";
  el.importModalGuideText.textContent = isAccessory
    ? "첫 줄에 헤더를 포함해서 붙여넣어주세요. 첫 칸은 이름, 나머지 칸은 그룹명_부위명입니다."
    : isBoss
      ? "첫 줄에 헤더를 포함해서 붙여넣어주세요. 첫 칸은 이름, 나머지 칸은 보스컬렉명입니다."
      : "첫 줄에 헤더를 포함해서 붙여넣어주세요. 첫 칸은 이름, 나머지 칸은 탈것명입니다.";
  el.importTextarea.value = "";
  el.importPreviewBox.textContent = "미리보기를 누르면 반영 예정 내용을 보여드립니다.";
  el.importApplyBtn.disabled = true;
  openModal(el.importModalBackdrop);
  setTimeout(() => el.importTextarea.focus(), 0);
}

function closeImportModal() {
  state.importPreview = null;
  el.importApplyBtn.disabled = true;
  closeModal(el.importModalBackdrop);
}

function getImportTargetConfig() {
  if (state.activeTab === "accessory") {
    return {
      tabLabel: "악세사리",
      tableName: "member_accessories",
      conflictKey: "member_id,accessory_group_id"
    };
  }

  if (state.activeTab === "boss") {
    return {
      tabLabel: "보스컬렉",
      items: state.bossItems,
      conflictKey: "member_id,boss_collection_id",
      makeRow: (memberId, itemId) => ({
        member_id: memberId,
        boss_collection_id: itemId,
        owned: true
      }),
      applyOwned: (row, owned) => {
        row.owned = owned;
        row.updated_at = new Date().toISOString();
      },
      tableName: "member_boss_collections"
    };
  }

  return {
    tabLabel: "탈것",
    items: state.mountItems,
    conflictKey: "member_id,mount_id",
    makeRow: (memberId, itemId) => ({
      member_id: memberId,
      mount_id: itemId,
      owned: true
    }),
    applyOwned: (row, owned) => {
      row.owned = owned;
    },
    tableName: "member_mounts"
  };
}

function parseImportOwnedValue(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) return { kind: "blank" };

  const normalized = value.toLowerCase();
  if (["1", "true", "보유", "o", "y"].includes(normalized)) return { kind: "value", owned: true };
  if (["0", "false", "미보유", "x", "n"].includes(normalized)) return { kind: "value", owned: false };
  return { kind: "invalid", value };
}

function parseImportAccessoryHeader(headerValue) {
  const raw = String(headerValue ?? "").trim();
  if (!raw) return null;

  const separators = ["_", "-", "/", ":", " "];
  for (const separator of separators) {
    const lastIndex = raw.lastIndexOf(separator);
    if (lastIndex <= 0 || lastIndex >= raw.length - 1) continue;

    const groupName = raw.slice(0, lastIndex).trim();
    const partLabel = raw.slice(lastIndex + 1).trim();
    if (!groupName || !partLabel) continue;

    const part = ACCESSORY_PARTS.find((entry) => entry.label === partLabel);
    if (!part) continue;

    return {
      groupName,
      partKey: part.key,
      partLabel: part.label
    };
  }

  return null;
}

function parseImportAccessoryValue(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) return { kind: "blank" };

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return { kind: "invalid", value };
  }

  return {
    kind: "value",
    count: Math.max(0, Math.floor(number))
  };
}

function buildImportPreview() {
  if (!(state.activeTab === "mount" || state.activeTab === "boss" || state.activeTab === "accessory")) {
    throw new Error("탈것, 악세사리 또는 보스컬렉 탭에서만 사용할 수 있습니다.");
  }

  const raw = String(el.importTextarea.value ?? "").split("\r").join("").trim();
  if (!raw) {
    throw new Error("붙여넣을 데이터를 입력해주세요.");
  }

  const rows = raw.split("\n").map((line) => line.split("\t"));
  if (rows.length < 2) {
    throw new Error("헤더 포함 2줄 이상 데이터를 붙여넣어주세요.");
  }

  const config = getImportTargetConfig();
  const headerRow = rows[0].map((value) => String(value ?? "").trim());
  const memberMap = new Map(state.members.map((member) => [member.name.trim(), member]));

  if (state.activeTab === "accessory") {
    const groupMap = new Map(state.accessoryGroups.map((group) => [group.name.trim(), group]));
    const headerInfos = [];
    const unknownHeaders = [];

    for (let colIndex = 1; colIndex < headerRow.length; colIndex += 1) {
      const headerName = headerRow[colIndex];
      if (!headerName) {
        headerInfos.push(null);
        continue;
      }

      const parsedHeader = parseImportAccessoryHeader(headerName);
      if (!parsedHeader) {
        unknownHeaders.push(headerName);
        headerInfos.push(null);
        continue;
      }

      const group = groupMap.get(parsedHeader.groupName);
      if (!group) {
        unknownHeaders.push(headerName);
        headerInfos.push(null);
        continue;
      }

      headerInfos.push({
        headerName,
        groupId: group.id,
        groupName: group.name,
        partKey: parsedHeader.partKey,
        maxCount: Number(group.max_count ?? 0)
      });
    }

    const unknownMembers = new Set();
    const invalidValues = [];
    const appliedMap = new Map();

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const memberName = String(row[0] ?? "").trim();
      if (!memberName) continue;

      const member = memberMap.get(memberName);
      if (!member) {
        unknownMembers.add(memberName);
        continue;
      }

      for (let colIndex = 1; colIndex < headerRow.length; colIndex += 1) {
        const headerInfo = headerInfos[colIndex - 1];
        if (!headerInfo) continue;

        const parsedValue = parseImportAccessoryValue(row[colIndex] ?? "");
        if (parsedValue.kind === "blank") continue;
        if (parsedValue.kind === "invalid") {
          invalidValues.push(`${memberName} / ${headerInfo.headerName} / ${parsedValue.value}`);
          continue;
        }

        const key = `${member.id}__${headerInfo.groupId}`;
        const existing = appliedMap.get(key) ?? {
          member_id: member.id,
          accessory_group_id: headerInfo.groupId
        };

        existing[headerInfo.partKey] = Math.min(headerInfo.maxCount, parsedValue.count);
        appliedMap.set(key, existing);
      }
    }

    return {
      tableName: config.tableName,
      conflictKey: config.conflictKey,
      updates: Array.from(appliedMap.values()),
      summaryText: [
        `${config.tabLabel} 초기값 미리보기`,
        `반영 예정 행 수: ${appliedMap.size}건`,
        `없는 헤더 수: ${unknownHeaders.length}건`,
        `없는 길드원 수: ${unknownMembers.size}건`,
        `잘못된 값 수: ${invalidValues.length}건`,
        unknownHeaders.length ? `없는 헤더: ${unknownHeaders.join(", ")}` : "",
        unknownMembers.size ? `없는 길드원: ${Array.from(unknownMembers).join(", ")}` : "",
        invalidValues.length ? `잘못된 값 예시: ${invalidValues.slice(0, 10).join(" | ")}` : ""
      ].filter(Boolean).join("\n")
    };
  }

  const itemMap = new Map(config.items.map((item) => [item.name.trim(), item]));
  const unknownHeaders = [];
  const headerItems = [];
  for (let colIndex = 1; colIndex < headerRow.length; colIndex += 1) {
    const headerName = headerRow[colIndex];
    if (!headerName) {
      headerItems.push(null);
      continue;
    }

    const item = itemMap.get(headerName) ?? null;
    if (!item) unknownHeaders.push(headerName);
    headerItems.push(item);
  }

  const unknownMembers = new Set();
  const invalidValues = [];
  const appliedMap = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const memberName = String(row[0] ?? "").trim();
    if (!memberName) continue;

    const member = memberMap.get(memberName);
    if (!member) {
      unknownMembers.add(memberName);
      continue;
    }

    for (let colIndex = 1; colIndex < headerRow.length; colIndex += 1) {
      const item = headerItems[colIndex - 1];
      if (!item) continue;

      const parsed = parseImportOwnedValue(row[colIndex] ?? "");
      if (parsed.kind === "blank") continue;
      if (parsed.kind === "invalid") {
        invalidValues.push(`${memberName} / ${headerRow[colIndex]} / ${parsed.value}`);
        continue;
      }

      const key = `${member.id}__${item.id}`;
      const targetRow = config.makeRow(member.id, item.id);
      config.applyOwned(targetRow, parsed.owned);
      appliedMap.set(key, targetRow);
    }
  }

  return {
    tableName: config.tableName,
    conflictKey: config.conflictKey,
    updates: Array.from(appliedMap.values()),
    summaryText: [
      `${config.tabLabel} 초기값 미리보기`,
      `반영 예정 셀 수: ${appliedMap.size}건`,
      `없는 항목 수: ${unknownHeaders.length}건`,
      `없는 길드원 수: ${unknownMembers.size}건`,
      `잘못된 값 수: ${invalidValues.length}건`,
      unknownHeaders.length ? `없는 항목: ${unknownHeaders.join(", ")}` : "",
      unknownMembers.size ? `없는 길드원: ${Array.from(unknownMembers).join(", ")}` : "",
      invalidValues.length ? `잘못된 값 예시: ${invalidValues.slice(0, 10).join(" | ")}` : ""
    ].filter(Boolean).join("\n")
  };
}

function handleImportPreview() {
  try {
    const preview = buildImportPreview();
    state.importPreview = preview;
    el.importPreviewBox.textContent = preview.summaryText;
    el.importApplyBtn.disabled = preview.updates.length === 0;
    if (preview.updates.length === 0) {
      el.importPreviewBox.textContent += "\n\n반영할 데이터가 없습니다.";
    }
  } catch (error) {
    state.importPreview = null;
    el.importApplyBtn.disabled = true;
    el.importPreviewBox.textContent = error.message;
  }
}

async function handleImportApply() {
  if (!state.importPreview || state.importPreview.updates.length === 0) {
    alert("먼저 미리보기를 확인해주세요.");
    return;
  }

  try {
    const res = await supabase
      .from(state.importPreview.tableName)
      .upsert(state.importPreview.updates, { onConflict: state.importPreview.conflictKey });

    if (res.error) {
      throw new Error(`초기값 저장 중 오류가 발생했습니다.\n${res.error.message}`);
    }

    closeImportModal();
    await loadActiveTabData();
    renderAll();
    alert("초기값이 저장되었습니다.");
  } catch (error) {
    alert(error.message);
  }
}
