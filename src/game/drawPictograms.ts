import Phaser from 'phaser';
import { PALETTE_HEX, SuspectId } from '../shared/constants';

/**
 * Shared Creative Bible v1.0 Procedural Flat-Vector Pictogram Renderer
 * Rules:
 * - Palette strictly restricted to Void Black, Signal Red, Evidence Paper, Kraft Tan, Ink, Cold Grey.
 * - Flat vector, 6px black outlines (`PALETTE_HEX.INK`), zero textures.
 * - Faceless flat pictograms: white (`EVIDENCE_PAPER`) ovoid head, thick black outline, NO facial features.
 */

export function drawAuditorPictogram(g: Phaser.GameObjects.Graphics, facing: 1 | -1 = 1): void {
  g.clear();
  const flip = facing;

  // Ground shadow
  g.fillStyle(PALETTE_HEX.VOID_BLACK, 0.55);
  g.fillEllipse(0, 0, 62, 14);

  // Legs / boots
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.INK, 1);
  g.fillRect(-16, -34, 11, 34);
  g.fillRect(5, -34, 11, 34);

  // Long Noir Trench Coat
  g.fillStyle(PALETTE_HEX.VOID_BLACK, 1);
  g.beginPath();
  g.moveTo(-24, -108);
  g.lineTo(24, -108);
  g.lineTo(30, -26);
  g.lineTo(-30, -26);
  g.closePath();
  g.fillPath();
  g.strokePath();

  // Trench lapels & belt in Cold Grey / Ink
  g.lineStyle(4, PALETTE_HEX.COLD_GREY, 1);
  g.strokeLineShape(new Phaser.Geom.Line(-23, -68, 23, -68));
  g.strokeLineShape(new Phaser.Geom.Line(0, -108, -10 * flip, -74));
  g.strokeLineShape(new Phaser.Geom.Line(0, -108, 12 * flip, -74));

  //Faceless White Ovoid Head
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
  g.fillEllipse(0, -134, 34, 42);
  g.strokeEllipse(0, -134, 34, 42);

  // Black Fedora (wide brim + crown + red band accent)
  g.fillStyle(PALETTE_HEX.INK, 1);
  g.fillRoundedRect(-28, -153, 56, 9, 4);
  g.strokeRoundedRect(-28, -153, 56, 9, 4);
  g.beginPath();
  g.moveTo(-18, -153);
  g.lineTo(-14, -173);
  g.lineTo(14, -173);
  g.lineTo(18, -153);
  g.closePath();
  g.fillPath();
  g.strokePath();

  g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
  g.fillRect(-16, -158, 32, 5);

  // Signature Red Notepad held forward
  const padX = 22 * flip;
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
  g.fillRoundedRect(padX - 10, -88, 20, 26, 3);
  g.strokeRoundedRect(padX - 10, -88, 20, 26, 3);
  // Top spiral binding ticks
  g.lineStyle(3, PALETTE_HEX.EVIDENCE_PAPER, 1);
  g.strokeLineShape(new Phaser.Geom.Line(padX - 5, -69, padX + 5, -69));
  g.strokeLineShape(new Phaser.Geom.Line(padX - 5, -77, padX + 5, -77));
}

