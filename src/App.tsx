import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import {
  ChampionshipVictoryModal,
  HoleClearModal,
  PauseModal,
  ScorecardModal,
} from './components/Modals';
import { TitleScreen } from './components/TitleScreen';
import { woodballAudio } from './game/audio';
import { COURSES } from './game/courses';
import { ParticlePool } from './game/particles';
import {
  applyShot,
  createInitialBall,
  createInitialGateState,
  getDistanceToGateMeters,
  getMaxStrokesForPar,
  MAX_DT,
  querySlope,
  querySurface,
  simulateAimPreview,
  stepWoodballPhysics,
} from './game/physics';
import {
  buildCourseBaseCanvas,
  renderWoodballScene,
  type AimRenderState,
  type CameraState,
} from './game/renderer';
import type {
  AppGameState,
  BallState,
  GatePhysicsState,
  HoleScoreRecord,
  HudSnapshot,
  PlayPhase,
} from './game/types';

const BEST_SCORE_STORAGE_KEY = 'woodball_championship_best_v1';
const TOTAL_COURSE_PAR = COURSES.reduce((sum, c) => sum + c.par, 0);

function loadBestScore(): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= COURSES.length ? parsed : null;
  } catch {
    return null;
  }
}

function saveBestScore(strokes: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(strokes));
  } catch {
    // Ignore storage quota / sandbox restrictions
  }
}

function createInitialScores(): HoleScoreRecord[] {
  return COURSES.map((c) => ({
    courseId: c.id,
    courseName: c.name,
    par: c.par,
    strokes: 0,
    completed: false,
    gateInOne: false,
  }));
}

function buildHudSnapshot(
  courseIndex: number,
  ball: BallState,
  strokes: number,
  phase: PlayPhase,
  overviewMode: boolean,
  scores: HoleScoreRecord[],
  lastCallout: HudSnapshot['lastCallout']
): HudSnapshot {
  const course = COURSES[courseIndex];
  const surface = querySurface(course, ball.x, ball.y);
  const slope = querySlope(course, ball.x, ball.y);
  const completedStrokes = scores.reduce((sum, s) => sum + (s.completed ? s.strokes : 0), 0);
  const completedPar = scores.reduce((sum, s) => sum + (s.completed ? s.par : 0), 0);

  return {
    courseIndex,
    courseId: course.id,
    courseName: course.name,
    courseSubtitle: course.subtitle,
    par: course.par,
    strokes,
    maxStrokes: getMaxStrokesForPar(course.par),
    totalStrokes: completedStrokes,
    totalParCompleted: completedPar,
    surface,
    distanceMeters: getDistanceToGateMeters(course, ball.x, ball.y),
    phase,
    overviewMode,
    slopeHint: slope ? slope.label : null,
    lastCallout,
    scores: scores.map((s) => ({ ...s })),
  };
}

