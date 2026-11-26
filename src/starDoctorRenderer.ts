import doctorUrl from './assets/star-doctor-body.png';
import handUrl from './assets/star-doctor-hand.png';

export interface StarDoctorPose { x: number; y: number; size: number; tilt: number }
interface Point { x: number; y: number }
export interface StarDoctorHand { side: 'left' | 'right'; x: number; y: number; squash: number }

function bodyAngle(pose: StarDoctorPose): number {
  return Math.max(-0.08, Math.min(0.08, pose.tilt * 0.4));
}

export function starDoctorPoint(pose: StarDoctorPose, u: number, v: number): Point {
  const x = (u - 0.485) * pose.size;
  const y = (v - 0.65) * pose.size;
  const angle = bodyAngle(pose);
  return { x: pose.x + x * Math.cos(angle) - y * Math.sin(angle), y: pose.y + x * Math.sin(angle) + y * Math.cos(angle) };
}

export function starDoctorArm(pose: StarDoctorPose, hand: StarDoctorHand, cover: number) {
  const sign = hand.side === 'left' ? -1 : 1;
  const shoulder = starDoctorPoint(pose, hand.side === 'left' ? 0.38 : 0.59, 0.65);
  const eye = starDoctorPoint(pose, 0.485 + sign * 19.95 / pose.size, 0.425);
  const amount = Math.max(0, Math.min(1, cover));
  const target = { x: hand.x * (1 - amount) + eye.x * amount, y: hand.y * (1 - amount) + eye.y * amount };
  const distance = Math.hypot(target.x - shoulder.x, target.y - shoulder.y);
  const bend = Math.min(18, distance * 0.18);
  const elbow = { x: (shoulder.x + target.x) / 2 + sign * bend, y: (shoulder.y + target.y) / 2 };
  const forearmLength = Math.max(1, Math.hypot(target.x - elbow.x, target.y - elbow.y));
  const wrist = { x: target.x - (target.x - elbow.x) / forearmLength * 14, y: target.y - (target.y - elbow.y) / forearmLength * 14 };
  return { shoulder, elbow, wrist, target };
}

export class StarDoctorRenderer {
  private image: HTMLImageElement | null = null;
  private handImage: HTMLImageElement | null = null;
  private failed = false;

  constructor(private readonly onReady: () => void) {}

  public prepare(): void {
    if (this.image) return;
    this.failed = false;
    const load = (url: string) => {
      const image = new Image();
      image.onload = this.onReady;
      image.onerror = () => {
        this.failed = true;
        console.error('Could not load a Star Doctor character image:', url);
        this.onReady();
      };
      image.src = url;
      return image;
    };
    this.image = load(doctorUrl);
    this.handImage = load(handUrl);
  }

