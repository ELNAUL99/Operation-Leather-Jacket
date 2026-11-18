import React, { useEffect, useRef } from 'react';
import { CAST_PROFILES, SuspectId } from '../shared/constants';
import { OrbitScanResult, TranscriptEntry } from '../shared/types';
import { OrbitDieSvg, PulseShapeMeter, SuspectPortraitSvg } from './PictogramSvg';

interface DialogueDrawerProps {
  suspectId: SuspectId;
  transcripts: TranscriptEntry[];
  draftQuestion: string;
  onDraftQuestionChange: (val: string) => void;
  streamingText: string | null;
  isAsking: boolean;
  isScanning: boolean;
  tokensLeft: number;
  scansLeft: number;
  gossipCount: number;
  latestScan: OrbitScanResult | null;
  reducedMotion: boolean;
  onAskQuestion: (question: string) => void;
  onScanTranscript: () => void;
  onOpenHowToPlay: () => void;
  onClose: () => void;
}

export const DialogueDrawer: React.FC<DialogueDrawerProps> = ({
  suspectId,
  transcripts,
  draftQuestion,
  onDraftQuestionChange,
  streamingText,
  isAsking,
  isScanning,
  tokensLeft,
  scansLeft,
  gossipCount,
  latestScan,
  reducedMotion,
  onAskQuestion,
  onScanTranscript,
  onOpenHowToPlay,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const profile = CAST_PROFILES[suspectId];
  const latestEntry = transcripts[transcripts.length - 1] ?? null;
  const currentStress = latestEntry?.response.stress ?? 32;

  useEffect(() => {
    if (draftQuestion && inputRef.current && !isAsking) {
      inputRef.current.focus();
    }
  }, [draftQuestion, isAsking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftQuestion.trim();
    if (!trimmed || isAsking || tokensLeft <= 0) return;
    onAskQuestion(trimmed);
    onDraftQuestionChange('');
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 md:p-5 pointer-events-none flex justify-center">
      <section
        aria-label={`Interrogation with ${profile.name}`}
        className={`pointer-events-auto w-full max-w-4xl evidence-card p-4 md:p-5 ${
          reducedMotion ? '' : '-rotate-[0.8deg]'
        }`}
      >
        {/* Top Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-[#111111]">
          <div className="flex items-center gap-3">
            <SuspectPortraitSvg suspectId={suspectId} size={52} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-label text-[11px] text-[#C8242B] font-bold">
                  INTERROGATION
                </span>
                <span className="text-[#8A8A8E]">·</span>
                <span className="font-mono-code text-[11px] text-[#111111]">
                  GOSSIP VENTS: {gossipCount} LOGGED
                </span>
              </div>
              <h3 className="font-display text-lg md:text-xl text-[#111111] leading-tight">
                {profile.name}{' '}
                <span className="font-mono-code text-xs font-normal text-[#111111]/75">
                  ({profile.role})
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PulseShapeMeter stress={currentStress} />

            <button
              type="button"
              onClick={onOpenHowToPlay}
              className="px-2.5 py-1.5 rounded-md border-[3px] border-[#111111] bg-[#F2F2EE] hover:bg-[#C98F4E] text-[#111111] font-mono-label text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              Guide [H]
            </button>

            <button
              type="button"
              disabled={scansLeft <= 0 || isScanning}
              onClick={onScanTranscript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border-[3px] border-[#111111] bg-[#C98F4E] enabled:hover:bg-[#b87e3e] disabled:bg-[#8A8A8E] disabled:cursor-not-allowed text-[#111111] font-mono-label text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              <OrbitDieSvg size={18} />
              <span>{isScanning ? 'Scanning...' : `ORBIT Scan (${scansLeft})`}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border-[3px] border-[#111111] bg-[#0A0A0B] text-[#F2F2EE] font-mono-label text-[11px] cursor-pointer whitespace-nowrap shrink-0"
            >
              Step Away [Esc]
            </button>
          </div>
        </div>

        {/* Suspect Speech Area */}
        <div className="mt-3 min-h-[68px] p-3.5 rounded-lg bg-[#0A0A0B] text-[#F2F2EE] border-[3px] border-[#111111]">
          {isAsking ? (
            <p className="text-sm md:text-base leading-relaxed">
              {streamingText ? (
                <>
                  &ldquo;{streamingText}
                  <span className="inline-block ml-1 text-[#C8242B] font-mono-code">...</span>&rdquo;
                </>
              ) : (
                <span className="font-mono-code text-sm text-[#C98F4E]">
                  [{profile.name} weighs their alibi ...]
                </span>
              )}
            </p>
          ) : latestEntry ? (
            <div>
              <div className="font-mono-code text-[11px] text-[#8A8A8E] mb-1">
                AUDITOR ASKED: &ldquo;{latestEntry.question}&rdquo;
              </div>
              <p className="text-sm md:text-base leading-relaxed text-[#F2F2EE]">
                &ldquo;{latestEntry.response.say}&rdquo;
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#8A8A8E] italic">
              {profile.silhouetteNote} Ask a targeted question—remember every answer echoes into
              the shared penthouse Gossip Log.
            </p>
          )}
        </div>

        {/* Inline ORBIT Scan Readout if scanned */}
        {latestScan && (
          <div className="mt-2.5 p-2.5 rounded-md bg-[#111111] text-[#F2F2EE] border-2 border-[#C8242B] text-xs font-mono-code flex items-start gap-2">
            <OrbitDieSvg size={22} className="mt-0.5 shrink-0" />
            <div>
              <span className="text-[#C8242B] font-bold">
                ORBIT [{latestScan.confidenceLabel}]:{' '}
              </span>
              <span>{latestScan.summary}</span>
            </div>
          </div>
        )}

        {/* Preset Probe Chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.presetProbes.map((probe, i) => (
            <button
              key={i}
              type="button"
              disabled={isAsking || tokensLeft <= 0}
              onClick={() => onAskQuestion(probe)}
              className="text-left px-3 py-1.5 rounded bg-[#F2F2EE] enabled:hover:bg-[#C8242B] enabled:hover:text-[#F2F2EE] disabled:bg-[#8A8A8E] disabled:text-[#111111] disabled:cursor-not-allowed text-[#111111] border-2 border-[#111111] font-mono-code text-xs transition-colors cursor-pointer"
            >
              Probe {i + 1}: {probe}
            </button>
          ))}
        </div>

        {/* Free-Text Mono Input (Controlled via draftQuestion so HowToPlay example probes fill it directly) */}
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <label htmlFor="auditor-question-input" className="sr-only">
            Type your question to {profile.name}
          </label>
          <input
            ref={inputRef}
            id="auditor-question-input"
            type="text"
            value={draftQuestion}
            onChange={(e) => onDraftQuestionChange(e.target.value)}
            disabled={isAsking || tokensLeft <= 0}
            maxLength={160}
            placeholder={
              tokensLeft > 0
                ? `Ask ${profile.name} anything in your own words (-1 Question Token)...`
                : 'OUT OF QUESTION TOKENS — Check Notebook or Submit Accusation!'
            }
            className="flex-1 px-3.5 py-2 rounded-md bg-[#0A0A0B] text-[#F2F2EE] placeholder-[#8A8A8E] border-[3px] border-[#111111] font-mono-code text-xs md:text-sm focus:outline-none focus:border-[#C8242B]"
          />
          <button
            type="submit"
            disabled={isAsking || tokensLeft <= 0 || !draftQuestion.trim()}
            className="px-4 py-2 rounded-md bg-[#C8242B] enabled:hover:bg-[#a91d23] disabled:bg-[#8A8A8E] disabled:text-[#111111] disabled:cursor-not-allowed text-[#F2F2EE] font-mono-label text-xs font-bold border-[3px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
          >
            Ask ({tokensLeft})
          </button>
        </form>
      </section>
    </div>
  );
};
