import React, { useState } from 'react';
import { AccessibilitySettings, SfxCaption } from '../shared/types';
import { OrbitDieSvg } from './PictogramSvg';

export const ForgingOverlay: React.FC<{ statusLine: string; seed: string }> = ({
  statusLine,
  seed,
}) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0A0A0B]"
  >
    <div className="max-w-lg w-full evidence-card -rotate-1 p-7 text-center">
      <div className="flex justify-center mb-4">
        <OrbitDieSvg size={54} />
      </div>
      <div className="font-mono-label text-xs text-[#C8242B] font-bold">
        SEED {seed} · ENVYDIA INTERNAL AUDIT
      </div>
      <h2 className="mt-2 font-display text-2xl text-[#111111]">
        CASE FILE PRINTING...
      </h2>
      <p className="mt-3 font-mono-code text-xs text-[#111111]/80">{statusLine}</p>
      <div className="mt-5 h-3 w-full rounded bg-[#111111]/15 overflow-hidden border-2 border-[#111111]">
        <div className="h-full w-2/3 bg-[#C8242B]" />
      </div>
    </div>
  </div>
);

export const PauseModal: React.FC<{
  seed: string;
  onResume: () => void;
  onOpenHowToPlay: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}> = ({ seed, onResume, onOpenHowToPlay, onRestart, onReturnTitle }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="pause-heading"
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/90"
  >
    <div className="max-w-md w-full noir-panel border-[6px] border-[#C8242B] p-6 text-center shadow-[10px_10px_0px_#111111]">
      <div className="font-mono-label text-xs text-[#C8242B]">INVESTIGATION PAUSED</div>
      <h2 id="pause-heading" className="mt-1 font-display text-2xl text-[#F2F2EE]">
        OPERATION LEATHER JACKET
      </h2>
      <p className="mt-2 font-mono-code text-xs text-[#8A8A8E]">ACTIVE SEED: {seed}</p>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onResume}
          className="w-full py-3 rounded-lg bg-[#C8242B] text-[#F2F2EE] font-display text-base border-[3px] border-[#111111] cursor-pointer"
        >
          Resume Investigation [Esc]
        </button>
        <button
          type="button"
          onClick={onOpenHowToPlay}
          className="w-full py-2.5 rounded-lg bg-[#C98F4E] text-[#111111] font-mono-label text-xs font-bold border-[3px] border-[#111111] cursor-pointer"
        >
          How to Play [H]
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2.5 rounded-lg bg-[#F2F2EE] text-[#111111] font-mono-label text-xs font-bold border-[3px] border-[#111111] cursor-pointer"
        >
          Forge Fresh Case
        </button>
        <button
          type="button"
          onClick={onReturnTitle}
          className="w-full py-2.5 rounded-lg bg-[#111111] text-[#F2F2EE] font-mono-label text-xs border-2 border-[#8A8A8E] cursor-pointer"
        >
          Exit to Title Screen
        </button>
      </div>
    </div>
  </div>
);

export const AccessibilityModal: React.FC<{
  settings: AccessibilitySettings;
  seedInput: string;
  onSeedChange: (val: string) => void;
  onChange: (next: AccessibilitySettings) => void;
  onClose: () => void;
}> = ({ settings, seedInput, onSeedChange, onChange, onClose }) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/90"
    >
      <div className="max-w-lg w-full noir-panel border-[6px] border-[#F2F2EE] p-6 shadow-[10px_10px_0px_#C8242B]">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111]">
          <h2 id="a11y-heading" className="font-display text-xl text-[#F2F2EE]">
            SETTINGS &amp; ACCESSIBILITY
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#C8242B] text-[#F2F2EE] font-mono-label text-xs cursor-pointer"
          >
            Done
          </button>
        </div>

        <div className="mt-5 space-y-4 font-mono-code text-xs">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="text-scale-slider" className="text-[#F2F2EE]">
              TEXT SIZE ({Math.round(settings.textScale * 100)}%)
            </label>
            <input
              id="text-scale-slider"
              type="range"
              min={0.9}
              max={1.2}
              step={0.05}
              value={settings.textScale}
              onChange={(e) =>
                onChange({ ...settings, textScale: parseFloat(e.target.value) })
              }
              className="w-44 accent-[#C8242B] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span>REDUCED MOTION (NO SHAKE / NO CARD TILT)</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reducedMotion}
              onClick={() =>
                onChange({ ...settings, reducedMotion: !settings.reducedMotion })
              }
              className="px-3 py-1.5 rounded bg-[#111111] border-2 border-[#8A8A8E] text-[#F2F2EE] cursor-pointer"
            >
              {settings.reducedMotion ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span>AUDIO SFX CAPTIONS</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.captionsEnabled}
              onClick={() =>
                onChange({ ...settings, captionsEnabled: !settings.captionsEnabled })
              }
              className="px-3 py-1.5 rounded bg-[#111111] border-2 border-[#8A8A8E] text-[#F2F2EE] cursor-pointer"
            >
              {settings.captionsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span>MUTE SYNTH AUDIO [M]</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.muted}
              onClick={() => onChange({ ...settings, muted: !settings.muted })}
              className="px-3 py-1.5 rounded bg-[#111111] border-2 border-[#8A8A8E] text-[#F2F2EE] cursor-pointer"
            >
              {settings.muted ? 'MUTED' : 'ACTIVE'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span>OFFLINE MODE (SEALED ARCHIVE FALLBACK)</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.offlineMode}
              onClick={() =>
                onChange({ ...settings, offlineMode: !settings.offlineMode })
              }
              className="px-3 py-1.5 rounded bg-[#111111] border-2 border-[#8A8A8E] text-[#F2F2EE] cursor-pointer"
            >
              {settings.offlineMode ? 'OFFLINE' : 'LIVE AI'}
            </button>
          </div>

          {/* Collapsible Advanced Disclosure (Optional Case Seed) */}
          <div className="pt-3 border-t-2 border-[#111111]">
            <button
              type="button"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className="w-full flex items-center justify-between py-1.5 font-mono-label text-xs text-[#C98F4E] hover:text-[#F2F2EE] cursor-pointer"
            >
              <span>ADVANCED</span>
              <span>{advancedOpen ? '▾ HIDE' : '▸ SHOW'}</span>
            </button>

            {advancedOpen && (
              <div className="mt-3 space-y-3 p-3 rounded-lg bg-[#111111] border border-[#8A8A8E]/40">
                <div>
                  <label
                    htmlFor="advanced-case-seed-input"
                    className="block font-mono-label text-[10px] text-[#8A8A8E] mb-1"
                  >
                    CUSTOM CASE SEED (OPTIONAL)
                  </label>
                  <input
                    id="advanced-case-seed-input"
                    type="text"
                    value={seedInput}
                    onChange={(e) => onSeedChange(e.target.value)}
                    placeholder="PT-88-RANDOM"
                    maxLength={28}
                    className="w-full px-3 py-2 rounded bg-[#0A0A0B] border-2 border-[#8A8A8E] text-[#F2F2EE] font-mono-code text-xs focus:outline-none focus:border-[#C8242B]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CaptionStrip: React.FC<{ caption: SfxCaption | null }> = ({ caption }) => {
  if (!caption) return null;
  return (
    <div
      aria-live="polite"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-3.5 py-1.5 rounded bg-[#0A0A0B]/95 border-2 border-[#C8242B] font-mono-code text-xs text-[#F2F2EE] shadow-[4px_4px_0px_#111111]"
    >
      {caption.label}
    </div>
  );
};
