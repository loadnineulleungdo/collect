require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Events,
} = require("discord.js");

const { createClient } = require("@supabase/supabase-js");
const path = require("node:path");
const fs = require("node:fs");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
} = require("@discordjs/voice");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const BOSS_CHANNEL_ID = process.env.BOSS_CHANNEL_ID;
const BOSS_VOICE_CHANNEL_ID = process.env.BOSS_VOICE_CHANNEL_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const TIMEZONE = process.env.TIMEZONE || "Asia/Seoul";

if (!DISCORD_TOKEN || !BOSS_CHANNEL_ID || !SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(".env 설정이 부족합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const VOICE_SETS = {
  ara: { label: "아라", folder: "ara" },
  jinho: { label: "진호", folder: "jinho" },
};

let currentVoiceSet = "ara";
let voiceConnection = null;
let isVoiceQueueRunning = false;
const voiceQueue = [];

const voicePlayer = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
  },
});

const KOREAN_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getKoreanDayName(year, month, day) {
  const dateText =
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00+09:00`;
  const date = new Date(dateText);

  return KOREAN_DAYS[date.getUTCDay()];
}

function getKstParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const hour = Number(map.hour);

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function makeDateFromKst(year, month, day, hour, minute, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, second));
}

function parseKstTimeInput(input) {
  const now = getKstParts(new Date());

  const fullMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (fullMatch) {
    return makeDateFromKst(
      Number(fullMatch[1]),
      Number(fullMatch[2]),
      Number(fullMatch[3]),
      Number(fullMatch[4]),
      Number(fullMatch[5])
    );
  }

  const shortMatch = input.match(/^(\d{1,2}):(\d{2})$/);
  if (shortMatch) {
    return makeDateFromKst(
      now.year,
      now.month,
      now.day,
      Number(shortMatch[1]),
      Number(shortMatch[2])
    );
  }

  const compactMatch = input.match(/^(\d{3,4})$/);
  if (compactMatch) {
    const value = compactMatch[1].padStart(4, "0");
    const hour = Number(value.slice(0, 2));
    const minute = Number(value.slice(2, 4));

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return makeDateFromKst(now.year, now.month, now.day, hour, minute);
    }
  }

  return null;
}


function parseCompactTime(value) {
  if (!/^\d{3,4}$/.test(value)) return null;

  const padded = value.padStart(4, "0");
  const hour = Number(padded.slice(0, 2));
  const minute = Number(padded.slice(2, 4));

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

function parseCompactDate(value) {
  if (!/^(\d{4}|\d{6})$/.test(value)) return null;

  const now = getKstParts(new Date());
  let year;
  let month;
  let day;

  if (value.length === 4) {
    year = now.year;
    month = Number(value.slice(0, 2));
    day = Number(value.slice(2, 4));
  } else {
    year = 2000 + Number(value.slice(0, 2));
    month = Number(value.slice(2, 4));
    day = Number(value.slice(4, 6));
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

function parseKstDateTimeInput(dateText, timeText) {
  const date = parseCompactDate(dateText);
  const time = parseCompactTime(timeText);

  if (!date || !time) return null;

  const result = makeDateFromKst(date.year, date.month, date.day, time.hour, time.minute);
  const check = getKstParts(result);

  if (check.year !== date.year || check.month !== date.month || check.day !== date.day) {
    return null;
  }

  return result;
}
function formatKst(dateInput) {
  if (!dateInput) return "-";

  const date = new Date(dateInput);
  const parts = getKstParts(date);
  const now = getKstParts(new Date());

  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  const hh = String(parts.hour).padStart(2, "0");
  const mi = String(parts.minute).padStart(2, "0");

  const targetDay = makeDateFromKst(parts.year, parts.month, parts.day, 0, 0);
  const today = makeDateFromKst(now.year, now.month, now.day, 0, 0);
  const diffDays = Math.round((targetDay - today) / 86400000);

  if (diffDays === 0) return `오늘 ${hh}:${mi}`;
  if (diffDays === 1) return `내일 ${hh}:${mi}`;

  return `${mm}-${dd} ${hh}:${mi}`;
}

function getRemainText(dateInput) {
  if (!dateInput) return "-";

  const diffMs = new Date(dateInput).getTime() - Date.now();
  if (diffMs <= 0) return "젠됨";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}일 ${hours}시간 후`;
  if (hours > 0) return `${hours}시간 ${minutes}분 후`;
  return `${minutes}분 후`;
}

function addMinutes(dateInput, minutes) {
  return new Date(new Date(dateInput).getTime() + minutes * 60000);
}

function normalizeFixedTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function calculateNextFixedSpawn(boss, fromDate = new Date()) {
  const fixedTimes = Array.isArray(boss.fixed_times) && boss.fixed_times.length > 0
    ? boss.fixed_times.map(normalizeFixedTime)
    : boss.fixed_time
      ? [normalizeFixedTime(boss.fixed_time)]
      : [];

  if (fixedTimes.length === 0) return null;

  const now = getKstParts(fromDate);
  const candidates = [];

  for (let offset = 0; offset <= 14; offset++) {
    const base = makeDateFromKst(now.year, now.month, now.day + offset, 0, 0);
    const baseParts = getKstParts(base);
    const dayName = getKoreanDayName(baseParts.year, baseParts.month, baseParts.day);

    if (boss.spawn_type === "weekly_fixed") {
      const days = boss.fixed_days || [];
      if (!days.includes(dayName)) continue;
    }

    for (const timeText of fixedTimes) {
      const [hour, minute] = timeText.split(":").map(Number);
      const candidate = makeDateFromKst(
        baseParts.year,
        baseParts.month,
        baseParts.day,
        hour,
        minute
      );

      if (candidate.getTime() > fromDate.getTime()) {
        candidates.push(candidate);
      }
    }
  }

  candidates.sort((a, b) => a - b);
  return candidates[0] || null;
}

