export interface Vec2 {
  x: number;
  y: number;
}

export type SurfaceType =
  | 'green'
  | 'fairway'
  | 'bridge'
  | 'sand'
  | 'rough'
  | 'water'
  | 'ob';

export interface PolygonZone {
  id: string;
  points: Vec2[];
}

export interface SlopeZone {
  id: string;
  points: Vec2[];
  /** Acceleration vector in world units / sec^2 */
  ax: number;
  ay: number;
  /** Label hint e.g. '上坡' | '下坡' | '右傾側坡' */
  label: string;
}

export interface WallSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Restitution factor (0.55 - 0.85) */
  restitution: number;
  material: 'timber' | 'stone';
}

export interface CircleObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: 'tree' | 'boulder' | 'post';
  canopyRadius?: number;
}

export interface GateSpec {
  /** Center point between the two wooden bottle posts */
  x: number;
  y: number;
  /** Angle in radians of the gate's FRONT facing direction (ball enters moving OPPOSITE to facing? No: let's define `entryDir` = unit vector direction ball travels when entering legally from the front!) */
  entryAngle: number;
  /** Distance from center to each post center (total opening width = halfWidth * 2 - postRadius * 2) */
  halfWidth: number;
  postRadius: number;
}

export interface FairwayCourse {
  id: number;
  name: string;
  subtitle: string;
  par: number;
  lengthMeters: number;
  /** World bounding box */
  width: number;
  height: number;
  /** Outer OB boundary polygon; outside this polygon is Out of Bounds */
  bounds: Vec2[];
  /** Main manicured fairway polygons */
  fairways: PolygonZone[];
  /** Circular/oval green apron around gate */
  greenCenter: Vec2;
  greenRadiusX: number;
  greenRadiusY: number;
  /** Bridges override water beneath them */
  bridges: PolygonZone[];
  /** Sand bunkers */
  bunkers: PolygonZone[];
  /** Water hazards */
  waters: PolygonZone[];
  /** Slopes */
  slopes: SlopeZone[];
  /** Wooden rails & stone walls */
  walls: WallSegment[];
  /** Trees & boulders */
  obstacles: CircleObstacle[];
  /** Tee starting position & initial aim angle toward fairway */
  tee: Vec2;
  initialAimAngle: number;
  /** Gate position & legal front-entry direction */
  gate: GateSpec;
}

export type AppGameState = 'title' | 'playing' | 'paused' | 'hole_clear' | 'gameover';

export type PlayPhase = 'ready' | 'swinging' | 'rolling' | 'gate_in' | 'hazard_reset';

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Accumulated visual roll offset for wood grain rendering */
  rollPhase: number;
  rollAngle: number;
  lastSafeX: number;
  lastSafeY: number;
}

export interface GatePhysicsState {
  /** Cup swing angle in radians (0 = hanging vertically, swings when ball passes through) */
  cupAngle: number;
  cupAngularVel: number;
  /** Last triggered highlight timer */
  flashTimer: number;
}

export interface StrokeEvent {
  type:
    | 'strike'
    | 'wall_hit'
    | 'post_hit'
    | 'boulder_hit'
    | 'sand_enter'
    | 'water_hazard'
    | 'ob_hazard'
    | 'reverse_gate'
    | 'gate_in';
  x: number;
  y: number;
  intensity: number;
  material?: 'timber' | 'stone' | 'post';
}

export interface HoleScoreRecord {
  courseId: number;
  courseName: string;
  par: number;
  strokes: number;
  completed: boolean;
  gateInOne: boolean;
}

export interface HudSnapshot {
  courseIndex: number;
  courseId: number;
  courseName: string;
  courseSubtitle: string;
  par: number;
  strokes: number;
  maxStrokes: number;
  totalStrokes: number;
  totalParCompleted: number;
  surface: SurfaceType;
  distanceMeters: number;
  phase: PlayPhase;
  overviewMode: boolean;
  slopeHint: string | null;
  lastCallout: { id: number; text: string; tone: 'good' | 'warn' | 'info' } | null;
  scores: HoleScoreRecord[];
}
