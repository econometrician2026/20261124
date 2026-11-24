import { COURSES } from '../game/courses';
import {
  formatParDelta,
  getChampionshipRank,
  getWoodballScoreTerm,
} from '../game/physics';
import type { HoleScoreRecord } from '../game/types';
import { WoodballEmblem } from './WoodballEmblem';

interface PauseModalProps {
  courseId: number;
  courseName: string;
  strokes: number;
  par: number;
  totalStrokes: number;
  totalParCompleted: number;
  onResume: () => void;
  onRestartFairway: () => void;
  onReturnTitle: () => void;
}

export function PauseModal({
  courseId,
  courseName,
  strokes,
  par,
  totalStrokes,
  totalParCompleted,
  onResume,
  onRestartFairway,
  onReturnTitle,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0b140e]/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-[#1e1711] border border-[#d4a34a]/50 shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-6">
        <h2 id="pause-title" className="font-display text-2xl font-bold text-[#faf4e6]">
          比賽暫停
        </h2>
        <p className="mt-1 text-sm text-[#c9bca2]">
          第 {courseId} 道・{courseName}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2.5 border-y border-[#e8d8b5]/15 py-4">
          <div>
            <div className="text-xs text-[#b8ab92]">本道桿數</div>
            <div className="font-mono-num text-xl font-bold text-[#fff8e8] mt-0.5">{strokes}</div>
          </div>
          <div>
            <div className="text-xs text-[#b8ab92]">標準桿</div>
            <div className="font-mono-num text-xl font-bold text-[#e5cfa0] mt-0.5">{par}</div>
          </div>
          <div>
            <div className="text-xs text-[#b8ab92]">累計成績</div>
            <div className="font-mono-num text-xl font-bold text-[#f2c864] mt-0.5">
              {formatParDelta(totalStrokes, totalParCompleted)}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-lg bg-[#d4a34a] hover:bg-[#e3b55c] text-[#1c140b] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            繼續比賽
          </button>
          <button
            type="button"
            onClick={onRestartFairway}
            className="w-full py-2.5 rounded-lg bg-[#2b2118] hover:bg-[#382b20] text-[#f4ead4] font-medium text-sm border border-[#e8d8b5]/18 transition-colors cursor-pointer whitespace-nowrap"
          >
            重打本道
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 rounded-lg bg-transparent hover:bg-[#2b2118]/70 text-[#cbbda0] hover:text-[#faf4e6] font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            返回主選單
          </button>
        </div>
      </div>
    </div>
  );
}

interface HoleClearModalProps {
  courseIndex: number;
  courseName: string;
  par: number;
  strokes: number;
  exceededMax: boolean;
  scores: HoleScoreRecord[];
  onNextCourse: () => void;
  onRetryCourse: () => void;
}

export function HoleClearModal({
  courseIndex,
  courseName,
  par,
  strokes,
  exceededMax,
  scores,
  onNextCourse,
  onRetryCourse,
}: HoleClearModalProps) {
  const term = getWoodballScoreTerm(strokes, par, exceededMax);
  const completedStrokes = scores.reduce((acc, s) => acc + (s.completed ? s.strokes : 0), 0);
  const completedPar = scores.reduce((acc, s) => acc + (s.completed ? s.par : 0), 0);
  const nextCourse = COURSES[courseIndex + 1];

  const accentColor =
    term.tone === 'gold'
      ? 'text-[#f6cf66]'
      : term.tone === 'emerald'
        ? 'text-[#6de08c]'
        : term.tone === 'amber'
          ? 'text-[#f0a868]'
          : 'text-[#faf4e6]';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0b140e]/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hole-clear-title"
    >
      <div className="w-full max-w-md rounded-xl bg-[#1e1711] border border-[#d4a34a]/55 shadow-[0_22px_54px_rgba(0,0,0,0.68)] p-6">
        <div className="text-xs font-medium text-[#cbbda0]">
          第 {courseIndex + 1} 道完賽 · {courseName}
        </div>
        <h2
          id="hole-clear-title"
          className={`font-display text-3xl font-black mt-1 ${accentColor}`}
        >
          {term.title}
        </h2>
        <p className="text-sm text-[#d9cfb9] mt-1">{term.subtitle}</p>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-[#e8d8b5]/15 py-4">
          <div>
            <div className="text-xs text-[#b8ab92]">本道桿數</div>
            <div className="font-mono-num text-2xl font-bold text-[#fff8e8] mt-0.5">{strokes}</div>
          </div>
          <div>
            <div className="text-xs text-[#b8ab92]">標準桿</div>
            <div className="font-mono-num text-2xl font-bold text-[#dfd2b5] mt-0.5">{par}</div>
          </div>
          <div>
            <div className="text-xs text-[#b8ab92]">累計成績</div>
            <div className="font-mono-num text-2xl font-bold text-[#f2c864] mt-0.5">
              {formatParDelta(completedStrokes, completedPar)}
            </div>
          </div>
        </div>

        {/* Mini 6-Hole Progress Strip */}
        <div className="mt-4 grid grid-cols-6 gap-1.5 text-center">
          {scores.map((rec, idx) => (
            <div
              key={rec.courseId}
              className={`rounded-md py-1.5 px-1 border ${
                idx === courseIndex
                  ? 'bg-[#2a5e3b] border-[#d4a34a]'
                  : rec.completed
                    ? 'bg-[#282018] border-[#e8d8b5]/16'
                    : 'bg-[#17120d] border-[#e8d8b5]/8 opacity-65'
              }`}
            >
              <div className="text-[10px] text-[#cbbda0] font-mono-num">H{rec.courseId}</div>
              <div className="font-mono-num text-sm font-bold text-[#faf4e6]">
                {rec.completed ? rec.strokes : '—'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onNextCourse}
            className="flex-1 py-3 px-4 rounded-lg bg-[#d4a34a] hover:bg-[#e3b55c] text-[#1c140b] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {nextCourse ? `進入第 ${nextCourse.id} 道・${nextCourse.name}` : '查看總成績單'}
          </button>
          <button
            type="button"
            onClick={onRetryCourse}
            className="py-3 px-4 rounded-lg bg-[#2b2118] hover:bg-[#382b20] text-[#f2e8d2] font-medium text-sm border border-[#e8d8b5]/18 transition-colors cursor-pointer whitespace-nowrap"
          >
            重打本道
          </button>
        </div>
      </div>
    </div>
  );
}

interface ScorecardModalProps {
  scores: HoleScoreRecord[];
  currentCourseIndex: number;
  onClose: () => void;
}

export function ScorecardModal({ scores, currentCourseIndex, onClose }: ScorecardModalProps) {
  const completedStrokes = scores.reduce((acc, s) => acc + (s.completed ? s.strokes : 0), 0);
  const completedPar = scores.reduce((acc, s) => acc + (s.completed ? s.par : 0), 0);
  const totalPar = scores.reduce((acc, s) => acc + s.par, 0);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0b140e]/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorecard-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#1e1711] border border-[#d4a34a]/50 shadow-[0_22px_54px_rgba(0,0,0,0.68)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="scorecard-title" className="font-display text-2xl font-bold text-[#faf4e6]">
              錦標賽記分卡
            </h2>
            <div className="text-xs text-[#cbbda0] mt-0.5">
              總標準桿 {totalPar} · 目前差桿 {formatParDelta(completedStrokes, completedPar)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-[#2b2118] hover:bg-[#382b20] text-[#f4ead4] text-xs font-medium border border-[#e8d8b5]/20 cursor-pointer whitespace-nowrap"
          >
            關閉
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e8d8b5]/20 text-xs text-[#b8ab92]">
                <th className="py-2 pr-2 font-medium">球道</th>
                <th className="py-2 px-2 font-medium text-right">標準桿</th>
                <th className="py-2 px-2 font-medium text-right">桿數</th>
                <th className="py-2 pl-2 font-medium text-right">差桿</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8d8b5]/10">
              {scores.map((rec, idx) => {
                const diff = rec.completed ? rec.strokes - rec.par : null;
                return (
                  <tr
                    key={rec.courseId}
                    className={idx === currentCourseIndex ? 'bg-[#2a5e3b]/35' : ''}
                  >
                    <td className="py-2.5 pr-2 text-[#f4ead4] font-medium whitespace-nowrap">
                      第 {rec.courseId} 道・{rec.courseName}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num text-[#cbbda0]">
                      {rec.par}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num font-bold text-[#fff8e8]">
                      {rec.completed ? rec.strokes : '—'}
                    </td>
                    <td
                      className={`py-2.5 pl-2 text-right font-mono-num font-bold ${
                        diff === null
                          ? 'text-[#7f7460]'
                          : diff < 0
                            ? 'text-[#6de08c]'
                            : diff === 0
                              ? 'text-[#e5cfa0]'
                              : 'text-[#f0a868]'
                      }`}
                    >
                      {diff === null ? '—' : diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ChampionshipVictoryModalProps {
  scores: HoleScoreRecord[];
  bestTotalStrokes: number | null;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

export function ChampionshipVictoryModal({
  scores,
  bestTotalStrokes,
  isNewBest,
  onPlayAgain,
  onReturnTitle,
}: ChampionshipVictoryModalProps) {
  const totalStrokes = scores.reduce((acc, s) => acc + s.strokes, 0);
  const totalPar = scores.reduce((acc, s) => acc + s.par, 0);
  const gateInOnes = scores.filter((s) => s.gateInOne).length;
  const rank = getChampionshipRank(totalStrokes, totalPar);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0b140e]/80 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#1e1711] border border-[#d4a34a]/60 shadow-[0_24px_60px_rgba(0,0,0,0.72)] p-6">
        <div className="flex items-center gap-4">
          <WoodballEmblem className="w-14 h-14 shrink-0" />
          <div>
            <div className="text-xs font-medium text-[#d4a34a]">
              翠嶺木球錦標賽完賽{isNewBest ? ' · 刷新個人最佳紀錄' : ''}
            </div>
            <h2 id="victory-title" className="font-display text-3xl font-black text-[#faf4e6]">
              {rank.title}
            </h2>
            <p className="text-sm text-[#cbbda0] mt-0.5">{rank.description}</p>
          </div>
        </div>

        {/* Summary Mastery Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-[#e8d8b5]/15 py-4">
          <div>
            <div className="text-xs text-[#b8ab92]">總桿數</div>
            <div className="font-mono-num text-2xl font-bold text-[#fff8e8] mt-0.5">
              {totalStrokes}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#b8ab92]">總差桿 (PAR {totalPar})</div>
            <div className="font-mono-num text-2xl font-bold text-[#f2c864] mt-0.5">
              {formatParDelta(totalStrokes, totalPar)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#b8ab92]">歷史最佳</div>
            <div className="font-mono-num text-2xl font-bold text-[#6de08c] mt-0.5">
              {bestTotalStrokes ?? totalStrokes} 桿
            </div>
          </div>
        </div>

        {gateInOnes > 0 && (
          <div className="mt-3 text-xs font-bold text-[#f6cf66]">
            本場達成 {gateInOnes} 次「一桿過門」傳奇擊球
          </div>
        )}

        {/* Full 6-Hole Scorecard Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#e8d8b5]/20 text-xs text-[#b8ab92]">
                <th className="py-1.5 pr-2 font-medium">球道</th>
                <th className="py-1.5 px-2 font-medium text-right">標準桿</th>
                <th className="py-1.5 px-2 font-medium text-right">桿數</th>
                <th className="py-1.5 pl-2 font-medium text-right">差桿</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8d8b5]/10">
              {scores.map((rec) => {
                const diff = rec.strokes - rec.par;
                return (
                  <tr key={rec.courseId}>
                    <td className="py-2 pr-2 text-[#f4ead4] font-medium whitespace-nowrap">
                      第 {rec.courseId} 道・{rec.courseName}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-num text-[#cbbda0]">{rec.par}</td>
                    <td className="py-2 px-2 text-right font-mono-num font-bold text-[#fff8e8]">
                      {rec.strokes}
                    </td>
                    <td
                      className={`py-2 pl-2 text-right font-mono-num font-bold ${
                        diff < 0
                          ? 'text-[#6de08c]'
                          : diff === 0
                            ? 'text-[#e5cfa0]'
                            : 'text-[#f0a868]'
                      }`}
                    >
                      {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-lg bg-[#d4a34a] hover:bg-[#e3b55c] text-[#1c140b] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            再來一局
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="py-3 px-4 rounded-lg bg-[#2b2118] hover:bg-[#382b20] text-[#f2e8d2] font-medium text-sm border border-[#e8d8b5]/18 transition-colors cursor-pointer whitespace-nowrap"
          >
            返回主選單
          </button>
        </div>
      </div>
    </div>
  );
}
