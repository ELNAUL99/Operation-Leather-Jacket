/**
 * Procedural WebAudio Synthesizer & Accessible SFX Caption Emitter
 * Zero external audio files. Generates:
 * - Typewriter ticks
 * - Low noir synth drone
 * - Elevated stress heartbeat (> 70 pulse)
 * - Red rubber stamp thud
 * - Evidence card pickup & red-string pin snap
 */

type CaptionListener = (caption: string) => void;

class NoirSoundEngine {
  private ctx: AudioContext | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private heartbeatTimer: number | null = null;
  private muted = false;
  private droneActive = false;
  private captionListeners = new Set<CaptionListener>();
  private lastTickTime = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public onCaption(listener: CaptionListener): () => void {
    this.captionListeners.add(listener);
    return () => {
      this.captionListeners.delete(listener);
    };
  }

  private emitCaption(text: string): void {
    for (const cb of this.captionListeners) {
      cb(text);
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopDrone();
      this.stopHeartbeat();
    } else if (this.droneActive) {
      this.startDrone();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public startDrone(): void {
    this.droneActive = true;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || this.droneOsc) return;

    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 55; // A1 low noir bass
    sub.type = 'sine';
    sub.frequency.value = 27.5;

    filter.type = 'lowpass';
    filter.frequency.value = 140;

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 1.2);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    sub.start();
    osc.onended = () => {
      try {
        sub.stop();
      } catch {
        // ignore
      }
    };

    this.droneOsc = osc;
    this.droneGain = gain;
    this.emitCaption('[SFX: LOW PENTHOUSE SYNTH DRONE]');
  }

  public stopDrone(): void {
    if (this.droneOsc && this.ctx && this.droneGain) {
      try {
        this.droneGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.droneOsc.stop(this.ctx.currentTime + 0.05);
      } catch {
        // ignore
      }
    }
    this.droneOsc = null;
    this.droneGain = null;
  }

  public playTypewriterTick(emitVisualCaption = false): void {
    const now = performance.now();
    if (now - this.lastTickTime < 45) return;
    this.lastTickTime = now;

    if (emitVisualCaption) {
      this.emitCaption('[SFX: TYPEWRITER CLACK]');
    }
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920 + (Math.random() - 0.5) * 140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  public playFootstep(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115 + (Math.random() - 0.5) * 18, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  public playEvidencePickup(): void {
    this.emitCaption('[SFX: EVIDENCE CARD CATALOGUED]');
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const notes = [330, 440];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.065;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.07, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  public playOrbitScan(): void {
    this.emitCaption('[SFX: ORBIT DIE TELEMETRY SWEEP]');
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.18);
    osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.32);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  public playPinSnap(): void {
    this.emitCaption('[SFX: RED STRING PIN TAUT]');
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  }

  public playStampThud(): void {
    this.emitCaption('[SFX: HEAVY RUBBER STAMP THUD]');
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(34, ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.24, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  }

  public updateStressHeartbeat(stress: number): void {
    if (stress > 70) {
      if (this.heartbeatTimer !== null) return;
      this.emitCaption('[SFX: ELEVATED PULSE HEARTBEAT]');
      this.triggerSingleHeartbeat();
      this.heartbeatTimer = window.setInterval(() => {
        this.triggerSingleHeartbeat();
      }, 780);
    } else {
      this.stopHeartbeat();
    }
  }

  public stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private triggerSingleHeartbeat(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    [0, 0.16].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + offset;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 68 : 56, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.11);

      gain.gain.setValueAtTime(idx === 0 ? 0.12 : 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }
}

export const soundEngine = new NoirSoundEngine();
