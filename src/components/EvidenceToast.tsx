import React from 'react';
import { ROOMS } from '../shared/constants';
import { EvidenceItem, OrbitScanResult } from '../shared/types';
import { OrbitDieSvg } from './PictogramSvg';

interface EvidenceToastProps {
  evidence: EvidenceItem;
  existingScan: OrbitScanResult | null;
  scansLeft: number;
  isScanning: boolean;
  reducedMotion: boolean;
  onScanEvidence: (item: EvidenceItem) => void;
  onClose: () => void;
}

export const EvidenceToast: React.FC<EvidenceToastProps> = ({
  evidence,
  existingScan,
  scansLeft,
  isScanning,
  reducedMotion,
  onScanEvidence,
  onClose,
}) => {
  const roomName = ROOMS.find((r) => r.id === evidence.room)?.name ?? evidence.room;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-card-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0A0A0B]/80"
    >
      <div
        className={`max-w-lg w-full evidence-card p-6 ${
          reducedMotion ? '' : '-rotate-2'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-label text-xs font-bold text-[#111111]">
            {evidence.code} · {roomName}
          </span>
          <span className="font-mono-label text-xs font-bold text-[#C8242B]">
            CLASSIFIED
          </span>
        </div>

        <h3
          id="evidence-card-title"
          className="mt-3 font-display text-xl text-[#111111]"
        >
          {evidence.label}
        </h3>

        <div className="mt-1 font-mono-code text-xs text-[#111111]/75">
          LOGGED TIME: {evidence.timestamp ?? '23:15'} · GRADE: {evidence.reliability}
        </div>

        <p className="mt-4 text-sm md:text-base text-[#111111] leading-relaxed border-t-2 border-b-2 border-[#111111]/20 py-3">
          {evidence.text}
        </p>

        {existingScan && (
          <div className="mt-4 p-3 rounded-md bg-[#0A0A0B] text-[#F2F2EE] border-2 border-[#C8242B] font-mono-code text-xs flex items-start gap-2.5">
            <OrbitDieSvg size={24} className="shrink-0 mt-0.5" />
            <div>
              <div className="text-[#C8242B] font-bold">
                ORBIT SCAN · {existingScan.confidenceLabel}
              </div>
              <p className="mt-1 leading-relaxed">{existingScan.summary}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={Boolean(existingScan) || scansLeft <= 0 || isScanning}
            onClick={() => onScanEvidence(evidence)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#C98F4E] enabled:hover:bg-[#b87e3e] disabled:bg-[#8A8A8E] disabled:cursor-not-allowed text-[#111111] font-mono-label text-xs font-bold border-[3px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
          >
            <OrbitDieSvg size={20} />
            <span>
              {existingScan
                ? 'Scanned'
                : isScanning
                ? 'Scanning...'
                : `ORBIT Scan (${scansLeft} left)`}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-[#0A0A0B] hover:bg-[#111111] text-[#F2F2EE] font-mono-label text-xs font-bold border-[3px] border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
          >
            File in Red Notepad
          </button>
        </div>
      </div>
    </div>
  );
};
