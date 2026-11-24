import type { FairwayCourse } from './types';

export const BALL_RADIUS = 11;
export const UNITS_PER_METER = 18;
export const MAX_SHOT_SPEED = 780;

export const COURSES: FairwayCourse[] = [
  // Fairway 1: Morning Straight — Clean Par 3 opener teaching aim, power & front-entry gate
  {
    id: 1,
    name: '晨曦直道',
    subtitle: '開闊平直的草地賽道，掌握拉桿力道與正面攻門節奏',
    par: 3,
    lengthMeters: 52,
    width: 1320,
    height: 700,
    bounds: [
      { x: 90, y: 150 },
      { x: 1230, y: 150 },
      { x: 1230, y: 550 },
      { x: 90, y: 550 },
    ],
    fairways: [
      {
        id: 'f1-main',
        points: [
          { x: 130, y: 230 },
          { x: 980, y: 215 },
          { x: 1170, y: 245 },
          { x: 1170, y: 455 },
          { x: 980, y: 485 },
          { x: 130, y: 470 },
        ],
      },
    ],
    greenCenter: { x: 1095, y: 350 },
    greenRadiusX: 115,
    greenRadiusY: 105,
    bridges: [],
    bunkers: [
      {
        id: 'f1-sand1',
        points: [
          { x: 640, y: 168 },
          { x: 775, y: 168 },
          { x: 795, y: 215 },
          { x: 735, y: 235 },
          { x: 635, y: 220 },
        ],
      },
      {
        id: 'f1-sand2',
        points: [
          { x: 650, y: 478 },
          { x: 780, y: 472 },
          { x: 800, y: 526 },
          { x: 660, y: 530 },
        ],
      },
    ],
    waters: [],
    slopes: [],
    walls: [
      {
        id: 'f1-rail-top',
        x1: 990,
        y1: 185,
        x2: 1190,
        y2: 225,
        restitution: 0.76,
        material: 'timber',
      },
      {
        id: 'f1-rail-bot',
        x1: 990,
        y1: 515,
        x2: 1190,
        y2: 475,
        restitution: 0.76,
        material: 'timber',
      },
    ],
    obstacles: [
      { id: 'f1-t1', x: 370, y: 118, radius: 14, kind: 'tree', canopyRadius: 48 },
      { id: 'f1-t2', x: 900, y: 110, radius: 14, kind: 'tree', canopyRadius: 52 },
      { id: 'f1-t3', x: 430, y: 585, radius: 14, kind: 'tree', canopyRadius: 46 },
      { id: 'f1-t4', x: 960, y: 590, radius: 15, kind: 'tree', canopyRadius: 54 },
    ],
    tee: { x: 205, y: 350 },
    initialAimAngle: 0,
    gate: {
      x: 1105,
      y: 350,
      entryAngle: 0, // legal entry travelling +X (left to right)
      halfWidth: 34,
      postRadius: 8,
    },
  },

  // Fairway 2: Timber Bend — Dogleg with angled bank rails and corner bunker
  {
    id: 2,
    name: '曲徑木欄',
    subtitle: '善用原木護欄的折角反彈，避開內彎沙坑直取球門',
    par: 4,
    lengthMeters: 68,
    width: 1440,
    height: 780,
    bounds: [
      { x: 85, y: 310 },
      { x: 690, y: 310 },
      { x: 750, y: 110 },
      { x: 1355, y: 110 },
      { x: 1355, y: 510 },
      { x: 980, y: 675 },
      { x: 85, y: 675 },
    ],
    fairways: [
      {
        id: 'f2-leg1',
        points: [
          { x: 125, y: 375 },
          { x: 785, y: 375 },
          { x: 930, y: 455 },
          { x: 910, y: 615 },
          { x: 125, y: 615 },
        ],
      },
      {
        id: 'f2-leg2',
        points: [
          { x: 760, y: 465 },
          { x: 810, y: 165 },
          { x: 1300, y: 165 },
          { x: 1300, y: 435 },
          { x: 905, y: 615 },
        ],
      },
    ],
    greenCenter: { x: 1210, y: 295 },
    greenRadiusX: 115,
    greenRadiusY: 110,
    bridges: [],
    bunkers: [
      {
        id: 'f2-bunker1',
        points: [
          { x: 650, y: 330 },
          { x: 755, y: 320 },
          { x: 775, y: 395 },
          { x: 695, y: 425 },
          { x: 625, y: 385 },
        ],
      },
      {
        id: 'f2-bunker2',
        points: [
          { x: 1090, y: 410 },
          { x: 1215, y: 395 },
          { x: 1245, y: 465 },
          { x: 1120, y: 485 },
        ],
      },
    ],
    waters: [],
    slopes: [],
    walls: [
      {
        id: 'f2-bank-corner',
        x1: 935,
        y1: 638,
        x2: 1095,
        y2: 530,
        restitution: 0.82,
        material: 'timber',
      },
      {
        id: 'f2-bank-top',
        x1: 795,
        y1: 145,
        x2: 1015,
        y2: 145,
        restitution: 0.78,
        material: 'timber',
      },
      {
        id: 'f2-bank-back',
        x1: 1320,
        y1: 190,
        x2: 1320,
        y2: 410,
        restitution: 0.74,
        material: 'timber',
      },
    ],
    obstacles: [
      { id: 'f2-b1', x: 520, y: 468, radius: 19, kind: 'boulder' },
      { id: 'f2-t1', x: 430, y: 255, radius: 15, kind: 'tree', canopyRadius: 50 },
      { id: 'f2-t2', x: 650, y: 200, radius: 15, kind: 'tree', canopyRadius: 54 },
      { id: 'f2-t3', x: 340, y: 718, radius: 14, kind: 'tree', canopyRadius: 46 },
      { id: 'f2-t4', x: 1255, y: 585, radius: 15, kind: 'tree', canopyRadius: 52 },
    ],
    tee: { x: 195, y: 495 },
    initialAimAngle: 0,
    gate: {
      x: 1215,
      y: 290,
      entryAngle: 0,
      halfWidth: 34,
      postRadius: 8,
    },
  },

  // Fairway 3: Twin Slopes — Uphill ridge + lateral side-slope into the green
  {
    id: 3,
    name: '雙坡試煉',
    subtitle: '判讀草地等高線箭頭：先爬升緩坡，再預留右側坡偏移量',
    par: 4,
    lengthMeters: 64,
    width: 1420,
    height: 740,
    bounds: [
      { x: 90, y: 125 },
      { x: 1330, y: 125 },
      { x: 1330, y: 615 },
      { x: 90, y: 615 },
    ],
    fairways: [
      {
        id: 'f3-main',
        points: [
          { x: 130, y: 245 },
          { x: 520, y: 215 },
          { x: 940, y: 185 },
          { x: 1265, y: 215 },
          { x: 1265, y: 540 },
          { x: 890, y: 555 },
          { x: 490, y: 515 },
          { x: 130, y: 485 },
        ],
      },
    ],
    greenCenter: { x: 1175, y: 395 },
    greenRadiusX: 115,
    greenRadiusY: 115,
    bridges: [],
    bunkers: [
      {
        id: 'f3-b1',
        points: [
          { x: 860, y: 490 },
          { x: 1030, y: 495 },
          { x: 1040, y: 580 },
          { x: 870, y: 575 },
        ],
      },
    ],
    waters: [],
    slopes: [
      {
        id: 'f3-uphill',
        points: [
          { x: 375, y: 225 },
          { x: 645, y: 210 },
          { x: 645, y: 525 },
          { x: 375, y: 505 },
        ],
        ax: -95,
        ay: 0,
        label: '逆向上坡',
      },
      {
        id: 'f3-sideslope',
        points: [
          { x: 740, y: 205 },
          { x: 1055, y: 205 },
          { x: 1055, y: 480 },
          { x: 740, y: 480 },
        ],
        ax: 28,
        ay: 108,
        label: '右傾順坡',
      },
    ],
    walls: [
      {
        id: 'f3-top-rail',
        x1: 720,
        y1: 162,
        x2: 1120,
        y2: 162,
        restitution: 0.75,
        material: 'timber',
      },
    ],
    obstacles: [
      { id: 'f3-r1', x: 690, y: 268, radius: 22, kind: 'boulder' },
      { id: 'f3-r2', x: 710, y: 465, radius: 18, kind: 'boulder' },
      { id: 'f3-t1', x: 295, y: 92, radius: 14, kind: 'tree', canopyRadius: 48 },
      { id: 'f3-t2', x: 1165, y: 90, radius: 15, kind: 'tree', canopyRadius: 50 },
      { id: 'f3-t3', x: 315, y: 652, radius: 14, kind: 'tree', canopyRadius: 48 },
    ],
    tee: { x: 195, y: 365 },
    initialAimAngle: 0,
    gate: {
      x: 1185,
      y: 395,
      entryAngle: 0,
      halfWidth: 34,
      postRadius: 8,
    },
  },

  // Fairway 4: Jade Lake Crossing — Wooden bridge over shimmering water + safer north detour
  {
    id: 4,
    name: '翠湖之橋',
    subtitle: '直穿湖心原木橋一舉切近，或繞行北岸草坡穩健過門',
    par: 4,
    lengthMeters: 70,
    width: 1480,
    height: 780,
    bounds: [
      { x: 80, y: 100 },
      { x: 1400, y: 100 },
      { x: 1400, y: 680 },
      { x: 80, y: 680 },
    ],
    fairways: [
      {
        id: 'f4-west',
        points: [
          { x: 120, y: 260 },
          { x: 470, y: 170 },
          { x: 525, y: 540 },
          { x: 120, y: 540 },
        ],
      },
      {
        id: 'f4-north-detour',
        points: [
          { x: 420, y: 150 },
          { x: 1040, y: 140 },
          { x: 1090, y: 265 },
          { x: 445, y: 270 },
        ],
      },
      {
        id: 'f4-east',
        points: [
          { x: 960, y: 185 },
          { x: 1340, y: 215 },
          { x: 1340, y: 575 },
          { x: 955, y: 560 },
        ],
      },
    ],
    greenCenter: { x: 1230, y: 410 },
    greenRadiusX: 115,
    greenRadiusY: 110,
    waters: [
      {
        id: 'f4-lake',
        points: [
          { x: 525, y: 285 },
          { x: 950, y: 275 },
          { x: 970, y: 625 },
          { x: 515, y: 620 },
        ],
      },
    ],
    bridges: [
      {
        id: 'f4-bridge',
        points: [
          { x: 495, y: 382 },
          { x: 980, y: 382 },
          { x: 980, y: 468 },
          { x: 495, y: 468 },
        ],
      },
    ],
    bunkers: [
      {
        id: 'f4-b1',
        points: [
          { x: 1060, y: 520 },
          { x: 1210, y: 525 },
          { x: 1215, y: 605 },
          { x: 1055, y: 595 },
        ],
      },
    ],
    slopes: [
      {
        id: 'f4-north-slope',
        points: [
          { x: 640, y: 155 },
          { x: 900, y: 155 },
          { x: 900, y: 255 },
          { x: 640, y: 255 },
        ],
        ax: 36,
        ay: 26,
        label: '順坡推進',
      },
    ],
    walls: [
      {
        id: 'f4-bridge-top',
        x1: 505,
        y1: 382,
        x2: 970,
        y2: 382,
        restitution: 0.72,
        material: 'timber',
      },
      {
        id: 'f4-bridge-bot',
        x1: 505,
        y1: 468,
        x2: 970,
        y2: 468,
        restitution: 0.72,
        material: 'timber',
      },
    ],
    obstacles: [
      { id: 'f4-t1', x: 250, y: 150, radius: 15, kind: 'tree', canopyRadius: 52 },
      { id: 'f4-t2', x: 1180, y: 148, radius: 15, kind: 'tree', canopyRadius: 50 },
      { id: 'f4-b2', x: 1050, y: 318, radius: 20, kind: 'boulder' },
      { id: 'f4-t3', x: 280, y: 635, radius: 14, kind: 'tree', canopyRadius: 48 },
    ],
    tee: { x: 195, y: 425 },
    initialAimAngle: 0,
    gate: {
      x: 1245,
      y: 415,
      entryAngle: 0,
      halfWidth: 34,
      postRadius: 8,
    },
  },

  // Fairway 5: Boulders & Pines — Long strategic Par 5 weaving through stone pillars & angled gate
  {
    id: 5,
    name: '石陣迴廊',
    subtitle: '長距離五桿賽道，穿梭林間景觀石與斜角球門考驗落點佈局',
    par: 5,
    lengthMeters: 84,
    width: 1620,
    height: 820,
    bounds: [
      { x: 80, y: 110 },
      { x: 1540, y: 110 },
      { x: 1540, y: 710 },
      { x: 80, y: 710 },
    ],
    fairways: [
      {
        id: 'f5-main',
        points: [
          { x: 120, y: 430 },
          { x: 560, y: 400 },
          { x: 820, y: 200 },
          { x: 1475, y: 185 },
          { x: 1475, y: 540 },
          { x: 1040, y: 520 },
          { x: 640, y: 650 },
          { x: 120, y: 645 },
        ],
      },
    ],
    greenCenter: { x: 1365, y: 335 },
    greenRadiusX: 120,
    greenRadiusY: 115,
    bridges: [],
    waters: [],
    bunkers: [
      {
        id: 'f5-b1',
        points: [
          { x: 520, y: 245 },
          { x: 685, y: 215 },
          { x: 710, y: 300 },
          { x: 545, y: 330 },
        ],
      },
      {
        id: 'f5-b2',
        points: [
          { x: 1015, y: 500 },
          { x: 1200, y: 515 },
          { x: 1215, y: 605 },
          { x: 1020, y: 590 },
        ],
      },
    ],
    slopes: [
      {
        id: 'f5-slope-mid',
        points: [
          { x: 840, y: 250 },
          { x: 1140, y: 250 },
          { x: 1140, y: 445 },
          { x: 840, y: 445 },
        ],
        ax: 32,
        ay: -64,
        label: '左傾側坡',
      },
    ],
    walls: [
      {
        id: 'f5-wall-1',
        x1: 720,
        y1: 635,
        x2: 960,
        y2: 535,
        restitution: 0.78,
        material: 'stone',
      },
      {
        id: 'f5-wall-2',
        x1: 1190,
        y1: 160,
        x2: 1485,
        y2: 160,
        restitution: 0.76,
        material: 'timber',
      },
    ],
    obstacles: [
      { id: 'f5-s1', x: 540, y: 525, radius: 24, kind: 'boulder' },
      { id: 'f5-s2', x: 810, y: 365, radius: 22, kind: 'boulder' },
      { id: 'f5-s3', x: 1095, y: 315, radius: 20, kind: 'boulder' },
      { id: 'f5-t1', x: 370, y: 260, radius: 16, kind: 'tree', canopyRadius: 54 },
      { id: 'f5-t2', x: 965, y: 165, radius: 15, kind: 'tree', canopyRadius: 48 },
      { id: 'f5-t3', x: 1380, y: 625, radius: 16, kind: 'tree', canopyRadius: 56 },
    ],
    tee: { x: 195, y: 540 },
    initialAimAngle: -0.18,
    gate: {
      x: 1380,
      y: 325,
      entryAngle: -0.22, // Slight angled approach from bottom-left
      halfWidth: 34,
      postRadius: 8,
    },
  },

  // Fairway 6: Championship Finale — S-curve Par 5 with water flank, banked rail, slope & precision gate
  {
    id: 6,
    name: '冠軍決戰道',
    subtitle: '匯聚水池、逆坡、原木折板與精準攻門區的錦標賽最終戰',
    par: 5,
    lengthMeters: 88,
    width: 1660,
    height: 840,
    bounds: [
      { x: 80, y: 100 },
      { x: 1580, y: 100 },
      { x: 1580, y: 740 },
      { x: 80, y: 740 },
    ],
    fairways: [
      {
        id: 'f6-main',
        points: [
          { x: 120, y: 185 },
          { x: 740, y: 165 },
          { x: 940, y: 320 },
          { x: 1515, y: 295 },
          { x: 1515, y: 655 },
          { x: 760, y: 660 },
          { x: 540, y: 455 },
          { x: 120, y: 455 },
        ],
      },
    ],
    greenCenter: { x: 1405, y: 485 },
    greenRadiusX: 120,
    greenRadiusY: 118,
    bridges: [],
    waters: [
      {
        id: 'f6-pond-south',
        points: [
          { x: 170, y: 515 },
          { x: 545, y: 510 },
          { x: 640, y: 685 },
          { x: 160, y: 690 },
        ],
      },
      {
        id: 'f6-pond-north',
        points: [
          { x: 945, y: 130 },
          { x: 1455, y: 130 },
          { x: 1455, y: 255 },
          { x: 970, y: 265 },
        ],
      },
    ],
    bunkers: [
      {
        id: 'f6-b1',
        points: [
          { x: 745, y: 575 },
          { x: 940, y: 585 },
          { x: 945, y: 670 },
          { x: 745, y: 665 },
        ],
      },
      {
        id: 'f6-b2',
        points: [
          { x: 1185, y: 590 },
          { x: 1335, y: 595 },
          { x: 1345, y: 675 },
          { x: 1185, y: 665 },
        ],
      },
    ],
    slopes: [
      {
        id: 'f6-slope-drop',
        points: [
          { x: 625, y: 270 },
          { x: 870, y: 270 },
          { x: 870, y: 515 },
          { x: 625, y: 515 },
        ],
        ax: 58,
        ay: 75,
        label: '斜下順坡',
      },
      {
        id: 'f6-slope-approach',
        points: [
          { x: 1055, y: 335 },
          { x: 1265, y: 335 },
          { x: 1265, y: 550 },
          { x: 1055, y: 550 },
        ],
        ax: -52,
        ay: 30,
        label: '緩升斜坡',
      },
    ],
    walls: [
      {
        id: 'f6-rail-1',
        x1: 715,
        y1: 155,
        x2: 915,
        y2: 295,
        restitution: 0.82,
        material: 'timber',
      },
      {
        id: 'f6-rail-2',
        x1: 1525,
        y1: 350,
        x2: 1525,
        y2: 615,
        restitution: 0.76,
        material: 'timber',
      },
    ],
    obstacles: [
      { id: 'f6-s1', x: 520, y: 280, radius: 21, kind: 'boulder' },
      { id: 'f6-s2', x: 995, y: 455, radius: 22, kind: 'boulder' },
      { id: 'f6-t1', x: 355, y: 125, radius: 15, kind: 'tree', canopyRadius: 50 },
      { id: 'f6-t2', x: 1515, y: 165, radius: 15, kind: 'tree', canopyRadius: 52 },
      { id: 'f6-t3', x: 1060, y: 705, radius: 15, kind: 'tree', canopyRadius: 50 },
    ],
    tee: { x: 195, y: 315 },
    initialAimAngle: 0.08,
    gate: {
      x: 1415,
      y: 485,
      entryAngle: 0,
      halfWidth: 34,
      postRadius: 8,
    },
  },
];
