import { BALL_RADIUS, MAX_SHOT_SPEED, UNITS_PER_METER } from './courses';
import type {
  BallState,
  FairwayCourse,
  GatePhysicsState,
  GateSpec,
  SlopeZone,
  StrokeEvent,
  SurfaceType,
  Vec2,
  WallSegment,
} from './types';

export const STOP_SPEED_THRESHOLD = 9.5;
export const MAX_DT = 0.05;

/** Friction (linear drag + rolling deceleration) per surface */
export const SURFACE_PHYSICS: Record<
  SurfaceType,
  { linearDrag: number; rollingDecel: number; label: string }
> = {
  green: { linearDrag: 0.52, rollingDecel: 52, label: '攻門果嶺' },
  fairway: { linearDrag: 0.62, rollingDecel: 64, label: '球道草地' },
  bridge: { linearDrag: 0.44, rollingDecel: 42, label: '原木球橋' },
  rough: { linearDrag: 1.55, rollingDecel: 158, label: '長草區' },
  sand: { linearDrag: 3.15, rollingDecel: 340, label: '沙坑' },
  water: { linearDrag: 4.5, rollingDecel: 400, label: '水池障礙' },
  ob: { linearDrag: 1.8, rollingDecel: 180, label: '界外區 OB' },
};

export function pointInPolygon(px: number, py: number, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getGatePosts(gate: GateSpec): { left: Vec2; right: Vec2; dir: Vec2; perp: Vec2 } {
  const dir = { x: Math.cos(gate.entryAngle), y: Math.sin(gate.entryAngle) };
  // Perpendicular vector pointing to gate's left/right posts
  const perp = { x: -dir.y, y: dir.x };
  return {
    left: {
      x: gate.x + perp.x * gate.halfWidth,
      y: gate.y + perp.y * gate.halfWidth,
    },
    right: {
      x: gate.x - perp.x * gate.halfWidth,
      y: gate.y - perp.y * gate.halfWidth,
    },
    dir,
    perp,
  };
}

export function querySurface(course: FairwayCourse, x: number, y: number): SurfaceType {
  if (!pointInPolygon(x, y, course.bounds)) {
    return 'ob';
  }
  // Bridges take precedence over water underneath them
  for (const bridge of course.bridges) {
    if (pointInPolygon(x, y, bridge.points)) {
      return 'bridge';
    }
  }
  for (const water of course.waters) {
    if (pointInPolygon(x, y, water.points)) {
      return 'water';
    }
  }
  for (const bunker of course.bunkers) {
    if (pointInPolygon(x, y, bunker.points)) {
      return 'sand';
    }
  }
  const dx = (x - course.greenCenter.x) / course.greenRadiusX;
  const dy = (y - course.greenCenter.y) / course.greenRadiusY;
  if (dx * dx + dy * dy <= 1) {
    return 'green';
  }
  for (const fairway of course.fairways) {
    if (pointInPolygon(x, y, fairway.points)) {
      return 'fairway';
    }
  }
  return 'rough';
}

export function querySlope(course: FairwayCourse, x: number, y: number): SlopeZone | null {
  for (const slope of course.slopes) {
    if (pointInPolygon(x, y, slope.points)) {
      return slope;
    }
  }
  return null;
}

export function createInitialBall(course: FairwayCourse): BallState {
  return {
    x: course.tee.x,
    y: course.tee.y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    rollPhase: 0,
    rollAngle: course.initialAimAngle,
    lastSafeX: course.tee.x,
    lastSafeY: course.tee.y,
  };
}

export function createInitialGateState(): GatePhysicsState {
  return {
    cupAngle: 0,
    cupAngularVel: 0,
    flashTimer: 0,
  };
}

export function applyShot(ball: BallState, angle: number, powerRatio: number): number {
  const clampedPower = Math.max(0.06, Math.min(1, powerRatio));
  // Subtle ease-in curve so gentle gate putts have finer control
  const speed = MAX_SHOT_SPEED * (0.12 + 0.88 * Math.pow(clampedPower, 1.15));
  ball.lastSafeX = ball.x;
  ball.lastSafeY = ball.y;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.rollAngle = angle;
  return speed;
}

function resolveCircleCollision(
  ball: BallState,
  cx: number,
  cy: number,
  cr: number,
  restitution: number
): number {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const minDist = ball.radius + cr;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist || distSq < 1e-8) {
    return 0;
  }
  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  // Separate overlapping circle
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    const impulse = -(1 + restitution) * vn;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;
    return Math.abs(vn);
  }
  return 0;
}

