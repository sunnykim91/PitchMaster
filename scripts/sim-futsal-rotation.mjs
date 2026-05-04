// 풋살 자동편성 v3 알고리즘 시뮬레이터
// 매 쿼터 capacity 정확 채움 + 각 선수 needed 정확 매칭 검증

const PREF_TO_POSITION = {
  GK: "GK",
  CB: "DF", LB: "DF", RB: "DF",
  CDM: "MF", CM: "MF", CAM: "MF",
  LW: "FW", RW: "FW", ST: "FW",
  FIXO: "DF", ALA: "MF", PIVO: "FW",
};

function getAllPos(p) {
  return p.prefs ?? [];
}

// ── 풋살 v3 알고리즘 (사전 분배 + 슬롯 매칭) ──

function distributeFutsalV3(players, quarterCount, slotsPerQ, slots) {
  const fieldPlayers = players.filter(p => !p.isGK);
  const gks = players.filter(p => p.isGK);

  // Step 1: 페어 결정 — 0.5 잔여 있는 선수 2명씩
  const halfQ = fieldPlayers.filter(p => p.quarters % 1 !== 0);
  const pairs = [];
  for (let i = 0; i + 1 < halfQ.length; i += 2) {
    pairs.push([halfQ[i], halfQ[i + 1]]);
  }
  const pairQuarters = [];
  if (pairs.length > 0) {
    for (let i = 0; i < pairs.length; i++) {
      pairQuarters.push(Math.min(quarterCount, 1 + Math.floor(i * quarterCount / pairs.length)));
    }
  }

  const playerPairQ = new Map();
  for (let i = 0; i < pairs.length; i++) {
    playerPairQ.set(pairs[i][0].id, pairQuarters[i]);
    playerPairQ.set(pairs[i][1].id, pairQuarters[i]);
  }

  // Step 2: 풀쿼터 needed 계산
  const remaining = new Map();
  for (const p of fieldPlayers) {
    const isInPair = playerPairQ.has(p.id);
    remaining.set(p.id, isInPair ? Math.floor(p.quarters) : p.quarters);
  }

  const fieldSlotCount = slots.filter(s => s.role !== "GK").length;
  const cap = new Array(quarterCount).fill(fieldSlotCount);
  for (const q of pairQuarters) cap[q - 1] -= 1;

  // Step 3: 매 쿼터 capacity-aware 라운드로빈 배정
  const assigned = new Map();
  for (const p of fieldPlayers) assigned.set(p.id, []);

  // 페어 등록
  for (let i = 0; i < pairs.length; i++) {
    const [p1, p2] = pairs[i];
    const q = pairQuarters[i];
    assigned.get(p1.id).push({ quarter: q, type: "first_half" });
    assigned.get(p2.id).push({ quarter: q, type: "second_half" });
  }

  for (let q = 1; q <= quarterCount; q++) {
    const remainingQuarters = quarterCount - q + 1;
    while (cap[q - 1] > 0) {
      const usedThisQ = new Set();
      for (const [id, arr] of assigned.entries()) {
        if (arr.some(x => x.quarter === q)) usedThisQ.add(id);
      }
      const candidates = fieldPlayers.filter(p => {
        if ((remaining.get(p.id) ?? 0) <= 0) return false;
        if (usedThisQ.has(p.id)) return false;
        if (playerPairQ.get(p.id) === q) return false;
        return true;
      });
      if (candidates.length === 0) break;
      candidates.sort((a, b) => {
        const aRatio = (remaining.get(a.id) ?? 0) / remainingQuarters;
        const bRatio = (remaining.get(b.id) ?? 0) / remainingQuarters;
        if (Math.abs(aRatio - bRatio) > 0.001) return bRatio - aRatio;
        const aCount = assigned.get(a.id)?.length ?? 0;
        const bCount = assigned.get(b.id)?.length ?? 0;
        return aCount - bCount;
      });
      const player = candidates[0];
      assigned.get(player.id).push({ quarter: q, type: "full" });
      remaining.set(player.id, (remaining.get(player.id) ?? 0) - 1);
      cap[q - 1] -= 1;
    }
  }

  return { assigned, pairs, pairQuarters, gks };
}

