// src/components/ScheduleView.jsx
import React, { useMemo, useState } from "react";
import { blockDates, pgyLevels } from "../data/scheduleData";
import {
  getRotationColor,
  getPGYColor,
  getBlockDisplay,
  formatDate,
} from "../utils/scheduleUtils";

const isBlockInVacation = (vacations, fellow, blockNumber) => {
  return vacations.some(
    (v) =>
      v.fellow === fellow &&
      v.reason === "Vacation" &&
      blockNumber >= v.startBlock &&
      blockNumber <= v.endBlock
  );
};

const toggleVacationBlock = (vacations, fellow, blockNumber) => {
  const expanded = new Set();

  vacations.forEach((v) => {
    if (v.fellow !== fellow || v.reason !== "Vacation") return;
    for (let b = v.startBlock; b <= v.endBlock; b++) expanded.add(b);
  });

  if (expanded.has(blockNumber)) expanded.delete(blockNumber);
  else expanded.add(blockNumber);

  const sorted = Array.from(expanded).sort((a, b) => a - b);
  const others = vacations.filter(
    (v) => !(v.fellow === fellow && v.reason === "Vacation")
  );

  const nextRanges = [];
  let start = null;
  let prev = null;

  for (const b of sorted) {
    if (start === null) {
      start = b;
      prev = b;
      continue;
    }
    if (b === prev + 1) {
      prev = b;
      continue;
    }
    nextRanges.push({
      fellow,
      startBlock: start,
      endBlock: prev,
      reason: "Vacation",
    });
    start = b;
    prev = b;
  }
  if (start !== null)
    nextRanges.push({
      fellow,
      startBlock: start,
      endBlock: prev,
      reason: "Vacation",
    });

  return [...others, ...nextRanges];
};

const PGYDividerRow = ({ pgy, colSpan }) => (
  <tr>
    <td
      colSpan={colSpan}
      className="sticky left-0 z-20 bg-white dark:bg-gray-800 border-y-2 border-gray-400 dark:border-gray-600 px-2 py-1 text-xs font-extrabold text-gray-700 dark:text-gray-200"
    >
      PGY-{pgy}
    </td>
  </tr>
);

