import React, { useState } from 'react';
import { CAST_PROFILES } from '../shared/constants';
import {
  AccusationVerdict,
  CaseData,
  ScoreBreakdown,
} from '../shared/types';
import { OrbitDieSvg, SuspectPortraitSvg } from './PictogramSvg';

interface RevealModalProps {
  caseData: CaseData;
  verdict: AccusationVerdict;
  score: ScoreBreakdown;
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

export const RevealModal: React.FC<RevealModalProps> = ({
  caseData,
  verdict,
  score,
  onPlayAgain,
  onReturnTitle,
}) => {
  const [copied, setCopied] = useState(false);

  const actualSpy = CAST_PROFILES[caseData.spy_id];
  const accusedSpy = CAST_PROFILES[verdict.accusedSpyId];
  const framedSuspect = caseData.framed_id ? CAST_PROFILES[caseData.framed_id] : null;

  const handleCopySeed = () => {
    navigator.clipboard?.writeText(caseData.seed).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-[#0A0A0B]/95 overflow-y-auto"
    >
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto evidence-card p-6 md:p-8">
        {/* Top Stamp & Rank Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b-[4px] border-[#111111]">
          <div>
            <div className="font-mono-label text-xs text-[#C8242B] font-bold">
              DECLASSIFIED CASE REVEAL · SEED {caseData.seed}
            </div>
            <h2 id="reveal-heading" className="font-display text-2xl md:text-4xl text-[#111111]">
              {score.rank}
            </h2>
            <div className="mt-1 font-mono-code text-sm font-bold text-[#111111]">
              TOTAL SCORE: {score.totalScore} PTS (SPY {score.spyPoints >= 0 ? `+${score.spyPoints}` : score.spyPoints} · ORBIT +{score.orbitPoints} · TOKENS +{score.tokenBonus} · TIME +{score.timeBonus}{' '}
              {score.penalties < 0 ? `· PENALTY ${score.penalties}` : ''})
            </div>
          </div>

          {/* Big Red Rubber Stamps */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="stamp-slam px-4 py-2 border-[5px] border-[#C8242B] rounded text-[#C8242B] font-display text-lg md:text-xl tracking-wider uppercase">
              {score.spyCorrect ? `GUILTY: ${actualSpy.name}` : `MISSED: ${actualSpy.name}`}
            </div>
            <div className="stamp-slam px-4 py-2 border-[5px] border-[#111111] rounded text-[#111111] font-display text-lg md:text-xl tracking-wider uppercase">
              {caseData.orbit_compromised ? 'ORBIT: COMPROMISED' : 'ORBIT: CLEARED'}
            </div>
          </div>
        </div>

        {/* Ground Truth Summary Strip */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0A0A0B] text-[#F2F2EE] border-[4px] border-[#111111]">
            <div className="font-mono-label text-xs text-[#C98F4E]">
              UNREDACTED SECRET · THE FACT
            </div>
            <div className="mt-1 font-display text-xl text-[#F2F2EE]">
              {caseData.fact.codename} — {caseData.fact.city} ({caseData.fact.number})
            </div>
            <p className="mt-1 text-xs md:text-sm text-[#8A8A8E]">
              {caseData.fact.category}: {caseData.fact.detail}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0A0B] text-[#F2F2EE] border-[4px] border-[#111111] flex items-center gap-3.5">
            <OrbitDieSvg size={44} className="shrink-0" />
            <div className="text-xs md:text-sm">
              <div className="font-mono-label text-xs text-[#C8242B]">
                YOUR VERDICT CHECK
              </div>
              <p className="mt-1">
                You accused <strong>{accusedSpy.name}</strong> ({score.spyCorrect ? 'CORRECT' : `WRONG — actual Spy was ${actualSpy.name}`}) and ruled ORBIT{' '}
                <strong>{verdict.orbitVerdict}</strong> ({score.orbitCorrect ? 'CORRECT' : 'WRONG'}).
                {caseData.orbit_compromised && framedSuspect
                  ? ` ORBIT was covertly framing innocent guest ${framedSuspect.name}.`
                  : ' ORBIT reported clean telemetry all night.'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline & Private Affair Secrets Replay */}
        <div className="mt-6">
          <div className="font-mono-label text-xs text-[#111111] font-bold mb-3">
            FLOOR 88 TIMELINE &amp; PRIVATE SECRETS REPLAY
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {caseData.suspects.map((s) => {
              const isSpy = s.id === caseData.spy_id;
              const isFramed = s.id === caseData.framed_id;
              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-xl border-[3px] border-[#111111] flex flex-col justify-between ${
                    isSpy ? 'bg-[#C8242B] text-[#F2F2EE]' : 'bg-[#F2F2EE] text-[#111111]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <SuspectPortraitSvg suspectId={s.id} size={42} />
                      <span className="font-mono-label text-[10px] font-bold">
                        {isSpy ? '[THE SPY]' : isFramed ? '[FRAMED]' : '[CLEARED]'}
                      </span>
                    </div>
                    <div className="mt-2 font-display text-sm">{s.name}</div>
                    <div className="font-mono-code text-[10px] opacity-80">
                      {s.knows_fact ? 'Knew THE FACT' : 'Did NOT know THE FACT'}
                    </div>
                    <p className="mt-2 text-xs leading-snug">{s.affair_secret}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shareable Case Seed & Restart Buttons */}
        <div className="mt-6 pt-4 border-t-[3px] border-[#111111] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono-code text-xs font-bold text-[#111111]">
              SHARE SEED: {caseData.seed}
            </span>
            <button
              type="button"
              onClick={handleCopySeed}
              className="px-3 py-1.5 rounded bg-[#111111] text-[#F2F2EE] font-mono-label text-[11px] cursor-pointer whitespace-nowrap shrink-0"
            >
              {copied ? 'Copied Seed' : 'Copy Seed'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnTitle}
              className="px-4 py-2.5 rounded-lg bg-[#111111] text-[#F2F2EE] font-mono-label text-xs border-[3px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
            >
              Title Screen
            </button>

            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="px-6 py-2.5 rounded-lg bg-[#C8242B] hover:bg-[#a91d23] text-[#F2F2EE] font-display text-base border-[4px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
            >
              Play New Case
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