function scheduleQuartersFutsalV3(players, quarterCount, formation) {
  const { assigned, gks } = distributeFutsalV3(
    players,
    quarterCount,
    formation.slots.length,
    formation.slots,
  );
  const fieldPlayers = players.filter(p => !p.isGK);
  const gkSlot = formation.slots.find(s => s.role === "GK");
  const fieldSlots = formation.slots.filter(s => s.role !== "GK");

  const results = [];
  for (let q = 1; q <= quarterCount; q++) {
    const assignments = [];

    // GK
    if (gkSlot) {
      const gkPick = gks[(q - 1) % Math.max(1, gks.length)] ?? null;
      if (gkPick) {
        assignments.push({ slotId: gkSlot.id, slotLabel: gkSlot.label, playerId: gkPick.id, playerName: gkPick.name, type: "full" });
      }
    }

    // 이 쿼터 출전 필드 선수 분류
    const qFull = [], qFirstHalf = [], qSecondHalf = [];
    for (const p of fieldPlayers) {
      const entry = assigned.get(p.id).find(x => x.quarter === q);
      if (!entry) continue;
      if (entry.type === "full") qFull.push(p);
      else if (entry.type === "first_half") qFirstHalf.push(p);
      else qSecondHalf.push(p);
    }

    // 슬롯 매칭 요청
    const slotReqs = [];
    for (const p of qFull) slotReqs.push({ ids: [p.id], type: "full", player: p });
    const pairCount = Math.min(qFirstHalf.length, qSecondHalf.length);
    for (let i = 0; i < pairCount; i++) {
      slotReqs.push({ ids: [qFirstHalf[i].id, qSecondHalf[i].id], type: "first_half", player: qFirstHalf[i] });
    }

    const usedSlots = new Set();
    const usedReqs = new Set();

    function assignReq(slot, req) {
      if (req.ids.length === 2) {
        const p1 = fieldPlayers.find(p => p.id === req.ids[0]);
        const p2 = fieldPlayers.find(p => p.id === req.ids[1]);
        assignments.push({ slotId: slot.id, slotLabel: slot.label, playerId: p1.id, playerName: p1.name, type: "first_half" });
        assignments.push({ slotId: slot.id, slotLabel: slot.label, playerId: p2.id, playerName: p2.name, type: "second_half" });
      } else {
        const p = fieldPlayers.find(pl => pl.id === req.ids[0]);
        assignments.push({ slotId: slot.id, slotLabel: slot.label, playerId: p.id, playerName: p.name, type: req.type });
      }
      usedSlots.add(slot.id);
      usedReqs.add(req);
    }

    // 1차 정확 매칭
    for (const slot of fieldSlots) {
      if (usedSlots.has(slot.id)) continue;
      const req = slotReqs.find(r => !usedReqs.has(r) && getAllPos(r.player).includes(slot.role));
      if (req) assignReq(slot, req);
    }
    // 2차 카테고리
    for (const slot of fieldSlots) {
      if (usedSlots.has(slot.id)) continue;
      const slotCat = PREF_TO_POSITION[slot.role] ?? null;
      const req = slotReqs.find(r => !usedReqs.has(r) && getAllPos(r.player).some(pos => PREF_TO_POSITION[pos] === slotCat));
      if (req) assignReq(slot, req);
    }
    // 3차 강제
    for (const slot of fieldSlots) {
      if (usedSlots.has(slot.id)) continue;
      const req = slotReqs.find(r => !usedReqs.has(r));
      if (req) assignReq(slot, req);
    }

    results.push({ quarter: q, assignments });
  }
  return results;
}

