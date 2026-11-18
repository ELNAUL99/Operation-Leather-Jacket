import React from 'react';
import { PALETTE, SuspectId } from '../shared/constants';

export const OrbitDieSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    {/* Silicon pins */}
    {[-14, 0, 14].map((offset) => (
      <g key={offset}>
        <rect
          x={4}
          y={29 + offset}
          width={9}
          height={6}
          fill={PALETTE.EVIDENCE_PAPER}
          stroke={PALETTE.INK}
          strokeWidth={3.5}
        />
        <rect
          x={51}
          y={29 + offset}
          width={9}
          height={6}
          fill={PALETTE.EVIDENCE_PAPER}
          stroke={PALETTE.INK}
          strokeWidth={3.5}
        />
        <rect
          x={29 + offset}
          y={4}
          width={6}
          height={9}
          fill={PALETTE.EVIDENCE_PAPER}
          stroke={PALETTE.INK}
          strokeWidth={3.5}
        />
        <rect
          x={29 + offset}
          y={51}
          width={6}
          height={9}
          fill={PALETTE.EVIDENCE_PAPER}
          stroke={PALETTE.INK}
          strokeWidth={3.5}
        />
      </g>
    ))}
    {/* Grey GPU die body */}
    <rect
      x={12}
      y={12}
      width={40}
      height={40}
      rx={6}
      fill={PALETTE.COLD_GREY}
      stroke={PALETTE.INK}
      strokeWidth={5}
    />
    <rect
      x={20}
      y={20}
      width={24}
      height={24}
      stroke={PALETTE.INK}
      strokeWidth={2.5}
    />
    {/* Single Red Dot Eye */}
    <circle
      cx={32}
      cy={32}
      r={6}
      fill={PALETTE.SIGNAL_RED}
      stroke={PALETTE.INK}
      strokeWidth={2.5}
    />
  </svg>
);