function resolveSegmentCollision(ball: BallState, wall: WallSegment): number {
  const sx = wall.x2 - wall.x1;
  const sy = wall.y2 - wall.y1;
  const lenSq = sx * sx + sy * sy;
  if (lenSq < 1e-6) return 0;

  let t = ((ball.x - wall.x1) * sx + (ball.y - wall.y1) * sy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = wall.x1 + t * sx;
  const closestY = wall.y1 + t * sy;

  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distSq = dx * dx + dy * dy;
  const minDist = ball.radius + 3.5; // wall half-thickness = 3.5
  if (distSq >= minDist * minDist || distSq < 1e-8) {
    return 0;
  }

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x += nx * (minDist - dist);
  ball.y += ny * (minDist - dist);

  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    const impulse = -(1 + wall.restitution) * vn;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;
    return Math.abs(vn);
  }
  return 0;
}

/**
 * Checks whether the segment (prevX, prevY) -> (currX, currY) crossed the gate threshold line
 * between the two posts.
 * Returns 'front' for valid Woodball Gate-In, 'rear' for illegal reverse entry, or null.
 */
export function checkGateCrossing(
  gate: GateSpec,
  prevX: number,
  prevY: number,
  currX: number,
  currY: number
): 'front' | 'rear' | null {
  const { dir, perp } = getGatePosts(gate);
  const prevRelX = prevX - gate.x;
  const prevRelY = prevY - gate.y;
  const currRelX = currX - gate.x;
  const currRelY = currY - gate.y;

  // Signed distance along entry direction (negative = in front of gate, positive = past gate)
  const prevAlong = prevRelX * dir.x + prevRelY * dir.y;
  const currAlong = currRelX * dir.x + currRelY * dir.y;

  // Must cross plane 0
  if ((prevAlong < 0 && currAlong >= 0) || (prevAlong > 0 && currAlong <= 0)) {
    const denom = currAlong - prevAlong;
    if (Math.abs(denom) < 1e-6) return null;
    const frac = -prevAlong / denom;
    const crossX = prevX + (currX - prevX) * frac;
    const crossY = prevY + (currY - prevY) * frac;

    const lateral = Math.abs((crossX - gate.x) * perp.x + (crossY - gate.y) * perp.y);
    const clearHalfWidth = gate.halfWidth - gate.postRadius * 0.65;
    if (lateral <= clearHalfWidth) {
      return prevAlong < 0 && currAlong >= 0 ? 'front' : 'rear';
    }
  }
  return null;
}

export interface PhysicsStepResult {
  stopped: boolean;
  surface: SurfaceType;
  events: StrokeEvent[];
  gateIn: boolean;
  hazard: 'water' | 'ob' | null;
}

/**
 * Advances ball and hanging gate cup physics by `rawDt` seconds using clamped sub-stepping.
 */
