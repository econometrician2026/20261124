export type ParticleKind = 'grass' | 'wood' | 'sand' | 'water' | 'sparkle';

interface ParticleSlot {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  rot: number;
  vrot: number;
  color: string;
}

const POOL_SIZE = 180;

const GRASS_COLORS = ['#6ac473', '#4da858', '#8ad685', '#3c8a47'];
const WOOD_COLORS = ['#d8a66a', '#c28749', '#ebd0a4', '#9e6231'];
const SAND_COLORS = ['#f0dfb2', '#dec58c', '#f7ecd0', '#cbb075'];
const WATER_COLORS = ['#a7e8f5', '#68c8e2', '#e0f8ff', '#45a7c9'];
const SPARKLE_COLORS = ['#ffd659', '#ff9b42', '#fff6cc', '#d4a34a', '#e85d4a'];

/**
 * Fixed-capacity pooled particle system — zero GC allocation during the 60fps loop.
 */
export class ParticlePool {
  private readonly slots: ParticleSlot[] = [];
  private cursor = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.slots.push({
        active: false,
        kind: 'grass',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        life: 0,
        maxLife: 0.4,
        rot: 0,
        vrot: 0,
        color: '#ffffff',
      });
    }
  }

  clear(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.slots[i].active = false;
    }
  }

  spawnBurst(
    kind: ParticleKind,
    x: number,
    y: number,
    count: number,
    baseAngle: number,
    spread: number,
    speedMin: number,
    speedMax: number
  ): void {
    const palette =
      kind === 'grass'
        ? GRASS_COLORS
        : kind === 'wood'
          ? WOOD_COLORS
          : kind === 'sand'
            ? SAND_COLORS
            : kind === 'water'
              ? WATER_COLORS
              : SPARKLE_COLORS;

    for (let i = 0; i < count; i++) {
      const slot = this.slots[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_SIZE;

      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      slot.active = true;
      slot.kind = kind;
      slot.x = x + (Math.random() - 0.5) * 6;
      slot.y = y + (Math.random() - 0.5) * 6;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.size = kind === 'sparkle' ? 3.5 + Math.random() * 3.5 : 2.5 + Math.random() * 3;
      slot.maxLife =
        kind === 'sparkle' ? 0.65 + Math.random() * 0.55 : 0.28 + Math.random() * 0.28;
      slot.life = slot.maxLife;
      slot.rot = Math.random() * Math.PI * 2;
      slot.vrot = (Math.random() - 0.5) * 10;
      slot.color = palette[Math.floor(Math.random() * palette.length)];
    }
  }

  update(dt: number): void {
    const drag = Math.exp(-3.4 * dt);
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.slots[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
      p.rot += p.vrot * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.slots[i];
      if (!p.active) continue;
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.kind === 'grass') {
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
      } else if (p.kind === 'sparkle') {
        const s = p.size * (0.5 + 0.5 * alpha);
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.4);
        ctx.lineTo(s * 0.55, -s * 0.55);
        ctx.lineTo(s * 1.4, 0);
        ctx.lineTo(s * 0.55, s * 0.55);
        ctx.lineTo(0, s * 1.4);
        ctx.lineTo(-s * 0.55, s * 0.55);
        ctx.lineTo(-s * 1.4, 0);
        ctx.lineTo(-s * 0.55, -s * 0.55);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
