import React from 'react';
import { RedactedFactBriefing } from '../shared/types';
import { formatClock } from './HudBar';
import { OrbitDieSvg } from './PictogramSvg';

interface BriefingModalProps {
  seed: string;
  source: 'GEMINI_LIVE' | 'HANDWRITTEN_FALLBACK';
  redactedFact: RedactedFactBriefing;
  briefingSecondsLeft: number;
  reducedMotion: boolean;
  onBeginInvestigation: () => void;
}

export const BriefingModal: React.FC<BriefingModalProps> = ({
  seed,
  source,
  redactedFact,
  briefingSecondsLeft,
  reducedMotion,
  onBeginInvestigation,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-heading"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0A0A0B]/90"
    >
      <div className="max-w-2xl w-full noir-panel p-6 md:p-8 shadow-[12px_12px_0px_#C8242B]">
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#111111] pb-4">
          <div className="flex items-center gap-3">
            <OrbitDieSvg size={44} />
            <div>
              <div className="font-mono-label text-xs text-[#C8242B]">
                MISSION BRIEFING · SEED {seed}
              </div>
              <h2 id="briefing-heading" className="font-display text-2xl text-[#F2F2EE]">
                FLOOR 88 LEAK CONTAINMENT
              </h2>
            </div>
          </div>
          <div className="text-right font-mono-code">
            <div className="text-[11px] text-[#8A8A8E]">AUTO-DEPLOY</div>
            <div className="text-lg font-bold text-[#C8242B]">
              {formatClock(briefingSecondsLeft)}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-[#F2F2EE] leading-relaxed">
          <strong className="font-mono-code text-[#C98F4E]">ORBIT:</strong> &ldquo;Good evening,
          Auditor. CEO Dax Mercer shared a sensitive Envydia milestone with{' '}
          <strong>four</strong> of the five guests on Floor 88 tonight. The{' '}
          <strong>fifth guest is a rival plant</strong> who does not know the secret—and will try
          to harvest it from your questions and the penthouse gossip vents.&rdquo;
        </p>

        {/* Rotated -2deg Evidence Card for Redacted THE FACT */}
        <div
          className={`mt-6 evidence-card p-5 ${reducedMotion ? '' : '-rotate-1'}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono-label text-xs text-[#111111] font-bold">
              DOSSIER #00 · THE FACT (REDACTED)
            </span>
            <span className="font-mono-label text-xs text-[#C8242B] font-bold">
              CLASSIFIED
            </span>
          </div>

          <div className="mt-3 font-display text-xl text-[#111111]">
            CATEGORY: {redactedFact.category}
          </div>
          <div className="mt-2 space-y-1 font-mono-code text-xs md:text-sm text-[#111111]">
            <div>• {redactedFact.hintOne}</div>
            <div>• {redactedFact.hintTwo}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code text-[#8A8A8E]">
          <div>1. 10 QUESTION TOKENS TOTAL</div>
          <div>2. EVERY GUEST HIDES A FLING</div>
          <div>3. VERIFY ORBIT’S 3 SCANS</div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="font-mono-code text-xs text-[#8A8A8E]">
            SOURCE: {source === 'GEMINI_LIVE' ? 'LIVE GEMINI FORGE' : 'SEALED ARCHIVE CASE'}
          </span>

          <button
            type="button"
            onClick={onBeginInvestigation}
            className="px-6 py-3 bg-[#C8242B] hover:bg-[#a91d23] text-[#F2F2EE] font-display text-base rounded-lg border-[4px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
          >
            Enter Floor 88
          </button>
        </div>
      </div>
    </div>
  );
};