export function stepWoodballPhysics(
  course: FairwayCourse,
  ball: BallState,
  gateState: GatePhysicsState,
  rawDt: number
): PhysicsStepResult {
  const dt = Math.min(Math.max(rawDt, 0), MAX_DT);
  const events: StrokeEvent[] = [];

  // Always tick gate cup damped pendulum physics
  const cupStiffness = 28;
  const cupDamping = 2.6;
  const cupAcc = -cupStiffness * Math.sin(gateState.cupAngle) - cupDamping * gateState.cupAngularVel;
  gateState.cupAngularVel += cupAcc * dt;
  gateState.cupAngle += gateState.cupAngularVel * dt;
  if (gateState.flashTimer > 0) {
    gateState.flashTimer = Math.max(0, gateState.flashTimer - dt);
  }

  const speed0 = Math.hypot(ball.vx, ball.vy);
  const initialSurface = querySurface(course, ball.x, ball.y);

  // If already stationary and not on a strong slope, stay stopped
  const initialSlope = querySlope(course, ball.x, ball.y);
  if (speed0 < 0.01 && !initialSlope) {
    return { stopped: true, surface: initialSurface, events, gateIn: false, hazard: null };
  }

  const substeps = Math.max(1, Math.min(8, Math.ceil((speed0 * dt) / 4.5)));
  const subDt = dt / substeps;

  let prevSurface = initialSurface;
  let gateIn = false;
  let hazard: 'water' | 'ob' | null = null;
  const gatePosts = getGatePosts(course.gate);

  for (let s = 0; s < substeps; s++) {
    const prevX = ball.x;
    const prevY = ball.y;

    const surface = querySurface(course, ball.x, ball.y);
    const slope = querySlope(course, ball.x, ball.y);
    const phys = SURFACE_PHYSICS[surface];

    // Apply slope gravity
    if (slope) {
      ball.vx += slope.ax * subDt;
      ball.vy += slope.ay * subDt;
    }

    // Apply viscous drag + rolling resistance
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0.001) {
      const dragFactor = Math.exp(-phys.linearDrag * subDt);
      ball.vx *= dragFactor;
      ball.vy *= dragFactor;

      const afterDragSpeed = Math.hypot(ball.vx, ball.vy);
      const decel = phys.rollingDecel * subDt;
      if (afterDragSpeed <= decel) {
        ball.vx = 0;
        ball.vy = 0;
      } else {
        const scale = (afterDragSpeed - decel) / afterDragSpeed;
        ball.vx *= scale;
        ball.vy *= scale;
      }
    }

    // Integrate position
    ball.x += ball.vx * subDt;
    ball.y += ball.vy * subDt;

    const stepDist = Math.hypot(ball.x - prevX, ball.y - prevY);
    if (stepDist > 0.01) {
      ball.rollPhase += stepDist / ball.radius;
      ball.rollAngle = Math.atan2(ball.y - prevY, ball.x - prevX);
    }

    // Collide with wooden walls / stone rails
    for (const wall of course.walls) {
      const hitSpeed = resolveSegmentCollision(ball, wall);
      if (hitSpeed > 18) {
        events.push({
          type: 'wall_hit',
          x: ball.x,
          y: ball.y,
          intensity: Math.min(1, hitSpeed / 420),
          material: wall.material,
        });
      }
    }

    // Collide with trees & boulders
    for (const obs of course.obstacles) {
      const hitSpeed = resolveCircleCollision(
        ball,
        obs.x,
        obs.y,
        obs.radius,
        obs.kind === 'boulder' ? 0.68 : 0.62
      );
      if (hitSpeed > 18) {
        events.push({
          type: 'boulder_hit',
          x: ball.x,
          y: ball.y,
          intensity: Math.min(1, hitSpeed / 400),
          material: obs.kind === 'boulder' ? 'stone' : 'timber',
        });
      }
    }

    // Collide with left & right wooden bottle posts of the Gate
    const leftHit = resolveCircleCollision(
      ball,
      gatePosts.left.x,
      gatePosts.left.y,
      course.gate.postRadius,
      0.74
    );
    if (leftHit > 15) {
      events.push({
        type: 'post_hit',
        x: gatePosts.left.x,
        y: gatePosts.left.y,
        intensity: Math.min(1, leftHit / 380),
        material: 'post',
      });
    }

    const rightHit = resolveCircleCollision(
      ball,
      gatePosts.right.x,
      gatePosts.right.y,
      course.gate.postRadius,
      0.74
    );
    if (rightHit > 15) {
      events.push({
        type: 'post_hit',
        x: gatePosts.right.x,
        y: gatePosts.right.y,
        intensity: Math.min(1, rightHit / 380),
        material: 'post',
      });
    }

    // Check Gate crossing (front = valid Gate-In, rear = illegal reverse entry)
    if (!gateIn) {
      const crossing = checkGateCrossing(course.gate, prevX, prevY, ball.x, ball.y);
      if (crossing === 'front') {
        gateIn = true;
        const passSpeed = Math.hypot(ball.vx, ball.vy);
        gateState.cupAngularVel = Math.max(7.5, Math.min(18, passSpeed * 0.045));
        gateState.flashTimer = 1.4;
        // Gently dampen ball past the gate so it comes to rest nicely right behind the cup
        ball.vx *= 0.48;
        ball.vy *= 0.48;
        events.push({
          type: 'gate_in',
          x: course.gate.x,
          y: course.gate.y,
          intensity: 1,
        });
      } else if (crossing === 'rear') {
        gateState.cupAngularVel = -5.5;
        events.push({
          type: 'reverse_gate',
          x: course.gate.x,
          y: course.gate.y,
          intensity: 0.6,
        });
      }
    }

    // Check hazard transitions
    const currSurface = querySurface(course, ball.x, ball.y);
    if (currSurface === 'sand' && prevSurface !== 'sand') {
      events.push({
        type: 'sand_enter',
        x: ball.x,
        y: ball.y,
        intensity: Math.min(1, Math.hypot(ball.vx, ball.vy) / 300),
      });
    }

    if (currSurface === 'water' && !gateIn) {
      hazard = 'water';
      ball.vx = 0;
      ball.vy = 0;
      events.push({
        type: 'water_hazard',
        x: ball.x,
        y: ball.y,
        intensity: 1,
      });
      break;
    }

    if (currSurface === 'ob' && !gateIn) {
      hazard = 'ob';
      ball.vx = 0;
      ball.vy = 0;
      events.push({
        type: 'ob_hazard',
        x: ball.x,
        y: ball.y,
        intensity: 1,
      });
      break;
    }

    prevSurface = currSurface;
  }

  const finalSpeed = Math.hypot(ball.vx, ball.vy);
  const finalSurface = querySurface(course, ball.x, ball.y);
  const finalSlope = querySlope(course, ball.x, ball.y);

  // Stop ball when speed falls below threshold and slope cannot overcome static friction
  const slopeMag = finalSlope ? Math.hypot(finalSlope.ax, finalSlope.ay) : 0;
  const staticThresh = SURFACE_PHYSICS[finalSurface].rollingDecel * 0.72;
  let stopped = false;

  if (!hazard && finalSpeed < STOP_SPEED_THRESHOLD && slopeMag <= staticThresh) {
    ball.vx = 0;
    ball.vy = 0;
    stopped = true;
  }

  return {
    stopped,
    surface: finalSurface,
    events,
    gateIn,
    hazard,
  };
}

