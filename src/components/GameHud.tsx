import type { RefObject } from 'react';
import { COURSES } from '../game/courses';
import { formatParDelta, SURFACE_PHYSICS } from '../game/physics';
import type { HudSnapshot } from '../game/types';
import {
  IconGate,
  IconOverview,
  IconPause,
  IconRestart,
  IconScorecard,
  IconSound,
} from './WoodballEmblem';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  powerFillRef: RefObject<HTMLDivElement | null>;
  powerTextRef: RefObject<HTMLSpanElement | null>;
  radarBallRef: RefObject<SVGCircleElement | null>;
  onToggleOverview: () => void;
  onOpenScorecard: () => void;
  onRestartFairway: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export function GameHud({
  hud,
  muted,
  powerFillRef,
  powerTextRef,
  radarBallRef,
  onToggleOverview,
  onOpenScorecard,
  onRestartFairway,
  onToggleMute,
  onPause,
}: GameHudProps) {
  const course = COURSES[hud.courseIndex];
  const parDeltaText = formatParDelta(hud.totalStrokes, hud.totalParCompleted);
  const surfaceInfo = SURFACE_PHYSICS[hud.surface];

  const utilBtnClass =
    'w-10 h-10 sm:w-10 sm:h-10 rounded-lg bg-[#1d1610]/90 hover:bg-[#2d2218] active:translate-y-px border border-[#d4a34a]/35 text-[#f4ead4] flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.38)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2c864]';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* TOP BAR: Corner Clusters ONLY — Center stays open for the fairway */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Clubhouse Walnut Fairway Plaque */}
        <div
          className="pointer-events-auto rounded-lg bg-[#1c1610]/92 border border-[#d4a34a]/40 shadow-[0_6px_18px_rgba(0,0,0,0.4)] px-3.5 py-2.5 flex items-center gap-4"
          data-testid="hud-fairway-plaque"
        >
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-base sm:text-lg font-bold text-[#faf4e6] whitespace-nowrap">
                第 {hud.courseId} 道・{hud.courseName}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[#cbbda0]">
              <span className="font-mono-num">標準桿 {hud.par}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{course.lengthMeters}m</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">總成績 {parDeltaText}</span>
            </div>
          </div>

          <div className="h-9 w-px bg-[#e8d8b5]/18" aria-hidden="true" />

          {/* Hero Stroke Readout (2.5:1 hero-to-kicker ratio) */}
          <div className="text-right min-w-[44px]">
            <div className="text-[11px] font-medium text-[#d4a34a] leading-none">桿數</div>
            <div
              className="font-mono-num text-2xl sm:text-3xl font-bold text-[#fffaf0] leading-tight hud-hero-stroke"
              data-testid="hud-strokes"
            >
              {hud.strokes}
            </div>
          </div>
        </div>

        {/* Top-Right: Compact Square SVG Utility Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            tabIndex={-1}
            aria-label={hud.overviewMode ? '返回球位視角 (V)' : '全景預覽球道 (V)'}
            title="全景預覽 (V)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleOverview();
            }}
            className={`${utilBtnClass} ${hud.overviewMode ? 'bg-[#2f6e44] border-[#f2c864] text-[#fff8e6]' : ''}`}
          >
            <IconOverview className="w-5 h-5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="查看記分卡 (C)"
            title="記分卡 (C)"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenScorecard();
            }}
            className={utilBtnClass}
          >
            <IconScorecard className="w-5 h-5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="重打本道 (R)"
            title="重打本道 (R)"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestartFairway();
            }}
            className={utilBtnClass}
          >
            <IconRestart className="w-5 h-5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? '開啟音效 (M)' : '靜音 (M)'}
            title={muted ? '開啟音效 (M)' : '靜音 (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className={utilBtnClass}
          >
            <IconSound muted={muted} className="w-5 h-5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="暫停遊戲 (P)"
            title="暫停 (P)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className={utilBtnClass}
          >
            <IconPause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* TRANSIENT EVENT CALLOUT (OB / Water / Reverse Gate / Slope Alert) */}
      {hud.lastCallout && (
        <div
          key={hud.lastCallout.id}
          className="self-center mt-2 px-4 py-1.5 rounded-md border shadow-[0_4px_16px_rgba(0,0,0,0.45)] text-sm font-bold tracking-wide"
          style={{
            backgroundColor:
              hud.lastCallout.tone === 'good'
                ? 'rgba(30, 82, 49, 0.94)'
                : hud.lastCallout.tone === 'warn'
                  ? 'rgba(138, 42, 29, 0.94)'
                  : 'rgba(34, 26, 18, 0.92)',
            borderColor:
              hud.lastCallout.tone === 'good'
                ? 'rgba(242, 200, 100, 0.7)'
                : hud.lastCallout.tone === 'warn'
                  ? 'rgba(245, 165, 130, 0.65)'
                  : 'rgba(212, 163, 74, 0.5)',
            color: '#fff8ea',
          }}
          role="status"
        >
          {hud.lastCallout.text}
        </div>
      )}

      {/* BOTTOM CLUSTER: Compact Shot Telemetry Bar + Mini-Course Radar */}
      <div className="flex items-end justify-between gap-3">
        {/* Bottom-Left / Center Compact Telemetry Strip */}
        <div className="rounded-lg bg-[#1c1610]/90 border border-[#d4a34a]/35 shadow-[0_4px_14px_rgba(0,0,0,0.38)] px-3.5 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {/* Distance to Gate */}
          <div className="flex items-center gap-2">
            <IconGate className="w-4 h-4 shrink-0" />
            <span className="text-xs text-[#cbbda0]">距球門</span>
            <span className="font-mono-num text-sm font-bold text-[#fff8e8]" data-testid="hud-distance">
              {hud.distanceMeters}m
            </span>
          </div>

          <span className="text-[#e8d8b5]/25" aria-hidden="true">
            |
          </span>

          {/* Surface & Slope */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#e9dec6] font-medium">{surfaceInfo.label}</span>
            {hud.slopeHint && (
              <>
                <span aria-hidden="true" className="text-[#d4a34a]">
                  ·
                </span>
                <span className="text-[#f2c864] font-medium">{hud.slopeHint}</span>
              </>
            )}
          </div>

          <span className="text-[#e8d8b5]/25 hidden sm:inline" aria-hidden="true">
            |
          </span>

          {/* Live 60Hz Power Meter (mutated via refs — zero React re-render overhead) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#cbbda0]">力道</span>
            <div className="w-24 sm:w-28 h-2.5 rounded-sm bg-[#0f0c09] border border-[#d4a34a]/30 overflow-hidden">
              <div
                ref={powerFillRef}
                className="h-full origin-left bg-[#d4a34a]"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>
            <span
              ref={powerTextRef}
              className="font-mono-num text-xs font-bold text-[#f2e8d2] w-8 text-right"
            >
              0%
            </span>
          </div>
        </div>

        {/* Bottom-Right: Clickable Mini-Course Radar (desktop & tablet) */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="點擊切換球道全景雷達"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleOverview();
          }}
          className="hidden sm:block pointer-events-auto rounded-lg bg-[#17281d]/92 border border-[#d4a34a]/40 p-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.42)] hover:border-[#f2c864] transition-colors cursor-pointer"
        >
          <svg
            width="164"
            height="86"
            viewBox={`0 0 ${course.width} ${course.height}`}
            className="block"
            aria-hidden="true"
          >
            {/* Bounds */}
            <polygon
              points={course.bounds.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="#235434"
              stroke="rgba(248,244,230,0.45)"
              strokeWidth="12"
            />
            {/* Fairways */}
            {course.fairways.map((fw) => (
              <polygon
                key={fw.id}
                points={fw.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="#368d52"
              />
            ))}
            {/* Waters */}
            {course.waters.map((w) => (
              <polygon
                key={w.id}
                points={w.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="#227996"
              />
            ))}
            {/* Bridges */}
            {course.bridges.map((br) => (
              <polygon
                key={br.id}
                points={br.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="#a16c3b"
              />
            ))}
            {/* Bunkers */}
            {course.bunkers.map((b) => (
              <polygon
                key={b.id}
                points={b.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="#e2ca91"
              />
            ))}
            {/* Gate marker */}
            <circle cx={course.gate.x} cy={course.gate.y} r="32" fill="#d94632" stroke="#fff7df" strokeWidth="10" />
            {/* Live Ball marker updated via ref */}
            <circle
              ref={radarBallRef}
              cx={course.tee.x}
              cy={course.tee.y}
              r="28"
              fill="#fff3c9"
              stroke="#2a1809"
              strokeWidth="10"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