  public release(): void {
    for (const image of [this.image, this.handImage]) {
      if (!image) continue;
      image.onload = null;
      image.onerror = null;
      image.src = '';
    }
    this.image = null;
    this.handImage = null;
    this.failed = false;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    pose: StarDoctorPose,
    drawFace: () => void,
  ): void {
    if (!this.image?.complete || !this.image.naturalWidth) {
      if (this.failed) {
        ctx.save();
        ctx.fillStyle = '#f5b82b';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', pose.x, pose.y);
        ctx.restore();
      }
      return;
    }
    const { x, y, size } = pose;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bodyAngle(pose));
    // Artwork anchors: face center (0.485, 0.425), shoulders at y=0.65.
    ctx.drawImage(this.image, -size * 0.485, -size * 0.65, size, size);
    ctx.translate(0, -size * 0.225);
    ctx.scale(0.95, 1.25);
    drawFace();
    ctx.restore();
  }

  public renderSleeves(ctx: CanvasRenderingContext2D, pose: StarDoctorPose, hands: StarDoctorHand[], cover: number, layer: 'upper' | 'lower'): void {
    if (!this.image?.complete || !this.image.naturalWidth) return;
    ctx.save();
    ctx.lineWidth = 1.65;
    ctx.strokeStyle = '#392b16';
    ctx.fillStyle = '#fff4db';
    const amount = Math.max(0, Math.min(1, cover));
    for (const hand of hands) {
      const arm = starDoctorArm(pose, hand, cover);
      if (layer === 'upper') {
        ctx.globalAlpha = 1 - amount;
        this.drawSleeve(ctx, arm);
      } else {
        if (amount < 1) {
          ctx.save();
          ctx.globalAlpha = 1 - amount;
          const length = Math.max(1, Math.hypot(arm.wrist.x - arm.elbow.x, arm.wrist.y - arm.elbow.y));
          const ux = (arm.wrist.x - arm.elbow.x) / length;
          const uy = (arm.wrist.y - arm.elbow.y) / length;
          const x = arm.elbow.x - ux * 3;
          const y = arm.elbow.y - uy * 3;
          // Clip a complete sleeve, so the elbow has no stroked division or end cap.
          ctx.beginPath();
          ctx.moveTo(x - uy * 2000, y + ux * 2000);
          ctx.lineTo(x + uy * 2000, y - ux * 2000);
          ctx.lineTo(x + (uy + ux) * 2000, y + (uy - ux) * 2000);
          ctx.lineTo(x + (ux - uy) * 2000, y + (ux + uy) * 2000);
          ctx.closePath();
          ctx.clip();
          this.drawSleeve(ctx, arm);
          ctx.restore();
        }
        if (amount > 0) {
          ctx.globalAlpha = amount;
          this.drawSleeve(ctx, arm);
        }
        ctx.globalAlpha = 1;
        if (this.handImage?.complete && this.handImage.naturalWidth) {
          ctx.save();
          ctx.translate(arm.target.x, arm.target.y);
          ctx.rotate(Math.atan2(arm.target.y - arm.wrist.y, arm.target.x - arm.wrist.x) + Math.PI / 2);
          const squash = Math.max(0, Math.min(1, hand.squash));
          ctx.scale((hand.side === 'left' ? -1 : 1) * (1 + squash * 0.14), 1 - squash * 0.12);
          // Keep the painted wrist tucked inside the sleeve cuff.
          ctx.beginPath();
          ctx.rect(-64, -64, 128, 76);
          ctx.clip();
          ctx.drawImage(this.handImage, -64 * 0.47, -64 * 0.49, 64, 64);
          ctx.restore();
        } else if (this.failed) {
          ctx.fillStyle = '#dc683d';
          ctx.font = '20px sans-serif';
          ctx.fillText('!', arm.target.x, arm.target.y);
          ctx.fillStyle = '#fff4db';
        }
      }
    }
    ctx.restore();
  }

  private drawSleeve(ctx: CanvasRenderingContext2D, arm: ReturnType<typeof starDoctorArm>): void {
    const { shoulder: s, elbow: e, wrist: w } = arm;
    const l1 = Math.max(1, Math.hypot(e.x - s.x, e.y - s.y));
    const l2 = Math.max(1, Math.hypot(w.x - e.x, w.y - e.y));
    const span = Math.max(1, Math.hypot(w.x - s.x, w.y - s.y));
    const d1 = { x: (e.x - s.x) / l1, y: (e.y - s.y) / l1 };
    const d2 = { x: (w.x - e.x) / l2, y: (w.y - e.y) / l2 };
    const tangent = { x: (w.x - s.x) / span, y: (w.y - s.y) / span };
    const edge = (p: Point, direction: Point, radius: number, side: number) => ({ x: p.x - direction.y * radius * side, y: p.y + direction.x * radius * side });
    const a = edge(s, d1, 13.5, 1), b = edge(e, tangent, 13, 1), c = edge(w, d2, 9.5, 1);
    const d = edge(w, d2, 9.5, -1), f = edge(e, tangent, 13, -1), g = edge(s, d1, 13.5, -1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(a.x + d1.x * l1 * 0.45, a.y + d1.y * l1 * 0.45, b.x - tangent.x * l1 * 0.35, b.y - tangent.y * l1 * 0.35, b.x, b.y);
    ctx.bezierCurveTo(b.x + tangent.x * l2 * 0.35, b.y + tangent.y * l2 * 0.35, c.x - d2.x * l2 * 0.45, c.y - d2.y * l2 * 0.45, c.x, c.y);
    ctx.quadraticCurveTo(w.x + d2.x * 9.5, w.y + d2.y * 9.5, d.x, d.y);
    ctx.bezierCurveTo(d.x - d2.x * l2 * 0.45, d.y - d2.y * l2 * 0.45, f.x + tangent.x * l2 * 0.35, f.y + tangent.y * l2 * 0.35, f.x, f.y);
    ctx.bezierCurveTo(f.x - tangent.x * l1 * 0.35, f.y - tangent.y * l1 * 0.35, g.x + d1.x * l1 * 0.45, g.y + d1.y * l1 * 0.45, g.x, g.y);
    ctx.quadraticCurveTo(s.x - d1.x * 13.5, s.y - d1.y * 13.5, a.x, a.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