export default function ScheduleView({
  fellows,
  schedule,
  vacations,
  onScheduleChange,
  onVacationsChange,
}) {
  const [draggedCell, setDraggedCell] = useState(null);
  const [validationWarning, setValidationWarning] = useState(null);
  const [vacMode, setVacMode] = useState(false);
  const [mouseDown, setMouseDown] = useState(false);

  // Mobile: tap-to-select mode
  const [selectedCell, setSelectedCell] = useState(null);

  // Highlight state
  const [highlight, setHighlight] = useState(null);
  // { type: "fellow", fellow } | { type: "rotation", rotation } | { type: "col", idx }

  const toggleHighlight = (next) => {
    setHighlight((prev) => {
      if (!prev) return next;
      const same =
        prev.type === next.type &&
        prev.fellow === next.fellow &&
        prev.rotation === next.rotation &&
        prev.idx === next.idx;
      return same ? null : next;
    });
  };

  const isRowHot = (f) => highlight?.type === "fellow" && highlight.fellow === f;
  const isColHot = (i) => highlight?.type === "col" && highlight.idx === i;
  const isRotHot = (r) =>
    highlight?.type === "rotation" && highlight.rotation === r;

  const rotationGroups = useMemo(() => {
    const groups = [];
    let currentRotation = null;
    let startIdx = 0;

    blockDates.forEach((bd, idx) => {
      if (bd.rotation !== currentRotation) {
        if (currentRotation !== null) {
          groups.push({
            rotation: currentRotation,
            start: startIdx,
            end: idx - 1,
          });
        }
        currentRotation = bd.rotation;
        startIdx = idx;
      }
    });
    groups.push({
      rotation: currentRotation,
      start: startIdx,
      end: blockDates.length - 1,
    });
    return groups;
  }, []);

  // Touch detection (safe)
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // Precompute vacation set for O(1) checks: keys like "Fellow#blockNumber"
  const vacationSet = useMemo(() => {
    const s = new Set();
    (vacations || []).forEach((v) => {
      if (v.reason !== "Vacation") return;
      for (let b = v.startBlock; b <= v.endBlock; b++) {
        s.add(`${v.fellow}#${b}`);
      }
    });
    return s;
  }, [vacations]);

  const isBlockInVacationFast = (fellow, blockNumber) => vacationSet.has(`${fellow}#${blockNumber}`);

  const handleDragStart = (fellow, blockIdx) => {
    if (vacMode) return;

    const blockNumber = blockIdx + 1;
    if (isBlockInVacationFast(fellow, blockNumber)) {
      setValidationWarning(
        "Can't drag a vacation block. Toggle Vacation Mode to edit vacation."
      );
      return;
    }

    setDraggedCell({ fellow, blockIdx });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetFellow, targetBlockIdx) => {
    if (vacMode) return;
    if (!draggedCell) return;

    const fromBlockNumber = draggedCell.blockIdx + 1;
    const toBlockNumber = targetBlockIdx + 1;

    const fromIsVac = isBlockInVacationFast(draggedCell.fellow, fromBlockNumber);
    const toIsVac = isBlockInVacationFast(targetFellow, toBlockNumber);

    if (fromIsVac || toIsVac) {
      setValidationWarning(
        "Can't swap into or out of a vacation block. Toggle Vacation Mode to change vacation."
      );
      setDraggedCell(null);
      return;
    }

    const newSchedule = { ...schedule };
    newSchedule[draggedCell.fellow] = [...newSchedule[draggedCell.fellow]];
    newSchedule[targetFellow] = [...newSchedule[targetFellow]];

    const temp = newSchedule[draggedCell.fellow][draggedCell.blockIdx];
    newSchedule[draggedCell.fellow][draggedCell.blockIdx] =
      newSchedule[targetFellow][targetBlockIdx];
    newSchedule[targetFellow][targetBlockIdx] = temp;

    onScheduleChange(newSchedule);
    setDraggedCell(null);
    setValidationWarning(null);
  };

  // Mobile: tap to select, tap again to swap
  const handleCellTap = (fellow, blockIdx) => {
    if (vacMode) return;

    const blockNumber = blockIdx + 1;
    const isVac = isBlockInVacationFast(fellow, blockNumber);

    if (isVac) {
      setValidationWarning(
        "Can't select a vacation block. Toggle Vacation Mode to edit vacation."
      );
      return;
    }

    if (!selectedCell) {
      setSelectedCell({ fellow, blockIdx });
      setValidationWarning(null);
    } else if (selectedCell.fellow === fellow && selectedCell.blockIdx === blockIdx) {
      setSelectedCell(null);
    } else {
      const fromIsVac = isBlockInVacationFast(selectedCell.fellow, selectedCell.blockIdx + 1);
      const toIsVac = isBlockInVacationFast(fellow, blockNumber);

      if (fromIsVac || toIsVac) {
        setValidationWarning("Can't swap into or out of a vacation block.");
        setSelectedCell(null);
        return;
      }

      const newSchedule = { ...schedule };
      newSchedule[selectedCell.fellow] = [...newSchedule[selectedCell.fellow]];
      newSchedule[fellow] = [...newSchedule[fellow]];

      const temp = newSchedule[selectedCell.fellow][selectedCell.blockIdx];
      newSchedule[selectedCell.fellow][selectedCell.blockIdx] =
        newSchedule[fellow][blockIdx];
      newSchedule[fellow][blockIdx] = temp;

      onScheduleChange(newSchedule);
      setSelectedCell(null);
      setValidationWarning(null);
    }
  };

  const paintVacation = (fellow, blockIdx) => {
    if (!onVacationsChange) {
      setValidationWarning(
        "Vacation editing is not wired. Pass onVacationsChange from App."
      );
      return;
    }
    const blockNumber = blockIdx + 1;
    const next = toggleVacationBlock(vacations, fellow, blockNumber);
    onVacationsChange(next);
  };

  const handleCellMouseDown = (fellow, idx) => {
    if (!vacMode) return;
    setMouseDown(true);
    paintVacation(fellow, idx);
  };

  const handleCellMouseEnter = (fellow, idx) => {
    if (!vacMode) return;
    if (!mouseDown) return;
    paintVacation(fellow, idx);
  };

  const handleMouseUpAnywhere = () => {
    if (mouseDown) setMouseDown(false);
  };

  // Group fellows by PGY
  const fellowsByPGY = useMemo(
    () => ({
      4: fellows.filter((f) => pgyLevels[f] === 4),
      5: fellows.filter((f) => pgyLevels[f] === 5),
      6: fellows.filter((f) => pgyLevels[f] === 6),
    }),
    [fellows]
  );

  const colSpan = 1 + blockDates.length;

  const renderFellowRow = (fellow, isLastInGroup) => {
    const pgy = pgyLevels[fellow];

    const hotRow = isRowHot(fellow);
    const fadeRow = highlight && !hotRow && highlight.type === "fellow";

    return (
      <tr
        key={fellow}
        className={`border-b ${
          isLastInGroup ? "border-b-4 border-gray-400" : "border-gray-300"
        } hover:bg-gray-50 ${fadeRow ? "opacity-40" : "opacity-100"}`}
      >
        <td
          className={`sticky left-0 z-10 bg-white border-r-2 border-gray-400 px-2 py-1 font-semibold text-gray-800 border-l-4 ${getPGYColor(
            pgy
          )} cursor-pointer ${hotRow ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => {
            if (vacMode) return;
            setSelectedCell(null);
            setDraggedCell(null);
            setValidationWarning(null);
            toggleHighlight({ type: "fellow", fellow });
          }}
          title="Click to highlight this fellow (click again to clear)"
        >
          <div className="flex items-center gap-1">
            <span className="truncate">{fellow}</span>
            <span className="text-[8px] text-gray-500">PGY{pgy}</span>
          </div>
        </td>

        {schedule[fellow]?.map((rot, idx) => {
          const blockNumber = idx + 1;
          const isVac = isBlockInVacationFast(fellow, blockNumber);
          const isSelected =
            selectedCell?.fellow === fellow && selectedCell?.blockIdx === idx;

          const hotCol = isColHot(idx);
          const hotRot = isRotHot(rot);

          const hotCell =
            (highlight?.type === "fellow" && hotRow) ||
            (highlight?.type === "col" && hotCol) ||
            (highlight?.type === "rotation" && hotRot);

          const fadeCell = highlight && !hotCell;

          const vacOverlay = vacMode && isVac ? "ring-2 ring-red-600" : "";
          const selectedOverlay = isSelected
            ? "ring-2 ring-blue-500 scale-105"
            : "";

          // Vacation styling: muted gradient + watermark name
          const vacStyle = isVac
            ? "bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-200 opacity-95"
            : "";

          return (
            <td
              key={idx}
              className={`border-r border-gray-200 dark:border-gray-700 px-0.5 py-0.5 text-center transition-opacity ${
                fadeCell ? "opacity-30" : "opacity-100"
              } ${
                vacMode
                  ? "cursor-crosshair"
                  : isVac
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              draggable={!vacMode && !isVac && !isTouchDevice}
              onDragStart={() => handleDragStart(fellow, idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(fellow, idx)}
              onMouseDown={() => handleCellMouseDown(fellow, idx)}
              onMouseEnter={() => handleCellMouseEnter(fellow, idx)}
              onClick={() => isTouchDevice && handleCellTap(fellow, idx)}
            >
              <div
                className={`relative px-1 py-1 rounded text-[9px] font-semibold whitespace-nowrap transition-all ${
                  isVac ? "" : getRotationColor(rot)
                } ${vacStyle} ${vacOverlay} ${selectedOverlay} ${
                  hotRot ? "ring-2 ring-amber-400" : ""
                } ${hotCol ? "outline outline-1 outline-gray-500" : ""}`}
                title={
                  vacMode
                    ? "Click or click-drag to toggle vacation for this block"
                    : isTouchDevice
                    ? "Tap to select, tap another to swap"
                    : "Drag to swap. Click cell to highlight this rotation."
                }
                onClick={(e) => {
                  if (isTouchDevice) return;
                  if (vacMode) return;
                  if (draggedCell) return;
                  setSelectedCell(null);
                  setValidationWarning(null);
                  toggleHighlight({ type: "rotation", rotation: rot });
                  e.stopPropagation();
                }}
              >
                <div className="relative">
                  {getBlockDisplay(fellow, idx, schedule, vacations)}
                </div>
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div
      className="space-y-2"
      onMouseUp={handleMouseUpAnywhere}
      onMouseLeave={handleMouseUpAnywhere}
    >
      {validationWarning && (
        <div className="bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-700 rounded p-2 text-xs text-red-800 dark:text-red-200">
          ⚠️ {validationWarning}
        </div>
      )}

      {selectedCell && (
        <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded p-2 text-xs text-blue-800 dark:text-blue-200">
          📍 Selected: {selectedCell.fellow} Block {selectedCell.blockIdx + 1} —
          Tap another cell to swap
        </div>
      )}

      {highlight && (
        <div className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded p-2 text-xs text-gray-800 dark:text-gray-200 flex items-center justify-between gap-2">
          <div className="truncate">
            🔦 Highlighting:{" "}
            {highlight.type === "fellow" && `Fellow ${highlight.fellow}`}
            {highlight.type === "rotation" && `Rotation ${highlight.rotation}`}
            {highlight.type === "col" && `Block ${highlight.idx + 1}`}
            <span className="ml-2 text-[10px] text-gray-500 dark:text-gray-400">
              (click again to clear)
            </span>
          </div>
          <button
            type="button"
            className="px-2 py-1 text-[10px] font-semibold rounded border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
            onClick={() => setHighlight(null)}
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
          {isTouchDevice
            ? "Tap to select, tap another to swap."
            : "Drag to swap rotations. Click a name, header, or cell to highlight."}{" "}
          Toggle Vacation Mode to paint vacation blocks.
        </div>

        <button
          type="button"
          onClick={() => {
            setVacMode((v) => !v);
            setDraggedCell(null);
            setSelectedCell(null);
            setHighlight(null);
            setValidationWarning(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded border min-h-[44px] ${
            vacMode
              ? "bg-red-600 text-white border-red-700"
              : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
          }`}
          title="When on, click-drag cells to mark vacation blocks"
        >
          {vacMode ? "Vacation Mode: ON" : "Vacation Mode: OFF"}
        </button>
      </div>

      <div className="bg-white rounded border-2 border-gray-400 overflow-hidden">
        {/* One long table: vertical + horizontal scrolling */}
        <div
          className="overflow-auto max-h-[calc(100vh-260px)]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <table className="min-w-full text-[10px] border-separate border-spacing-0">
            <thead>
              {/* Rotation groups header row (sticky) */}
              <tr className="bg-gray-100 sticky top-0 z-30">
                <th className="sticky top-0 left-0 z-40 bg-gray-100 border-r-2 border-gray-400 px-2 py-1 w-24 min-w-[96px]"></th>
                {rotationGroups.map((group, idx) => (
                  <th
                    key={idx}
                    colSpan={group.end - group.start + 1}
                    className="sticky top-0 z-30 bg-gray-100 border-r-2 border-gray-400 px-1 py-1 text-center font-bold"
                  >
                    Rot {group.rotation}
                  </th>
                ))}
              </tr>

              {/* Block header row (sticky under first header row) */}
              <tr className="bg-gray-200 dark:bg-gray-700 border-b-2 border-gray-400 dark:border-gray-600 sticky top-[26px] z-30">
                <th className="sticky left-0 top-[26px] z-40 bg-gray-200 dark:bg-gray-700 border-r-2 border-gray-400 dark:border-gray-600 px-2 py-1 text-left font-bold min-w-[96px] dark:text-gray-100">
                  Fellow
                </th>
                {blockDates.map((bd, i) => (
                  <th
                    key={i}
                    onClick={() => {
                      if (vacMode) return;
                      setSelectedCell(null);
                      setDraggedCell(null);
                      setValidationWarning(null);
                      toggleHighlight({ type: "col", idx: i });
                    }}
                    className={`sticky top-[26px] z-30 bg-gray-200 dark:bg-gray-700 border-r border-gray-300 dark:border-gray-600 px-1 py-1 text-center min-w-[60px] cursor-pointer ${
                      isColHot(i) ? "ring-2 ring-blue-500" : ""
                    }`}
                    title="Click to highlight this block column (click again to clear)"
                  >
                    <div className="font-bold dark:text-gray-100">{bd.block}</div>
                    <div className="text-[8px] text-gray-700 dark:text-gray-300 whitespace-nowrap font-semibold">
                      {formatDate(bd.start)}-{formatDate(bd.end)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <PGYDividerRow pgy={4} colSpan={colSpan} />
              {fellowsByPGY[4].map((fellow, idx) =>
                renderFellowRow(fellow, idx === fellowsByPGY[4].length - 1)
              )}

              <PGYDividerRow pgy={5} colSpan={colSpan} />
              {fellowsByPGY[5].map((fellow, idx) =>
                renderFellowRow(fellow, idx === fellowsByPGY[5].length - 1)
              )}

              <PGYDividerRow pgy={6} colSpan={colSpan} />
              {fellowsByPGY[6].map((fellow, idx) =>
                renderFellowRow(fellow, idx === fellowsByPGY[6].length - 1)
              )}
            </tbody>
          </table>
        </div>

        {vacMode && (
          <div className="px-3 py-2 border-t border-gray-200 text-[10px] text-gray-700 bg-gray-50">
            Vacation Mode is ON. Click or click-drag blocks to toggle vacation.
            Vacation ranges will auto-compress.
          </div>
        )}
      </div>
    </div>
  );
}