export function drawOrbitDie(g: Phaser.GameObjects.Graphics, pulsePhase: number): void {
  g.clear();

  // Soft red radial glow (the ONLY gradient allowed by the Creative Bible)
  const glowRadius = 26 + Math.sin(pulsePhase * 3) * 3;
  g.fillStyle(PALETTE_HEX.SIGNAL_RED, 0.14);
  g.fillCircle(0, 0, glowRadius);
  g.fillStyle(PALETTE_HEX.SIGNAL_RED, 0.08);
  g.fillCircle(0, 0, glowRadius + 10);

  // Side Silicon Pins (top, bottom, left, right)
  g.lineStyle(4, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
  const offsets = [-10, 0, 10];
  for (const off of offsets) {
    // Left & Right pins
    g.fillRect(-26, off - 3, 7, 6);
    g.strokeRect(-26, off - 3, 7, 6);
    g.fillRect(19, off - 3, 7, 6);
    g.strokeRect(19, off - 3, 7, 6);
    // Top & Bottom pins
    g.fillRect(off - 3, -26, 6, 7);
    g.strokeRect(off - 3, -26, 6, 7);
    g.fillRect(off - 3, 19, 6, 7);
    g.strokeRect(off - 3, 19, 6, 7);
  }

  // Square Grey GPU-Die Body
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.COLD_GREY, 1);
  g.fillRoundedRect(-19, -19, 38, 38, 6);
  g.strokeRoundedRect(-19, -19, 38, 38, 6);

  // Inner die frame
  g.lineStyle(3, PALETTE_HEX.INK, 1);
  g.strokeRect(-11, -11, 22, 22);

  // ONE Red Dot as an Eye (no visual tell when compromised!)
  g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
  g.fillCircle(0, 0, 5.5);
  g.lineStyle(2.5, PALETTE_HEX.INK, 1);
  g.strokeCircle(0, 0, 5.5);
}

export function drawSuspectPictogram(
  g: Phaser.GameObjects.Graphics,
  id: SuspectId,
  highlighted = false
): void {
  g.clear();

  if (highlighted) {
    g.fillStyle(PALETTE_HEX.SIGNAL_RED, 0.18);
    g.fillCircle(0, -90, 62);
  }

  // Ground shadow
  g.fillStyle(PALETTE_HEX.VOID_BLACK, 0.55);
  g.fillEllipse(0, 0, 58, 14);

  // Legs
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.INK, 1);
  g.fillRect(-14, -34, 10, 34);
  g.fillRect(4, -34, 10, 34);

  // Torso Silhouette
  const coatFill =
    id === 'mina'
      ? PALETTE_HEX.EVIDENCE_PAPER
      : id === 'odalys'
      ? PALETTE_HEX.KRAFT_TAN
      : PALETTE_HEX.COLD_GREY;

  g.fillStyle(coatFill, 1);
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillRoundedRect(-23, -108, 46, 76, 8);
  g.strokeRoundedRect(-23, -108, 46, 76, 8);

  // Faceless White Ovoid Head (no eyes, nose, or mouth!)
  g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillEllipse(0, -135, 34, 42);
  g.strokeEllipse(0, -135, 34, 42);

  // Cast-specific Bible props:
  switch (id) {
    case 'isolde': {
      // Round glasses (empty frames ONLY — zero eyes!) + long scarf
      g.lineStyle(4, PALETTE_HEX.INK, 1);
      g.strokeCircle(-7, -136, 6);
      g.strokeCircle(7, -136, 6);
      g.strokeLineShape(new Phaser.Geom.Line(-1, -136, 1, -136));

      // Long Scarf in Signal Red with 6px Ink outline
      g.lineStyle(6, PALETTE_HEX.INK, 1);
      g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
      g.fillRoundedRect(-20, -114, 40, 14, 5);
      g.strokeRoundedRect(-20, -114, 40, 14, 5);
      g.fillRoundedRect(8, -104, 13, 54, 4);
      g.strokeRoundedRect(8, -104, 13, 54, 4);
      break;
    }

    case 'bastian': {
      // Crisp Bow Tie + holds a Wine Glass
      g.lineStyle(4, PALETTE_HEX.INK, 1);
      g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
      g.fillTriangle(-11, -113, -11, -101, 0, -107);
      g.strokeTriangle(-11, -113, -11, -101, 0, -107);
      g.fillTriangle(11, -113, 11, -101, 0, -107);
      g.strokeTriangle(11, -113, 11, -101, 0, -107);

      // Stemmed Wine Glass held to side
      g.lineStyle(5, PALETTE_HEX.INK, 1);
      g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
      g.fillRoundedRect(26, -102, 16, 18, 6);
      g.strokeRoundedRect(26, -102, 16, 18, 6);
      g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
      g.fillRect(29, -93, 10, 7);
      g.strokeLineShape(new Phaser.Geom.Line(34, -84, 34, -70));
      g.strokeLineShape(new Phaser.Geom.Line(28, -70, 40, -70));
      break;
    }

    case 'odalys': {
      // Aviator Goggles pushed up on forehead
      g.lineStyle(5, PALETTE_HEX.INK, 1);
      g.strokeLineShape(new Phaser.Geom.Line(-17, -148, 17, -148));
      g.fillStyle(PALETTE_HEX.COLD_GREY, 1);
      g.fillRoundedRect(-14, -156, 12, 11, 3);
      g.strokeRoundedRect(-14, -156, 12, 11, 3);
      g.fillRoundedRect(2, -156, 12, 11, 3);
      g.strokeRoundedRect(2, -156, 12, 11, 3);
      // Flight harness diagonal stripe
      g.lineStyle(5, PALETTE_HEX.INK, 1);
      g.strokeLineShape(new Phaser.Geom.Line(-18, -106, 18, -42));
      break;
    }

    case 'mina': {
      // Tall Paper Chef Hat + Wire Whisk
      g.lineStyle(6, PALETTE_HEX.INK, 1);
      g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
      g.fillRect(-15, -184, 30, 32);
      g.strokeRect(-15, -184, 30, 32);
      g.fillRoundedRect(-20, -194, 40, 16, 8);
      g.strokeRoundedRect(-20, -194, 40, 16, 8);

      // Whisk held upright
      g.lineStyle(5, PALETTE_HEX.INK, 1);
      g.strokeLineShape(new Phaser.Geom.Line(30, -72, 30, -92));
      g.lineStyle(3.5, PALETTE_HEX.COLD_GREY, 1);
      g.strokeEllipse(30, -103, 12, 20);
      g.lineStyle(3.5, PALETTE_HEX.INK, 1);
      g.strokeEllipse(30, -103, 16, 22);
      break;
    }

    case 'felix': {
      // Tousled Hair Shape + Violin Case
      g.lineStyle(6, PALETTE_HEX.INK, 1);
      g.fillStyle(PALETTE_HEX.INK, 1);
      g.beginPath();
      g.moveTo(-18, -148);
      g.lineTo(-22, -162);
      g.lineTo(-6, -156);
      g.lineTo(4, -167);
      g.lineTo(14, -155);
      g.lineTo(22, -160);
      g.lineTo(17, -145);
      g.closePath();
      g.fillPath();

      // Structured Violin Case at side
      g.fillStyle(PALETTE_HEX.KRAFT_TAN, 1);
      g.lineStyle(6, PALETTE_HEX.INK, 1);
      g.fillRoundedRect(24, -92, 22, 58, 9);
      g.strokeRoundedRect(24, -92, 22, 58, 9);
      g.lineStyle(4, PALETTE_HEX.INK, 1);
      g.strokeLineShape(new Phaser.Geom.Line(24, -64, 46, -64));
      break;
    }
  }
}

