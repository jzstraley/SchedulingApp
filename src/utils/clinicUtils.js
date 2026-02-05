// src/utils/clinicUtils.js

// ---------- date helpers ----------
export const toNoon = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
};

export const daysBetweenInclusive = (start, end) => {
  const s = toNoon(start).getTime();
  const e = toNoon(end).getTime();
  return Math.floor((e - s) / (24 * 3600 * 1000)) + 1;
};

export const weeksInBlock = (blockStart, blockEnd) => {
  const len = daysBetweenInclusive(blockStart, blockEnd);
  // Week 2 starts at start+7, only include if it exists inside the block window
  return len >= 8 ? [1, 2] : [1];
};

export const isWithinBlock = (date, blockStart, blockEnd) => {
  const t = toNoon(date).getTime();
  const s = toNoon(blockStart).getTime();
  const e = toNoon(blockEnd).getTime();
  return t >= s && t <= e;
};

// blockStart-anchored week clinic date
// clinicDay: 1=Mon..5=Fri (matches JS getDay() for Mon-Fri)
export const getClinicDate = (blockStart, week, clinicDay) => {
  const weekStart = toNoon(blockStart);
  weekStart.setDate(weekStart.getDate() + (week - 1) * 7);

  const startDow = weekStart.getDay(); // 0=Sun..6=Sat
  const targetDow = clinicDay; // 1..5

  const delta = (targetDow - startDow + 7) % 7;
  const clinicDate = new Date(weekStart);
  clinicDate.setDate(weekStart.getDate() + delta);
  clinicDate.setHours(12, 0, 0, 0);
  return clinicDate;
};

export const getWeekRange = (blockStart, blockEnd, week) => {
  const s = toNoon(blockStart);
  s.setDate(s.getDate() + (week - 1) * 7);

  const e = new Date(s);
  e.setDate(e.getDate() + 6);

  const endClamp = toNoon(blockEnd);
  const displayEnd = e > endClamp ? endClamp : e;

  return { weekStart: s, weekEnd: displayEnd };
};