/**
 * Simulates a short aiming preview trail (returns polyline points including 1st wall/obstacle bounce).
 */
export function simulateAimPreview(
  course: FairwayCourse,
  startX: number,
  startY: number,
  angle: number,
  powerRatio: number
): { points: Vec2[]; bouncePoint: Vec2 | null } {
  const ghost: BallState = {
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    rollPhase: 0,
    rollAngle: angle,
    lastSafeX: startX,
    lastSafeY: startY,
  };
  applyShot(ghost, angle, powerRatio);
  const dummyGate = createInitialGateState();

  const points: Vec2[] = [{ x: startX, y: startY }];
  let bouncePoint: Vec2 | null = null;
  let totalDist = 0;
  const maxPreviewDist = 110 + powerRatio * 230;
  const stepDt = 0.016;

  for (let i = 0; i < 42; i++) {
    const px = ghost.x;
    const py = ghost.y;
    const res = stepWoodballPhysics(course, ghost, dummyGate, stepDt);
    totalDist += Math.hypot(ghost.x - px, ghost.y - py);

    if (!bouncePoint) {
      const hit = res.events.find(
        (e) => e.type === 'wall_hit' || e.type === 'boulder_hit' || e.type === 'post_hit'
      );
      if (hit) {
        bouncePoint = { x: ghost.x, y: ghost.y };
      }
    }

    if (i % 2 === 1 || res.stopped || res.hazard || res.gateIn) {
      points.push({ x: ghost.x, y: ghost.y });
    }
    if (res.stopped || res.hazard || res.gateIn || totalDist >= maxPreviewDist) {
      break;
    }
  }

  return { points, bouncePoint };
}

export function getDistanceToGateMeters(course: FairwayCourse, x: number, y: number): number {
  const dist = Math.hypot(course.gate.x - x, course.gate.y - y);
  return Math.max(0, Math.round(dist / UNITS_PER_METER));
}

export function getMaxStrokesForPar(par: number): number {
  return par * 2 + 2;
}

export interface ScoreTermInfo {
  title: string;
  subtitle: string;
  tone: 'gold' | 'emerald' | 'cream' | 'amber';
}

export function getWoodballScoreTerm(strokes: number, par: number, exceededMax = false): ScoreTermInfo {
  if (exceededMax) {
    return { title: '超桿結束', subtitle: '本道已達最高桿數上限', tone: 'amber' };
  }
  if (strokes === 1) {
    return { title: '一桿過門！', subtitle: '傳奇精準揮桿・Gate-in-One', tone: 'gold' };
  }
  const diff = strokes - par;
  if (diff <= -2) {
    return { title: '老鷹球！', subtitle: `低於標準桿 ${Math.abs(diff)} 桿`, tone: 'gold' };
  }
  if (diff === -1) {
    return { title: '博蒂！', subtitle: '低於標準桿 1 桿', tone: 'emerald' };
  }
  if (diff === 0) {
    return { title: '標準桿', subtitle: '穩健俐落過門', tone: 'cream' };
  }
  if (diff === 1) {
    return { title: '柏忌', subtitle: '高於標準桿 1 桿', tone: 'amber' };
  }
  if (diff === 2) {
    return { title: '雙柏忌', subtitle: '高於標準桿 2 桿', tone: 'amber' };
  }
  return { title: `+${diff} 桿過門`, subtitle: `高於標準桿 ${diff} 桿`, tone: 'amber' };
}

export function formatParDelta(totalStrokes: number, totalPar: number): string {
  if (totalPar === 0) return 'E';
  const diff = totalStrokes - totalPar;
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export function getChampionshipRank(totalStrokes: number, totalPar: number): {
  title: string;
  description: string;
} {
  const diff = totalStrokes - totalPar;
  if (diff <= -4) {
    return { title: '木球大師', description: '無懈可擊的控球手感與攻門準度' };
  }
  if (diff <= 0) {
    return { title: '錦標賽冠軍', description: '穩健掌控六道地形與標準桿節奏' };
  }
  if (diff <= 4) {
    return { title: '特優好手', description: '精準判讀坡道與折角反彈的好表現' };
  }
  if (diff <= 9) {
    return { title: '球道新星', description: '持續磨練攻門力道即可突破標準桿' };
  }
  return { title: '完賽挑戰者', description: '完成全部六道翠嶺木球賽道挑戰' };
}