function calculateNextSpawn(boss, cutTime) {
  if (boss.spawn_type === "interval") {
    return addMinutes(cutTime, boss.interval_minutes);
  }

  return calculateNextFixedSpawn(boss, new Date(cutTime));
}

async function refreshFixedBosses() {
  const { data, error } = await supabase
    .from("bosses")
    .select("*")
    .eq("is_active", true)
    .in("spawn_type", ["daily_fixed", "weekly_fixed"]);

  if (error) {
    console.error("고정 보스 조회 실패:", error.message);
    return;
  }

  for (const boss of data || []) {
    const next = calculateNextFixedSpawn(boss, new Date());
    if (!next) continue;

    const current = boss.next_spawn_time ? new Date(boss.next_spawn_time) : null;
    const hasActiveCutButton =
      boss.status === "alerted" ||
      boss.alert_1min_sent ||
      !!boss.cut_button_expires_at ||
      !!boss.alert_message_id;

    const shouldRefresh =
      !hasActiveCutButton &&
      (!current || current.getTime() !== next.getTime());

    if (shouldRefresh) {
      await supabase
        .from("bosses")
        .update({
          next_spawn_time: next.toISOString(),
          status: "waiting",
          alert_5min_sent: false,
          alert_5min_message_id: null,
          alert_1min_sent: false,
          alert_message_id: null,
          cut_button_expires_at: null,
        })
        .eq("id", boss.id);
    }
  }
}


