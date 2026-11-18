import React from 'react';

export const EXAMPLE_FACT_QUESTIONS: readonly string[] = [
  "What exact codename and launch city were written on Dax's whiteboard?",
  "What concrete metric number did Dax attach to tonight's chip launch?",
  'Summarize Dax’s secret briefing in one specific detail—no vague alibis.',
];

interface HowToPlayModalProps {
  isPreRound: boolean;
  reducedMotion: boolean;
  selectedExample: string;
  onSelectExampleQuestion: (question: string) => void;
  onContinue: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isPreRound,
  reducedMotion,
  selectedExample,
  onSelectExampleQuestion,
  onContinue,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#0A0A0B]/90"
    >
      <div
        className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto evidence-card p-5 md:p-6 ${
          reducedMotion ? '' : '-rotate-1'
        }`}
      >
        {/* Top Evidence-Style Mono Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b-[3px] border-[#111111]">
          <span className="font-mono-label text-xs font-bold text-[#C8242B]">
            FIELD MANUAL #00 · HOW TO PLAY
          </span>
          <span className="font-mono-label text-xs font-bold text-[#C8242B]">
            CLASSIFIED · REOPEN WITH [H]
          </span>
        </div>

        <h2
          id="how-to-play-heading"
          className="mt-2.5 font-display text-xl md:text-2xl text-[#111111]"
        >
          OPERATION LEATHER JACKET — AUDITOR BRIEF
        </h2>

        {/* Core Rules Grid */}
        <div className="mt-3 space-y-2 text-xs md:text-sm text-[#111111] leading-snug">
          <div className="p-2.5 rounded-lg bg-[#0A0A0B]/5 border-2 border-[#111111]">
            <span className="font-mono-label text-[11px] font-bold text-[#C8242B] block mb-0.5">
              GOAL
            </span>
            One of the five does not know the secret. Find the <strong>Spy</strong>. Then
            decide: is <strong>ORBIT</strong> trustworthy?
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[#0A0A0B]/5 border-2 border-[#111111]">
              <span className="font-mono-label text-[11px] font-bold text-[#C8242B] block mb-0.5">
                CONTROLS
              </span>
              <span className="font-mono-code text-xs">
                <strong>A / D</strong> or <strong>Arrows</strong> move · <strong>E</strong>{' '}
                interact · <strong>Tab</strong> notebook · <strong>Enter</strong> submit ·{' '}
                <strong>H</strong> guide
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0A0A0B]/5 border-2 border-[#111111]">
              <span className="font-mono-label text-[11px] font-bold text-[#C8242B] block mb-0.5">
                ROUND LIMIT
              </span>
              <span className="font-mono-code text-xs font-bold">
                12 MIN TARGET · 15 MIN HARD CAP
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0A0A0B]/5 border-2 border-[#111111]">
            <span className="font-mono-label text-[11px] font-bold text-[#C8242B] block mb-0.5">
              HOW
            </span>
            You have <strong>10 questions</strong>. Ask about <strong>THE FACT</strong> (what
            was on the whiteboard, the codename, the city), not just alibis. Real confidants
            answer concretely and consistently. The Spy bluffs. Everyone hides a personal
            secret, so evasion alone proves nothing.
          </div>

          <div className="p-2.5 rounded-lg bg-[#0A0A0B]/5 border-2 border-[#111111]">
            <span className="font-mono-label text-[11px] font-bold text-[#C8242B] block mb-0.5">
              TIPS
            </span>
            Compare answers in the Notebook. Check ORBIT&rsquo;s claims against evidence cards.
            Watch the Pulse meter.
          </div>
        </div>

        {/* 3 Clickable Example Questions that fill the input box */}
        <div className="mt-3 pt-2.5 border-t-2 border-[#111111]/20">
          <div className="font-mono-label text-[11px] font-bold text-[#C8242B] mb-1.5">
            EXAMPLE PROBES (CLICK TO FILL INTERROGATION INPUT BOX)
          </div>
          <div className="flex flex-col gap-1.5">
            {EXAMPLE_FACT_QUESTIONS.map((q, idx) => {
              const active = selectedExample === q;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectExampleQuestion(q)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg border-2 border-[#111111] font-mono-code text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-[#C8242B] text-[#F2F2EE]'
                      : 'bg-[#F2F2EE] hover:bg-[#C98F4E] text-[#111111]'
                  }`}
                >
                  <span>
                    {idx + 1}. &ldquo;{q}&rdquo;
                  </span>
                  <span className="font-mono-label text-[10px] font-bold shrink-0">
                    {active ? '[FILLED]' : '[FILL INPUT]'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Dismiss / Skip Action */}
        <div className="mt-3.5 pt-3 border-t-[3px] border-[#111111] flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono-code text-xs text-[#111111]/80">
            {isPreRound
              ? 'Press [Enter] to skip straight into Case Briefing.'
              : 'Press [Enter] or [H] to return to Floor 88.'}
          </span>

          <button
            type="button"
            onClick={onContinue}
            className="px-5 py-2 rounded-lg bg-[#C8242B] hover:bg-[#a91d23] text-[#F2F2EE] font-display text-sm md:text-base border-[4px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
          >
            {isPreRound ? 'Begin Briefing [Enter]' : 'Back to Floor 88 [Enter]'}
          </button>
        </div>
      </div>
    </div>
  );
};
