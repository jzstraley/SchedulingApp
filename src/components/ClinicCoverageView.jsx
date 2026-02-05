// src/components/ClinicCoverageView.jsx
import React, { useMemo } from "react";
import { Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import {
  optimizeClinicCoverage,
  getWeekRange,
} from "../utils/clinicUtils";

// PGY-4 fellows who can't cover clinic in blocks 1-4 (first 8 weeks)
const FIRST_YEAR_EXCLUSION_BLOCKS = 4; // Blocks 1-4

const formatClinicDate = (date) =>
  date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export default function ClinicCoverageView({
  fellows,
  schedule,
  clinicDays,
  pgyLevels,
  blockDates,
}) {
    
const CANNOT_COVER_ROTATIONS = [
  "Cath","Cath 2","Cath 3","ICU","Floor A","Floor B","Nights","Vac","Vacation",""
];

    // Generate clinic coverage for all blocks - WEEKLY (2 per block)
  const clinicCoverage = useMemo(() => {
    return optimizeClinicCoverage({
      fellows,
      schedule,
      clinicDays,
      pgyLevels,
      blockDates,
      cannotCoverRotations: CANNOT_COVER_ROTATIONS,
      firstYearExclusionBlocks: FIRST_YEAR_EXCLUSION_BLOCKS,
      pgy6ExclusionStartBlock: 21,
      targetPerFellow: 4,
      seed: 7,
      iters: 200,
      restarts: 3,
    });
  }, [fellows, schedule, clinicDays, pgyLevels, blockDates]);

  const { entries: coverageEntries, counts: coverageStats } = clinicCoverage;

    // clinicDay: 1=Mon..5=Fri (matches JS getDay() for Mon-Fri)
  const clinicDayName = (day) => {
    const names = { 0: "None", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };
    return names[day] || "?";
  };

  const getRotationColor = (rot) => {
    if (!rot || rot === "") return "bg-gray-200 text-gray-500";
    const r = String(rot).toLowerCase();
    if (r === "nights") return "bg-black text-white";
    if (r === "icu") return "bg-red-600 text-white";
    if (r.includes("floor")) return "bg-orange-500 text-white";
    if (r.includes("cath")) return "bg-blue-500 text-white";
    if (r.includes("echo")) return "bg-cyan-500 text-white";
    if (r.includes("nuclear")) return "bg-yellow-400 text-gray-900";
    if (r === "ep") return "bg-green-500 text-white";
    if (r.includes("ai")) return "bg-purple-400 text-white";
    if (r.includes("research")) return "bg-pink-300 text-gray-900";
    if (r === "admin" || r === "spc") return "bg-gray-400 text-white";
    if (r === "structural") return "bg-teal-500 text-white";
    if (r === "vascular") return "bg-rose-500 text-white";
    if (r === "cts") return "bg-amber-600 text-white";
    return "bg-blue-200 text-gray-800";
  };

  const getPGYColor = (pgy) => {
    if (pgy === 4) return "bg-blue-100 text-blue-800 border-blue-300";
    if (pgy === 5) return "bg-green-100 text-green-800 border-green-300";
    if (pgy === 6) return "bg-purple-100 text-purple-800 border-purple-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const noCoverageCount = coverageEntries.filter((e) => !e.coverer).length;

  const statsByPGY = {
    4: fellows.filter((f) => pgyLevels[f] === 4),
    5: fellows.filter((f) => pgyLevels[f] === 5),
    6: fellows.filter((f) => pgyLevels[f] === 6),
  };

  const totalAssignments = coverageEntries.filter((e) => e.coverer).length;
  const targetTotal = fellows.length * 4;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded border-2 border-gray-400 p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm">
              <span className="font-bold">{coverageEntries.length}</span> weekly coverage slots
            </div>

            <div className="text-sm text-gray-600">
              Assigned: <span className="font-bold">{totalAssignments}</span> (Target total:{" "}
              <span className="font-bold">{targetTotal}</span>)
            </div>

            {noCoverageCount > 0 ? (
              <div className="flex items-center gap-1 text-red-600 text-sm font-bold">
                <AlertTriangle className="w-4 h-4" />
                {noCoverageCount} missing
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <CheckCircle className="w-4 h-4" />
                All covered
              </div>
            )}
          </div>

          <div className="text-[10px] text-gray-500">
            Optimized toward 4 per fellow, relaxations flagged
          </div>
        </div>
      </div>

      {/* Coverage Table */}
      <div className="bg-white rounded border-2 border-gray-400 overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b-2 border-gray-400">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Weekly Clinic Coverage for Nights
          </h3>
          <p className="text-[10px] text-gray-600 mt-1">
            Week slots are blockStart-anchored and clamped to block end dates
          </p>
        </div>

        <div
          className="overflow-x-auto max-h-[400px] overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <table className="min-w-full text-[10px]">
            <thead className="sticky top-0 bg-gray-200 z-10">
              <tr className="border-b border-gray-400">
                <th className="px-2 py-2 text-left font-bold">Blk</th>
                <th className="px-2 py-2 text-left font-bold">Week</th>
                <th className="px-2 py-2 text-left font-bold">On Nights</th>
                <th className="px-2 py-2 text-left font-bold">Clinic Date</th>
                <th className="px-2 py-2 text-center font-bold">→</th>
                <th className="px-2 py-2 text-left font-bold">Covered By</th>
                <th className="px-2 py-2 text-left font-bold">Their Rot</th>
                <th className="px-2 py-2 text-center font-bold">PGY</th>
                <th className="px-2 py-2 text-center font-bold">#</th>
              </tr>
            </thead>

            <tbody>
              {coverageEntries.map((entry, idx) => {
                const rowBg = !entry.coverer
                  ? "bg-red-50"
                  : entry.relaxedSameClinicDay
                  ? "bg-yellow-50"
                  : entry.relaxedBackToBack
                  ? "bg-amber-50"
                  : idx % 2 === 0
                  ? "bg-white"
                  : "bg-gray-50";

                const { weekStart, weekEnd } = getWeekRange(
                  entry.blockStart,
                  entry.blockEnd,
                  entry.week
                );

                const clinicDate = entry.clinicDate;

                const count = entry.coverer ? (coverageStats?.[entry.coverer] || 0) : null;

                return (
                  <tr key={idx} className={`border-b border-gray-200 ${rowBg}`}>
                    <td className="px-2 py-2 font-bold">{entry.block}</td>

                    <td className="px-2 py-2 text-gray-600">
                      <div className="flex items-center gap-1">
                        <div>W{entry.week}</div>
                        {entry.relaxedSameClinicDay && (
                          <span className="px-1 rounded text-[8px] font-bold bg-yellow-200 text-yellow-900">
                            RELAX
                          </span>
                        )}
                        {!entry.relaxedSameClinicDay && entry.relaxedBackToBack && (
                          <span className="px-1 rounded text-[8px] font-bold bg-amber-200 text-amber-900">
                            B2B
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] text-gray-400">
                        {`${weekStart.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}-${weekEnd.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`}
                      </div>
                    </td>

                    <td className="px-2 py-2">
                      <span className="font-semibold">{entry.absent}</span>
                      <span
                        className={`ml-1 px-1 py-0.5 rounded text-[8px] font-semibold ${getRotationColor(
                          "Nights"
                        )}`}
                      >
                        Nts
                      </span>
                    </td>

                    <td className="px-2 py-2 text-left text-gray-700">
                      <div className="font-semibold">{clinicDayName(entry.absentClinicDay)}</div>
                      <div className="text-[8px] text-gray-500">{formatClinicDate(clinicDate)}</div>
                    </td>

                    <td className="px-2 py-2 text-center text-gray-400">→</td>

                    <td className="px-2 py-2">
                      {entry.coverer ? (
                        <span>
                          <span className="font-semibold">{entry.coverer}</span>
                          <span className="text-[8px] text-gray-400 ml-1">
                            ({clinicDayName(entry.covererClinicDay)})
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          NONE
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-2">
                      {entry.covererRotation ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${getRotationColor(
                            entry.covererRotation
                          )}`}
                        >
                          {entry.covererRotation}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-2 py-2 text-center">
                      {entry.covererPGY ? (
                        <span
                          className={`px-1 py-0.5 rounded text-[8px] font-bold border ${getPGYColor(
                            entry.covererPGY
                          )}`}
                        >
                          {entry.covererPGY}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-2 py-2 text-center font-bold text-gray-600">
                      {entry.coverer ? count : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coverage Stats by PGY */}
      <div className="bg-white rounded border-2 border-gray-400 overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b-2 border-gray-400">
          <h3 className="font-bold text-sm">Coverage Load Distribution</h3>
          <p className="text-[10px] text-gray-600">Target: 4 per fellow</p>
        </div>

        <div className="p-3 space-y-3">
          {[4, 5, 6].map((pgy) => (
            <div key={pgy}>
              <div className="text-[10px] font-bold text-gray-500 mb-1">PGY-{pgy}</div>
              <div className="flex flex-wrap gap-2">
                {statsByPGY[pgy].map((fellow) => {
                  const count = coverageStats?.[fellow] || 0;
                  const isOverTarget = count > 4;
                  const isUnderTarget = count < 4;

                  return (
                    <div
                      key={fellow}
                      className={`px-3 py-2 rounded border-2 min-w-[110px] ${
                        isOverTarget
                          ? "bg-red-50 border-red-300"
                          : isUnderTarget
                          ? "bg-yellow-50 border-yellow-300"
                          : getPGYColor(pgy)
                      }`}
                    >
                      <div className="font-semibold text-xs">{fellow}</div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-xl font-bold ${
                            isOverTarget ? "text-red-600" : isUnderTarget ? "text-yellow-600" : ""
                          }`}
                        >
                          {count}
                        </span>
                        <span className="text-[9px] text-gray-500">covers</span>
                      </div>
                      <div className="text-[8px] text-gray-500">
                        Clinic: {clinicDayName(clinicDays[fellow])}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <div className="text-[10px] text-gray-600">
            <span className="font-bold">Rules:</span> PGY-4s excluded blocks 1-4 • PGY-6s excluded blocks 21+ •
            B2B avoided unless needed • Same clinic day avoided unless needed
          </div>
        </div>
      </div>
    </div>
  );
}