async function getServerNickname(guild, user, member = null) {
  if (member?.nickname) return member.nickname;
  if (member?.displayName) return member.displayName;

  if (guild && user?.id) {
    try {
      const fetchedMember = await guild.members.fetch(user.id);
      return fetchedMember.nickname || fetchedMember.displayName || user.globalName || user.username;
    } catch (error) {
      console.error("서버 닉네임 조회 실패:", error.message);
    }
  }

  return user?.globalName || user?.username || "-";
}
async function findBossByName(name) {
  const { data, error } = await supabase
    .from("bosses")
    .select("*")
    .eq("name", name)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getLatestBossRecord(bossId) {
  const { data, error } = await supabase
    .from("boss_kill_records")
    .select("*")
    .eq("boss_id", bossId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getLatestEditableCutRecord(bossId) {
  const latestRecord = await getLatestBossRecord(bossId);

  if (!latestRecord) {
    return { record: null, reason: "not_found" };
  }

  if (latestRecord.record_type !== "cut") {
    return { record: null, reason: "last_record_is_mung" };
  }

  return { record: latestRecord, reason: null };
}

function isParticipationStillActive(record) {
  return !!record?.participation_expires_at && new Date() <= new Date(record.participation_expires_at);
}

function parseRequiredCutEditInput(body) {
  const parts = body.split(/\s+/);

  if (parts.length >= 3) {
    const dateText = parts[parts.length - 2];
    const timeText = parts[parts.length - 1];
    const parsedDateTime = parseKstDateTimeInput(dateText, timeText);

    if (parsedDateTime) {
      return {
        bossName: parts.slice(0, -2).join(" "),
        cutTime: parsedDateTime,
      };
    }
  }

  if (parts.length >= 2) {
    const timeText = parts[parts.length - 1];
    const parsedTime = parseKstTimeInput(timeText);

    if (parsedTime) {
      return {
        bossName: parts.slice(0, -1).join(" "),
        cutTime: parsedTime,
      };
    }
  }

  return { bossName: "", cutTime: null };
}

async function saveRecordEditLog({ record, boss, oldCutTime, newCutTime, oldNextSpawn, newNextSpawn, editedById, editedByNickname }) {
  const { error } = await supabase
    .from("boss_record_edits")
    .insert({
      record_id: record.id,
      boss_id: boss.id,
      boss_name: boss.name,
      old_cut_time: oldCutTime,
      new_cut_time: newCutTime,
      old_next_spawn_time: oldNextSpawn,
      new_next_spawn_time: newNextSpawn,
      edited_by_discord_id: editedById,
      edited_by_nickname: editedByNickname,
      edit_reason: "manual_cut_edit",
    });

  if (error) {
    console.error("컷 수정 이력 저장 실패:", error.message);
  }
}

async function sendCutEditMessage(channel, boss, oldCutTime, newCutTime, newNextSpawn, editedByNickname) {
  await channel.send({
    content:
      "✏️\n" +
      "```diff\n" +
      `+ ${boss.name} 컷 시간이 수정되었습니다.\n` +
      `  이전 컷 시간: ${formatBossListDateTime(oldCutTime)}\n` +
      `  수정 컷 시간: ${formatBossListDateTime(newCutTime)}\n` +
      `  다음 젠 시간: ${formatBossListDateTime(newNextSpawn)}\n` +
      `  수정자: ${editedByNickname || "-"}\n` +
      "```",
  });
}

async function handleCutEdit(message) {
  const body = message.content.replace(/^!컷수정\s+/, "").trim();

  if (!body) {
    await message.reply("사용법: `!컷수정 보스이름 HHMM`, `!컷수정 보스이름 MMDD HHMM`, `!컷수정 보스이름 YYMMDD HHMM`");
    return;
  }

  const { bossName, cutTime } = parseRequiredCutEditInput(body);

  if (!bossName || !cutTime) {
    await message.reply("사용법: `!컷수정 보스이름 HHMM`, `!컷수정 보스이름 MMDD HHMM`, `!컷수정 보스이름 YYMMDD HHMM`");
    return;
  }

  const boss = await findBossByName(bossName);
  if (!boss) {
    await message.reply(`보스를 찾을 수 없습니다: ${bossName}`);
    return;
  }

  const { record, reason } = await getLatestEditableCutRecord(boss.id);

  if (!record) {
    if (reason === "last_record_is_mung") {
      await message.reply("수정 가능한 컷 기록이 없습니다.\n멍 처리된 보스는 `!컷 보스이름 HHMM` 으로 새 컷 등록해주세요.");
      return;
    }

    await message.reply("수정 가능한 컷 기록이 없습니다.");
    return;
  }

  const nextSpawn = calculateNextSpawn(boss, cutTime);
  if (!nextSpawn) {
    await message.reply("다음 젠 시간을 계산할 수 없습니다.");
    return;
  }

  const oldCutTime = record.cut_time;
  const oldNextSpawn = record.next_spawn_time;
  const nickname = await getServerNickname(message.guild, message.author, message.member);

  const { error: recordUpdateError } = await supabase
    .from("boss_kill_records")
    .update({
      cut_time: cutTime.toISOString(),
      next_spawn_time: nextSpawn.toISOString(),
    })
    .eq("id", record.id);

  if (recordUpdateError) throw recordUpdateError;

  const { error: participantUpdateError } = await supabase
    .from("boss_participants")
    .update({
      cut_time: cutTime.toISOString(),
    })
    .eq("kill_record_id", record.id);

  if (participantUpdateError) throw participantUpdateError;

  const { error: bossUpdateError } = await supabase
    .from("bosses")
    .update({
      next_spawn_time: nextSpawn.toISOString(),
      status: "waiting",
      alert_5min_sent: false,
      alert_5min_message_id: null,
      alert_1min_sent: false,
      alert_message_id: null,
      cut_button_expires_at: null,
      last_record_id: record.id,
    })
    .eq("id", boss.id);

  if (bossUpdateError) throw bossUpdateError;

  await saveRecordEditLog({
    record,
    boss,
    oldCutTime,
    newCutTime: cutTime.toISOString(),
    oldNextSpawn,
    newNextSpawn: nextSpawn.toISOString(),
    editedById: message.author.id,
    editedByNickname: nickname,
  });

  await sendCutEditMessage(message.channel, boss, oldCutTime, cutTime, nextSpawn, nickname);
}

function parseParticipantEditInput(body) {
  const parts = body.split(/\s+/);

  if (parts.length < 2) {
    return { bossName: "", targetText: "" };
  }

  return {
    bossName: parts.slice(0, -1).join(" "),
    targetText: parts[parts.length - 1],
  };
}

async function resolveParticipantTarget(message, targetText) {
  const mentionMatch = targetText.match(/^<@!?(\d+)>$/);

  if (mentionMatch) {
    const userId = mentionMatch[1];
    const user =
      message.mentions.users.get(userId) ||
      await client.users.fetch(userId).catch(() => null);

    if (!user) {
      return null;
    }

    const member = message.mentions.members?.get(userId) || null;
    const nickname = await getServerNickname(message.guild, user, member);

    return {
      discordUserId: user.id,
      discordNickname: nickname,
    };
  }

  return {
    discordUserId: `manual:${targetText}`,
    discordNickname: targetText,
  };
}

async function getEditableParticipantRecord(message, bossName) {
  const boss = await findBossByName(bossName);

  if (!boss) {
    await message.reply(`보스를 찾을 수 없습니다: ${bossName}`);
    return null;
  }

  const { record, reason } = await getLatestEditableCutRecord(boss.id);

  if (!record) {
    if (reason === "last_record_is_mung") {
      await message.reply("참여자를 수정할 수 있는 컷 기록이 없습니다.\n멍 처리된 보스는 참여자 수정 대상이 아닙니다.");
      return null;
    }

    await message.reply("참여자를 수정할 수 있는 컷 기록이 없습니다.");
    return null;
  }

  return { boss, record };
}

async function sendParticipantEditMessage(channel, boss, record, actionText, participantName, editedByNickname) {
  await channel.send({
    content:
      "📝\n" +
      "```diff\n" +
      `+ ${boss.name} 참여자가 ${actionText}되었습니다.\n` +
      `  참여자: ${participantName || "-"}\n` +
      `  기준 컷 시간: ${formatBossListDateTime(record.cut_time)}\n` +
      `  수정자: ${editedByNickname || "-"}\n` +
      "```",
  });
}

async function handleParticipantAdd(message) {
  const body = message.content.replace(/^!참여자추가\s+/, "").trim();

  if (!body) {
    await message.reply("사용법: `!참여자추가 보스이름 닉네임` 또는 `!참여자추가 보스이름 @유저`");
    return;
  }

  const { bossName, targetText } = parseParticipantEditInput(body);

  if (!bossName || !targetText) {
    await message.reply("사용법: `!참여자추가 보스이름 닉네임` 또는 `!참여자추가 보스이름 @유저`");
    return;
  }

  const editable = await getEditableParticipantRecord(message, bossName);
  if (!editable) return;

  const target = await resolveParticipantTarget(message, targetText);
  if (!target || !target.discordNickname) {
    await message.reply("추가할 참여자를 찾을 수 없습니다.");
    return;
  }

  const { boss, record } = editable;

  const { error: insertError } = await supabase
    .from("boss_participants")
    .insert({
      kill_record_id: record.id,
      boss_id: record.boss_id,
      boss_name: record.boss_name,
      cut_time: record.cut_time,
      discord_user_id: target.discordUserId,
      discord_nickname: target.discordNickname,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      await message.reply("이미 참여 등록되어 있습니다.");
      return;
    }

    throw insertError;
  }

  const editedByNickname = await getServerNickname(message.guild, message.author, message.member);
  await sendParticipantEditMessage(message.channel, boss, record, "추가", target.discordNickname, editedByNickname);
}

async function handleParticipantDelete(message) {
  const body = message.content.replace(/^!참여자삭제\s+/, "").trim();

  if (!body) {
    await message.reply("사용법: `!참여자삭제 보스이름 닉네임` 또는 `!참여자삭제 보스이름 @유저`");
    return;
  }

  const { bossName, targetText } = parseParticipantEditInput(body);

  if (!bossName || !targetText) {
    await message.reply("사용법: `!참여자삭제 보스이름 닉네임` 또는 `!참여자삭제 보스이름 @유저`");
    return;
  }

  const editable = await getEditableParticipantRecord(message, bossName);
  if (!editable) return;

  const target = await resolveParticipantTarget(message, targetText);
  if (!target || !target.discordNickname) {
    await message.reply("삭제할 참여자를 찾을 수 없습니다.");
    return;
  }

  const { boss, record } = editable;
  let deleteQuery = supabase
    .from("boss_participants")
    .delete()
    .eq("kill_record_id", record.id);

  if (targetText.match(/^<@!?(\d+)>$/)) {
    deleteQuery = deleteQuery.eq("discord_user_id", target.discordUserId);
  } else {
    deleteQuery = deleteQuery.eq("discord_nickname", target.discordNickname);
  }

  const { data: deletedRows, error: deleteError } = await deleteQuery.select("*");

  if (deleteError) {
    throw deleteError;
  }

  if (!deletedRows || deletedRows.length === 0) {
    await message.reply("삭제할 참여자를 찾을 수 없습니다.");
    return;
  }

  const editedByNickname = await getServerNickname(message.guild, message.author, message.member);
  await sendParticipantEditMessage(message.channel, boss, record, "삭제", target.discordNickname, editedByNickname);
}

async function createKillRecord({ boss, recordType, cutTime, cutById, cutByNickname, cutSource, alertMessageId }) {
  const nextSpawn = calculateNextSpawn(boss, cutTime);
  if (!nextSpawn) throw new Error("다음 젠 시간을 계산할 수 없습니다.");

  const participationExpiresAt = recordType === "cut" ? addMinutes(new Date(), 60) : null;

  const { data: record, error: insertError } = await supabase
    .from("boss_kill_records")
    .insert({
      boss_id: boss.id,
      boss_name: boss.name,
      expected_spawn_time: boss.next_spawn_time || cutTime.toISOString(),
      record_type: recordType,
      cut_time: cutTime.toISOString(),
      cut_by_discord_id: cutById || null,
      cut_by_nickname: cutByNickname || null,
      cut_source: cutSource,
      next_spawn_time: nextSpawn.toISOString(),
      alert_message_id: alertMessageId || boss.alert_message_id || null,
      participation_expires_at: participationExpiresAt ? participationExpiresAt.toISOString() : null,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("bosses")
    .update({
      next_spawn_time: nextSpawn.toISOString(),
      status: "waiting",
      alert_5min_sent: false,
      alert_5min_message_id: null,
      alert_1min_sent: false,
      alert_message_id: null,
      cut_button_expires_at: null,
      last_record_id: record.id,
    })
    .eq("id", boss.id);

  if (updateError) throw updateError;

  return { record, nextSpawn, participationExpiresAt };
}


async function disableCutButton(channel, boss, label) {
  if (!boss.alert_message_id) return;

  try {
    const alertMessage = await channel.messages.fetch(boss.alert_message_id);

    const button = new ButtonBuilder()
      .setCustomId(`boss_cut_disabled:${boss.id}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const row = new ActionRowBuilder().addComponents(button);

    await alertMessage.edit({
      components: [row],
    });
  } catch (error) {
    console.error("컷 버튼 비활성화 실패:", error.message);
  }
}
async function sendKillMessage(channel, boss, record, nextSpawn) {
  const joinButton = new ButtonBuilder()
    .setCustomId(`boss_join:${record.id}`)
    .setLabel("참여")
    .setStyle(ButtonStyle.Success);

  const participantsButton = new ButtonBuilder()
    .setCustomId(`boss_participants:${record.id}`)
    .setLabel("참여자 확인")
    .setStyle(ButtonStyle.Primary);

  const logButton = new ButtonBuilder()
    .setCustomId(`boss_log:${record.id}`)
    .setLabel("로그")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(joinButton, participantsButton, logButton);

  const message = await channel.send({
    content:
      "✅\n" +
      "```diff\n" +
      `+ ${boss.name} 컷 처리되었습니다.\n` +
      `  컷 시간: ${formatBossListDateTime(record.cut_time)}\n` +
      `  컷 등록자: ${record.cut_by_nickname || "-"}\n` +
      "```",
    components: [row],
  });

  await supabase
    .from("boss_kill_records")
    .update({
      kill_message_id: message.id,
      participation_message_id: message.id,
    })
    .eq("id", record.id);
}

async function handleManualCut(message) {
  const body = message.content.replace(/^!컷\s+/, "").trim();

  if (!body) {
    await message.reply("사용법: `!컷 보스이름`, `!컷 보스이름 HHMM`, `!컷 보스이름 MMDD HHMM`, `!컷 보스이름 YYMMDD HHMM`");
    return;
  }

  const parts = body.split(/\s+/);
  let bossName = body;
  let cutTime = new Date();

  if (parts.length >= 3) {
    const dateText = parts[parts.length - 2];
    const timeText = parts[parts.length - 1];
    const parsedDateTime = parseKstDateTimeInput(dateText, timeText);

    if (parsedDateTime) {
      bossName = parts.slice(0, -2).join(" ");
      cutTime = parsedDateTime;
    } else {
      const parsedTime = parseKstTimeInput(timeText);

      if (parsedTime) {
        bossName = parts.slice(0, -1).join(" ");
        cutTime = parsedTime;
      }
    }
  } else if (parts.length >= 2) {
    const timeText = parts[parts.length - 1];
    const parsedTime = parseKstTimeInput(timeText);

    if (parsedTime) {
      bossName = parts.slice(0, -1).join(" ");
      cutTime = parsedTime;
    }
  }

  if (!bossName) {
    await message.reply("사용법: `!컷 보스이름`, `!컷 보스이름 HHMM`, `!컷 보스이름 MMDD HHMM`, `!컷 보스이름 YYMMDD HHMM`");
    return;
  }

  const boss = await findBossByName(bossName);
  if (!boss) {
    await message.reply(`보스를 찾을 수 없습니다: ${bossName}`);
    return;
  }

  const nickname = await getServerNickname(message.guild, message.author, message.member);
  const latestRecord = await getLatestBossRecord(boss.id);

  if (latestRecord?.record_type === "cut" && isParticipationStillActive(latestRecord)) {
    await message.reply("이미 최근 컷 기록이 있습니다.\n시간을 잘못 입력한 경우 `!컷수정 보스이름 HHMM` 을 사용해주세요.");
    return;
  }

  const { record, nextSpawn } = await createKillRecord({
    boss,
    recordType: "cut",
    cutTime,
    cutById: message.author.id,
    cutByNickname: nickname,
    cutSource: "manual",
  });

  await disableCutButton(message.channel, boss, "컷 완료");
  await sendKillMessage(message.channel, boss, record, nextSpawn);
}

function getTextWidth(text) {
  let width = 0;
  for (const char of String(text ?? "")) {
    width += /[\u0000-\u007f]/.test(char) ? 1 : 2;
  }
  return width;
}

function padText(text, targetWidth) {
  const value = String(text ?? "");
  const padding = Math.max(targetWidth - getTextWidth(value), 0);
  return value + " ".repeat(padding);
}


function formatBossListDateTime(dateInput) {
  if (!dateInput) return "-";

  const parts = getKstParts(new Date(dateInput));
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  const hh = String(parts.hour).padStart(2, "0");
  const mi = String(parts.minute).padStart(2, "0");

  return `${mm}-${dd} ${hh}:${mi}`;
}

function getBossListTimeText(boss) {
  if (!boss.next_spawn_time) return "미등록";

  const parts = getKstParts(new Date(boss.next_spawn_time));
  const hh = String(parts.hour).padStart(2, "0");
  const mi = String(parts.minute).padStart(2, "0");

  return `${hh}:${mi}`;
}

function getBossListDateKey(boss) {
  if (!boss.next_spawn_time) return "미등록";

  const parts = getKstParts(new Date(boss.next_spawn_time));
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");

  return `${mm}-${dd}`;
}


function getBossListDayOffsetText(boss) {
  if (!boss.next_spawn_time) return "";

  const parts = getKstParts(new Date(boss.next_spawn_time));
  const now = getKstParts(new Date());

  const targetDay = makeDateFromKst(parts.year, parts.month, parts.day, 0, 0);
  const today = makeDateFromKst(now.year, now.month, now.day, 0, 0);
  const diffDays = Math.round((targetDay - today) / 86400000);

  return diffDays > 0 ? `+${diffDays}d` : "";
}

function formatBossListLine(boss) {
  const timeText = getBossListTimeText(boss);
  const bossInfo = `${boss.name || "-"}  (${boss.location || "-"})`;
  const dayOffsetText = getBossListDayOffsetText(boss);
  const daySuffix = dayOffsetText ? `  ${dayOffsetText}` : "";
  const statusText = boss.status === "alerted" ? "  컷대기" : "";
  const line = `${padText(timeText, 5)} | ${bossInfo}${daySuffix}${statusText}`;

  return boss.status === "alerted" ? `-${line}` : `+${line}`;
}


function getCommandHelpMessage() {
  return [
    "📘 보스봇 명령어",
    "```diff",
    "[기본]",
    "+ !핑",
    "  봇 응답 상태를 확인합니다.",
    "",
    "+ !보스 시간",
    "  전체 보스의 다음 젠 시간을 조회합니다.",
    "",
    "+ !음성설정 / !음성 설정 / !음성",
    "  보스 알림 음성을 선택합니다.",
    "",
    "[컷 처리]",
    "+ !컷 보스이름",
    "  현재 시간으로 컷 처리합니다.",
    "  예) !컷 베나투스",
    "",
    "+ !컷 보스이름 HHMM",
    "  오늘 HH:MM 기준으로 컷 처리합니다.",
    "  예) !컷 베나투스 2300",
    "",
    "+ !컷 보스이름 MMDD HHMM",
    "  올해 MM-DD HH:MM 기준으로 컷 처리합니다.",
    "  예) !컷 베나투스 0501 2300",
    "",
    "+ !컷 보스이름 YYMMDD HHMM",
    "  20YY-MM-DD HH:MM 기준으로 컷 처리합니다.",
    "  예) !컷 베나투스 260501 2300",
    "",
    "[컷 수정]",
    "+ !컷수정 보스이름 HHMM",
    "  마지막 컷 기록의 시간을 수정합니다.",
    "  예) !컷수정 베나투스 2310",
    "",
    "+ !컷수정 보스이름 MMDD HHMM",
    "  마지막 컷 기록을 올해 MM-DD HH:MM 기준으로 수정합니다.",
    "  예) !컷수정 베나투스 0501 2310",
    "",
    "+ !컷수정 보스이름 YYMMDD HHMM",
    "  마지막 컷 기록을 20YY-MM-DD HH:MM 기준으로 수정합니다.",
    "  예) !컷수정 베나투스 260501 2310",
    "",
    "[참여자 수정]",
    "+ !참여자추가 보스이름 닉네임",
    "  마지막 컷 기록에 참여자를 추가합니다.",
    "  예) !참여자추가 베나투스 홍길동",
    "",
    "+ !참여자추가 보스이름 @유저",
    "  멘션한 유저를 참여자로 추가합니다.",
    "  예) !참여자추가 베나투스 @홍길동",
    "",
    "+ !참여자삭제 보스이름 닉네임",
    "  마지막 컷 기록에서 참여자를 삭제합니다.",
    "  예) !참여자삭제 베나투스 홍길동",
    "",
    "+ !참여자삭제 보스이름 @유저",
    "  멘션한 유저를 참여자에서 삭제합니다.",
    "  예) !참여자삭제 베나투스 @홍길동",
    "",
    "[음성 출처]",
    "  본 보스 알림 음성은 Supertone Play를 사용하여 제작되었습니다.",
    "```",
  ].join("\n");
}
async function handleBossList(message) {
  await refreshFixedBosses();

  const { data, error } = await supabase
    .from("bosses")
    .select("*")
    .eq("is_active", true)
    .order("next_spawn_time", { ascending: true, nullsFirst: false });

  if (error) {
    await message.reply(`보스 조회 실패: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    await message.reply("등록된 보스가 없습니다.");
    return;
  }

  const sortedBosses = [...data].sort((a, b) => {
    if (!a.next_spawn_time && !b.next_spawn_time) return a.display_order - b.display_order;
    if (!a.next_spawn_time) return 1;
    if (!b.next_spawn_time) return -1;
    return new Date(a.next_spawn_time) - new Date(b.next_spawn_time);
  });

  const makeHeader = (title) =>
    `${title}\n` +
    "```diff\n" +
    `${padText("시간", 5)}  | 보스이름   (위치)\n` +
    "──────────────────────────────\n";

  const chunks = [];
  let current = makeHeader("📌 보스 현황");
  let lastDateKey = null;

  for (const boss of sortedBosses) {
    const dateKey = getBossListDateKey(boss);

    if (lastDateKey !== null && dateKey !== lastDateKey) {
      current += "──────────────────────────────\n";
    }

    const line = formatBossListLine(boss);

    if ((current + line + "\n```").length > 1900) {
      current += "```";
      chunks.push(current);
      current = makeHeader("📌 보스 현황 계속");
      lastDateKey = null;
    }

    current += line + "\n";
    lastDateKey = dateKey;
  }

  current += "```";
  chunks.push(current);

  for (const chunk of chunks) {
    await message.channel.send(chunk);
  }
}


function getCurrentVoiceSetInfo() {
  return VOICE_SETS[currentVoiceSet] || VOICE_SETS.ara;
}

function getVoiceFilePath(...parts) {
  return path.join(__dirname, "sounds", ...parts);
}

async function ensureVoiceConnection() {
  if (!BOSS_VOICE_CHANNEL_ID) return null;

  if (voiceConnection && voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
    try {
      await entersState(voiceConnection, VoiceConnectionStatus.Ready, 5000);
      return voiceConnection;
    } catch {
      try {
        voiceConnection.destroy();
      } catch {}
      voiceConnection = null;
    }
  }

  const channel = await client.channels.fetch(BOSS_VOICE_CHANNEL_ID).catch(() => null);
  if (!channel?.isVoiceBased?.()) return null;
  if (!channel.joinable || !channel.speakable) return null;

  const guild = channel.guild;
  if (typeof guild?.voiceAdapterCreator !== "function") return null;

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  connection.on("stateChange", (_, newState) => {
    if (newState.status === VoiceConnectionStatus.Destroyed && voiceConnection === connection) {
      voiceConnection = null;
    }
  });

  const subscription = connection.subscribe(voicePlayer);
  if (!subscription) {
    connection.destroy();
    return null;
  }

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 45000);
    voiceConnection = connection;
    return connection;
  } catch {
    try {
      connection.destroy();
    } catch {}
    if (voiceConnection === connection) voiceConnection = null;
    return null;
  }
}

async function processVoiceQueue() {
  if (isVoiceQueueRunning) return;
  isVoiceQueueRunning = true;

  while (voiceQueue.length > 0) {
    const filePath = voiceQueue.shift();

    try {
      const connection = await ensureVoiceConnection();
      if (!connection) continue;

      const resource = createAudioResource(filePath);
      voicePlayer.play(resource);
      await entersState(voicePlayer, AudioPlayerStatus.Idle, 120000).catch(() => null);
    } catch {}
  }

  isVoiceQueueRunning = false;
}

function enqueueVoiceFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;

  voiceQueue.push(filePath);
  void processVoiceQueue();
  return true;
}


function playVoiceSample(voiceSet) {
  const voiceSetInfo = VOICE_SETS[voiceSet];
  if (!voiceSetInfo) return false;

  return enqueueVoiceFile(getVoiceFilePath(voiceSetInfo.folder, "sample.mp3"));
}

function playBossVoice(alertType, bossName) {
  const voiceSetInfo = getCurrentVoiceSetInfo();
  return enqueueVoiceFile(getVoiceFilePath(voiceSetInfo.folder, alertType, `${bossName}.mp3`));
}

async function handleVoiceSetting(message) {
  const araButton = new ButtonBuilder()
    .setCustomId("voice_set:ara")
    .setLabel("아라")
    .setStyle(ButtonStyle.Secondary);

  const jinhoButton = new ButtonBuilder()
    .setCustomId("voice_set:jinho")
    .setLabel("진호")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(araButton, jinhoButton);

  await message.channel.send({
    content:
      "보스 알림 음성을 선택해주세요.\n" +
      "본 보스 알림 음성은 Supertone Play를 사용하여 제작되었습니다.",
    components: [row],
  });
}

async function checkBossAlerts() {
  await refreshFixedBosses();

  const { data, error } = await supabase
    .from("bosses")
    .select("*")
    .eq("is_active", true)
    .not("next_spawn_time", "is", null);

  if (error) {
    console.error("알림 대상 조회 실패:", error.message);
    return;
  }

  const channel = await client.channels.fetch(BOSS_CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.error("보스 알림 채널을 찾을 수 없습니다.");
    return;
  }

  const now = new Date();

  for (const boss of data || []) {
    const spawnTime = new Date(boss.next_spawn_time);
    const oneMinuteBefore = new Date(spawnTime.getTime() - 60000);
    const expireTime = new Date(spawnTime.getTime() + 30 * 60000);

    const fiveMinutesBefore = new Date(spawnTime.getTime() - 5 * 60000);

    if (boss.status === "waiting" && !boss.alert_5min_sent && now >= fiveMinutesBefore && now < oneMinuteBefore) {
      const alertMessage = await channel.send({
        content:
          "⚔️\n" +
          "```diff\n" +
          `+ ${boss.name} 젠 5분 전입니다.\n` +
          `  젠 시간: ${formatBossListDateTime(spawnTime)}\n` +
          "```",
      });

      const { error: alert5MinUpdateError } = await supabase
        .from("bosses")
        .update({
          alert_5min_sent: true,
          alert_5min_message_id: alertMessage.id,
        })
        .eq("id", boss.id);

      if (alert5MinUpdateError) {
        console.error("5분 전 알림 상태 저장 실패:", alert5MinUpdateError.message);
      }

      playBossVoice("5min", boss.name);
    }

    if (boss.status === "waiting" && !boss.alert_1min_sent && now >= oneMinuteBefore && now < expireTime) {
      const button = new ButtonBuilder()
        .setCustomId(`boss_cut:${boss.id}`)
        .setLabel("컷")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(button);

      const alertMessage = await channel.send({
        content:
          "⚔️\n" +
          "```diff\n" +
          `+ ${boss.name} 젠 1분 전입니다.\n` +
          `  젠 시간: ${formatBossListDateTime(spawnTime)}\n` +
          "```",
        components: [row],
      });

      const { error: alertUpdateError } = await supabase
        .from("bosses")
        .update({
          status: "alerted",
          alert_1min_sent: true,
          alert_message_id: alertMessage.id,
          cut_button_expires_at: expireTime.toISOString(),
        })
        .eq("id", boss.id);

      if (alertUpdateError) {
        console.error("1분 전 알림 상태 저장 실패:", alertUpdateError.message);
      }

      playBossVoice("1min", boss.name);
    }

    const hasExpiredCutButton =
      boss.cut_button_expires_at &&
      now >= new Date(boss.cut_button_expires_at) &&
      (boss.status === "alerted" || boss.alert_1min_sent || boss.alert_message_id);

    if (hasExpiredCutButton) {
      const { record, nextSpawn } = await createKillRecord({
        boss,
        recordType: "mung",
        cutTime: spawnTime,
        cutById: null,
        cutByNickname: null,
        cutSource: "auto_mung",
        alertMessageId: boss.alert_message_id,
      });

      await disableCutButton(channel, boss, "멍 처리");

      const mungMessage = await channel.send(
        `⚫ ${boss.name} 멍 처리되었습니다.\n` +
        `30분 동안 컷 버튼이 눌리지 않아 젠 시간 기준으로 다음 시간이 갱신되었습니다.\n` +
        `기준 시간: ${formatKst(record.cut_time)}\n` +
        `다음 젠: ${formatKst(nextSpawn)}`
      );

      await supabase
        .from("boss_kill_records")
        .update({
          kill_message_id: mungMessage.id,
        })
        .eq("id", record.id);
    }
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.channelId !== BOSS_CHANNEL_ID) return;

  try {
    if (interaction.customId.startsWith("voice_set:")) {
      const voiceSet = interaction.customId.split(":")[1];
      const voiceSetInfo = VOICE_SETS[voiceSet];

      if (!voiceSetInfo) {
        await interaction.reply({ content: "선택할 수 없는 음성입니다.", ephemeral: true });
        return;
      }

      await interaction.deferUpdate();

      currentVoiceSet = voiceSet;
      playVoiceSample(voiceSet);

      await interaction.message.edit({
        content: `현재 보스 알림 음성이 ${voiceSetInfo.label}로 변경되었습니다.`,
        components: [],
      });

      return;
    }

    if (interaction.customId.startsWith("boss_cut:")) {
      const bossId = interaction.customId.split(":")[1];

      const { data: boss, error } = await supabase
        .from("bosses")
        .update({
          status: "waiting",
        })
        .eq("id", bossId)
        .eq("status", "alerted")
        .select("*")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!boss) {
        await interaction.reply({ content: "이미 처리되었거나 유효하지 않은 컷 버튼입니다.", ephemeral: true });
        return;
      }

      if (boss.cut_button_expires_at && new Date() > new Date(boss.cut_button_expires_at)) {
        await supabase
          .from("bosses")
          .update({
            status: "alerted",
          })
          .eq("id", boss.id)
          .eq("status", "waiting");

        await interaction.reply({ content: "컷 버튼 유효시간이 만료되었습니다.", ephemeral: true });
        return;
      }

      const nickname = await getServerNickname(interaction.guild, interaction.user, interaction.member);
      const cutTime = new Date();

      let record;
      let nextSpawn;

      try {
        const created = await createKillRecord({
          boss,
          recordType: "cut",
          cutTime,
          cutById: interaction.user.id,
          cutByNickname: nickname,
          cutSource: "button",
          alertMessageId: boss.alert_message_id,
        });

        record = created.record;
        nextSpawn = created.nextSpawn;
      } catch (error) {
        await supabase
          .from("bosses")
          .update({
            status: "alerted",
          })
          .eq("id", boss.id)
          .eq("status", "waiting");

        throw error;
      }

      await disableCutButton(interaction.channel, boss, "컷 완료");
      await sendKillMessage(interaction.channel, boss, record, nextSpawn);

      await interaction.reply({
        content: `${boss.name} 컷 처리되었습니다.`,
        ephemeral: true,
      });

      return;
    }

    if (interaction.customId.startsWith("boss_join:")) {
      const recordId = interaction.customId.split(":")[1];

      const { data: record, error } = await supabase
        .from("boss_kill_records")
        .select("*")
        .eq("id", recordId)
        .single();

      if (error || !record) {
        await interaction.reply({ content: "컷 기록을 찾을 수 없습니다.", ephemeral: true });
        return;
      }

      if (record.record_type !== "cut") {
        await interaction.reply({ content: "참여할 수 없는 기록입니다.", ephemeral: true });
        return;
      }

      if (record.participation_expires_at && new Date() > new Date(record.participation_expires_at)) {
        await interaction.reply({ content: "참여 등록 시간이 만료되었습니다.", ephemeral: true });
        return;
      }

      const nickname = await getServerNickname(interaction.guild, interaction.user, interaction.member);

      const { error: insertError } = await supabase
        .from("boss_participants")
        .insert({
          kill_record_id: record.id,
          boss_id: record.boss_id,
          boss_name: record.boss_name,
          cut_time: record.cut_time,
          discord_user_id: interaction.user.id,
          discord_nickname: nickname,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          await interaction.reply({ content: "이미 참여 등록되어 있습니다.", ephemeral: true });
          return;
        }

        throw insertError;
      }

      await interaction.reply({ content: "참여 등록되었습니다.", ephemeral: true });
      return;
    }

    if (interaction.customId.startsWith("boss_participants:")) {
      const recordId = interaction.customId.split(":")[1];

      const { data: record, error: recordError } = await supabase
        .from("boss_kill_records")
        .select("*")
        .eq("id", recordId)
        .single();

      if (recordError || !record) {
        await interaction.reply({ content: "컷 기록을 찾을 수 없습니다.", ephemeral: true });
        return;
      }

      const { data: participants, error: participantsError } = await supabase
        .from("boss_participants")
        .select("discord_nickname, created_at")
        .eq("kill_record_id", recordId)
        .order("created_at", { ascending: true });

      if (participantsError) {
        throw participantsError;
      }

      const names = (participants || [])
        .map((item) => item.discord_nickname || "-")
        .filter((name) => name && name !== "-");

      const content =
        names.length > 0
          ? `📋 ${record.boss_name} 참여자\n${names.join(", ")}`
          : `📋 ${record.boss_name} 참여자\n아직 참여자가 없습니다.`;

      await interaction.reply({
        content,
        ephemeral: true,
      });

      return;
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "처리 중 오류가 발생했습니다.", ephemeral: true });
    }
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== BOSS_CHANNEL_ID) return;

  try {
    if (message.content === "!핑") {
      await message.reply("퐁");
      return;
    }

    if (message.content === "!명령어" || message.content === "!도움말" || message.content === "!help") {
      await message.channel.send(getCommandHelpMessage());
      return;
    }

    if (
      message.content === "!음성설정" ||
      message.content === "!음성 설정" ||
      message.content === "!음성"
    ) {
      await handleVoiceSetting(message);
      return;
    }


    if (message.content === "!보스" || message.content === "!보스 시간") {
      await handleBossList(message);
      return;
    }

    if (message.content.startsWith("!참여자추가 ")) {
      await handleParticipantAdd(message);
      return;
    }

    if (message.content.startsWith("!참여자삭제 ")) {
      await handleParticipantDelete(message);
      return;
    }

    if (message.content.startsWith("!컷수정 ")) {
      await handleCutEdit(message);
      return;
    }

    if (message.content.startsWith("!컷 ")) {
      await handleManualCut(message);
      return;
    }
  } catch (error) {
    console.error(error);
    await message.reply("처리 중 오류가 발생했습니다.");
  }
});

client.once("ready", async () => {
  console.log(`로그인 완료: ${client.user.tag}`);
  await refreshFixedBosses();
  await ensureVoiceConnection();
  setInterval(checkBossAlerts, 30000);
  setInterval(() => {
    void ensureVoiceConnection();
  }, 300000);
});

client.login(DISCORD_TOKEN);
