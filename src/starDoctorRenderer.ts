import doctorUrl from './assets/star-doctor-body.png';

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
  const wrist = { x: target.x - (target.x - elbow.x) / forearmLength * 7, y: target.y - (target.y - elbow.y) / forearmLength * 7 };
  return { shoulder, elbow, wrist, target };
}

export class StarDoctorRenderer {
  private image: HTMLImageElement | null = null;
  private failed = false;

  constructor(private readonly onReady: () => void) {}

  public prepare(): void {
    if (this.image) return;
    const image = new Image();
    this.image = image;
    this.failed = false;
    image.onload = this.onReady;
    image.onerror = () => {
      this.failed = true;
      console.error('Could not load the Star Doctor character image.');
      this.onReady();
    };
    image.src = doctorUrl;
  }

  public release(): void {
    if (!this.image) return;
    this.image.onload = null;
    this.image.onerror = null;
    this.image.src = '';
    this.image = null;
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
    for (const hand of hands) {
      const arm = starDoctorArm(pose, hand, cover);
      if (layer === 'upper') {
        ctx.globalAlpha = 1 - Math.max(0, Math.min(1, cover));
        this.drawSleeve(ctx, arm.shoulder, arm.elbow, 13, 11.5);
        ctx.globalAlpha = 1;
      } else {
        // Raised arms cross in front of the head; leaving them behind it detaches the forearms.
        if (cover > 0) {
          ctx.globalAlpha = Math.min(1, cover);
          this.drawSleeve(ctx, arm.shoulder, arm.elbow, 13, 11.5);
          ctx.globalAlpha = 1;
        }
        this.drawSleeve(ctx, arm.elbow, arm.wrist, 11.5, 9);
        ctx.fillStyle = '#ffc52f';
        ctx.beginPath();
        ctx.ellipse(arm.target.x, arm.target.y, 14.5 * (1 + hand.squash * 0.14), 11.5 * (1 - hand.squash * 0.12), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff4db';
      }
    }
    ctx.restore();
  }

  private drawSleeve(ctx: CanvasRenderingContext2D, from: Point, to: Point, shoulderRadius: number, cuffRadius: number): void {
    const length = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
    const ux = (to.x - from.x) / length;
    const uy = (to.y - from.y) / length;
    const nx = -uy;
    const ny = ux;
    ctx.beginPath();
    ctx.moveTo(from.x + nx * shoulderRadius, from.y + ny * shoulderRadius);
    ctx.lineTo(to.x + nx * cuffRadius, to.y + ny * cuffRadius);
    ctx.quadraticCurveTo(to.x + ux * cuffRadius, to.y + uy * cuffRadius, to.x - nx * cuffRadius, to.y - ny * cuffRadius);
    ctx.lineTo(from.x - nx * shoulderRadius, from.y - ny * shoulderRadius);
    ctx.quadraticCurveTo(from.x - ux * shoulderRadius, from.y - uy * shoulderRadius, from.x + nx * shoulderRadius, from.y + ny * shoulderRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
