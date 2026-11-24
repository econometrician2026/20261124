import { getGatePosts } from './physics';
import type { ParticlePool } from './particles';
import type {
  BallState,
  FairwayCourse,
  GatePhysicsState,
  Vec2,
} from './types';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  shakeTrauma: number;
}

export interface AimRenderState {
  active: boolean;
  angle: number;
  power: number;
  previewPoints: Vec2[];
  bouncePoint: Vec2 | null;
  /** 0 = idle/drawing back, >0..1 = active forward mallet swing */
  swingProgress: number;
  swingPower: number;
  swingAngle: number;
}

function tracePolygon(ctx: CanvasRenderingContext2D, points: Vec2[]): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Pre-renders the static sunlit turf, mowed stripes, sand bunkers, bridges, walls,
 * OB boundary stakes, and boulders onto an offscreen canvas for crisp 60fps performance.
 */
export function buildCourseBaseCanvas(course: FairwayCourse): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = course.width;
  canvas.height = course.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rand = seededRandom(course.id * 7919 + 17);

  // 1. Keep baseCanvas transparent outside course.bounds so it blends seamlessly with the viewport fill (#173c24) without any rectangle seam!

  // 2. Playable in-bounds rough grass
  ctx.save();
  tracePolygon(ctx, course.bounds);
  ctx.fillStyle = '#25663b';
  ctx.fill();
  ctx.clip();

  // Subtle rough lawn diagonal sheen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let x = -course.height; x < course.width + course.height; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 24 - course.height * 0.4, course.height);
    ctx.lineTo(x - course.height * 0.4, course.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3. Manicured Fairway polygons with sunlit mowed stripes
  for (const fw of course.fairways) {
    ctx.save();
    // Soft rough-edge collar shadow
    tracePolygon(ctx, fw.points);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(18, 46, 28, 0.35)';
    ctx.stroke();

    tracePolygon(ctx, fw.points);
    ctx.fillStyle = '#338e4f';
    ctx.fill();
    ctx.clip();

    // Alternating sunlit mowed stripes
    const stripeW = 34;
    ctx.fillStyle = '#3ea15c';
    for (let x = -course.height; x < course.width + course.height; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW - course.height * 0.25, course.height);
      ctx.lineTo(x - course.height * 0.25, course.height);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle sunlit top highlight across fairway
    const sunGrad = ctx.createLinearGradient(0, 0, course.width, course.height);
    sunGrad.addColorStop(0, 'rgba(255, 248, 210, 0.1)');
    sunGrad.addColorStop(1, 'rgba(12, 34, 20, 0.06)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, course.width, course.height);
    ctx.restore();
  }

  // 4. Gate Green (攻門區果嶺)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    course.greenCenter.x,
    course.greenCenter.y,
    course.greenRadiusX + 5,
    course.greenRadiusY + 5,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(20, 56, 33, 0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    course.greenCenter.x,
    course.greenCenter.y,
    course.greenRadiusX,
    course.greenRadiusY,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = '#4cb368';
  ctx.fill();
  ctx.clip();

  // Fine concentric mowing rings on green
  ctx.strokeStyle = 'rgba(255, 255, 230, 0.09)';
  ctx.lineWidth = 10;
  for (let r = 22; r < Math.max(course.greenRadiusX, course.greenRadiusY) + 15; r += 26) {
    ctx.beginPath();
    ctx.arc(course.gate.x, course.gate.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Official 5m Gate Area chalk ring
  ctx.save();
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = 'rgba(248, 244, 230, 0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(course.gate.x, course.gate.y, 76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 5. Slope Zones (translucent contour chevrons)
  for (const slope of course.slopes) {
    ctx.save();
    tracePolygon(ctx, slope.points);
    ctx.fillStyle = 'rgba(240, 248, 200, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(240, 248, 200, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.clip();

    // Compute slope bounding box & direction angle
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of slope.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const slopeAngle = Math.atan2(slope.ay, slope.ax);
    ctx.strokeStyle = 'rgba(252, 246, 212, 0.42)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const spacing = 46;
    for (let x = minX + 24; x < maxX - 10; x += spacing) {
      for (let y = minY + 24; y < maxY - 10; y += spacing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(slopeAngle);
        ctx.beginPath();
        ctx.moveTo(-7, -6);
        ctx.lineTo(3, 0);
        ctx.lineTo(-7, 6);
        ctx.moveTo(1, -6);
        ctx.lineTo(11, 0);
        ctx.lineTo(1, 6);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // 6. Sand Bunkers (bright warm sunlit sand)
  for (const bunker of course.bunkers) {
    ctx.save();
    tracePolygon(ctx, bunker.points);
    ctx.fillStyle = '#c4a66e';
    ctx.fill();

    // Inner recessed sand body
    ctx.save();
    tracePolygon(ctx, bunker.points);
    ctx.clip();
    ctx.translate(3, 4);
    tracePolygon(ctx, bunker.points);
    const sandGrad = ctx.createLinearGradient(0, 0, course.width * 0.5, course.height * 0.5);
    sandGrad.addColorStop(0, '#f5e7be');
    sandGrad.addColorStop(1, '#e6d099');
    ctx.fillStyle = sandGrad;
    ctx.fill();

    // Fine sand speckles
    let bMinX = Infinity,
      bMaxX = -Infinity,
      bMinY = Infinity,
      bMaxY = -Infinity;
    for (const p of bunker.points) {
      if (p.x < bMinX) bMinX = p.x;
      if (p.x > bMaxX) bMaxX = p.x;
      if (p.y < bMinY) bMinY = p.y;
      if (p.y > bMaxY) bMaxY = p.y;
    }
    for (let i = 0; i < 85; i++) {
      const sx = bMinX + rand() * (bMaxX - bMinX);
      const sy = bMinY + rand() * (bMaxY - bMinY);
      ctx.fillStyle = rand() > 0.5 ? 'rgba(130, 98, 48, 0.16)' : 'rgba(255, 250, 232, 0.42)';
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.restore();

    tracePolygon(ctx, bunker.points);
    ctx.strokeStyle = 'rgba(92, 72, 38, 0.42)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // 7. Water Ponds (base shoreline & depth gradient; ripples animate live)
  for (const water of course.waters) {
    ctx.save();
    tracePolygon(ctx, water.points);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#c8b489'; // sandy bank lip
    ctx.stroke();

    tracePolygon(ctx, water.points);
    const wGrad = ctx.createLinearGradient(0, 120, 0, course.height - 120);
    wGrad.addColorStop(0, '#2a8aa6');
    wGrad.addColorStop(0.55, '#1e6e8a');
    wGrad.addColorStop(1, '#165269');
    ctx.fillStyle = wGrad;
    ctx.fill();

    tracePolygon(ctx, water.points);
    ctx.strokeStyle = 'rgba(218, 246, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // 8. Timber Bridges (drawn OVER water!)
  for (const bridge of course.bridges) {
    ctx.save();
    // Cast shadow onto pond below
    ctx.save();
    ctx.translate(0, 8);
    tracePolygon(ctx, bridge.points);
    ctx.fillStyle = 'rgba(8, 26, 36, 0.38)';
    ctx.fill();
    ctx.restore();

    tracePolygon(ctx, bridge.points);
    ctx.fillStyle = '#9c6b3d';
    ctx.fill();
    ctx.clip();

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of bridge.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Individual hardwood planks
    for (let x = minX; x < maxX; x += 18) {
      ctx.fillStyle = (Math.floor(x / 18) % 2 === 0 ? '#a97746' : '#946336');
      ctx.fillRect(x, minY, 16, maxY - minY);
      ctx.fillStyle = 'rgba(42, 24, 12, 0.45)';
      ctx.fillRect(x + 16, minY, 2, maxY - minY);
      // Nail heads
      ctx.fillStyle = 'rgba(46, 30, 16, 0.55)';
      ctx.beginPath();
      ctx.arc(x + 8, minY + 9, 1.5, 0, Math.PI * 2);
      ctx.arc(x + 8, maxY - 9, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 9. Crisp Chalk OB Boundary Line + Painted OB Stakes
  ctx.save();
  tracePolygon(ctx, course.bounds);
  ctx.strokeStyle = 'rgba(247, 244, 232, 0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // OB White/Red stakes every ~95 units along boundary perimeter
  for (let i = 0; i < course.bounds.length; i++) {
    const a = course.bounds[i];
    const b = course.bounds[(i + 1) % course.bounds.length];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(1, Math.floor(segLen / 105));
    for (let k = 0; k < count; k++) {
      const t = k / count;
      const sx = a.x + (b.x - a.x) * t;
      const sy = a.y + (b.y - a.y) * t;
      ctx.fillStyle = 'rgba(10, 24, 14, 0.45)';
      ctx.beginPath();
      ctx.arc(sx + 2, sy + 2.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8f5ea';
      ctx.beginPath();
      ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c84b31';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 10. Teeing Area Mat (發球區)
  ctx.save();
  ctx.translate(course.tee.x, course.tee.y);
  ctx.rotate(course.initialAimAngle);

  // Subtle turf mat
  ctx.fillStyle = 'rgba(245, 238, 212, 0.14)';
  ctx.strokeStyle = 'rgba(248, 243, 224, 0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-24, -38, 48, 76, 6);
  ctx.fill();
  ctx.stroke();

  // Two painted wooden tee markers
  for (const dy of [-32, 32]) {
    ctx.fillStyle = 'rgba(12, 22, 14, 0.4)';
    ctx.beginPath();
    ctx.arc(2, dy + 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4a34a';
    ctx.beginPath();
    ctx.arc(0, dy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4c3214';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();

  // 11. Timber Bank Rails & Stone Walls
  for (const wall of course.walls) {
    ctx.save();
    ctx.lineCap = 'round';
    // Drop shadow
    ctx.strokeStyle = 'rgba(10, 22, 12, 0.42)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(wall.x1 + 3, wall.y1 + 4);
    ctx.lineTo(wall.x2 + 3, wall.y2 + 4);
    ctx.stroke();

    // Main beam body
    ctx.strokeStyle = wall.material === 'timber' ? '#5e3819' : '#5e6662';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();

    // Sunlit top bevel highlight
    ctx.strokeStyle = wall.material === 'timber' ? '#b87d44' : '#9aa39e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1 - 1);
    ctx.lineTo(wall.x2, wall.y2 - 1);
    ctx.stroke();

    // End post bolts
    for (const pt of [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 },
    ]) {
      ctx.fillStyle = wall.material === 'timber' ? '#3d220d' : '#404744';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d4a34a';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 12. Ornamental Boulders (Trees rendered dynamically above ball for canopy depth!)
  for (const obs of course.obstacles) {
    if (obs.kind !== 'boulder') continue;
    ctx.save();
    ctx.translate(obs.x, obs.y);
    // Drop shadow
    ctx.fillStyle = 'rgba(10, 24, 14, 0.38)';
    ctx.beginPath();
    ctx.ellipse(4, 6, obs.radius * 1.05, obs.radius * 0.92, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Sculpted stone silhouette
    const stoneGrad = ctx.createRadialGradient(
      -obs.radius * 0.35,
      -obs.radius * 0.35,
      2,
      0,
      0,
      obs.radius * 1.05
    );
    stoneGrad.addColorStop(0, '#c0c7c0');
    stoneGrad.addColorStop(0.55, '#869088');
    stoneGrad.addColorStop(1, '#525b54');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 42, 36, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Moss patch accent
    ctx.fillStyle = 'rgba(72, 128, 66, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-obs.radius * 0.2, obs.radius * 0.28, obs.radius * 0.45, obs.radius * 0.22, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return canvas;
}

/**
 * Draws the iconic Woodball Gate (two turned bottle-shaped wooden posts, crossbar,
 * ground front-approach indicator chevron, and swinging lacquered red wooden cup).
 */
function renderWoodballGate(
  ctx: CanvasRenderingContext2D,
  course: FairwayCourse,
  gateState: GatePhysicsState,
  time: number
): void {
  const { gate } = course;
  const { left, right, dir } = getGatePosts(gate);

  // 1. Subtle front-approach turf chevron so player immediately knows legal attack side!
  const frontX = gate.x - dir.x * 42;
  const frontY = gate.y - dir.y * 42;
  const pulse = 0.68 + 0.32 * Math.sin(time * 2.8);

  ctx.save();
  ctx.translate(frontX, frontY);
  ctx.rotate(gate.entryAngle);
  ctx.strokeStyle =
    gateState.flashTimer > 0
      ? `rgba(255, 222, 105, ${0.85})`
      : `rgba(247, 236, 185, ${0.42 * pulse})`;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -11);
  ctx.lineTo(2, 0);
  ctx.lineTo(-10, 11);
  ctx.moveTo(2, -9);
  ctx.lineTo(12, 0);
  ctx.lineTo(2, 9);
  ctx.stroke();
  ctx.restore();

  // Gate threshold chalk line between posts
  ctx.save();
  ctx.strokeStyle =
    gateState.flashTimer > 0 ? 'rgba(255, 214, 89, 0.92)' : 'rgba(250, 245, 230, 0.55)';
  ctx.lineWidth = gateState.flashTimer > 0 ? 3.2 : 2;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.stroke();
  ctx.restore();

  // 2. Ground shadows for posts & swinging wooden cup
  ctx.save();
  ctx.fillStyle = 'rgba(10, 24, 14, 0.36)';
  ctx.beginPath();
  ctx.ellipse(left.x + 6, left.y + 7, gate.postRadius * 1.15, gate.postRadius * 0.9, 0, 0, Math.PI * 2);
  ctx.ellipse(right.x + 6, right.y + 7, gate.postRadius * 1.15, gate.postRadius * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow of crossbar
  ctx.strokeStyle = 'rgba(10, 24, 14, 0.24)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(left.x + 9, left.y + 10);
  ctx.lineTo(right.x + 9, right.y + 10);
  ctx.stroke();
  ctx.restore();

  // 3. Turned bottle-shaped wooden posts (left & right)
  for (const post of [left, right]) {
    ctx.save();
    ctx.translate(post.x, post.y);
    // Base ring
    const postGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, gate.postRadius + 2);
    postGrad.addColorStop(0, '#f0d2a2');
    postGrad.addColorStop(0.55, '#b67336');
    postGrad.addColorStop(1, '#5e3412');
    ctx.fillStyle = postGrad;
    ctx.beginPath();
    ctx.arc(0, 0, gate.postRadius + 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Bottle neck cap (classic Woodball upright silhouette)
    ctx.fillStyle = '#e5be82';
    ctx.beginPath();
    ctx.arc(-1, -1.5, gate.postRadius * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3d200a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, gate.postRadius + 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Elevated Crossbar connecting the two bottle posts
  ctx.save();
  ctx.strokeStyle = '#4a2910';
  ctx.lineWidth = 7.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left.x, left.y - 2);
  ctx.lineTo(right.x, right.y - 2);
  ctx.stroke();

  ctx.strokeStyle = '#d49a56';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y - 3);
  ctx.lineTo(right.x, right.y - 3);
  ctx.stroke();
  ctx.restore();

  // 5. Suspended Lacquered Red-Amber Wooden Cup (酒杯 / 門杯) — swings along entry direction!
  const swingOffset = Math.sin(gateState.cupAngle) * 16;
  const cupX = gate.x + dir.x * swingOffset;
  const cupY = gate.y + dir.y * swingOffset - 2;
  const cupScale = 1 + Math.abs(Math.sin(gateState.cupAngle)) * 0.22;

  ctx.save();
  ctx.translate(cupX, cupY);
  ctx.rotate(gate.entryAngle);

  // Hanging brass hinge ring
  ctx.fillStyle = '#e3b85b';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Cup body (iconic red-lacquered wooden bell/goblet)
  const cupGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11 * cupScale);
  cupGrad.addColorStop(0, '#ff8e6e');
  cupGrad.addColorStop(0.55, '#c93827');
  cupGrad.addColorStop(1, '#781912');
  ctx.fillStyle = cupGrad;
  ctx.beginPath();
  ctx.ellipse(
    Math.sin(gateState.cupAngle) * 4,
    0,
    8.5 * cupScale,
    10.5,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.strokeStyle = '#47100b';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Golden celebratory rim band on the wooden cup
  ctx.strokeStyle = '#f4ce6a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(Math.sin(gateState.cupAngle) * 4, 0, 4.8 * cupScale, 6.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Celebratory radial pulse ring on Gate-In
  if (gateState.flashTimer > 0) {
    const t = 1 - gateState.flashTimer / 1.4;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 224, 112, ${(1 - t) * 0.85})`;
    ctx.lineWidth = 3.5 * (1 - t * 0.5);
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, 18 + t * 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Draws the solid hardwood Woodball sphere with rolling wood-grain stripes.
 */
function renderWoodenBall(ctx: CanvasRenderingContext2D, ball: BallState): void {
  const { x, y, radius, rollPhase, rollAngle } = ball;

  // Ground drop shadow
  ctx.save();
  ctx.fillStyle = 'rgba(10, 22, 12, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x + 3.2, y + 4.2, radius * 1.04, radius * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wooden sphere body
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, 1.5, 0, 0, radius);
  grad.addColorStop(0, '#f6dfb3');
  grad.addColorStop(0.45, '#d59a55');
  grad.addColorStop(0.85, '#9d5f29');
  grad.addColorStop(1, '#5e3414');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  // Rolling wood-grain bands synchronized to rollPhase & rollAngle
  ctx.rotate(rollAngle);
  const bandOffset = ((rollPhase * 4.5) % (radius * 2.2)) - radius * 1.1;
  ctx.strokeStyle = 'rgba(72, 37, 12, 0.36)';
  ctx.lineWidth = 1.6;
  for (const shift of [-radius * 1.1, 0, radius * 1.1]) {
    const bx = bandOffset + shift;
    ctx.beginPath();
    ctx.ellipse(bx, 0, 2.4, radius * 1.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Painted tournament stripe around ball equator
  ctx.strokeStyle = 'rgba(196, 56, 39, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bandOffset, -radius);
  ctx.lineTo(bandOffset, radius);
  ctx.stroke();

  ctx.restore();

  // Subtle rim outline & sunlit specular dot
  ctx.save();
  ctx.strokeStyle = 'rgba(54, 29, 10, 0.72)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 250, 232, 0.65)';
  ctx.beginPath();
  ctx.ellipse(x - radius * 0.34, y - radius * 0.34, 3.2, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the authentic bottle-shaped Woodball Mallet (木球桿) behind the ball
 * with smooth pull-back charging and active forward strike swing.
 */
function renderWoodballMallet(
  ctx: CanvasRenderingContext2D,
  ball: BallState,
  aim: AimRenderState
): void {
  const isSwinging = aim.swingProgress > 0 && aim.swingProgress < 1;
  if (!aim.active && !isSwinging) return;

  const angle = isSwinging ? aim.swingAngle : aim.angle;
  const power = isSwinging ? aim.swingPower : aim.power;

  let pullback = 18 + power * 48;
  if (isSwinging) {
    // Windup -> snappy forward strike -> brief follow-through
    const p = aim.swingProgress;
    if (p < 0.38) {
      const t = p / 0.38;
      const ease = t * t * t;
      pullback = (18 + power * 48) * (1 - ease) + 9 * ease;
    } else {
      const t = (p - 0.38) / 0.62;
      pullback = 9 - Math.sin(t * Math.PI) * 14;
    }
  }

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(angle);
  ctx.translate(-pullback - ball.radius, 0);

  // Mallet shadow
  ctx.fillStyle = 'rgba(10, 22, 12, 0.36)';
  ctx.beginPath();
  ctx.roundRect(-42, -6, 44, 18, 6);
  ctx.fill();

  // Angled shaft extending sideways (top-down wooden handle cue)
  ctx.strokeStyle = '#3d2411';
  ctx.lineWidth = 5.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-19, 0);
  ctx.lineTo(-27, -36);
  ctx.stroke();

  ctx.strokeStyle = '#d4a66a';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-19, 0);
  ctx.lineTo(-27, -36);
  ctx.stroke();

  // Bottle-shaped solid hardwood mallet head
  const headGrad = ctx.createLinearGradient(0, -10, 0, 10);
  headGrad.addColorStop(0, '#e8be82');
  headGrad.addColorStop(0.5, '#a8652e');
  headGrad.addColorStop(1, '#5d3110');
  ctx.fillStyle = headGrad;

  ctx.beginPath();
  ctx.moveTo(-4, -8.5);
  ctx.lineTo(-26, -8.5);
  ctx.quadraticCurveTo(-34, -7.5, -39, -4.5);
  ctx.lineTo(-44, -4.5);
  ctx.lineTo(-44, 4.5);
  ctx.lineTo(-39, 4.5);
  ctx.quadraticCurveTo(-34, 7.5, -26, 8.5);
  ctx.lineTo(-4, 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a1f0b';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Brass decorative collar stripe on mallet head
  ctx.fillStyle = '#e2b758';
  ctx.fillRect(-13, -8, 3, 16);

  // Iconic black rubber impact cap on the front striking nose
  ctx.fillStyle = '#222426';
  ctx.beginPath();
  ctx.roundRect(-5, -8.5, 6.5, 17, [0, 3, 3, 0]);
  ctx.fill();
  ctx.strokeStyle = '#0e0f10';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders the diegetic world-space aiming arc and dotted trajectory preview.
 */
function renderAimGuide(
  ctx: CanvasRenderingContext2D,
  ball: BallState,
  aim: AimRenderState
): void {
  if (!aim.active || aim.power < 0.03) return;

  // 1. Dotted trajectory preview
  const pts = aim.previewPoints;
  if (pts.length >= 2) {
    ctx.save();
    for (let i = 1; i < pts.length; i++) {
      const frac = i / pts.length;
      const alpha = (1 - frac * 0.78) * 0.92;
      const r = 4.2 * (1 - frac * 0.45);
      ctx.fillStyle = `rgba(255, 246, 214, ${alpha})`;
      ctx.strokeStyle = `rgba(26, 20, 12, ${alpha * 0.65})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Highlight bounce point when banking off wooden rails/boulders
  if (aim.bouncePoint) {
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 198, 92, 0.92)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(aim.bouncePoint.x, aim.bouncePoint.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Curved brass power meter ring around the ball
  ctx.save();
  ctx.translate(ball.x, ball.y);
  const ringR = 25;
  ctx.strokeStyle = 'rgba(20, 18, 12, 0.42)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, aim.angle - 0.85, aim.angle + 0.85);
  ctx.stroke();

  const powerColor =
    aim.power < 0.45 ? '#66cf7a' : aim.power < 0.78 ? '#f0be4a' : '#e45c3e';
  ctx.strokeStyle = powerColor;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  const halfSpan = 0.82 * aim.power;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, aim.angle - halfSpan, aim.angle + halfSpan);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders park tree trunks & gently swaying multi-layered foliage canopies above the fairway.
 */
function renderTrees(ctx: CanvasRenderingContext2D, course: FairwayCourse, time: number): void {
  for (let i = 0; i < course.obstacles.length; i++) {
    const obs = course.obstacles[i];
    if (obs.kind !== 'tree') continue;
    const canopyR = obs.canopyRadius ?? 48;
    const swayX = Math.sin(time * 1.15 + i * 1.7) * 2.4;
    const swayY = Math.cos(time * 0.9 + i * 2.1) * 1.6;

    ctx.save();
    // Dappled canopy shadow on grass
    ctx.fillStyle = 'rgba(10, 24, 14, 0.24)';
    ctx.beginPath();
    ctx.arc(obs.x + 14 + swayX * 0.6, obs.y + 16 + swayY * 0.6, canopyR * 0.96, 0, Math.PI * 2);
    ctx.fill();

    // Solid hardwood trunk (exact collision circle!)
    ctx.fillStyle = '#5c3a1f';
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#361f0e';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Multi-lobe leafy canopy
    const cx = obs.x + swayX;
    const cy = obs.y + swayY;
    ctx.fillStyle = '#1b502c';
    ctx.beginPath();
    ctx.arc(cx, cy, canopyR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#25693a';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i * 0.6;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(a) * canopyR * 0.36,
        cy + Math.sin(a) * canopyR * 0.36,
        canopyR * 0.52,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Sunlit top-left foliage highlight
    ctx.fillStyle = '#3d8b4e';
    ctx.beginPath();
    ctx.arc(cx - canopyR * 0.22, cy - canopyR * 0.22, canopyR * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Renders subtle live animated shimmer lines inside water hazards.
 */
function renderWaterRipples(
  ctx: CanvasRenderingContext2D,
  course: FairwayCourse,
  time: number
): void {
  if (course.waters.length === 0) return;
  for (const water of course.waters) {
    ctx.save();
    tracePolygon(ctx, water.points);
    ctx.clip();

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of water.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    ctx.strokeStyle = 'rgba(218, 248, 255, 0.24)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    for (let row = 0; row < 6; row++) {
      const y = minY + ((row + 0.5) / 6) * (maxY - minY);
      const drift = Math.sin(time * 1.4 + row * 1.3) * 14;
      for (let col = 0; col < 3; col++) {
        const x = minX + ((col + 0.35) / 3) * (maxX - minX) + drift;
        ctx.beginPath();
        ctx.moveTo(x - 16, y);
        ctx.quadraticCurveTo(x, y - 3.5, x + 16, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export function renderWoodballScene(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  course: FairwayCourse,
  baseCanvas: HTMLCanvasElement,
  ball: BallState,
  gateState: GatePhysicsState,
  camera: CameraState,
  aim: AimRenderState,
  particles: ParticlePool,
  time: number,
  showReadyCue = false
): void {
  // Deep forest backdrop fill — baseCanvas is transparent outside course.bounds so zero edge seam exists
  ctx.fillStyle = '#173c24';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  // Camera shake offset (trauma^2)
  const shakeMag = camera.shakeTrauma * camera.shakeTrauma * 12;
  const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
  const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

  ctx.save();
  ctx.translate(viewportWidth * 0.5 + shakeX, viewportHeight * 0.5 + shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // 1. Pre-rendered crisp course terrain
  ctx.drawImage(baseCanvas, 0, 0);

  // 2. Live animated water shimmer (with bridges re-stamped cleanly above ripples)
  if (course.waters.length > 0) {
    renderWaterRipples(ctx, course, time);
    for (const bridge of course.bridges) {
      ctx.save();
      tracePolygon(ctx, bridge.points);
      ctx.clip();
      ctx.drawImage(baseCanvas, 0, 0);
      ctx.restore();
    }
  }

  // 3. Ready stance breathing cue + aim guide below ball
  if (showReadyCue && !aim.active && aim.swingProgress === 0) {
    const pulse = 0.55 + 0.45 * Math.sin(time * 3.4);
    ctx.save();
    ctx.strokeStyle = `rgba(246, 214, 126, ${0.32 + pulse * 0.32})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 9 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  renderAimGuide(ctx, ball, aim);

  // 4. Wooden ball
  renderWoodenBall(ctx, ball);

  // 5. Bottle-shaped wooden mallet (rests lightly behind ball when ready)
  if (showReadyCue && !aim.active && aim.swingProgress === 0) {
    const restAngle = Math.atan2(course.gate.y - ball.y, course.gate.x - ball.x);
    renderWoodballMallet(ctx, ball, {
      ...aim,
      active: true,
      angle: restAngle,
      power: 0.02,
    });
  } else {
    renderWoodballMallet(ctx, ball, aim);
  }

  // 6. Iconic Woodball Gate (posts + crossbar + swinging red wooden cup)
  renderWoodballGate(ctx, course, gateState, time);

  // 7. Pooled particles
  particles.render(ctx);

  // 8. Park trees with swaying canopies above playfield
  renderTrees(ctx, course, time);

  ctx.restore();
}
