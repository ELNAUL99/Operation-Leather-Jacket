import React from 'react';
import { ROOMS, ROUND_BUDGET, RoomId } from '../shared/constants';
import { GamePhase } from '../shared/types';
import { OrbitDieSvg } from './PictogramSvg';

interface HudBarProps {
  phase: GamePhase;
  secondsRemaining: number;
  tokensLeft: number;
  scansLeft: number;
  currentRoomId: RoomId;
  collectedEvidenceCount: number;
  totalEvidenceCount: number;
  muted: boolean;
  isLiveAiActive: boolean;
  lastAiError: string | null;
  onJumpRoom: (roomId: RoomId) => void;
  onOpenNotebook: () => void;
  onOpenAccusation: () => void;
  onOpenHowToPlay: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
}

export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const HudBar: React.FC<HudBarProps> = ({
  phase,
  secondsRemaining,
  tokensLeft,
  scansLeft,
  currentRoomId,
  collectedEvidenceCount,
  totalEvidenceCount,
  muted,
  isLiveAiActive,
  lastAiError,
  onJumpRoom,
  onOpenNotebook,
  onOpenAccusation,
  onOpenHowToPlay,
  onToggleMute,
  onOpenSettings,
  onPause,
}) => {
  const currentRoom = ROOMS.find((r) => r.id === currentRoomId) ?? ROOMS[2];
  const lowTime = secondsRemaining <= 90;

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none px-3 pt-2.5">
      <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 bg-[#0A0A0B]/95 border-[4px] border-[#111111] rounded-lg px-3 py-2 shadow-[0_4px_0_#111111]">
        {/* Left Perimeter Cluster: Timer + AI Status Badge + Room Selector */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          <div
            className="flex items-baseline gap-1.5 pr-2 border-r-2 border-[#111111]"
            aria-label={`Round timer ${formatClock(secondsRemaining)}`}
          >
            <span className="font-mono-label text-[10px] text-[#C8242B]">
              {phase === 'ACCUSATION' ? 'VERDICT' : 'CAP 15M'}
            </span>
            <span
              className={`font-mono-code text-base font-bold ${
                lowTime ? 'text-[#C8242B]' : 'text-[#F2F2EE]'
              }`}
            >
              {formatClock(secondsRemaining)}
            </span>
          </div>

          {/* Green-Free AI Engine Status Badge: White on Black ("LIVE AI") or Red ("OFFLINE") */}
          <span
            data-testid="ai-status-badge"
            title={
              isLiveAiActive
                ? 'Connected to live Gemini Suspect & ORBIT engine'
                : lastAiError ?? 'Offline archive fallback active'
            }
            className={`px-2 py-0.5 rounded font-mono-label text-[10px] font-bold border-2 whitespace-nowrap shrink-0 ${
              isLiveAiActive
                ? 'bg-[#0A0A0B] text-[#F2F2EE] border-[#F2F2EE]'
                : 'bg-[#C8242B] text-[#F2F2EE] border-[#111111]'
            }`}
          >
            {isLiveAiActive ? 'LIVE AI' : 'OFFLINE'}
          </span>

          <div className="hidden xl:flex items-center">
            <label htmlFor="hud-sector-jump" className="sr-only">
              Jump to Floor 88 Room
            </label>
            <select
              id="hud-sector-jump"
              value={currentRoom.id}
              onChange={(e) => {
                onJumpRoom(e.target.value as RoomId);
                e.currentTarget.blur();
              }}
              className="bg-[#111111] text-[#F2F2EE] font-mono-label text-[10px] px-2 py-1 rounded border-2 border-[#8A8A8E] cursor-pointer focus:outline-none focus:border-[#C8242B]"
            >
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Perimeter Cluster: 10 Question Token Pips + 3 ORBIT Scan Pips */}
        <div className="pointer-events-auto flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-1.5"
            aria-label={`Question tokens remaining: ${tokensLeft} of ${ROUND_BUDGET.QUESTION_TOKENS}`}
          >
            <span className="font-mono-label text-[10px] text-[#C8242B] hidden md:inline">
              TOKENS
            </span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: ROUND_BUDGET.QUESTION_TOKENS }).map((_, idx) => {
                const filled = idx < tokensLeft;
                return (
                  <span
                    key={idx}
                    className={`inline-block w-2 h-3.5 rounded-[2px] border-2 ${
                      filled
                        ? 'bg-[#C8242B] border-[#F2F2EE]'
                        : 'bg-transparent border-[#8A8A8E]/50'
                    }`}
                  />
                );
              })}
            </div>
            <span className="font-mono-code text-xs font-bold text-[#F2F2EE]">
              {tokensLeft}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 pl-2.5 border-l-2 border-[#111111]"
            aria-label={`ORBIT scans remaining: ${scansLeft} of ${ROUND_BUDGET.ORBIT_SCANS}`}
          >
            <OrbitDieSvg size={20} />
            <span className="font-mono-label text-[10px] text-[#C8242B] hidden md:inline">
              SCANS
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: ROUND_BUDGET.ORBIT_SCANS }).map((_, idx) => {
                const filled = idx < scansLeft;
                return (
                  <span
                    key={idx}
                    className={`inline-block w-3 h-3 rounded-sm border-2 ${
                      filled
                        ? 'bg-[#C98F4E] border-[#F2F2EE]'
                        : 'bg-transparent border-[#8A8A8E]/50'
                    }`}
                  />
                );
              })}
            </div>
            <span className="font-mono-code text-xs font-bold text-[#F2F2EE]">
              {scansLeft}
            </span>
          </div>
        </div>

        {/* Right Perimeter Cluster: Notebook, Accuse, How to Play [H], Utility Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenNotebook();
            }}
            className="px-2.5 py-1.5 bg-[#F2F2EE] hover:bg-[#C98F4E] text-[#111111] font-mono-label text-[11px] font-bold rounded border-2 border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
          >
            Notebook ({collectedEvidenceCount}/{totalEvidenceCount}) [Tab]
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenAccusation();
            }}
            className="px-2.5 py-1.5 bg-[#C8242B] hover:bg-[#a91d23] text-[#F2F2EE] font-mono-label text-[11px] font-bold rounded border-2 border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
          >
            Accuse [Enter]
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="How to Play [H]"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenHowToPlay();
            }}
            className="w-8 h-8 flex items-center justify-center bg-[#111111] text-[#F2F2EE] border-2 border-[#8A8A8E] rounded hover:border-[#F2F2EE] cursor-pointer font-mono-code text-xs font-bold"
          >
            ?H
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-8 h-8 flex items-center justify-center bg-[#111111] text-[#F2F2EE] border-2 border-[#8A8A8E] rounded hover:border-[#F2F2EE] cursor-pointer font-mono-code text-xs"
          >
            {muted ? 'M✕' : 'M♪'}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Accessibility and Options"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="w-8 h-8 flex items-center justify-center bg-[#111111] text-[#F2F2EE] border-2 border-[#8A8A8E] rounded hover:border-[#F2F2EE] cursor-pointer font-mono-code text-xs"
          >
            Aa
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Investigation [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-8 h-8 flex items-center justify-center bg-[#111111] text-[#F2F2EE] border-2 border-[#8A8A8E] rounded hover:border-[#F2F2EE] cursor-pointer font-mono-code text-xs"
          >
            II
          </button>
        </div>
      </div>
    </div>
  );
};