// ---------- optimizer ----------
export function optimizeClinicCoverage({
  fellows,
  schedule,
  clinicDays,
  pgyLevels,
  blockDates,
  cannotCoverRotations,
  firstYearExclusionBlocks = 4,
  pgy6ExclusionStartBlock = 21,
  targetPerFellow = 4,
  seed = 7,
  iters = 200,
  restarts = 3,
}) {
  // seeded RNG
  let s = (seed >>> 0) || 1;
  const rand = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const pickOne = (arr) => arr[Math.floor(rand() * arr.length)];

  // ---- build slots ----
  const slots = [];
  for (let blockIdx = 0; blockIdx < blockDates.length; blockIdx++) {
    const blockNum = blockIdx + 1;
    const blockInfo = blockDates[blockIdx];
    const blockStart = blockInfo.start;
    const blockEnd = blockInfo.end;

    if (!blockStart || !blockEnd) continue;

    const nightsFellow = fellows.find((f) => {
      const rot = schedule?.[f]?.[blockIdx] || "";
      return rot.toLowerCase() === "nights";
    });
    if (!nightsFellow) continue;

    const nightsClinicDay = clinicDays?.[nightsFellow] || 0;
    if (!nightsClinicDay) continue;

    for (const week of weeksInBlock(blockStart, blockEnd)) {
      const clinicDate = getClinicDate(blockStart, week, nightsClinicDay);
      if (!isWithinBlock(clinicDate, blockStart, blockEnd)) continue;

      slots.push({
        id: `${blockNum}-W${week}`,
        blockIdx,
        blockNum,
        week,
        blockStart,
        blockEnd,
        clinicDate,
        absent: nightsFellow,
        absentClinicDay: nightsClinicDay,
      });
    }
  }

  const initCounts = () => Object.fromEntries(fellows.map((f) => [f, 0]));

  const isOnBadRotation = (rot) => {
    const r = (rot || "").toLowerCase();
    return cannotCoverRotations.some((x) => x && r === String(x).toLowerCase());
  };

  const eligibleStrict = (slot, coverer, prevCoverer) => {
    if (!coverer || coverer === slot.absent) return false;

    const blockIdx = slot.blockIdx;
    const blockNum = slot.blockNum;

    const rot = schedule?.[coverer]?.[blockIdx] || "";
    if (isOnBadRotation(rot)) return false;

    const cd = clinicDays?.[coverer] || 0;
    if (cd && cd === slot.absentClinicDay) return false;

    const pgy = pgyLevels?.[coverer];
    if (pgy === 4 && blockNum <= firstYearExclusionBlocks) return false;
    if (pgy === 6 && blockNum >= pgy6ExclusionStartBlock) return false;

    if (prevCoverer && coverer === prevCoverer) return false;

    return true;
  };

  const eligibleRelaxB2B = (slot, coverer) => {
    if (!coverer || coverer === slot.absent) return false;

    const blockIdx = slot.blockIdx;
    const blockNum = slot.blockNum;

    const rot = schedule?.[coverer]?.[blockIdx] || "";
    if (isOnBadRotation(rot)) return false;

    const cd = clinicDays?.[coverer] || 0;
    if (cd && cd === slot.absentClinicDay) return false;

    const pgy = pgyLevels?.[coverer];
    if (pgy === 4 && blockNum <= firstYearExclusionBlocks) return false;
    if (pgy === 6 && blockNum >= pgy6ExclusionStartBlock) return false;

    return true;
  };

  const eligibleRelaxClinicDayAndB2B = (slot, coverer) => {
    if (!coverer || coverer === slot.absent) return false;

    const blockIdx = slot.blockIdx;
    const blockNum = slot.blockNum;

    const rot = schedule?.[coverer]?.[blockIdx] || "";
    if (isOnBadRotation(rot)) return false;

    const pgy = pgyLevels?.[coverer];
    if (pgy === 4 && blockNum <= firstYearExclusionBlocks) return false;
    if (pgy === 6 && blockNum >= pgy6ExclusionStartBlock) return false;

    return true;
  };

  const score = (assign) => {
    const counts = initCounts();
    let penalty = 0;

    // missing is catastrophic
    for (const a of assign) {
      if (!a.coverer) penalty += 5000;
      else counts[a.coverer]++;

      if (a.flags?.relaxedSameClinicDay) penalty += 150;
      if (a.flags?.relaxedBackToBack) penalty += 80;
    }

    // quadratic toward target
    for (const f of fellows) {
      const d = (counts[f] || 0) - targetPerFellow;
      penalty += d * d * 25;
    }

    // mild variance penalty
    const vals = fellows.map((f) => counts[f] || 0);
    const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, vals.length);
    penalty += variance * 10;

    return { penalty, counts };
  };

  const buildInitial = () => {
    const counts = initCounts();
    const assign = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const prevCoverer = i > 0 ? assign[i - 1]?.coverer : null;

      // 1) strict candidates
      let candidates = fellows.filter((f) => eligibleStrict(slot, f, prevCoverer));
      let flags = { relaxedBackToBack: false, relaxedSameClinicDay: false };

      // 2) relax back-to-back (only if needed)
      if (candidates.length === 0) {
        candidates = fellows.filter((f) => eligibleRelaxB2B(slot, f));
        flags.relaxedBackToBack = true;
      }

      // 3) relax clinic-day + b2b (only if needed)
      if (candidates.length === 0) {
        candidates = fellows.filter((f) => eligibleRelaxClinicDayAndB2B(slot, f));
        flags.relaxedBackToBack = true;
        flags.relaxedSameClinicDay = true;
      }

      if (candidates.length === 0) {
        assign.push({ coverer: null, flags: { noCoverage: true } });
        continue;
      }

      // quota-first, then least-loaded, random tie-break
      const under = candidates.filter((f) => (counts[f] || 0) < targetPerFellow);
      const pool = under.length ? under : candidates;

      pool.sort((a, b) => (counts[a] - counts[b]) || (rand() - 0.5));
      const coverer = pool[0];

      counts[coverer]++;
      assign.push({ coverer, flags });
    }

    return assign;
  };

  const randomMove = (assign) => {
    if (slots.length === 0) return { entries: [], counts: initCounts() };

    const i = Math.floor(rand() * slots.length);
    const slot = slots[i];
    const prevCoverer = i > 0 ? assign[i - 1]?.coverer : null;

    // try strict -> relax b2b -> relax clinic day
    let candidates = fellows.filter((f) => eligibleStrict(slot, f, prevCoverer));
    let flags = { relaxedBackToBack: false, relaxedSameClinicDay: false };

    if (candidates.length === 0) {
      candidates = fellows.filter((f) => eligibleRelaxB2B(slot, f));
      flags.relaxedBackToBack = true;
    }
    if (candidates.length === 0) {
      candidates = fellows.filter((f) => eligibleRelaxClinicDayAndB2B(slot, f));
      flags.relaxedBackToBack = true;
      flags.relaxedSameClinicDay = true;
    }
    if (candidates.length === 0) return null;

    const coverer = pickOne(candidates);
    const next = assign.slice();
    next[i] = { coverer, flags };
    return next;
  };

  let bestAssign = null;
  let bestScore = Infinity;
  let bestCounts = initCounts();

  for (let r = 0; r < restarts; r++) {
    let cur = buildInitial();
    let curEval = score(cur);

    for (let k = 0; k < iters; k++) {
      const next = randomMove(cur);
      if (!next) continue;

      const nextEval = score(next);
      if (nextEval.penalty <= curEval.penalty) {
        cur = next;
        curEval = nextEval;
      }
    }

    if (curEval.penalty < bestScore) {
      bestScore = curEval.penalty;
      bestAssign = cur;
      bestCounts = curEval.counts;
    }
  }

  const entries = slots.map((slot, i) => {
    const a = bestAssign?.[i] || { coverer: null, flags: { noCoverage: true } };
    const coverer = a.coverer || null;

    return {
      block: slot.blockNum,
      week: slot.week,
      blockStart: slot.blockStart,
      blockEnd: slot.blockEnd,
      clinicDate: slot.clinicDate,
      absent: slot.absent,
      absentRotation: "Nights",
      absentClinicDay: slot.absentClinicDay,
      absentPGY: pgyLevels?.[slot.absent],
      coverer,
      covererRotation: coverer ? schedule?.[coverer]?.[slot.blockIdx] : null,
      covererClinicDay: coverer ? clinicDays?.[coverer] : null,
      covererPGY: coverer ? pgyLevels?.[coverer] : null,
      status: coverer ? "OK" : "NO_COVERAGE",
      relaxedBackToBack: !!a.flags?.relaxedBackToBack,
      relaxedSameClinicDay: !!a.flags?.relaxedSameClinicDay,
    };
  });

  // IMPORTANT: counts only for actual covers (ignore null)
  const counts = initCounts();
  for (const e of entries) {
    if (e.coverer) counts[e.coverer] = (counts[e.coverer] || 0) + 1;
  }

  return { entries, counts, score: bestScore };
}
