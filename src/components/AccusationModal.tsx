import React, { useState } from 'react';
import { CAST_PROFILES, SUSPECT_IDS, SuspectId } from '../shared/constants';
import { AccusationVerdict, OrbitVerdict } from '../shared/types';
import { formatClock } from './HudBar';
import { OrbitDieSvg, SuspectPortraitSvg } from './PictogramSvg';

interface AccusationModalProps {
  secondsRemaining: number;
  tokensLeft: number;
  canReturnToFloor: boolean;
  onSubmitVerdict: (verdict: AccusationVerdict) => void;
  onCancel: () => void;
}

export const AccusationModal: React.FC<AccusationModalProps> = ({
  secondsRemaining,
  tokensLeft,
  canReturnToFloor,
  onSubmitVerdict,
  onCancel,
}) => {
  const [selectedSpy, setSelectedSpy] = useState<SuspectId>('bastian');
  const [orbitVerdict, setOrbitVerdict] = useState<OrbitVerdict>('TRUSTED');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitVerdict({
      accusedSpyId: selectedSpy,
      orbitVerdict,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accusation-heading"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0A0A0B]/92 overflow-y-auto"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl noir-panel border-[6px] border-[#C8242B] p-6 md:p-8 shadow-[12px_12px_0px_#111111]"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-[#111111]">
          <div>
            <div className="font-mono-label text-xs text-[#C8242B]">
              FINAL VERDICT DOSSIER · OPERATION LEATHER JACKET
            </div>
            <h2 id="accusation-heading" className="font-display text-2xl md:text-3xl text-[#F2F2EE]">
              FILE YOUR SEALED ACCUSATION
            </h2>
          </div>

          <div className="text-right font-mono-code">
            <div className="text-[11px] text-[#8A8A8E]">CLOCK REMAINING</div>
            <div className="text-xl font-bold text-[#C8242B]">
              {formatClock(secondsRemaining)}
            </div>
          </div>
        </div>

        {/* Verdict Part A: Who is the Spy? */}
        <fieldset className="mt-5">
          <legend className="font-mono-label text-xs text-[#C98F4E] mb-3">
            VERDICT A — WHO IS THE RIVAL PLANT (DOES NOT KNOW THE FACT)? (+100 PTS)
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {SUSPECT_IDS.map((id) => {
              const active = selectedSpy === id;
              const profile = CAST_PROFILES[id];
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedSpy(id)}
                  className={`p-3 rounded-xl border-[3px] flex flex-col items-center text-center cursor-pointer transition-transform ${
                    active
                      ? 'bg-[#C8242B] text-[#F2F2EE] border-[#F2F2EE] -translate-y-0.5'
                      : 'bg-[#111111] text-[#F2F2EE] border-[#8A8A8E]/40 hover:border-[#F2F2EE]'
                  }`}
                >
                  <SuspectPortraitSvg suspectId={id} size={56} />
                  <span className="mt-2 font-display text-xs leading-tight">
                    {profile.name}
                  </span>
                  <span className="mt-0.5 font-mono-code text-[10px] opacity-80">
                    {profile.role}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Verdict Part B: ORBIT Trusted or Compromised */}
        <fieldset className="mt-6">
          <legend className="font-mono-label text-xs text-[#C98F4E] mb-3">
            VERDICT B — IS YOUR AI ASSISTANT ORBIT HONEST OR COMPROMISED? (+50 PTS)
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['TRUSTED', 'COMPROMISED'] as OrbitVerdict[]).map((choice) => {
              const active = orbitVerdict === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOrbitVerdict(choice)}
                  className={`p-4 rounded-xl border-[3px] flex items-center gap-3.5 text-left cursor-pointer ${
                    active
                      ? 'bg-[#F2F2EE] text-[#111111] border-[#C8242B]'
                      : 'bg-[#111111] text-[#F2F2EE] border-[#8A8A8E]/40 hover:border-[#F2F2EE]'
                  }`}
                >
                  <OrbitDieSvg size={38} />
                  <div>
                    <div className="font-display text-base">
                      ORBIT IS {choice}
                    </div>
                    <div className="font-mono-code text-xs opacity-80">
                      {choice === 'TRUSTED'
                        ? 'Telemetry scans matched room timestamps and quotes accurately.'
                        : 'Scans subtly fabricated timestamps, rooms, or quotes to frame an innocent.'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Footer Actions */}
        <div className="mt-7 pt-4 border-t-2 border-[#111111] flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono-code text-xs text-[#8A8A8E]">
            UNUSED QUESTION BONUS: +{tokensLeft * 5} PTS · WRONG VERDICT PENALTY APPLIES
          </div>

          <div className="flex items-center gap-3">
            {canReturnToFloor && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-lg bg-[#111111] hover:bg-[#0A0A0B] text-[#F2F2EE] font-mono-label text-xs border-2 border-[#8A8A8E] cursor-pointer whitespace-nowrap shrink-0"
              >
                Back to Floor 88
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-[#C8242B] hover:bg-[#a91d23] text-[#F2F2EE] font-display text-base border-[4px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
            >
              Stamp Final Verdict
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
