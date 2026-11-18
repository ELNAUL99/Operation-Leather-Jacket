import Phaser from 'phaser';
import { soundEngine } from '../audio/soundEngine';
import {
  CAST_PROFILES,
  PALETTE,
  PALETTE_HEX,
  ROOMS,
  RoomId,
  SUSPECT_IDS,
  SuspectId,
  WORLD_CONFIG,
} from '../shared/constants';
import { EvidenceItem } from '../shared/types';
import {
  drawAuditorPictogram,
  drawCeoBedroomProps,
  drawOrbitDie,
  drawSuspectPictogram,
} from './drawPictograms';

export interface SceneBridgeCallbacks {
  onRoomChange: (roomId: RoomId) => void;
  onSuspectInteract: (suspectId: SuspectId) => void;
  onHotspotInteract: (evidence: EvidenceItem) => void;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
}

export class PenthouseScene extends Phaser.Scene {
  private callbacks: SceneBridgeCallbacks;
  private auditorContainer!: Phaser.GameObjects.Container;
  private auditorGraphics!: Phaser.GameObjects.Graphics;
  private orbitContainer!: Phaser.GameObjects.Container;
  private orbitGraphics!: Phaser.GameObjects.Graphics;
  private promptContainer!: Phaser.GameObjects.Container;
  private promptBg!: Phaser.GameObjects.Graphics;
  private promptText!: Phaser.GameObjects.Text;
  private speechBubbleContainer!: Phaser.GameObjects.Container;
  private speechBubbleText!: Phaser.GameObjects.Text;

  private suspectNodes = new Map<
    SuspectId,
    {
      container: Phaser.GameObjects.Container;
      graphics: Phaser.GameObjects.Graphics;
      x: number;
      highlighted: boolean;
    }
  >();
  private hotspotNodes = new Map<
    string,
    {
      evidence: EvidenceItem;
      container: Phaser.GameObjects.Container;
      graphics: Phaser.GameObjects.Graphics;
      collected: boolean;
    }
  >();

  private particleGraphics!: Phaser.GameObjects.Graphics;
  private particlePool: PooledParticle[] = [];
  private isSceneCreated = false;
  private pendingHotspots: { list: EvidenceItem[]; collected: Set<string> } | null = null;

  private auditorX: number = WORLD_CONFIG.AUDITOR_START_X;
  private auditorFacing: 1 | -1 = 1;
  private walkDistance = 0;
  private targetWalkX: number | null = null;
  private tourMode = true;
  private tourTime = 0;
  private controlsLocked = false;
  private reducedMotion = false;
  private currentRoomId: RoomId = 'ceo_bedroom';
  private thinkingSuspectId: SuspectId | null = null;

  private heldKeys = new Set<string>();
  private justPressedE = false;

  private onKeyDownBound!: (e: KeyboardEvent) => void;
  private onKeyUpBound!: (e: KeyboardEvent) => void;
  private onBlurBound!: () => void;

  constructor(callbacks: SceneBridgeCallbacks) {
    super({ key: 'PenthouseScene' });
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: SceneBridgeCallbacks): void {
    this.callbacks = callbacks;
  }

  public setTourMode(enabled: boolean): void {
    this.tourMode = enabled;
    if (!enabled) {
      this.auditorX = WORLD_CONFIG.AUDITOR_START_X;
      this.targetWalkX = null;
      if (this.cameras?.main) {
        this.cameras.main.scrollX = Phaser.Math.Clamp(
          this.auditorX - WORLD_CONFIG.LOGICAL_WIDTH / 2,
          0,
          WORLD_CONFIG.TOTAL_WIDTH - WORLD_CONFIG.LOGICAL_WIDTH
        );
      }
    }
  }