export const SuspectPortraitSvg: React.FC<{
  suspectId: SuspectId;
  size?: number;
}> = ({ suspectId, size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <rect
      x={4}
      y={4}
      width={72}
      height={72}
      rx={10}
      fill={PALETTE.VOID_BLACK}
      stroke={PALETTE.INK}
      strokeWidth={4}
    />
    {/* Shoulders */}
    <path
      d="M18 74 C18 56, 62 56, 62 74"
      fill={
        suspectId === 'mina'
          ? PALETTE.EVIDENCE_PAPER
          : suspectId === 'odalys'
          ? PALETTE.KRAFT_TAN
          : PALETTE.COLD_GREY
      }
      stroke={PALETTE.INK}
      strokeWidth={5}
    />
    {/* Faceless White Ovoid Head */}
    <ellipse
      cx={40}
      cy={38}
      rx={14}
      ry={18}
      fill={PALETTE.EVIDENCE_PAPER}
      stroke={PALETTE.INK}
      strokeWidth={5}
    />
    {suspectId === 'isolde' && (
      <>
        {/* Empty round glasses frames + scarf */}
        <circle cx={34} cy={37} r={4.5} stroke={PALETTE.INK} strokeWidth={3} />
        <circle cx={46} cy={37} r={4.5} stroke={PALETTE.INK} strokeWidth={3} />
        <line x1={38.5} y1={37} x2={41.5} y2={37} stroke={PALETTE.INK} strokeWidth={3} />
        <rect
          x={24}
          y={53}
          width={32}
          height={9}
          rx={3}
          fill={PALETTE.SIGNAL_RED}
          stroke={PALETTE.INK}
          strokeWidth={4}
        />
      </>
    )}
    {suspectId === 'bastian' && (
      <>
        {/* Red bow tie */}
        <polygon
          points="31,55 31,63 40,59"
          fill={PALETTE.SIGNAL_RED}
          stroke={PALETTE.INK}
          strokeWidth={2.5}
        />
        <polygon
          points="49,55 49,63 40,59"
          fill={PALETTE.SIGNAL_RED}
          stroke={PALETTE.INK}
          strokeWidth={2.5}
        />
      </>
    )}
    {suspectId === 'odalys' && (
      <>
        {/* Pushed-up aviator goggles */}
        <rect
          x={27}
          y={21}
          width={11}
          height={8}
          rx={2}
          fill={PALETTE.COLD_GREY}
          stroke={PALETTE.INK}
          strokeWidth={3.5}
        />
        <rect
          x={42}
          y={21}
          width={11}
          height={8}
          rx={2}
          fill={PALETTE.COLD_GREY}
          stroke={PALETTE.INK}
          strokeWidth={3.5}
        />
      </>
    )}
    {suspectId === 'mina' && (
      <>
        {/* Tall paper chef hat */}
        <rect
          x={28}
          y={9}
          width={24}
          height={14}
          rx={4}
          fill={PALETTE.EVIDENCE_PAPER}
          stroke={PALETTE.INK}
          strokeWidth={4}
        />
      </>
    )}
    {suspectId === 'felix' && (
      <>
        {/* Tousled hair shape */}
        <path
          d="M25 26 L23 16 L34 20 L41 12 L49 20 L56 17 L53 26 Z"
          fill={PALETTE.INK}
        />
      </>
    )}
  </svg>
);

export const TitleLockupSvg: React.FC = () => (
  <svg
    viewBox="0 0 540 210"
    className="w-full max-w-[500px] select-none"
    role="img"
    aria-label="PILLOW TALK — An Envydia Investigation: Operation Leather Jacket"
  >
    {/* Red Target Crosshair + Leather Jacket Motif */}
    <g transform="translate(68, 86)">
      <circle cx="0" cy="0" r="54" fill="none" stroke={PALETTE.SIGNAL_RED} strokeWidth="6" />
      <circle cx="0" cy="0" r="30" fill="none" stroke={PALETTE.SIGNAL_RED} strokeWidth="4" />
      <line x1="-68" y1="0" x2="-40" y2="0" stroke={PALETTE.SIGNAL_RED} strokeWidth="5" />
      <line x1="40" y1="0" x2="68" y2="0" stroke={PALETTE.SIGNAL_RED} strokeWidth="5" />
      <line x1="0" y1="-68" x2="0" y2="-40" stroke={PALETTE.SIGNAL_RED} strokeWidth="5" />
      <line x1="0" y1="40" x2="0" y2="68" stroke={PALETTE.SIGNAL_RED} strokeWidth="5" />
      {/* Black Leather Jacket Silhouette with Silver Zips */}
      <path
        d="M-22 -24 L-8 -30 L8 -30 L22 -24 L28 24 L-28 24 Z"
        fill={PALETTE.VOID_BLACK}
        stroke={PALETTE.EVIDENCE_PAPER}
        strokeWidth="4"
      />
      <line x1="0" y1="-26" x2="0" y2="22" stroke={PALETTE.COLD_GREY} strokeWidth="3.5" />
      <line x1="-14" y1="-4" x2="-6" y2="12" stroke={PALETTE.COLD_GREY} strokeWidth="3" />
      <line x1="14" y1="-4" x2="6" y2="12" stroke={PALETTE.COLD_GREY} strokeWidth="3" />
    </g>

    {/* Plain text ENVYDIA wordmark (no emblem, no green) */}
    <text
      x="156"
      y="42"
      fill={PALETTE.SIGNAL_RED}
      fontFamily="'JetBrains Mono', monospace"
      fontSize="13"
      fontWeight="700"
      letterSpacing="4"
    >
      OPERATION LEATHER JACKET
    </text>

    <text
      x="154"
      y="98"
      fill={PALETTE.EVIDENCE_PAPER}
      fontFamily="'Archivo Black', Impact, sans-serif"
      fontSize="50"
      letterSpacing="1.5"
    >
      PILLOW
    </text>
    <text
      x="154"
      y="148"
      fill={PALETTE.EVIDENCE_PAPER}
      fontFamily="'Archivo Black', Impact, sans-serif"
      fontSize="50"
      letterSpacing="1.5"
    >
      TALK
    </text>

    {/* Red Stamp Tag */}
    <g transform="translate(362, 118) rotate(-6)">
      <rect
        x="0"
        y="0"
        width="156"
        height="34"
        rx="4"
        fill={PALETTE.SIGNAL_RED}
        stroke={PALETTE.INK}
        strokeWidth="4"
      />
      <text
        x="78"
        y="22"
        textAnchor="middle"
        fill={PALETTE.EVIDENCE_PAPER}
        fontFamily="'JetBrains Mono', monospace"
        fontSize="12"
        fontWeight="700"
        letterSpacing="2"
      >
        TRUST NO PILLOW
      </text>
    </g>

    <text
      x="156"
      y="184"
      fill={PALETTE.COLD_GREY}
      fontFamily="'JetBrains Mono', monospace"
      fontSize="14"
      fontWeight="700"
      letterSpacing="3.2"
    >
      AN ENVYDIA INVESTIGATION
    </text>
  </svg>
);

/**
 * Accessible Non-Hue-Only PULSE Meter:
 * Uses distinct geometric shape + numeric value + explicit state word (never color alone).
 */
export const PulseShapeMeter: React.FC<{ stress: number }> = ({ stress }) => {
  const clamped = Math.round(Math.max(0, Math.min(100, stress)));
  const isHigh = clamped > 70;
  const isMid = clamped >= 45 && clamped <= 70;

  const stateLabel = isHigh ? 'SPIKE' : isMid ? 'GUARDED' : 'STEADY';

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border-[3px] border-[#111111] bg-[#0A0A0B] text-[#F2F2EE]"
      aria-label={`Suspect Pulse ${clamped} out of 100, status ${stateLabel}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        {isHigh ? (
          <polygon
            points="12,2 22,12 12,22 2,12"
            fill={PALETTE.SIGNAL_RED}
            stroke={PALETTE.EVIDENCE_PAPER}
            strokeWidth="2.5"
          />
        ) : isMid ? (
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            fill={PALETTE.KRAFT_TAN}
            stroke={PALETTE.EVIDENCE_PAPER}
            strokeWidth="2.5"
          />
        ) : (
          <circle
            cx="12"
            cy="12"
            r="8"
            fill={PALETTE.COLD_GREY}
            stroke={PALETTE.EVIDENCE_PAPER}
            strokeWidth="2.5"
          />
        )}
      </svg>
      <div className="font-mono-code text-xs leading-none">
        <span className="font-bold text-sm">{clamped}</span>
        <span className="text-[#8A8A8E]">/100</span>
        <span className="mx-1.5 text-[#8A8A8E]">·</span>
        <span className={isHigh ? 'text-[#C8242B] font-bold' : 'text-[#F2F2EE]'}>
          PULSE {stateLabel}
        </span>
      </div>
    </div>
  );
};
