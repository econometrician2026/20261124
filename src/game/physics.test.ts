import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES, BALL_RADIUS } from './courses';
import {
  applyShot,
  checkGateCrossing,
  createInitialBall,
  createInitialGateState,
  formatParDelta,
  getGatePosts,
  getWoodballScoreTerm,
  querySurface,
  simulateAimPreview,
  stepWoodballPhysics,
} from './physics';

test('all 6 fairways have valid tee and gate placements inside bounds and clear of obstacles', () => {
  assert.equal(COURSES.length, 6);
  for (const course of COURSES) {
    const teeSurface = querySurface(course, course.tee.x, course.tee.y);
    assert.ok(
      teeSurface === 'fairway' || teeSurface === 'green',
      `Course ${course.id} tee should sit on fairway/green, got ${teeSurface}`
    );

    const gateSurface = querySurface(course, course.gate.x, course.gate.y);
    assert.equal(
      gateSurface,
      'green',
      `Course ${course.id} gate should sit on the green, got ${gateSurface}`
    );

    // Ensure tee is not overlapping any obstacle
    for (const obs of course.obstacles) {
      const dist = Math.hypot(course.tee.x - obs.x, course.tee.y - obs.y);
      assert.ok(
        dist > BALL_RADIUS + obs.radius + 10,
        `Course ${course.id} tee overlaps obstacle ${obs.id}`
      );
    }
  }
});

test('ball rolls farther on fairway than in rough or sand bunker', () => {
  const c1 = COURSES[0];

  // Fairway shot
  const ballFairway = createInitialBall(c1);
  applyShot(ballFairway, 0, 0.45);
  const gate1 = createInitialGateState();
  for (let i = 0; i < 240; i++) {
    const res = stepWoodballPhysics(c1, ballFairway, gate1, 0.016);
    if (res.stopped) break;
  }
  const fairwayDist = ballFairway.x - c1.tee.x;

  // Sand bunker shot (place inside bunker f1-sand1: x=680, y=195)
  const ballSand = createInitialBall(c1);
  ballSand.x = 670;
  ballSand.y = 195;
  assert.equal(querySurface(c1, ballSand.x, ballSand.y), 'sand');
  applyShot(ballSand, 0, 0.45);
  const gate2 = createInitialGateState();
  for (let i = 0; i < 240; i++) {
    const res = stepWoodballPhysics(c1, ballSand, gate2, 0.016);
    if (res.stopped || res.hazard) break;
  }
  const sandDist = ballSand.x - 670;

  assert.ok(
    fairwayDist > sandDist * 1.4,
    `Expected fairway roll (${fairwayDist.toFixed(1)}) to greatly exceed sand (${sandDist.toFixed(1)})`
  );
});

test('gate crossing distinguishes valid front Gate-In from illegal rear reverse entry', () => {
  const gate = COURSES[0].gate; // entryAngle = 0 (left to right)
  assert.equal(checkGateCrossing(gate, gate.x - 10, gate.y, gate.x + 10, gate.y), 'front');
  assert.equal(checkGateCrossing(gate, gate.x + 10, gate.y, gate.x - 10, gate.y), 'rear');
  // Passing outside post width does not trigger crossing
  assert.equal(
    checkGateCrossing(gate, gate.x - 10, gate.y + gate.halfWidth + 20, gate.x + 10, gate.y + gate.halfWidth + 20),
    null
  );
});

