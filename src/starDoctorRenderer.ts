import doctorUrl from './assets/star-doctor-body.png';

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
    pose: { x: number; y: number; size: number; tilt: number },
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
    const { x, y, size, tilt } = pose;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.max(-0.08, Math.min(0.08, tilt * 0.4)));
    // Artwork anchors: face center (0.485, 0.425), shoulders at y=0.65.
    ctx.drawImage(this.image, -size * 0.485, -size * 0.65, size, size);
    ctx.translate(0, -size * 0.225);
    ctx.scale(0.95, 1.25);
    drawFace();
    ctx.restore();
  }
}