  public setControlsLocked(locked: boolean): void {
    this.controlsLocked = locked;
    if (locked) {
      this.heldKeys.clear();
      this.targetWalkX = null;
    }
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public setThinkingBubble(suspectId: SuspectId | null): void {
    this.thinkingSuspectId = suspectId;
    if (!suspectId && this.speechBubbleContainer) {
      this.speechBubbleContainer.setVisible(false);
    }
  }

  public triggerCameraShake(intensity = 0.008, durationMs = 220): void {
    if (this.reducedMotion || !this.cameras?.main) return;
    this.cameras.main.shake(durationMs, intensity);
  }

  public teleportToRoom(roomId: RoomId): void {
    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) return;
    this.auditorX = room.centerX;
    this.targetWalkX = null;
    if (this.auditorContainer) {
      this.auditorContainer.setPosition(this.auditorX, WORLD_CONFIG.FLOOR_Y);
    }
    if (this.cameras?.main) {
      this.cameras.main.scrollX = Phaser.Math.Clamp(
        this.auditorX - WORLD_CONFIG.LOGICAL_WIDTH / 2,
        0,
        WORLD_CONFIG.TOTAL_WIDTH - WORLD_CONFIG.LOGICAL_WIDTH
      );
    }
    this.emitDustBurst(this.auditorX, WORLD_CONFIG.FLOOR_Y - 10, PALETTE_HEX.SIGNAL_RED, 8);
  }

  public populateEvidenceHotspots(evidenceList: EvidenceItem[], collectedIds: Set<string>): void {
    this.pendingHotspots = { list: evidenceList, collected: new Set(collectedIds) };
    if (!this.isSceneCreated) return;

    for (const node of this.hotspotNodes.values()) {
      node.container.destroy();
    }
    this.hotspotNodes.clear();

    for (const ev of evidenceList) {
      const container = this.add.container(ev.worldX, WORLD_CONFIG.FLOOR_Y - 46);
      container.setDepth(18);
      const g = this.add.graphics();
      const isCollected = collectedIds.has(ev.id);
      this.drawHotspotPin(g, isCollected);

      const codeTag = this.add.text(0, 22, ev.hotspotLabel.toUpperCase(), {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: isCollected ? PALETTE.COLD_GREY : PALETTE.EVIDENCE_PAPER,
        backgroundColor: PALETTE.VOID_BLACK,
        padding: { x: 5, y: 2 },
      });
      codeTag.setOrigin(0.5, 0);

      container.add([g, codeTag]);
      container.setSize(76, 76);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        if (this.tourMode || this.controlsLocked) return;
        if (Math.abs(this.auditorX - ev.worldX) <= WORLD_CONFIG.INTERACT_RADIUS + 40) {
          this.collectOrInspectHotspot(ev.id);
        } else {
          this.targetWalkX = ev.worldX;
        }
      });