// ── 검증 함수 ──
function verify(testName, players, quarterCount, formation, results) {
  const errors = [];
  const slotsPerQ = formation.slots.length; // GK 포함

  // 1. 매 쿼터 슬롯 채움 검증
  for (const r of results) {
    // 페어는 한 슬롯에 2명 = 1 슬롯. 즉 unique slotId 카운트
    const uniqueSlots = new Set(r.assignments.map(a => a.slotId));
    if (uniqueSlots.size !== slotsPerQ) {
      errors.push(`Q${r.quarter}: ${uniqueSlots.size}/${slotsPerQ} 슬롯만 채움`);
    }
  }

  // 2. 각 선수 출전 횟수 = quarters 검증
  const playerOut = new Map();
  for (const p of players) playerOut.set(p.id, 0);
  for (const r of results) {
    const seenInQ = new Set();
    for (const a of r.assignments) {
      // 페어는 first_half + second_half 각각 0.5
      const inc = (a.type === "first_half" || a.type === "second_half") ? 0.5 : 1;
      // 같은 쿼터에 같은 선수 중복 방지 (페어 first+second는 별도 type)
      const key = `${a.playerId}-${a.type}`;
      if (seenInQ.has(key)) {
        errors.push(`Q${r.quarter}: ${a.playerName} 중복 매칭 (${a.type})`);
      }
      seenInQ.add(key);
      playerOut.set(a.playerId, (playerOut.get(a.playerId) ?? 0) + inc);
    }
  }
  for (const p of players) {
    const got = playerOut.get(p.id) ?? 0;
    if (Math.abs(got - p.quarters) > 0.01) {
      errors.push(`${p.name}: ${got}쿼터 출전 (needed ${p.quarters})`);
    }
  }

  // 3. 한 슬롯에 같은 선수 X (페어 first/second는 OK)
  for (const r of results) {
    const slotPlayers = new Map();
    for (const a of r.assignments) {
      if (!slotPlayers.has(a.slotId)) slotPlayers.set(a.slotId, []);
      slotPlayers.get(a.slotId).push(a);
    }
    for (const [slotId, arr] of slotPlayers.entries()) {
      if (arr.length === 1) continue;
      if (arr.length === 2) {
        const types = arr.map(a => a.type).sort().join(",");
        if (types !== "first_half,second_half") {
          errors.push(`Q${r.quarter} ${slotId}: 잘못된 슬롯 공유 (${types})`);
        }
      } else {
        errors.push(`Q${r.quarter} ${slotId}: 슬롯에 ${arr.length}명 (페어 외 다중 매칭)`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✓ ${testName}`);
    return true;
  } else {
    console.log(`✗ ${testName}`);
    for (const e of errors) console.log(`    ${e}`);
    // 디버그용 결과 출력
    for (const r of results) {
      const pickSummary = r.assignments
        .map(a => `${a.slotLabel}=${a.playerName}${a.type === "first_half" ? "(½A)" : a.type === "second_half" ? "(½B)" : ""}`)
        .join(", ");
      console.log(`    Q${r.quarter}: ${pickSummary}`);
    }
    return false;
  }
}

// ── 테스트 케이스 ──

const formation_6_2_2_1 = {
  id: "futsal-6-2-2-1",
  slots: [
    { id: "gk", role: "GK", label: "GK" },
    { id: "fixo-l", role: "FIXO", label: "FIXO" },
    { id: "fixo-r", role: "FIXO", label: "FIXO" },
    { id: "ala-l", role: "ALA", label: "ALA" },
    { id: "ala-r", role: "ALA", label: "ALA" },
    { id: "pivo", role: "PIVO", label: "PIVO" },
  ],
};
const formation_5_2_2 = {
  id: "futsal-5-2-2",
  slots: [
    { id: "gk", role: "GK", label: "GK" },
    { id: "fixo-l", role: "FIXO", label: "FIXO" },
    { id: "fixo-r", role: "FIXO", label: "FIXO" },
    { id: "pivo-l", role: "PIVO", label: "PIVO" },
    { id: "pivo-r", role: "PIVO", label: "PIVO" },
  ],
};

let passed = 0, failed = 0;

// Case 1: 사용자 실 케이스 (8명 6인제 8쿼터)
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "fixo1", name: "피소1", isGK: false, quarters: 5.5, prefs: ["FIXO"] },
    { id: "fixo2", name: "피소2", isGK: false, quarters: 5.5, prefs: ["FIXO"] },
    { id: "ala1", name: "아라1", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "ala2", name: "아라2", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "pivo1", name: "피벗1", isGK: false, quarters: 6, prefs: ["PIVO"] },
    { id: "pivo2", name: "피벗2", isGK: false, quarters: 5.5, prefs: ["PIVO"] },
    { id: "sunhwi", name: "김선휘", isGK: false, quarters: 5.5, prefs: ["CB","LW","RW","LB","RB","ST"] },
  ];
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  if (verify("Case 1: 사용자 실 케이스 (8명·8Q·6인제·2-2-1)", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 2: 7명, 페어 X (정수 시간)
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "fixo1", name: "피소1", isGK: false, quarters: 7, prefs: ["FIXO"] },
    { id: "fixo2", name: "피소2", isGK: false, quarters: 7, prefs: ["FIXO"] },
    { id: "ala1", name: "아라1", isGK: false, quarters: 7, prefs: ["ALA"] },
    { id: "ala2", name: "아라2", isGK: false, quarters: 7, prefs: ["ALA"] },
    { id: "pivo1", name: "피벗1", isGK: false, quarters: 6, prefs: ["PIVO"] },
    { id: "pivo2", name: "피벗2", isGK: false, quarters: 6, prefs: ["PIVO"] },
  ];
  // 합 = 7×4 + 6×2 = 40, slots × 8 = 5×8 = 40 ✓
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  if (verify("Case 2: 7명 정수 시간 (페어 없음)", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 3: 김선휘만 멀티 (축구 선호)
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 4, prefs: ["GK"] },
    { id: "p1", name: "P1", isGK: false, quarters: 4, prefs: ["FIXO"] },
    { id: "p2", name: "P2", isGK: false, quarters: 4, prefs: ["FIXO"] },
    { id: "p3", name: "P3", isGK: false, quarters: 4, prefs: ["ALA"] },
    { id: "p4", name: "P4", isGK: false, quarters: 4, prefs: ["ALA"] },
    { id: "p5", name: "P5", isGK: false, quarters: 4, prefs: ["PIVO"] },
    { id: "sunhwi", name: "김선휘", isGK: false, quarters: 0, prefs: ["CB","LW"] },
    // 멀티 포지션이지만 0Q 출전(미참석 case)
  ];
  // 합 4*5 = 20, slots 5*4 = 20 ✓
  const results = scheduleQuartersFutsalV3(players, 4, formation_6_2_2_1);
  if (verify("Case 3: 6명 정확 매칭 (멀티 0Q 제외)", players.filter(p => p.quarters > 0), 4, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 4: 5인제 5명 4쿼터
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 4, prefs: ["GK"] },
    { id: "f1", name: "F1", isGK: false, quarters: 4, prefs: ["FIXO"] },
    { id: "f2", name: "F2", isGK: false, quarters: 4, prefs: ["FIXO"] },
    { id: "p1", name: "P1", isGK: false, quarters: 4, prefs: ["PIVO"] },
    { id: "p2", name: "P2", isGK: false, quarters: 4, prefs: ["PIVO"] },
  ];
  // 합 4*4=16, slots 4*4=16 ✓
  const results = scheduleQuartersFutsalV3(players, 4, formation_5_2_2);
  if (verify("Case 4: 5인제 5명·4Q·2-2", players, 4, formation_5_2_2, results)) passed++; else failed++;
}

// Case 5: 큰 인원 (10명, 6인제 8쿼터)
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "fixo1", name: "피소1", isGK: false, quarters: 5, prefs: ["FIXO"] },
    { id: "fixo2", name: "피소2", isGK: false, quarters: 5, prefs: ["FIXO"] },
    { id: "fixo3", name: "피소3", isGK: false, quarters: 4, prefs: ["FIXO"] },
    { id: "ala1", name: "아라1", isGK: false, quarters: 5, prefs: ["ALA"] },
    { id: "ala2", name: "아라2", isGK: false, quarters: 5, prefs: ["ALA"] },
    { id: "ala3", name: "아라3", isGK: false, quarters: 4, prefs: ["ALA"] },
    { id: "pivo1", name: "피벗1", isGK: false, quarters: 4, prefs: ["PIVO"] },
    { id: "pivo2", name: "피벗2", isGK: false, quarters: 4, prefs: ["PIVO"] },
    { id: "sunhwi", name: "김선휘", isGK: false, quarters: 4, prefs: ["CB","ST"] },
  ];
  // 합 5*2 + 4*7 = 10+28 = 38? slots 5*8=40. 2 부족 → 일부 빈 슬롯 가능
  // 인원 합 조정: 5*4 + 4*5 = 20+20 = 40. ✓
  players[1].quarters = 5; players[2].quarters = 5; players[4].quarters = 5; players[5].quarters = 5;
  players[3].quarters = 4; players[6].quarters = 4; players[7].quarters = 4; players[8].quarters = 4; players[9].quarters = 4;
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  if (verify("Case 5: 10명 6인제 8Q (인원 초과 분배)", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 6: PIVO 선호 1명만
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "fixo1", name: "피소1", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "fixo2", name: "피소2", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "ala1", name: "아라1", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "ala2", name: "아라2", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "ala3", name: "아라3", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "pivo1", name: "피벗1", isGK: false, quarters: 5, prefs: ["PIVO"] },
    { id: "sunhwi", name: "김선휘", isGK: false, quarters: 5, prefs: ["ST","LW"] },
  ];
  // 합 6*5 + 5*2 = 30+10 = 40 ✓
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  if (verify("Case 6: PIVO 1명만 (8명 6Q×5 + 5Q×2)", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 7: 모두 정수 6쿼터 같은 시간
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "p1", name: "P1", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "p2", name: "P2", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "p3", name: "P3", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "p4", name: "P4", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "p5", name: "P5", isGK: false, quarters: 6, prefs: ["PIVO"] },
    { id: "p6", name: "P6", isGK: false, quarters: 5, prefs: ["FIXO"] },
    { id: "p7", name: "P7", isGK: false, quarters: 5, prefs: ["ALA"] },
  ];
  // 합 6*5 + 5*2 = 30+10 = 40 ✓
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  if (verify("Case 7: 정수 시간만 균등", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 8: 페어 1개만 (5.5Q × 2명)
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "p1", name: "P1", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "p2", name: "P2", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "p3", name: "P3", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "p4", name: "P4", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "p5", name: "P5", isGK: false, quarters: 6, prefs: ["PIVO"] },
    { id: "p6", name: "P6", isGK: false, quarters: 5.5, prefs: ["PIVO"] },
    { id: "p7", name: "P7", isGK: false, quarters: 5.5, prefs: ["ALA"] },
  ];
  // 합 6*5 + 5.5*2 = 30+11 = 41. slots 5*8 = 40. 1 초과.
  // 페어 1개 → 페어 슬롯 1, capacity 5*8 - 1 = 39. 페어 인선 0.5*2 = 1. 풀쿼터 needed 5*2 = 10. 합 5*5 + 5*2 + 1 = 36? 다시.
  // 페어인 선수 needed = floor(5.5) = 5. p6, p7 각 5. 페어 외 6×5 = 30. 합 5+5+30 = 40.
  // capacity = 5*8 - 1 = 39. needed 합 40 > 39. ❌ 인원 초과.
  // 시간 분배 미스. 조정.
  players[5].quarters = 5; // p5 6→5
  // 6*4 + 5*1 + 5.5*2 = 24+5+11 = 40. 페어 1, capacity 39. 페어 needed 5*2=10. 풀쿼터 24+5=29. 합 39 ✓.
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  if (verify("Case 8: 페어 1개만 (5.5×2)", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 9: 풋살 1-2-1 (다이아몬드, 5인제) — 슬롯 분포 1+2+1 비대칭
{
  const formation_1_2_1 = {
    id: "futsal-1-2-1",
    slots: [
      { id: "gk", role: "GK", label: "GK" },
      { id: "fixo", role: "FIXO", label: "FIXO" },
      { id: "ala-l", role: "ALA", label: "ALA" },
      { id: "ala-r", role: "ALA", label: "ALA" },
      { id: "pivo", role: "PIVO", label: "PIVO" },
    ],
  };
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 4, prefs: ["GK"] },
    { id: "f", name: "F", isGK: false, quarters: 4, prefs: ["FIXO"] },
    { id: "a1", name: "A1", isGK: false, quarters: 4, prefs: ["ALA"] },
    { id: "a2", name: "A2", isGK: false, quarters: 4, prefs: ["ALA"] },
    { id: "p", name: "P", isGK: false, quarters: 4, prefs: ["PIVO"] },
  ];
  const results = scheduleQuartersFutsalV3(players, 4, formation_1_2_1);
  if (verify("Case 9: 1-2-1 다이아몬드 (5명·4Q)", players, 4, formation_1_2_1, results)) passed++; else failed++;
}

// Case 10: GK 2명 로테이션
{
  const players = [
    { id: "gk1", name: "GK1", isGK: true, quarters: 4, prefs: ["GK"] },
    { id: "gk2", name: "GK2", isGK: true, quarters: 4, prefs: ["GK"] },
    { id: "f1", name: "F1", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "f2", name: "F2", isGK: false, quarters: 6, prefs: ["FIXO"] },
    { id: "a1", name: "A1", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "a2", name: "A2", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "p1", name: "P1", isGK: false, quarters: 8, prefs: ["PIVO"] },
    { id: "p2", name: "P2", isGK: false, quarters: 8, prefs: ["PIVO"] },
  ];
  // GK 합 4+4=8 (8쿼터 정확), 필드 합 6*4 + 8*2 = 24+16 = 40 ✓
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  if (verify("Case 10: GK 2명 로테이션", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 11: 1쿼터만
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 1, prefs: ["GK"] },
    { id: "f1", name: "F1", isGK: false, quarters: 1, prefs: ["FIXO"] },
    { id: "f2", name: "F2", isGK: false, quarters: 1, prefs: ["FIXO"] },
    { id: "a1", name: "A1", isGK: false, quarters: 1, prefs: ["ALA"] },
    { id: "a2", name: "A2", isGK: false, quarters: 1, prefs: ["ALA"] },
    { id: "p", name: "P", isGK: false, quarters: 1, prefs: ["PIVO"] },
  ];
  const results = scheduleQuartersFutsalV3(players, 1, formation_6_2_2_1);
  if (verify("Case 11: 1쿼터만 (6명)", players, 1, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 12: 페어 외톨이 — 5.5Q 3명 (홀수)
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "f1", name: "F1", isGK: false, quarters: 5.5, prefs: ["FIXO"] },
    { id: "f2", name: "F2", isGK: false, quarters: 5.5, prefs: ["FIXO"] },
    { id: "a1", name: "A1", isGK: false, quarters: 5.5, prefs: ["ALA"] },
    { id: "a2", name: "A2", isGK: false, quarters: 6, prefs: ["ALA"] },
    { id: "p1", name: "P1", isGK: false, quarters: 6, prefs: ["PIVO"] },
    { id: "p2", name: "P2", isGK: false, quarters: 6, prefs: ["PIVO"] },
    { id: "x", name: "X", isGK: false, quarters: 6, prefs: ["FIXO"] },
  ];
  // 합 5.5*3 + 6*4 = 16.5 + 24 = 40.5 → 0.5 외톨이.
  // 외톨이 1명: 페어 못 만들고 floor 처리 → 5쿼터. 0.5 손실.
  // 합 = 5.5*2 + 5 + 6*4 = 11 + 5 + 24 = 40 (외톨이 0.5 무시)
  // capacity 5*8 - 1 페어 = 39. 페어 0.5*2 = 1. 풀쿼터 needed 5+5+5+6+6+6+6 = 39. ✓
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  // 외톨이 0.5 손실은 verify에서 잡힐 것. needed-0.5 차이 허용해야 함.
  // 일단 verify 통과 여부 확인.
  if (verify("Case 12: 페어 홀수 (5.5×3)", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 13: 페어 4쌍 (모두 5.5Q)
{
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 8, prefs: ["GK"] },
    { id: "p1", name: "P1", isGK: false, quarters: 5.5, prefs: ["FIXO"] },
    { id: "p2", name: "P2", isGK: false, quarters: 5.5, prefs: ["FIXO"] },
    { id: "p3", name: "P3", isGK: false, quarters: 5.5, prefs: ["FIXO"] },
    { id: "p4", name: "P4", isGK: false, quarters: 5.5, prefs: ["ALA"] },
    { id: "p5", name: "P5", isGK: false, quarters: 5.5, prefs: ["ALA"] },
    { id: "p6", name: "P6", isGK: false, quarters: 5.5, prefs: ["PIVO"] },
    { id: "p7", name: "P7", isGK: false, quarters: 5.5, prefs: ["PIVO"] },
    { id: "p8", name: "P8", isGK: false, quarters: 5.5, prefs: ["ALA"] },
  ];
  // 8명 5.5Q, 페어 4개. 합 5.5*8 = 44. capacity 5*8 - 4 페어 = 36. 페어 0.5*8 = 4. 풀쿼터 needed 5*8=40. 합 44 > 40 (4초과)
  // 페어 4개 = 4쿼터에 페어. 한 쿼터당 페어 1개.
  // 잠깐 — 4페어 합 = 4*0.5*2 = 4 인선 (반쿼터 8개 ÷ 2). 풀쿼터 8*5 = 40 이고 페어가 4 슬롯 차지. 풀쿼터 cap = 36.
  // 풀쿼터 needed (페어인 선수 floor) = 5*8 = 40. cap 36 < needed 40. 4 미달.
  // → 인원 초과 케이스. 일부 선수 needed 못 채움 (4인선 부족). 예상 실패.
  // 이런 케이스 알고리즘이 어떻게 처리하는지 검증.
  // 합리적 처리: 매 쿼터 cap 정확히 채우고 needed 미달은 알고리즘 한계.
  players[1].quarters = 5; // 한 명 5로 줄임. 합 5 + 5.5*7 = 5 + 38.5 = 43.5
  players[2].quarters = 5; // 한 명 더. 합 5*2 + 5.5*6 = 10 + 33 = 43
  // 페어 후보: 5.5인 6명 → 페어 3개. 나머지 5인 2명. 합 = 5*2 + 5.5*6 = 43. cap = 5*8 - 3 = 37. 페어 0.5*6=3. 풀쿼터 5+5+5*6 = 40. 합 43.
  // 풀쿼터 needed = floor(5.5)*6 + 5*2 = 30 + 10 = 40. cap 37 < 40. 3 부족.
  players[3].quarters = 5; players[4].quarters = 5; players[5].quarters = 5;
  // 합 5*5 + 5.5*3 = 25+16.5 = 41.5. cap=5*8-1=39 (페어 1개 남음? 5.5 3명 → 페어 1개 + 외톨이). 페어 외 0.5 1개.
  // 다시 단순화: 모든 선수 정수 5. 합 5*7=35. cap=40. 5 부족 → 일부 쿼터 빈.
  for (let i = 1; i <= 8; i++) players[i].quarters = i <= 7 ? 5 : 5;
  // 7명 모두 5Q. 합 35. cap 40. 5 부족.
  // 이 케이스는 시간 합 < cap. 알고리즘이 빈 슬롯 채우려 해도 후보 부족.
  // 합리적 처리: 알고리즘 시도하다 후보 없으면 break. 빈 슬롯 발생 — 이는 시간 분배 단계에서 사용자가 더 채워야.
  // verify에서 슬롯 미달 잡힐 것. 이건 expected fail.
  const results = scheduleQuartersFutsalV3(players, 8, formation_6_2_2_1);
  console.log(`Case 13: 시간 < cap (35 vs 40) — 빈 슬롯 발생 expected`);
  if (verify("Case 13: 시간 부족 (예상 fail)", players, 8, formation_6_2_2_1, results)) passed++; else failed++;
}

// Case 14: 4명 (소수, 5인제 4쿼터)
{
  const formation_4_1_2 = {
    id: "futsal-4-1-2",
    slots: [
      { id: "gk", role: "GK", label: "GK" },
      { id: "fixo", role: "FIXO", label: "FIXO" },
      { id: "ala-l", role: "ALA", label: "ALA" },
      { id: "ala-r", role: "ALA", label: "ALA" },
    ],
  };
  const players = [
    { id: "gk", name: "GK", isGK: true, quarters: 4, prefs: ["GK"] },
    { id: "f", name: "F", isGK: false, quarters: 4, prefs: ["FIXO"] },
    { id: "a1", name: "A1", isGK: false, quarters: 4, prefs: ["ALA"] },
    { id: "a2", name: "A2", isGK: false, quarters: 4, prefs: ["ALA"] },
  ];
  const results = scheduleQuartersFutsalV3(players, 4, formation_4_1_2);
  if (verify("Case 14: 4인제 4명·4Q", players, 4, formation_4_1_2, results)) passed++; else failed++;
}

console.log(`\n결과: ${passed} pass / ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