/**
 * Draws the iconic CEO Bedroom Centerpiece Props:
 * 1. Red Target/Crosshair on wall behind Dax Mercer's black leather jacket with silver zips.
 * 2. Bed with RED bedspread and a black fedora peeking out.
 * 3. Stack of Kraft-Tan GPU boxes with a chip icon.
 */
export function drawCeoBedroomProps(g: Phaser.GameObjects.Graphics, baseX: number, floorY: number): void {
  // 1. Wall Crosshair Motif + Leather Jacket on Bedpost
  const targetX = baseX + 360;
  const targetY = floorY - 250;
  g.fillStyle(PALETTE_HEX.SIGNAL_RED, 0.14);
  g.fillCircle(targetX, targetY, 95);
  g.lineStyle(6, PALETTE_HEX.SIGNAL_RED, 1);
  g.strokeCircle(targetX, targetY, 68);
  g.strokeCircle(targetX, targetY, 38);
  g.strokeLineShape(new Phaser.Geom.Line(targetX - 88, targetY, targetX + 88, targetY));
  g.strokeLineShape(new Phaser.Geom.Line(targetX, targetY - 88, targetX, targetY + 88));

  // 2. CEO Bed with RED Bedspread + Peeking Fedora + Bedpost Leather Jacket
  const bedX = baseX + 360;
  // Headboard & Posts
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.VOID_BLACK, 1);
  g.fillRect(bedX - 18, floorY - 155, 22, 155);
  g.strokeRect(bedX - 18, floorY - 155, 22, 155);
  g.fillRect(bedX + 260, floorY - 105, 18, 105);
  g.strokeRect(bedX + 260, floorY - 105, 18, 105);

  // Mattress & RED Bedspread
  g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
  g.fillRect(bedX + 4, floorY - 82, 256, 36);
  g.strokeRect(bedX + 4, floorY - 82, 256, 36);

  g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
  g.fillRoundedRect(bedX + 36, floorY - 86, 226, 56, 8);
  g.strokeRoundedRect(bedX + 36, floorY - 86, 226, 56, 8);

  // Pillow
  g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
  g.fillRoundedRect(bedX + 12, floorY - 102, 58, 24, 6);
  g.strokeRoundedRect(bedX + 12, floorY - 102, 58, 24, 6);

  // Peeking Black Fedora at foot of the bed
  g.fillStyle(PALETTE_HEX.INK, 1);
  g.fillRoundedRect(bedX + 210, floorY - 104, 48, 8, 3);
  g.strokeRoundedRect(bedX + 210, floorY - 104, 48, 8, 3);
  g.fillRoundedRect(bedX + 220, floorY - 120, 28, 17, 4);
  g.strokeRoundedRect(bedX + 220, floorY - 120, 28, 17, 4);

  // Dax Mercer's Signature Black Leather Jacket with Silver Zips draped on Left Bedpost
  const jX = bedX - 8;
  const jY = floorY - 155;
  g.lineStyle(6, PALETTE_HEX.INK, 1);
  g.fillStyle(PALETTE_HEX.VOID_BLACK, 1);
  g.fillRoundedRect(jX - 28, jY + 4, 58, 78, 8);
  g.strokeRoundedRect(jX - 28, jY + 4, 58, 78, 8);
  // Silver zips (`COLD_GREY` + `EVIDENCE_PAPER` pull tabs)
  g.lineStyle(4, PALETTE_HEX.COLD_GREY, 1);
  g.strokeLineShape(new Phaser.Geom.Line(jX + 2, jY + 10, jX + 2, jY + 76));
  g.strokeLineShape(new Phaser.Geom.Line(jX - 16, jY + 34, jX - 6, jY + 56));
  g.strokeLineShape(new Phaser.Geom.Line(jX + 18, jY + 34, jX + 10, jY + 56));
  g.fillStyle(PALETTE_HEX.EVIDENCE_PAPER, 1);
  g.fillRect(jX - 1, jY + 26, 6, 10);

  // 3. Stack of Kraft-Tan GPU Boxes with Chip Icon
  const stackX = baseX + 860;
  const boxes = [
    { dx: 0, dy: -56, w: 96, h: 56 },
    { dx: 102, dy: -56, w: 96, h: 56 },
    { dx: 44, dy: -112, w: 96, h: 56 },
  ];
  for (const b of boxes) {
    g.lineStyle(6, PALETTE_HEX.INK, 1);
    g.fillStyle(PALETTE_HEX.KRAFT_TAN, 1);
    g.fillRoundedRect(stackX + b.dx, floorY + b.dy, b.w, b.h, 5);
    g.strokeRoundedRect(stackX + b.dx, floorY + b.dy, b.w, b.h, 5);

    // Chip icon stamped on box
    const cx = stackX + b.dx + b.w / 2;
    const cy = floorY + b.dy + b.h / 2;
    g.lineStyle(3, PALETTE_HEX.INK, 1);
    g.strokeRect(cx - 11, cy - 11, 22, 22);
    g.fillStyle(PALETTE_HEX.SIGNAL_RED, 1);
    g.fillRect(cx - 4, cy - 4, 8, 8);
  }
}