      this.hotspotNodes.set(ev.id, {
        evidence: ev,
        container,
        graphics: g,
        collected: isCollected,
      });
    }
  }

  public markEvidenceCollected(evId: string): void {
    const node = this.hotspotNodes.get(evId);
    if (!node) return;
    node.collected = true;
    this.drawHotspotPin(node.graphics, true);
  }

  private drawHotspotPin(g: Phaser.GameObjects.Graphics, collected: boolean): void {
    g.clear();
    if (!collected) {
      g.fillStyle(PALETTE_HEX.SIGNAL_RED, 0.2);
      g.fillCircle(0, -6, 26);
    }

    // Tilted Evidence Card / Map Pin icon
    g.lineStyle(5, PALETTE_HEX.INK, 1);
    g.fillStyle(collected ? PALETTE_HEX.COLD_GREY : PALETTE_HEX.EVIDENCE_PAPER, 1);
    g.fillRoundedRect(-18, -22, 36, 26, 4);
    g.strokeRoundedRect(-18, -22, 36, 26, 4);

    // Red pin head
    g.fillStyle(collected ? PALETTE_HEX.INK : PALETTE_HEX.SIGNAL_RED, 1);
    g.fillCircle(0, -24, 8);
    g.lineStyle(4, PALETTE_HEX.INK, 1);
    g.strokeCircle(0, -24, 8);
  }

  public create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_CONFIG.TOTAL_WIDTH, WORLD_CONFIG.LOGICAL_HEIGHT);
    this.cameras.main.setBackgroundColor(PALETTE.VOID_BLACK);

    // Pre-allocate Zero-GC Particle Ring Buffer (24 particles)
    this.particlePool = Array.from({ length: 24 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.4,
      radius: 4,
      color: PALETTE_HEX.EVIDENCE_PAPER,
    }));

    this.drawParallaxSkyline();
    this.drawPenthouseRooms();

    // Create Suspects across the 5 rooms
    for (const id of SUSPECT_IDS) {
      const profile = CAST_PROFILES[id];
      const container = this.add.container(profile.worldX, WORLD_CONFIG.FLOOR_Y);
      container.setDepth(20);
      const g = this.add.graphics();
      drawSuspectPictogram(g, id, false);

      const namePlate = this.add.text(0, 12, profile.name, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: PALETTE.EVIDENCE_PAPER,
        backgroundColor: PALETTE.INK,
        padding: { x: 6, y: 3 },
      });
      namePlate.setOrigin(0.5, 0);

      const rolePlate = this.add.text(0, 34, profile.role.toUpperCase(), {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        color: PALETTE.COLD_GREY,
      });
      rolePlate.setOrigin(0.5, 0);

      container.add([g, namePlate, rolePlate]);
      container.setSize(76, 185);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-38, -185, 76, 195),
        Phaser.Geom.Rectangle.Contains
      );
      container.input!.cursor = 'pointer';
      container.on('pointerdown', () => {
        if (this.tourMode || this.controlsLocked) return;
        if (Math.abs(this.auditorX - profile.worldX) <= WORLD_CONFIG.INTERACT_RADIUS + 40) {
          this.callbacks.onSuspectInteract(id);
        } else {
          this.targetWalkX = profile.worldX - 56;
        }
      });

      this.suspectNodes.set(id, {
        container,
        graphics: g,
        x: profile.worldX,
        highlighted: false,
      });
    }

    // Create Auditor (player)
    this.auditorContainer = this.add.container(this.auditorX, WORLD_CONFIG.FLOOR_Y);
    this.auditorContainer.setDepth(26);
    this.auditorGraphics = this.add.graphics();
    drawAuditorPictogram(this.auditorGraphics, 1);
    this.auditorContainer.add(this.auditorGraphics);

    // Create floating ORBIT GPU-die companion
    this.orbitContainer = this.add.container(this.auditorX - 58, WORLD_CONFIG.FLOOR_Y - 168);
    this.orbitContainer.setDepth(27);
    this.orbitGraphics = this.add.graphics();
    drawOrbitDie(this.orbitGraphics, 0);
    this.orbitContainer.add(this.orbitGraphics);

    // Particle Graphics Layer
    this.particleGraphics = this.add.graphics();
    this.particleGraphics.setDepth(25);

    // Floating "[E] INTERACT" world prompt
    this.promptContainer = this.add.container(0, 0);
    this.promptContainer.setDepth(35);
    this.promptContainer.setVisible(false);
    this.promptBg = this.add.graphics();
    this.promptText = this.add.text(0, 0, '[E] INTERROGATE', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: PALETTE.EVIDENCE_PAPER,
    });
    this.promptText.setOrigin(0.5, 0.5);
    this.promptContainer.add([this.promptBg, this.promptText]);

    // Animated "..." speech bubble for streaming LLM responses
    this.speechBubbleContainer = this.add.container(0, 0);
    this.speechBubbleContainer.setDepth(36);
    this.speechBubbleContainer.setVisible(false);
    const bubbleBg = this.add.graphics();
    bubbleBg.lineStyle(5, PALETTE_HEX.INK, 1);
    bubbleBg.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
    bubbleBg.fillRoundedRect(-34, -22, 68, 36, 8);
    bubbleBg.strokeRoundedRect(-34, -22, 68, 36, 8);
    this.speechBubbleText = this.add.text(0, -4, '...', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: PALETTE.INK,
    });
    this.speechBubbleText.setOrigin(0.5, 0.5);
    this.speechBubbleContainer.add([bubbleBg, this.speechBubbleText]);

    // Click floor to walk
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.tourMode || this.controlsLocked) return;
      if (currentlyOver.length > 0) return;
      if (pointer.y > 110 && pointer.y < WORLD_CONFIG.FLOOR_Y + 60) {
        this.targetWalkX = Phaser.Math.Clamp(pointer.worldX, 90, WORLD_CONFIG.TOTAL_WIDTH - 90);
      }
    });

    // Window-level keyboard listeners with input-element & focus-loss hygiene
    this.onKeyDownBound = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (this.tourMode || this.controlsLocked) return;

      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyD' || code === 'ArrowRight') {
        this.heldKeys.add(code);
        this.targetWalkX = null;
      }
      if (code === 'KeyE' && !e.repeat) {
        this.justPressedE = true;
      }
    };

    this.onKeyUpBound = (e: KeyboardEvent) => {
      this.heldKeys.delete(e.code);
    };

    this.onBlurBound = () => {
      this.heldKeys.clear();
      this.justPressedE = false;
    };

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    document.addEventListener('visibilitychange', this.onBlurBound);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.onKeyDownBound);
      window.removeEventListener('keyup', this.onKeyUpBound);
      window.removeEventListener('blur', this.onBlurBound);
      document.removeEventListener('visibilitychange', this.onBlurBound);
    });

    this.isSceneCreated = true;
    if (!this.tourMode) {
      this.cameras.main.scrollX = Phaser.Math.Clamp(
        this.auditorX - WORLD_CONFIG.LOGICAL_WIDTH / 2,
        0,
        WORLD_CONFIG.TOTAL_WIDTH - WORLD_CONFIG.LOGICAL_WIDTH
      );
    }
    if (this.pendingHotspots) {
      this.populateEvidenceHotspots(this.pendingHotspots.list, this.pendingHotspots.collected);
    }
  }

  private drawParallaxSkyline(): void {
    // Distant Night Skyline (scrollFactor 0.2)
    const farSky = this.add.graphics();
    farSky.setScrollFactor(0.2);
    farSky.setDepth(1);

    // Soft red horizon glow behind downtown towers
    farSky.fillStyle(PALETTE_HEX.SIGNAL_RED, 0.08);
    farSky.fillEllipse(960, 290, 1400, 320);

    const farTowers = [
      { x: 40, w: 120, h: 320 },
      { x: 210, w: 95, h: 250 },
      { x: 340, w: 150, h: 390 },
      { x: 540, w: 110, h: 280 },
      { x: 700, w: 165, h: 420 },
      { x: 910, w: 130, h: 310 },
      { x: 1090, w: 140, h: 360 },
      { x: 1270, w: 110, h: 260 },
      { x: 1430, w: 160, h: 400 },
      { x: 1640, w: 135, h: 300 },
      { x: 1820, w: 150, h: 350 },
      { x: 2020, w: 125, h: 290 },
      { x: 2180, w: 160, h: 380 },
    ];

    for (const t of farTowers) {
      farSky.fillStyle(PALETTE_HEX.INK, 1);
      farSky.lineStyle(4, PALETTE_HEX.COLD_GREY, 0.25);
      farSky.fillRect(t.x, 480 - t.h, t.w, t.h);
      farSky.strokeRect(t.x, 480 - t.h, t.w, t.h);

      // Minimalist cold-grey & occasional signal-red aircraft beacon slits
      farSky.fillStyle(PALETTE_HEX.SIGNAL_RED, 0.85);
      farSky.fillCircle(t.x + t.w / 2, 480 - t.h - 6, 3);

      farSky.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 0.22);
      for (let wy = 480 - t.h + 24; wy < 440; wy += 34) {
        farSky.fillRect(t.x + 18, wy, t.w - 36, 4);
      }
    }

    // Midground Towers (scrollFactor 0.45)
    const midSky = this.add.graphics();
    midSky.setScrollFactor(0.45);
    midSky.setDepth(2);
    for (let x = 80; x < 3900; x += 270) {
      const h = 190 + ((x * 37) % 140);
      midSky.fillStyle(PALETTE_HEX.VOID_BLACK, 1);
      midSky.lineStyle(5, PALETTE_HEX.INK, 1);
      midSky.fillRect(x, 490 - h, 140, h);
      midSky.strokeRect(x, 490 - h, 140, h);
    }
  }

  private drawPenthouseRooms(): void {
    const worldG = this.add.graphics();
    worldG.setDepth(6);

    const floorY = WORLD_CONFIG.FLOOR_Y;

    // Continuous Floor 88 Architectural Cross-Section Shell
    worldG.fillStyle(PALETTE_HEX.VOID_BLACK, 0.72);
    worldG.fillRect(0, 96, WORLD_CONFIG.TOTAL_WIDTH, floorY - 96);

    // Penthouse Floor Slab
    worldG.fillStyle(PALETTE_HEX.INK, 1);
    worldG.fillRect(0, floorY, WORLD_CONFIG.TOTAL_WIDTH, WORLD_CONFIG.LOGICAL_HEIGHT - floorY);
    worldG.lineStyle(6, PALETTE_HEX.COLD_GREY, 1);
    worldG.strokeLineShape(new Phaser.Geom.Line(0, floorY, WORLD_CONFIG.TOTAL_WIDTH, floorY));

    // Dotted Auditor Investigation Trail Line across Floor 88
    worldG.lineStyle(3, PALETTE_HEX.SIGNAL_RED, 0.45);
    for (let x = 120; x < WORLD_CONFIG.TOTAL_WIDTH - 120; x += 36) {
      worldG.strokeLineShape(new Phaser.Geom.Line(x, floorY + 32, x + 16, floorY + 32));
    }

    for (const room of ROOMS) {
      const rx = room.startX;

      // Panoramic Penthouse Window Mullions
      worldG.lineStyle(6, PALETTE_HEX.INK, 1);
      for (let wx = rx + 320; wx < room.endX; wx += 320) {
        worldG.strokeLineShape(new Phaser.Geom.Line(wx, 108, wx, floorY));
      }

      // Dividing Structural Pillar between rooms (open doorway arch at bottom!)
      if (room.index > 0) {
        worldG.fillStyle(PALETTE_HEX.INK, 1);
        worldG.fillRect(rx - 18, 86, 36, 175);
        worldG.lineStyle(6, PALETTE_HEX.COLD_GREY, 1);
        worldG.strokeRect(rx - 18, 86, 36, 175);
      }

      // Room Sector Header Plaque
      const header = this.add.text(rx + 48, 118, `${room.code} · ${room.name}`, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: room.id === 'ceo_bedroom' ? PALETTE.SIGNAL_RED : PALETTE.COLD_GREY,
        backgroundColor: PALETTE.VOID_BLACK,
        padding: { x: 10, y: 5 },
      });
      header.setDepth(8);

      // Room-specific Flat-Vector Architectural Props (6px Ink outlines)
      switch (room.id) {
        case 'gallery_nook': {
          // Minimalist Plinths & Monochrome Frames
          worldG.lineStyle(6, PALETTE_HEX.INK, 1);
          worldG.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
          worldG.fillRect(rx + 210, floorY - 290, 150, 110);
          worldG.strokeRect(rx + 210, floorY - 290, 150, 110);
          worldG.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
          worldG.fillCircle(rx + 285, floorY - 235, 24);

          worldG.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
          worldG.fillRect(rx + 930, floorY - 120, 86, 120);
          worldG.strokeRect(rx + 930, floorY - 120, 86, 120);
          break;
        }

        case 'wine_closet': {
          // Floor-to-ceiling Cellar Bottle Racks & Tasting Counter
          worldG.lineStyle(6, PALETTE_HEX.INK, 1);
          worldG.fillStyle(PALETTE_HEX.KRAFT_TAN, 1);
          worldG.fillRect(rx + 220, floorY - 280, 210, 280);
          worldG.strokeRect(rx + 220, floorY - 280, 210, 280);
          for (let row = floorY - 245; row < floorY - 30; row += 45) {
            worldG.strokeLineShape(new Phaser.Geom.Line(rx + 220, row, rx + 430, row));
            for (let bx = rx + 248; bx < rx + 415; bx += 36) {
              worldG.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
              worldG.fillCircle(bx, row - 14, 8);
            }
          }
          // Tasting bar
          worldG.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
          worldG.fillRoundedRect(rx + 840, floorY - 96, 190, 96, 6);
          worldG.strokeRoundedRect(rx + 840, floorY - 96, 190, 96, 6);
          break;
        }

        case 'ceo_bedroom': {
          drawCeoBedroomProps(worldG, rx, floorY);
          // Plain text ENVYDIA wordmark plaque (strictly plain text, no emblem, no green!)
          const wordmark = this.add.text(rx + 860, floorY - 190, 'ENVYDIA', {
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '26px',
            color: PALETTE.EVIDENCE_PAPER,
          });
          wordmark.setDepth(8);
          break;
        }

        case 'hangar_suite': {
          // Wind-tunnel Delta Wing Model & Flight Console
          worldG.lineStyle(6, PALETTE_HEX.INK, 1);
          worldG.fillStyle(PALETTE_HEX.COLD_GREY, 1);
          worldG.fillRoundedRect(rx + 230, floorY - 115, 210, 115, 8);
          worldG.strokeRoundedRect(rx + 230, floorY - 115, 210, 115, 8);
          // Suspended prototype wing silhouette
          worldG.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
          worldG.fillTriangle(rx + 780, floorY - 250, rx + 1050, floorY - 220, rx + 830, floorY - 195);
          worldG.strokeTriangle(rx + 780, floorY - 250, rx + 1050, floorY - 220, rx + 830, floorY - 195);
          break;
        }

        case 'pastry_pantry': {
          // Marble Prep Table & Tiered Cake Cloche
          worldG.lineStyle(6, PALETTE_HEX.INK, 1);
          worldG.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
          worldG.fillRoundedRect(rx + 240, floorY - 98, 250, 98, 6);
          worldG.strokeRoundedRect(rx + 240, floorY - 98, 250, 98, 6);
          // Cloche dome
          worldG.fillStyle(PALETTE_HEX.KRAFT_TAN, 1);
          worldG.fillRoundedRect(rx + 320, floorY - 140, 88, 42, 18);
          worldG.strokeRoundedRect(rx + 320, floorY - 140, 88, 42, 18);
          break;
        }

        case 'music_room': {
          // Acoustic Wall Baffles & Sheet Music Stand
          worldG.lineStyle(6, PALETTE_HEX.INK, 1);
          for (let bx = rx + 220; bx <= rx + 460; bx += 80) {
            worldG.fillStyle(PALETTE_HEX.KRAFT_TAN, 1);
            worldG.fillRoundedRect(bx, floorY - 290, 52, 150, 6);
            worldG.strokeRoundedRect(bx, floorY - 290, 52, 150, 6);
          }
          // Music stand
          worldG.strokeLineShape(new Phaser.Geom.Line(rx + 890, floorY, rx + 890, floorY - 115));
          worldG.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
          worldG.fillRect(rx + 855, floorY - 148, 70, 42);
          worldG.strokeRect(rx + 855, floorY - 148, 70, 42);
          break;
        }
      }
    }
  }

  private emitDustBurst(x: number, y: number, color: number, count: number): void {
    if (this.reducedMotion) return;
    let spawned = 0;
    for (const p of this.particlePool) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 18;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 95;
        p.vy = -30 - Math.random() * 65;
        p.life = 0;
        p.maxLife = 0.28 + Math.random() * 0.18;
        p.radius = 3 + Math.random() * 3;
        p.color = color;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private collectOrInspectHotspot(evId: string): void {
    const node = this.hotspotNodes.get(evId);
    if (!node) return;
    if (!node.collected) {
      node.collected = true;
      this.drawHotspotPin(node.graphics, true);
      this.emitDustBurst(node.evidence.worldX, WORLD_CONFIG.FLOOR_Y - 56, PALETTE_HEX.SIGNAL_RED, 10);
      soundEngine.playEvidencePickup();
    }
    this.callbacks.onHotspotInteract(node.evidence);
  }

  public update(time: number, rawDelta: number): void {
    const dt = Math.min(rawDelta / 1000, 0.05);

    // 1. Title Screen Live Camera Pan Tour
    if (this.tourMode) {
      this.tourTime += dt;
      const maxScroll = WORLD_CONFIG.TOTAL_WIDTH - WORLD_CONFIG.LOGICAL_WIDTH;
      const normalized = 0.5 - 0.5 * Math.cos(this.tourTime * 0.12);
      this.cameras.main.scrollX = normalized * maxScroll;
      this.promptContainer.setVisible(false);
      return;
    }

    // Fast-path when a UI modal or interrogation drawer is open
    if (this.controlsLocked) {
      this.promptContainer.setVisible(false);
      this.justPressedE = false;
      if (this.thinkingSuspectId) {
        const node = this.suspectNodes.get(this.thinkingSuspectId);
        if (node) {
          this.speechBubbleContainer.setVisible(true);
          this.speechBubbleContainer.setPosition(node.x, WORLD_CONFIG.FLOOR_Y - 218);
          const dots = '.'.repeat((Math.floor(time / 260) % 3) + 1);
          this.speechBubbleText.setText(dots);
        }
      } else {
        this.speechBubbleContainer.setVisible(false);
      }
      return;
    }

    // 2. Gameplay Auditor Movement
    let moveDir = 0;
    const left = this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft');
    const right = this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight');
    if (left && !right) moveDir = -1;
    else if (right && !left) moveDir = 1;
    else if (this.targetWalkX !== null) {
      const diff = this.targetWalkX - this.auditorX;
      if (Math.abs(diff) > 10) {
        moveDir = Math.sign(diff);
      } else {
        this.targetWalkX = null;
      }
    }

    if (moveDir !== 0) {
      const prevFacing = this.auditorFacing;
      this.auditorFacing = moveDir > 0 ? 1 : -1;
      if (prevFacing !== this.auditorFacing) {
        drawAuditorPictogram(this.auditorGraphics, this.auditorFacing);
      }

      const step = moveDir * WORLD_CONFIG.AUDITOR_SPEED * dt;
      this.auditorX = Phaser.Math.Clamp(this.auditorX + step, 72, WORLD_CONFIG.TOTAL_WIDTH - 72);

      const prevStride = Math.floor(this.walkDistance / 115);
      this.walkDistance += Math.abs(step);
      if (Math.floor(this.walkDistance / 115) !== prevStride) {
        soundEngine.playFootstep();
        this.emitDustBurst(this.auditorX, WORLD_CONFIG.FLOOR_Y - 4, PALETTE_HEX.COLD_GREY, 3);
      }

      const bob = this.reducedMotion ? 0 : Math.abs(Math.sin(this.walkDistance * 0.035)) * 6;
      this.auditorContainer.setPosition(this.auditorX, WORLD_CONFIG.FLOOR_Y - bob);
      if (!this.reducedMotion) {
        this.auditorContainer.setScale(1.03, 0.97);
      }
    } else {
      this.auditorContainer.setPosition(this.auditorX, WORLD_CONFIG.FLOOR_Y);
      this.auditorContainer.setScale(
        Phaser.Math.Linear(this.auditorContainer.scaleX, 1, 0.25),
        Phaser.Math.Linear(this.auditorContainer.scaleY, 1, 0.25)
      );
    }

    // 3. Floating ORBIT Companion Smooth Follow (zero per-frame Graphics rebuild)
    const desiredOrbitX = this.auditorX - 56 * this.auditorFacing;
    const hoverOffset = this.reducedMotion ? 0 : Math.sin(time * 0.004) * 7;
    const desiredOrbitY = WORLD_CONFIG.FLOOR_Y - 170 + hoverOffset;
    this.orbitContainer.x = Phaser.Math.Linear(this.orbitContainer.x, desiredOrbitX, 0.12);
    this.orbitContainer.y = Phaser.Math.Linear(this.orbitContainer.y, desiredOrbitY, 0.12);

    // 4. Smooth Camera Follow
    const targetCamX = Phaser.Math.Clamp(
      this.auditorX - WORLD_CONFIG.LOGICAL_WIDTH / 2,
      0,
      WORLD_CONFIG.TOTAL_WIDTH - WORLD_CONFIG.LOGICAL_WIDTH
    );
    this.cameras.main.scrollX = this.reducedMotion
      ? targetCamX
      : Phaser.Math.Linear(this.cameras.main.scrollX, targetCamX, 0.14);

    // 5. Room Detection
    const activeRoom =
      ROOMS.find((r) => this.auditorX >= r.startX && this.auditorX < r.endX) ?? ROOMS[2];
    if (activeRoom.id !== this.currentRoomId) {
      this.currentRoomId = activeRoom.id;
      this.callbacks.onRoomChange(activeRoom.id);
    }

    // 6. Nearest Suspect or Evidence Hotspot Detection (only redraw suspect on state change!)
    let nearestSuspect: { id: SuspectId; dist: number; x: number } | null = null;
    for (const [id, node] of this.suspectNodes.entries()) {
      const dist = Math.abs(this.auditorX - node.x);
      const isNear = dist <= WORLD_CONFIG.INTERACT_RADIUS;
      if (node.highlighted !== isNear) {
        node.highlighted = isNear;
        drawSuspectPictogram(node.graphics, id, isNear);
      }
      if (isNear && (!nearestSuspect || dist < nearestSuspect.dist)) {
        nearestSuspect = { id, dist, x: node.x };
      }
    }

    let nearestHotspot: { id: string; dist: number; x: number; label: string; collected: boolean } | null =
      null;
    for (const [id, node] of this.hotspotNodes.entries()) {
      const dist = Math.abs(this.auditorX - node.evidence.worldX);
      if (dist <= WORLD_CONFIG.INTERACT_RADIUS && (!nearestHotspot || dist < nearestHotspot.dist)) {
        nearestHotspot = {
          id,
          dist,
          x: node.evidence.worldX,
          label: node.evidence.hotspotLabel,
          collected: node.collected,
        };
      }
    }

    // Display World Prompt & Consume Edge-Triggered [E]
    if (nearestSuspect || nearestHotspot) {
      const pickSuspect =
        nearestSuspect && (!nearestHotspot || nearestSuspect.dist <= nearestHotspot.dist);

      if (pickSuspect && nearestSuspect) {
        const label = `[E] TALK TO ${CAST_PROFILES[nearestSuspect.id].name}`;
        this.updatePromptBanner(nearestSuspect.x, WORLD_CONFIG.FLOOR_Y - 214, label);
        if (this.justPressedE) {
          this.callbacks.onSuspectInteract(nearestSuspect.id);
        }
      } else if (nearestHotspot) {
        const verb = nearestHotspot.collected ? 'REVIEW' : 'INSPECT';
        const label = `[E] ${verb}: ${nearestHotspot.label.toUpperCase()}`;
        this.updatePromptBanner(nearestHotspot.x, WORLD_CONFIG.FLOOR_Y - 108, label);
        if (this.justPressedE) {
          this.collectOrInspectHotspot(nearestHotspot.id);
        }
      }
    } else {
      this.promptContainer.setVisible(false);
    }
    this.justPressedE = false;
    this.speechBubbleContainer.setVisible(false);

    // 8. Render Pooled Particles
    this.particleGraphics.clear();
    for (const p of this.particlePool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = 1 - p.life / p.maxLife;
      this.particleGraphics.fillStyle(p.color, alpha);
      this.particleGraphics.fillCircle(p.x, p.y, p.radius);
    }
  }

  private updatePromptBanner(x: number, y: number, text: string): void {
    this.promptContainer.setVisible(true);
    this.promptContainer.setPosition(x, y);
    this.promptText.setText(text);
    const w = Math.max(150, this.promptText.width + 24);
    const h = 30;
    this.promptBg.clear();
    this.promptBg.lineStyle(4, PALETTE_HEX.INK, 1);
    this.promptBg.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
    this.promptBg.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    this.promptBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
  }
}
