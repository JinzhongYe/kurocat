import doctorUrl from './assets/star-doctor.png';

export interface StarDoctorState {
  elapsed: number;
  typingEnergy: number;
  tilt: number;
  sleep: number;
  happy: number;
  curious: number;
  cross: number;
  privacy: boolean;
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

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, state: StarDoctorState): void {
    if (!this.image?.complete || !this.image.naturalWidth) {
      if (this.failed) {
        ctx.save();
        ctx.fillStyle = '#f5b82b';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', width / 2, height / 2);
        ctx.restore();
      }
      return;
    }
    const size = Math.min(width - 16, height - 20);
    const active = !state.privacy && state.sleep < 0.5;
    const bounce = active ? Math.abs(Math.sin(state.elapsed * 15)) * state.typingEnergy * 5 : 0;
    const breath = Math.sin(state.elapsed * (state.sleep > 0.5 ? 1 : 2)) * 0.004;
    ctx.save();
    ctx.translate(width / 2, height - 12 - bounce);
    ctx.rotate(Math.max(-0.045, Math.min(0.045, state.tilt * 0.2)));
    ctx.scale(1 + breath, 1 - breath);
    // shortcut: one full-body illustration, add separate limb frames for articulated typing.
    ctx.drawImage(this.image, -size / 2, -size, size, size);
    const badge = state.privacy ? '🔒' : state.sleep > 0.5 ? 'Zzz' : state.cross > 0.3 ? '!' : state.happy > 0.3 ? '♥' : state.curious > 0.3 ? '?' : '';
    if (badge) {
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff9ee';
      ctx.fillStyle = state.cross > 0.3 ? '#dc683d' : '#e7a900';
      ctx.strokeText(badge, -size * 0.25, -size * 0.75);
      ctx.fillText(badge, -size * 0.25, -size * 0.75);
    }
    ctx.restore();
  }
}