test('physics step triggers gate_in and swings wooden cup on front approach, but NOT on rear approach', () => {
  const course = COURSES[0];

  // 1. Valid front approach
  const ballFront = createInitialBall(course);
  ballFront.x = course.gate.x - 36;
  ballFront.y = course.gate.y;
  applyShot(ballFront, 0, 0.35);
  const gateFront = createInitialGateState();
  let scoredFront = false;
  for (let i = 0; i < 40; i++) {
    const res = stepWoodballPhysics(course, ballFront, gateFront, 0.016);
    if (res.gateIn) {
      scoredFront = true;
      break;
    }
  }
  assert.equal(scoredFront, true, 'Front approach should register Gate-In');
  assert.ok(gateFront.cupAngularVel > 5, 'Gate cup should swing forward when scored');

  // 2. Illegal rear approach
  const ballRear = createInitialBall(course);
  ballRear.x = course.gate.x + 36;
  ballRear.y = course.gate.y;
  applyShot(ballRear, Math.PI, 0.35);
  const gateRear = createInitialGateState();
  let scoredRear = false;
  let sawReverse = false;
  for (let i = 0; i < 40; i++) {
    const res = stepWoodballPhysics(course, ballRear, gateRear, 0.016);
    if (res.gateIn) scoredRear = true;
    if (res.events.some((e) => e.type === 'reverse_gate')) sawReverse = true;
  }
  assert.equal(scoredRear, false, 'Rear approach must NOT register Gate-In');
  assert.equal(sawReverse, true, 'Rear approach should emit reverse_gate event');
});

test('ball rebounds off wooden gate post when hitting post directly', () => {
  const course = COURSES[0];
  const posts = getGatePosts(course.gate);
  const ball = createInitialBall(course);
  ball.x = posts.left.x - 32;
  ball.y = posts.left.y;
  applyShot(ball, 0, 0.4);
  const gate = createInitialGateState();
  let hitPost = false;
  for (let i = 0; i < 30; i++) {
    const res = stepWoodballPhysics(course, ball, gate, 0.016);
    if (res.events.some((e) => e.type === 'post_hit')) {
      hitPost = true;
      break;
    }
  }
  assert.equal(hitPost, true, 'Hitting gate post should emit post_hit event');
  assert.ok(ball.vx < 0, 'Ball hitting front of post head-on should rebound backward');
});

test('slope zone accelerates ball laterally on Fairway 3 side-slope', () => {
  const c3 = COURSES[2];
  const ball = createInitialBall(c3);
  // Place inside f3-sideslope (x: 740..1055, y: 205..480, ay = +108)
  ball.x = 800;
  ball.y = 260;
  applyShot(ball, 0, 0.35);
  const gate = createInitialGateState();
  for (let i = 0; i < 45; i++) {
    stepWoodballPhysics(c3, ball, gate, 0.016);
  }
  assert.ok(ball.y > 275, `Side slope should deflect ball downward (+Y), got y=${ball.y.toFixed(1)}`);
});

test('water hazard and OB detection report hazards accurately', () => {
  const c4 = COURSES[3]; // Jade Lake Crossing
  const ballWater = createInitialBall(c4);
  ballWater.x = 600;
  ballWater.y = 330; // inside f4-lake, off bridge
  ballWater.vx = 50;
  const resWater = stepWoodballPhysics(c4, ballWater, createInitialGateState(), 0.016);
  assert.equal(resWater.hazard, 'water');

  // Bridge over water is safe!
  assert.equal(querySurface(c4, 700, 425), 'bridge');

  // Outside bounds is OB
  const ballOb = createInitialBall(c4);
  ballOb.x = 30;
  ballOb.y = 425;
  ballOb.vx = -20;
  const resOb = stepWoodballPhysics(c4, ballOb, createInitialGateState(), 0.016);
  assert.equal(resOb.hazard, 'ob');
});

test('aim preview produces points and detects timber wall bounce', () => {
  const c1 = COURSES[0];
  const preview = simulateAimPreview(c1, 1020, 230, -0.55, 0.55);
  assert.ok(preview.points.length >= 3);
  assert.ok(preview.bouncePoint !== null, 'Shot aimed into top timber rail should report bouncePoint');
});

test('Woodball scoring terms and par deltas format accurately', () => {
  assert.equal(getWoodballScoreTerm(1, 3).title, '一桿過門！');
  assert.equal(getWoodballScoreTerm(2, 4).title, '老鷹球！');
  assert.equal(getWoodballScoreTerm(3, 4).title, '博蒂！');
  assert.equal(getWoodballScoreTerm(4, 4).title, '標準桿');
  assert.equal(getWoodballScoreTerm(5, 4).title, '柏忌');
  assert.equal(formatParDelta(12, 12), 'E');
  assert.equal(formatParDelta(10, 12), '-2');
  assert.equal(formatParDelta(15, 12), '+3');
});