interface SimState {
  appState: AppGameState;
  courseIndex: number;
  ball: BallState;
  gateState: GatePhysicsState;
  camera: CameraState;
  aim: AimRenderState;
  phase: PlayPhase;
  strokes: number;
  exceededMax: boolean;
  overviewMode: boolean;
  scores: HoleScoreRecord[];
  startedFromFirst: boolean;
  hitstopTimer: number;
  phaseTimer: number;
  calloutTimer: number;
  calloutSeq: number;
  lastCallout: HudSnapshot['lastCallout'];
  pendingShot: { angle: number; power: number } | null;
  // Pointer drag state
  dragging: boolean;
  dragPointerId: number | null;
  dragStartClientX: number;
  dragStartClientY: number;
  // Keyboard aiming/charging state
  keys: Set<string>;
  keyAimActive: boolean;
  spaceCharging: boolean;
  spaceChargeDir: number;
  keyboardPower: number;
  // Title tour time
  elapsed: number;
  // Cached base canvas per course id
  baseCanvases: Map<number, HTMLCanvasElement>;
  particles: ParticlePool;
  viewportW: number;
  viewportH: number;
}

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [appState, setAppState] = useState<AppGameState>(autostart ? 'playing' : 'title');
  const [selectedStartIndex, setSelectedStartIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [bestTotalStrokes, setBestTotalStrokes] = useState<number | null>(() =>
    typeof window !== 'undefined' ? loadBestScore() : null
  );
  const [isNewBest, setIsNewBest] = useState(false);
  const [exceededMaxFlag, setExceededMaxFlag] = useState(false);

  const initialCourse = COURSES[0];
  const initialBall = createInitialBall(initialCourse);
  const initialScores = createInitialScores();

  const [hud, setHud] = useState<HudSnapshot>(() =>
    buildHudSnapshot(0, initialBall, 0, 'ready', false, initialScores, null)
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const powerFillRef = useRef<HTMLDivElement | null>(null);
  const powerTextRef = useRef<HTMLSpanElement | null>(null);
  const radarBallRef = useRef<SVGCircleElement | null>(null);

  const simRef = useRef<SimState | null>(null);
  if (!simRef.current) {
    simRef.current = {
      appState: autostart ? 'playing' : 'title',
      courseIndex: 0,
      ball: initialBall,
      gateState: createInitialGateState(),
      camera: {
        x: initialCourse.width * 0.5,
        y: initialCourse.height * 0.5,
        zoom: 0.9,
        shakeTrauma: 0,
      },
      aim: {
        active: false,
        angle: initialCourse.initialAimAngle,
        power: 0,
        previewPoints: [],
        bouncePoint: null,
        swingProgress: 0,
        swingPower: 0,
        swingAngle: initialCourse.initialAimAngle,
      },
      phase: 'ready',
      strokes: 0,
      exceededMax: false,
      overviewMode: false,
      scores: initialScores,
      startedFromFirst: true,
      hitstopTimer: 0,
      phaseTimer: 0,
      calloutTimer: 0,
      calloutSeq: 0,
      lastCallout: null,
      pendingShot: null,
      dragging: false,
      dragPointerId: null,
      dragStartClientX: 0,
      dragStartClientY: 0,
      keys: new Set<string>(),
      keyAimActive: false,
      spaceCharging: false,
      spaceChargeDir: 1,
      keyboardPower: 0.42,
      elapsed: 0,
      baseCanvases: new Map<number, HTMLCanvasElement>(),
      particles: new ParticlePool(),
      viewportW: typeof window !== 'undefined' ? window.innerWidth : 1440,
      viewportH: typeof window !== 'undefined' ? window.innerHeight : 900,
    };
  }

  // Sync document.body.dataset.state cleanly
  useEffect(() => {
    const bodyState = appState === 'hole_clear' ? 'playing' : appState;
    document.body.dataset.state = bodyState;
    document.body.dataset.substate = appState;
  }, [appState]);

  const syncHudFromSim = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setHud(
      buildHudSnapshot(
        sim.courseIndex,
        sim.ball,
        sim.strokes,
        sim.phase,
        sim.overviewMode,
        sim.scores,
        sim.lastCallout
      )
    );
  }, []);

  const updatePowerDom = useCallback((powerRatio: number) => {
    const clamped = Math.max(0, Math.min(1, powerRatio));
    if (powerFillRef.current) {
      powerFillRef.current.style.transform = `scaleX(${clamped})`;
      powerFillRef.current.style.backgroundColor =
        clamped < 0.45 ? '#62cb77' : clamped < 0.78 ? '#e8b948' : '#e45c3e';
    }
    if (powerTextRef.current) {
      powerTextRef.current.textContent = `${Math.round(clamped * 100)}%`;
    }
  }, []);

  const pushCallout = useCallback(
    (text: string, tone: 'good' | 'warn' | 'info', duration = 2.1) => {
      const sim = simRef.current;
      if (!sim) return;
      sim.calloutSeq += 1;
      sim.lastCallout = { id: sim.calloutSeq, text, tone };
      sim.calloutTimer = duration;
      syncHudFromSim();
    },
    [syncHudFromSim]
  );

  const loadCourseIntoSim = useCallback(
    (courseIdx: number, resetCameraImmediate = true) => {
      const sim = simRef.current;
      if (!sim) return;
      const course = COURSES[courseIdx];
      sim.courseIndex = courseIdx;
      sim.ball = createInitialBall(course);
      sim.gateState = createInitialGateState();
      sim.phase = 'ready';
      sim.strokes = 0;
      sim.exceededMax = false;
      sim.overviewMode = false;
      sim.hitstopTimer = 0;
      sim.phaseTimer = 0;
      sim.pendingShot = null;
      sim.dragging = false;
      sim.dragPointerId = null;
      sim.keyAimActive = false;
      sim.spaceCharging = false;
      sim.keyboardPower = 0.42;
      sim.lastCallout = null;
      sim.calloutTimer = 0;
      sim.particles.clear();
      sim.aim = {
        active: false,
        angle: course.initialAimAngle,
        power: 0,
        previewPoints: [],
        bouncePoint: null,
        swingProgress: 0,
        swingPower: 0,
        swingAngle: course.initialAimAngle,
      };
      if (resetCameraImmediate) {
        const fitZoom = Math.min(
          (sim.viewportW * 0.9) / course.width,
          (sim.viewportH * 0.84) / course.height
        );
        const playZoom = Math.max(fitZoom, Math.min(1.08, sim.viewportW / 1220));
        sim.camera.zoom = playZoom;
        sim.camera.x = course.tee.x + 280;
        sim.camera.y = course.tee.y;
        sim.camera.shakeTrauma = 0;
      }
      setExceededMaxFlag(false);
      updatePowerDom(0);
      syncHudFromSim();
    },
    [syncHudFromSim, updatePowerDom]
  );

  const handleStartGame = useCallback(
    (startIdx = 0) => {
      const sim = simRef.current;
      if (!sim) return;
      woodballAudio.playUiTap();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      sim.keys.clear();
      sim.scores = createInitialScores();
      sim.startedFromFirst = startIdx === 0;
      setIsNewBest(false);
      setShowScorecard(false);
      sim.appState = 'playing';
      document.body.dataset.state = 'playing';
      loadCourseIntoSim(startIdx, true);
      setAppState('playing');
      canvasRef.current?.focus();
    },
    [loadCourseIntoSim]
  );

  const handleSelectStartIndex = useCallback(
    (idx: number) => {
      woodballAudio.playUiTap();
      setSelectedStartIndex(idx);
      const sim = simRef.current;
      if (sim && sim.appState === 'title') {
        loadCourseIntoSim(idx, true);
      }
    },
    [loadCourseIntoSim]
  );

  const handleRestartFairway = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    woodballAudio.playUiTap();
    sim.keys.clear();
    sim.scores[sim.courseIndex] = {
      ...sim.scores[sim.courseIndex],
      strokes: 0,
      completed: false,
      gateInOne: false,
    };
    sim.appState = 'playing';
    setShowScorecard(false);
    loadCourseIntoSim(sim.courseIndex, false);
    setAppState('playing');
  }, [loadCourseIntoSim]);

  const handleNextCourse = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    woodballAudio.playUiTap();
    const nextIdx = sim.courseIndex + 1;
    if (nextIdx >= COURSES.length) {
      // Complete Championship!
      const totalStrokes = sim.scores.reduce((acc, s) => acc + s.strokes, 0);
      const allCompleted = sim.scores.every((s) => s.completed);
      if (allCompleted) {
        const prevBest = loadBestScore();
        if (prevBest === null || totalStrokes < prevBest) {
          saveBestScore(totalStrokes);
          setBestTotalStrokes(totalStrokes);
          setIsNewBest(true);
        } else {
          setIsNewBest(false);
        }
      }
      sim.appState = 'gameover';
      setAppState('gameover');
      syncHudFromSim();
    } else {
      sim.appState = 'playing';
      loadCourseIntoSim(nextIdx, true);
      setAppState('playing');
    }
  }, [loadCourseIntoSim, syncHudFromSim]);

  const handleReturnTitle = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    woodballAudio.playUiTap();
    sim.keys.clear();
    sim.dragging = false;
    sim.spaceCharging = false;
    sim.appState = 'title';
    setShowScorecard(false);
    loadCourseIntoSim(selectedStartIndex, true);
    setAppState('title');
  }, [loadCourseIntoSim, selectedStartIndex]);

  const handleTogglePause = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (sim.appState === 'playing') {
      woodballAudio.playUiTap();
      sim.keys.clear();
      sim.dragging = false;
      sim.spaceCharging = false;
      sim.appState = 'paused';
      setShowScorecard(false);
      setAppState('paused');
    } else if (sim.appState === 'paused') {
      woodballAudio.playUiTap();
      sim.appState = 'playing';
      setAppState('playing');
      canvasRef.current?.focus();
    }
  }, []);

  const handleToggleOverview = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.appState !== 'playing') return;
    woodballAudio.playUiTap();
    sim.overviewMode = !sim.overviewMode;
    syncHudFromSim();
  }, [syncHudFromSim]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      woodballAudio.setMuted(next);
      if (!next) woodballAudio.playUiTap();
      return next;
    });
  }, []);

  // Store latest callbacks in ref so the single mounted game loop never restarts
  const callbacksRef = useRef({
    syncHudFromSim,
    updatePowerDom,
    pushCallout,
    handleStartGame,
    handleTogglePause,
    handleToggleOverview,
    handleRestartFairway,
    handleToggleMute,
    handleNextCourse,
  });
  callbacksRef.current = {
    syncHudFromSim,
    updatePowerDom,
    pushCallout,
    handleStartGame,
    handleTogglePause,
    handleToggleOverview,
    handleRestartFairway,
    handleToggleMute,
    handleNextCourse,
  };

  // Single mounted simulation + canvas rendering + input effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getBaseCanvas = (courseIdx: number): HTMLCanvasElement => {
      const course = COURSES[courseIdx];
      let cached = sim.baseCanvases.get(course.id);
      if (!cached) {
        cached = buildCourseBaseCanvas(course);
        sim.baseCanvases.set(course.id, cached);
      }
      return cached;
    };

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.round(rect.width));
      const h = Math.max(240, Math.round(rect.height));
      sim.viewportW = w;
      sim.viewportH = h;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    const refreshAimPreview = () => {
      const course = COURSES[sim.courseIndex];
      if (!sim.aim.active || sim.aim.power < 0.04) {
        sim.aim.previewPoints = [];
        sim.aim.bouncePoint = null;
        return;
      }
      const prev = simulateAimPreview(
        course,
        sim.ball.x,
        sim.ball.y,
        sim.aim.angle,
        sim.aim.power
      );
      sim.aim.previewPoints = prev.points;
      sim.aim.bouncePoint = prev.bouncePoint;
    };

    const launchMalletSwing = (angle: number, power: number) => {
      if (sim.phase !== 'ready' || sim.appState !== 'playing') return;
      const clampedPower = Math.max(0.08, Math.min(1, power));
      sim.phase = 'swinging';
      sim.aim.active = false;
      sim.aim.previewPoints = [];
      sim.aim.bouncePoint = null;
      sim.aim.swingProgress = 0.001;
      sim.aim.swingAngle = angle;
      sim.aim.swingPower = clampedPower;
      sim.pendingShot = { angle, power: clampedPower };
      sim.overviewMode = false;
      sim.dragging = false;
      sim.keyAimActive = false;
      sim.spaceCharging = false;
      callbacksRef.current.updatePowerDom(clampedPower);
    };

    const finishFairway = (exceeded: boolean) => {
      const course = COURSES[sim.courseIndex];
      sim.exceededMax = exceeded;
      setExceededMaxFlag(exceeded);
      sim.scores[sim.courseIndex] = {
        courseId: course.id,
        courseName: course.name,
        par: course.par,
        strokes: sim.strokes,
        completed: true,
        gateInOne: !exceeded && sim.strokes === 1,
      };
      if (sim.courseIndex === COURSES.length - 1) {
        // Final fairway completed!
        const totalStrokes = sim.scores.reduce((acc, s) => acc + s.strokes, 0);
        const allDone = sim.scores.every((s) => s.completed);
        if (allDone) {
          const prevBest = loadBestScore();
          if (prevBest === null || totalStrokes < prevBest) {
            saveBestScore(totalStrokes);
            setBestTotalStrokes(totalStrokes);
            setIsNewBest(true);
          } else {
            setIsNewBest(false);
          }
        }
        sim.appState = 'gameover';
        setAppState('gameover');
      } else {
        sim.appState = 'hole_clear';
        setAppState('hole_clear');
      }
      callbacksRef.current.syncHudFromSim();
    };

    // Pointer Events (Slingshot Pull-Back Aiming)
    const onPointerDown = (e: PointerEvent) => {
      if (sim.appState !== 'playing' || sim.phase !== 'ready') return;
      if (e.button === 2) {
        // Right-click cancels active aim
        sim.dragging = false;
        sim.aim.active = false;
        sim.aim.power = 0;
        callbacksRef.current.updatePowerDom(0);
        return;
      }
      if (e.button !== 0) return;

      canvas.setPointerCapture(e.pointerId);
      sim.dragging = true;
      sim.dragPointerId = e.pointerId;
      sim.dragStartClientX = e.clientX;
      sim.dragStartClientY = e.clientY;
      sim.keyAimActive = false;
      sim.spaceCharging = false;
      sim.aim.active = true;
      sim.aim.power = 0;
      callbacksRef.current.updatePowerDom(0);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!sim.dragging || e.pointerId !== sim.dragPointerId) return;
      if (sim.appState !== 'playing' || sim.phase !== 'ready') return;

      // Slingshot vector: pull back opposite to shot direction
      const pullX = sim.dragStartClientX - e.clientX;
      const pullY = sim.dragStartClientY - e.clientY;
      const pullDist = Math.hypot(pullX, pullY);

      if (pullDist < 10) {
        sim.aim.power = 0;
        sim.aim.previewPoints = [];
        sim.aim.bouncePoint = null;
        callbacksRef.current.updatePowerDom(0);
        return;
      }

      sim.aim.angle = Math.atan2(pullY, pullX);
      const maxPullPx = Math.min(220, Math.max(130, Math.min(sim.viewportW, sim.viewportH) * 0.28));
      sim.aim.power = Math.max(0.08, Math.min(1, (pullDist - 8) / maxPullPx));
      refreshAimPreview();
      callbacksRef.current.updatePowerDom(sim.aim.power);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!sim.dragging || e.pointerId !== sim.dragPointerId) return;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      sim.dragging = false;
      sim.dragPointerId = null;

      if (sim.appState === 'playing' && sim.phase === 'ready' && sim.aim.power >= 0.08) {
        launchMalletSwing(sim.aim.angle, sim.aim.power);
      } else {
        sim.aim.active = false;
        sim.aim.power = 0;
        sim.aim.previewPoints = [];
        sim.aim.bouncePoint = null;
        callbacksRef.current.updatePowerDom(0);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (sim.dragging || sim.aim.active) {
        sim.dragging = false;
        sim.dragPointerId = null;
        sim.aim.active = false;
        sim.aim.power = 0;
        sim.aim.previewPoints = [];
        callbacksRef.current.updatePowerDom(0);
      }
    };

    // Keyboard Events
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        e.preventDefault();
      }

      if (sim.appState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          callbacksRef.current.handleStartGame(sim.courseIndex);
        }
        return;
      }

      if (sim.appState === 'hole_clear') {
        if (e.code === 'Enter' || e.code === 'Space') {
          callbacksRef.current.handleNextCourse();
        }
        return;
      }

      if (sim.appState === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space') {
          callbacksRef.current.handleStartGame(0);
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (sim.dragging) {
          sim.dragging = false;
          sim.aim.active = false;
          sim.aim.power = 0;
          callbacksRef.current.updatePowerDom(0);
          return;
        }
        callbacksRef.current.handleTogglePause();
        return;
      }

      if (sim.appState !== 'playing') return;

      if (!e.repeat) {
        if (e.code === 'KeyV') {
          callbacksRef.current.handleToggleOverview();
          return;
        }
        if (e.code === 'KeyR') {
          callbacksRef.current.handleRestartFairway();
          return;
        }
        if (e.code === 'KeyM') {
          callbacksRef.current.handleToggleMute();
          return;
        }
        if (e.code === 'KeyC') {
          setShowScorecard((prev) => !prev);
          return;
        }
      }

      sim.keys.add(e.code);

      if (sim.phase === 'ready') {
        if (
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(
            e.code
          )
        ) {
          if (!sim.keyAimActive) {
            sim.keyAimActive = true;
            sim.aim.active = true;
            // Point initially toward gate
            const course = COURSES[sim.courseIndex];
            if (sim.aim.power < 0.05) {
              sim.aim.angle = Math.atan2(
                course.gate.y - sim.ball.y,
                course.gate.x - sim.ball.x
              );
              sim.aim.power = sim.keyboardPower;
            }
            refreshAimPreview();
            callbacksRef.current.updatePowerDom(sim.aim.power);
          }
        }

        if (e.code === 'Space' && !e.repeat) {
          const course = COURSES[sim.courseIndex];
          if (!sim.keyAimActive && !sim.aim.active) {
            sim.aim.angle = Math.atan2(
              course.gate.y - sim.ball.y,
              course.gate.x - sim.ball.x
            );
          }
          sim.keyAimActive = true;
          sim.aim.active = true;
          sim.spaceCharging = true;
          sim.spaceChargeDir = 1;
          sim.aim.power = 0.14;
          refreshAimPreview();
          callbacksRef.current.updatePowerDom(sim.aim.power);
        }

        if (e.code === 'Enter' && !e.repeat && sim.keyAimActive && sim.aim.power >= 0.08) {
          launchMalletSwing(sim.aim.angle, sim.aim.power);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      sim.keys.delete(e.code);
      if (e.code === 'Space' && sim.spaceCharging && sim.appState === 'playing' && sim.phase === 'ready') {
        sim.spaceCharging = false;
        launchMalletSwing(sim.aim.angle, sim.aim.power);
      }
    };

    const onWindowBlur = () => {
      sim.keys.clear();
      sim.dragging = false;
      sim.dragPointerId = null;
      sim.spaceCharging = false;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        onWindowBlur();
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Main 60fps simulation & render loop (with gentle yield only on slow software CPU frames)
    let rafId = 0;
    let yieldTimerId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let lastRadarX = -9999;
    let lastRadarY = -9999;

    const scheduleNext = (activeMotion: boolean, frameWorkMs: number) => {
      if (disposed) return;
      if (sim.appState === 'paused') {
        yieldTimerId = window.setTimeout(() => {
          if (!disposed) rafId = window.requestAnimationFrame(frame);
        }, 120);
      } else if (!activeMotion) {
        // Gentle power-saving cadence when ball is resting idle or on title tour
        yieldTimerId = window.setTimeout(() => {
          if (!disposed) rafId = window.requestAnimationFrame(frame);
        }, 48);
      } else if (frameWorkMs > 12) {
        yieldTimerId = window.setTimeout(() => {
          if (!disposed) rafId = window.requestAnimationFrame(frame);
        }, 16);
      } else {
        rafId = window.requestAnimationFrame(frame);
      }
    };

    const frame = (now: number) => {
      const workStart = performance.now();
      const rawDt = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;
      const dt = Math.min(rawDt, MAX_DT);

      const course = COURSES[sim.courseIndex];
      const baseCanvas = getBaseCanvas(sim.courseIndex);

      if (sim.appState !== 'paused') {
        sim.elapsed += dt;
      }

      // Decay camera shake & callout timer in real dt
      if (sim.camera.shakeTrauma > 0) {
        sim.camera.shakeTrauma = Math.max(0, sim.camera.shakeTrauma - dt * 2.1);
      }
      if (sim.calloutTimer > 0 && sim.appState === 'playing') {
        sim.calloutTimer -= dt;
        if (sim.calloutTimer <= 0) {
          sim.lastCallout = null;
          callbacksRef.current.syncHudFromSim();
        }
      }

      // Live World Camera Tour on Title Screen
      if (sim.appState === 'title') {
        const fitZoom = Math.min(
          (sim.viewportW * 0.96) / course.width,
          (sim.viewportH * 0.96) / course.height
        );
        const targetZoom = Math.max(fitZoom, Math.min(1.06, sim.viewportW / 1180));
        // Gentle horizontal pan across fairway favoring right-side showcase of gate & turf
        const panWave = Math.sin(sim.elapsed * 0.24);
        const targetX = course.width * 0.56 + panWave * (course.width * 0.14);
        const targetY = course.height * 0.5 + Math.cos(sim.elapsed * 0.19) * 26;

        sim.camera.x += (targetX - sim.camera.x) * Math.min(1, dt * 3);
        sim.camera.y += (targetY - sim.camera.y) * Math.min(1, dt * 3);
        sim.camera.zoom += (targetZoom - sim.camera.zoom) * Math.min(1, dt * 3);

        // Gentle breeze swaying the wooden gate cup on the Title Screen
        sim.gateState.cupAngle = Math.sin(sim.elapsed * 1.8) * 0.16;
      } else if (sim.appState === 'playing' || sim.appState === 'hole_clear' || sim.appState === 'gameover') {
        // Keyboard aiming updates when ready
        if (sim.appState === 'playing' && sim.phase === 'ready') {
          const fine = sim.keys.has('ShiftLeft') || sim.keys.has('ShiftRight');
          const rotSpeed = fine ? 0.55 : 1.75;
          let aimChanged = false;

          if (sim.keys.has('ArrowLeft') || sim.keys.has('KeyA')) {
            sim.aim.angle -= rotSpeed * dt;
            aimChanged = true;
          }
          if (sim.keys.has('ArrowRight') || sim.keys.has('KeyD')) {
            sim.aim.angle += rotSpeed * dt;
            aimChanged = true;
          }
          if (sim.keys.has('ArrowUp') || sim.keys.has('KeyW')) {
            sim.keyboardPower = Math.min(1, sim.keyboardPower + 0.65 * dt);
            sim.aim.power = sim.keyboardPower;
            aimChanged = true;
          }
          if (sim.keys.has('ArrowDown') || sim.keys.has('KeyS')) {
            sim.keyboardPower = Math.max(0.08, sim.keyboardPower - 0.65 * dt);
            sim.aim.power = sim.keyboardPower;
            aimChanged = true;
          }
          if (sim.spaceCharging) {
            sim.aim.power += sim.spaceChargeDir * 0.92 * dt;
            if (sim.aim.power >= 1) {
              sim.aim.power = 1;
              sim.spaceChargeDir = -1;
            } else if (sim.aim.power <= 0.12) {
              sim.aim.power = 0.12;
              sim.spaceChargeDir = 1;
            }
            sim.keyboardPower = sim.aim.power;
            aimChanged = true;
          }
          if (aimChanged) {
            sim.aim.active = true;
            refreshAimPreview();
            callbacksRef.current.updatePowerDom(sim.aim.power);
          }
        }

        // Simulation step with real hitstop freeze support
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        } else if (sim.appState === 'playing') {
          // Mallet swing animation -> actual strike at progress >= 0.38
          if (sim.phase === 'swinging') {
            sim.aim.swingProgress += dt * 4.8;
            if (sim.aim.swingProgress >= 0.38 && sim.pendingShot) {
              const { angle, power } = sim.pendingShot;
              sim.pendingShot = null;
              sim.strokes += 1;
              applyShot(sim.ball, angle, power);
              woodballAudio.playStrike(power);
              sim.hitstopTimer = power > 0.65 ? 0.036 : 0.02;
              sim.camera.shakeTrauma = Math.min(0.45, power * 0.36);

              // Directional grass & wood dust burst at impact
              const surface = querySurface(course, sim.ball.x, sim.ball.y);
              sim.particles.spawnBurst(
                surface === 'sand' ? 'sand' : 'grass',
                sim.ball.x,
                sim.ball.y,
                6 + Math.round(power * 8),
                angle,
                1.05,
                40,
                125 + power * 110
              );
              sim.particles.spawnBurst('wood', sim.ball.x, sim.ball.y, 4, angle + Math.PI, 1.4, 25, 70);
              callbacksRef.current.syncHudFromSim();
            }
            if (sim.aim.swingProgress >= 1) {
              sim.aim.swingProgress = 0;
              sim.phase = 'rolling';
            }
          }

          // Advance ball & gate physics while rolling, finishing swing, or celebrating gate-in
          if (sim.phase === 'rolling' || sim.phase === 'swinging' || sim.phase === 'gate_in') {
            const res = stepWoodballPhysics(course, sim.ball, sim.gateState, dt);

            for (const ev of res.events) {
              if (ev.type === 'wall_hit' || ev.type === 'boulder_hit' || ev.type === 'post_hit') {
                woodballAudio.playCollision(ev.material ?? 'timber', ev.intensity);
                sim.camera.shakeTrauma = Math.min(0.55, sim.camera.shakeTrauma + ev.intensity * 0.35);
                if (ev.intensity > 0.55) {
                  sim.hitstopTimer = 0.025;
                }
                sim.particles.spawnBurst(
                  'wood',
                  ev.x,
                  ev.y,
                  5 + Math.round(ev.intensity * 6),
                  Math.random() * Math.PI * 2,
                  Math.PI * 2,
                  35,
                  120
                );
              } else if (ev.type === 'sand_enter') {
                woodballAudio.playSand(ev.intensity);
                sim.particles.spawnBurst('sand', ev.x, ev.y, 10, Math.random() * Math.PI * 2, Math.PI * 2, 25, 95);
              } else if (ev.type === 'reverse_gate') {
                woodballAudio.playWarning();
                callbacksRef.current.pushCallout('反向穿門・須由正面攻門', 'warn', 2.4);
              } else if (ev.type === 'gate_in') {
                const isOne = sim.strokes === 1;
                woodballAudio.playGateIn(isOne);
                sim.phase = 'gate_in';
                sim.phaseTimer = 1.05;
                sim.hitstopTimer = 0.045;
                sim.camera.shakeTrauma = 0.42;
                sim.particles.spawnBurst('sparkle', ev.x, ev.y, 26, 0, Math.PI * 2, 50, 210);
                callbacksRef.current.pushCallout(
                  isOne ? '一桿過門！傳奇精準擊球' : '過門成功！',
                  'good',
                  2.0
                );
              } else if (ev.type === 'water_hazard') {
                woodballAudio.playWaterSplash();
                sim.particles.spawnBurst('water', ev.x, ev.y, 18, 0, Math.PI * 2, 40, 165);
                sim.strokes += 1;
                sim.phase = 'hazard_reset';
                sim.phaseTimer = 0.85;
                callbacksRef.current.pushCallout('落水障礙・罰 1 桿並回原位', 'warn', 2.2);
              } else if (ev.type === 'ob_hazard') {
                woodballAudio.playWarning();
                sim.strokes += 1;
                sim.phase = 'hazard_reset';
                sim.phaseTimer = 0.85;
                callbacksRef.current.pushCallout('球出界外 OB・罰 1 桿並回原位', 'warn', 2.2);
              }
            }

            if (sim.phase === 'rolling' && res.stopped) {
              const maxStrokes = getMaxStrokesForPar(course.par);
              if (sim.strokes >= maxStrokes) {
                finishFairway(true);
              } else {
                sim.phase = 'ready';
                sim.aim.power = 0;
                callbacksRef.current.updatePowerDom(0);
                callbacksRef.current.syncHudFromSim();
              }
            }
          }

          if (sim.phase === 'gate_in') {
            sim.phaseTimer -= dt;
            if (sim.phaseTimer <= 0) {
              finishFairway(false);
            }
          } else if (sim.phase === 'hazard_reset') {
            sim.phaseTimer -= dt;
            if (sim.phaseTimer <= 0) {
              const maxStrokes = getMaxStrokesForPar(course.par);
              sim.ball.x = sim.ball.lastSafeX;
              sim.ball.y = sim.ball.lastSafeY;
              sim.ball.vx = 0;
              sim.ball.vy = 0;
              if (sim.strokes >= maxStrokes) {
                finishFairway(true);
              } else {
                sim.phase = 'ready';
                callbacksRef.current.updatePowerDom(0);
                callbacksRef.current.syncHudFromSim();
              }
            }
          }
        }

        // Update particles even during hole_clear
        sim.particles.update(dt);

        // Smooth camera tracking vs full fairway overview
        const fitZoom = Math.min(
          (sim.viewportW * 0.9) / course.width,
          (sim.viewportH * 0.78) / course.height
        );

        let targetX = course.width * 0.5;
        let targetY = course.height * 0.5;
        let targetZoom = fitZoom;

        if (!sim.overviewMode && sim.appState === 'playing') {
          // Comfortable play zoom: shows rich detail around ball + upcoming obstacles & gate
          const playZoom = Math.max(fitZoom, Math.min(1.06, sim.viewportW / 1180));
          targetZoom = playZoom;

          // Bias camera slightly from ball toward the gate for forward visibility
          const lookBias = 0.28;
          const rawTargetX = sim.ball.x + (course.gate.x - sim.ball.x) * lookBias;
          const rawTargetY = sim.ball.y + (course.gate.y - sim.ball.y) * lookBias;

          const halfViewW = (sim.viewportW * 0.5) / playZoom;
          const halfViewH = (sim.viewportH * 0.5) / playZoom;
          const minCamX = Math.min(course.width * 0.5, halfViewW - 40);
          const maxCamX = Math.max(course.width * 0.5, course.width - halfViewW + 40);
          const minCamY = Math.min(course.height * 0.5, halfViewH - 40);
          const maxCamY = Math.max(course.height * 0.5, course.height - halfViewH + 40);

          targetX = Math.max(minCamX, Math.min(maxCamX, rawTargetX));
          targetY = Math.max(minCamY, Math.min(maxCamY, rawTargetY));
        }

        const camLerp = Math.min(1, dt * 5.2);
        sim.camera.x += (targetX - sim.camera.x) * camLerp;
        sim.camera.y += (targetY - sim.camera.y) * camLerp;
        sim.camera.zoom += (targetZoom - sim.camera.zoom) * camLerp;

        // Update mini-radar ball SVG node ONLY when rounded coordinates actually change
        if (radarBallRef.current) {
          const rx = Math.round(sim.ball.x);
          const ry = Math.round(sim.ball.y);
          if (rx !== lastRadarX || ry !== lastRadarY) {
            radarBallRef.current.setAttribute('cx', String(rx));
            radarBallRef.current.setAttribute('cy', String(ry));
            lastRadarX = rx;
            lastRadarY = ry;
          }
        }
      }

      // Render frame at exact DPR
      const dpr = canvas.width / Math.max(1, sim.viewportW);
      ctx.save();
      ctx.scale(dpr, dpr);
      renderWoodballScene(
        ctx,
        sim.viewportW,
        sim.viewportH,
        course,
        baseCanvas,
        sim.ball,
        sim.gateState,
        sim.camera,
        sim.aim,
        sim.particles,
        sim.elapsed,
        sim.appState === 'playing' && sim.phase === 'ready'
      );
      ctx.restore();

      const workMs = performance.now() - workStart;
      const isActivelyMoving =
        sim.appState === 'playing' &&
        (sim.phase !== 'ready' ||
          sim.dragging ||
          sim.spaceCharging ||
          sim.keys.size > 0 ||
          sim.camera.shakeTrauma > 0.01);
      scheduleNext(isActivelyMoving, workMs);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(yieldTimerId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#173c24]">
      {/* Isolated Full-Viewport Game Canvas */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        data-testid="woodball-canvas"
        aria-label="翠嶺木球賽道畫布，可拖曳拉桿擊球或使用鍵盤方向鍵與空白鍵揮桿"
        className="block w-full h-full outline-none cursor-crosshair"
      />

      {/* Static subtle corner atmosphere vignette (zero per-frame Canvas2D overdraw, zero backdrop-filter) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(8,22,13,0.28) 100%)',
        }}
      />

      {/* Title Screen Overlay */}
      {appState === 'title' && (
        <TitleScreen
          bestTotalStrokes={bestTotalStrokes}
          totalPar={TOTAL_COURSE_PAR}
          selectedStartIndex={selectedStartIndex}
          onSelectStartIndex={handleSelectStartIndex}
          onStartGame={handleStartGame}
        />
      )}

      {/* Active Playing HUD */}
      {(appState === 'playing' || appState === 'paused' || appState === 'hole_clear') && (
        <GameHud
          hud={hud}
          muted={muted}
          powerFillRef={powerFillRef}
          powerTextRef={powerTextRef}
          radarBallRef={radarBallRef}
          onToggleOverview={handleToggleOverview}
          onOpenScorecard={() => {
            woodballAudio.playUiTap();
            setShowScorecard(true);
          }}
          onRestartFairway={handleRestartFairway}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
        />
      )}

      {/* Optional In-Game Scorecard Drawer */}
      {showScorecard && appState === 'playing' && (
        <ScorecardModal
          scores={hud.scores}
          currentCourseIndex={hud.courseIndex}
          onClose={() => {
            woodballAudio.playUiTap();
            setShowScorecard(false);
          }}
        />
      )}

      {/* Pause Modal */}
      {appState === 'paused' && (
        <PauseModal
          courseId={hud.courseId}
          courseName={hud.courseName}
          strokes={hud.strokes}
          par={hud.par}
          totalStrokes={hud.totalStrokes}
          totalParCompleted={hud.totalParCompleted}
          onResume={handleTogglePause}
          onRestartFairway={handleRestartFairway}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {/* Fairway Clear Summary Modal (Holes 1-5) */}
      {appState === 'hole_clear' && (
        <HoleClearModal
          courseIndex={hud.courseIndex}
          courseName={hud.courseName}
          par={hud.par}
          strokes={hud.strokes}
          exceededMax={exceededMaxFlag}
          scores={hud.scores}
          onNextCourse={handleNextCourse}
          onRetryCourse={handleRestartFairway}
        />
      )}

      {/* Final Championship Victory / Full Scorecard Modal */}
      {appState === 'gameover' && (
        <ChampionshipVictoryModal
          scores={hud.scores}
          bestTotalStrokes={bestTotalStrokes}
          isNewBest={isNewBest}
          onPlayAgain={() => handleStartGame(0)}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </main>
  );
}
