import { COURSES } from '../game/courses';
import { formatParDelta } from '../game/physics';
import { WoodballEmblem } from './WoodballEmblem';

interface TitleScreenProps {
  bestTotalStrokes: number | null;
  totalPar: number;
  selectedStartIndex: number;
  onSelectStartIndex: (index: number) => void;
  onStartGame: (startIndex?: number) => void;
}

export function TitleScreen({
  bestTotalStrokes,
  totalPar,
  selectedStartIndex,
  onSelectStartIndex,
  onStartGame,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
      {/* Left-third calm walnut/forest scrim leaving the live sunlit fairway & gate unobstructed on the right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(96deg, rgba(16, 26, 18, 0.94) 0%, rgba(16, 26, 18, 0.86) 36%, rgba(16, 26, 18, 0.34) 64%, rgba(16, 26, 18, 0.08) 100%)',
        }}
      />

      {/* Main Left-Anchored Title Lockup */}
      <div className="relative z-10 flex-1 flex items-center px-6 sm:px-12 lg:px-16">
        <div className="w-full max-w-md pointer-events-auto">
          <div className="flex items-center gap-4 mb-5">
            <WoodballEmblem className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
            <div>
              <h1
                className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#faf4e6] leading-tight"
                style={{ textWrap: 'balance' }}
              >
                翠嶺木球錦標賽
              </h1>
              <div className="mt-1.5 flex items-center gap-2 text-xs sm:text-sm text-[#d9c8a1]">
                <span>六道標準木球賽道</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">總標準桿 {totalPar}</span>
                {bestTotalStrokes !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num text-[#f2c864]">
                      最佳 {bestTotalStrokes} 桿 ({formatParDelta(bestTotalStrokes, totalPar)})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#dcd7c8] leading-relaxed mb-7 max-w-sm">
            揮動原木球桿穿越斜坡、沙坑與湖畔木橋，從正面精準攻門翻轉酒杯。
          </p>

          {/* Primary Action CTA */}
          <div className="flex flex-wrap items-center gap-3 mb-7">
            <button
              type="button"
              data-start="true"
              onClick={() => onStartGame(selectedStartIndex)}
              className="px-7 py-3.5 rounded-lg bg-[#d4a34a] hover:bg-[#e2b55c] active:translate-y-px text-[#1c140b] font-bold text-base tracking-wide shadow-[0_6px_22px_rgba(0,0,0,0.42)] border border-[#f5d58e]/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d58e]"
            >
              {selectedStartIndex === 0 ? '開始錦標賽' : `從第 ${selectedStartIndex + 1} 道開球`}
            </button>

            {selectedStartIndex !== 0 && (
              <button
                type="button"
                onClick={() => onStartGame(0)}
                className="px-4 py-3.5 rounded-lg bg-[#241c14]/90 hover:bg-[#33271c] text-[#f2e8d2] font-medium text-sm border border-[#d4a34a]/35 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a34a]"
              >
                由第 1 道重開
              </button>
            )}
          </div>

          {/* Compact Starting Fairway Selector */}
          <div className="border-t border-[#e8d8b5]/18 pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-[#c5bca6]">選擇出發球道</span>
              <span className="text-xs text-[#e3c278] font-medium">
                第 {COURSES[selectedStartIndex].id} 道・{COURSES[selectedStartIndex].name}（PAR{' '}
                {COURSES[selectedStartIndex].par}）
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="選擇出發球道">
              {COURSES.map((course, idx) => {
                const active = idx === selectedStartIndex;
                return (
                  <button
                    key={course.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`第 ${course.id} 道 ${course.name}`}
                    onClick={() => onSelectStartIndex(idx)}
                    className={`py-2 rounded-md text-center transition-colors cursor-pointer font-mono-num text-sm font-bold border whitespace-nowrap ${
                      active
                        ? 'bg-[#2f6e44] text-[#fff8e6] border-[#d4a34a]'
                        : 'bg-[#1a1510]/80 text-[#c9bfa9] border-[#e8d8b5]/15 hover:border-[#d4a34a]/50 hover:text-[#faf4e6]'
                    }`}
                  >
                    {course.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Single Flat Borderless Control Hint Line in Bottom Safe Margin */}
      <div className="relative z-10 px-6 sm:px-12 lg:px-16 pb-5 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#cbbda0]/90 hud-text-shadow">
        <span>拖曳拉桿擊球</span>
        <span aria-hidden="true">·</span>
        <span>← → 瞄準方向</span>
        <span aria-hidden="true">·</span>
        <span>空白鍵蓄力揮桿</span>
        <span aria-hidden="true">·</span>
        <span>V 全景預覽</span>
        <span aria-hidden="true">·</span>
        <span>P 暫停</span>
      </div>
    </div>
  );
}
