import React from 'react';
import { TitleLockupSvg } from './PictogramSvg';

interface TitleScreenProps {
  offlineMode: boolean;
  onToggleOffline: () => void;
  onStartGame: () => void;
  onOpenHowToPlay: () => void;
  onOpenAccessibility: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  offlineMode,
  onToggleOffline,
  onStartGame,
  onOpenHowToPlay,
  onOpenAccessibility,
}) => {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Left Negative-Space Opaque Noir Panel */}
      <div className="pointer-events-auto max-w-[520px] rounded-xl bg-[#0A0A0B] border-[6px] border-[#111111] p-6 md:p-8 shadow-[10px_10px_0px_#111111]">
        <TitleLockupSvg />

        <p className="mt-4 text-sm md:text-base text-[#F2F2EE] leading-relaxed max-w-[45ch]">
          Someone in CEO Dax Mercer’s private life is leaking{' '}
          <strong className="font-semibold">ENVYDIA</strong> secrets from Floor 88. Four guests
          heard tonight’s launch fact. One rival plant is bluffing. And your AI sidekick{' '}
          <strong className="font-semibold text-[#C8242B]">ORBIT</strong> might be framing an
          innocent.
        </p>

        {/* Streamlined First-Launch Controls: Start + Offline Mode Toggle */}
        <div className="mt-6 flex flex-col gap-3.5">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="w-full px-5 py-3.5 bg-[#C8242B] hover:bg-[#a91d23] text-[#F2F2EE] font-display text-lg rounded-lg border-[4px] border-[#111111] shadow-[4px_4px_0px_#111111] transition-transform active:translate-y-0.5 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F2F2EE]"
          >
            Start
          </button>

          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#111111] border-2 border-[#8A8A8E]">
            <span className="font-mono-label text-xs text-[#F2F2EE]">OFFLINE MODE</span>
            <button
              type="button"
              role="switch"
              aria-label="Offline mode"
              aria-checked={offlineMode}
              onClick={onToggleOffline}
              className={`px-3 py-1 rounded font-mono-code text-xs font-bold border-2 cursor-pointer transition-colors ${
                offlineMode
                  ? 'bg-[#C8242B] text-[#F2F2EE] border-[#111111]'
                  : 'bg-[#0A0A0B] text-[#F2F2EE] border-[#F2F2EE]'
              }`}
            >
              {offlineMode ? 'ON (OFFLINE)' : 'OFF (LIVE AI)'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenHowToPlay}
              className="font-mono-label text-[11px] text-[#C98F4E] hover:text-[#F2F2EE] underline underline-offset-4 cursor-pointer"
            >
              How to Play [H]
            </button>

            <button
              type="button"
              onClick={onOpenAccessibility}
              className="font-mono-label text-[11px] text-[#8A8A8E] hover:text-[#F2F2EE] underline underline-offset-4 cursor-pointer"
            >
              Settings &amp; Advanced
            </button>
          </div>
        </div>
      </div>

      {/* Single flat borderless control-hint line in the bottom safe margin */}
      <div className="pointer-events-none flex items-center justify-between gap-4 text-xs font-mono-code text-[#F2F2EE] px-3 py-1.5 rounded bg-[#0A0A0B]/85 self-start">
        <span>
          A / D or Arrows Walk · E Interact · Tab Notebook · H How to Play · Enter Submit
        </span>
      </div>
    </div>
  );
};
