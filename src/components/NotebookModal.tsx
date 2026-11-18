import React, { useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { CAST_PROFILES, ROOMS, SUSPECT_IDS, SuspectId } from '../shared/constants';
import {
  EvidenceItem,
  GossipEntry,
  OrbitScanResult,
  PinLink,
  RedactedFactBriefing,
  TranscriptEntry,
} from '../shared/types';
import { OrbitDieSvg, PulseShapeMeter, SuspectPortraitSvg } from './PictogramSvg';

interface NotebookModalProps {
  redactedFact: RedactedFactBriefing;
  collectedEvidence: EvidenceItem[];
  totalEvidenceCount: number;
  transcripts: TranscriptEntry[];
  gossipLog: GossipEntry[];
  orbitScans: OrbitScanResult[];
  pinLinks: PinLink[];
  scansLeft: number;
  isScanning: boolean;
  reducedMotion: boolean;
  onScanEvidence: (item: EvidenceItem) => void;
  onScanSuspect: (suspectId: SuspectId) => void;
  onAddPinLink: (fromId: string, toId: string) => void;
  onRemovePinLink: (linkId: string) => void;
  onClose: () => void;
}

type NotebookTab = 'EVIDENCE' | 'TRANSCRIPTS' | 'PINBOARD';

const BOARD_WIDTH = 920;
const BOARD_HEIGHT = 440;

export const NotebookModal: React.FC<NotebookModalProps> = ({
  redactedFact,
  collectedEvidence,
  totalEvidenceCount,
  transcripts,
  gossipLog,
  orbitScans,
  pinLinks,
  scansLeft,
  isScanning,
  reducedMotion,
  onScanEvidence,
  onScanSuspect,
  onAddPinLink,
  onRemovePinLink,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<NotebookTab>('EVIDENCE');
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectId>('isolde');
  const [selectedPinNode, setSelectedPinNode] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Compute deterministic coordinates for Suspects (top row) and Collected Evidence (bottom row)
  const nodePositions = new Map<string, { x: number; y: number; title: string; kind: 'SUSPECT' | 'EVIDENCE' }>();

  SUSPECT_IDS.forEach((id, idx) => {
    const x = 110 + idx * 175;
    nodePositions.set(id, {
      x,
      y: 92,
      title: CAST_PROFILES[id].name,
      kind: 'SUSPECT',
    });
  });

  collectedEvidence.forEach((ev, idx) => {
    const cols = Math.max(1, collectedEvidence.length);
    const spacing = Math.min(165, (BOARD_WIDTH - 140) / Math.max(1, cols - 1 || 1));
    const startX = cols === 1 ? BOARD_WIDTH / 2 : 95;
    nodePositions.set(ev.id, {
      x: startX + idx * spacing,
      y: 332,
      title: `${ev.code}: ${ev.label}`,
      kind: 'EVIDENCE',
    });
  });

  const handlePinClickOrDrop = (nodeId: string) => {
    if (!selectedPinNode) {
      setSelectedPinNode(nodeId);
      return;
    }
    if (selectedPinNode === nodeId) {
      setSelectedPinNode(null);
      setDragPointer(null);
      return;
    }
    onAddPinLink(selectedPinNode, nodeId);
    soundEngine.playPinSnap();
    setSelectedPinNode(null);
    setDragPointer(null);
  };

  const handleBoardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPinNode || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const scaleX = BOARD_WIDTH / rect.width;
    const scaleY = BOARD_HEIGHT / rect.height;
    setDragPointer({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    });
  };

  const suspectEntries = transcripts.filter((t) => t.suspectId === selectedSuspect);
  const suspectScan = orbitScans.find(
    (s) => s.targetType === 'TRANSCRIPT' && s.targetId === selectedSuspect
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notebook-heading"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-6 bg-[#0A0A0B]/90"
    >
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col noir-panel border-[6px] border-[#C8242B] shadow-[12px_12px_0px_#111111] overflow-hidden">
        {/* Top Red Notepad Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#C8242B] text-[#F2F2EE] border-b-[4px] border-[#111111]">
          <div>
            <div className="font-mono-label text-[11px] text-[#0A0A0B] font-bold">
              AUDITOR’S RED NOTEPAD · {redactedFact.category}
            </div>
            <h2 id="notebook-heading" className="font-display text-xl md:text-2xl">
              CASE DOSSIER &amp; DEDUCTION BOARD
            </h2>
          </div>

          {/* Interactive Tab Controls */}
          <div className="flex items-center gap-2">
            {(['EVIDENCE', 'TRANSCRIPTS', 'PINBOARD'] as NotebookTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded font-mono-label text-xs font-bold border-2 border-[#111111] cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === tab
                    ? 'bg-[#F2F2EE] text-[#111111]'
                    : 'bg-[#0A0A0B] text-[#F2F2EE] hover:bg-[#111111]'
                }`}
              >
                {tab === 'EVIDENCE'
                  ? `Evidence (${collectedEvidence.length}/${totalEvidenceCount})`
                  : tab === 'TRANSCRIPTS'
                  ? `Transcripts (${transcripts.length})`
                  : `Pin Board (${pinLinks.length})`}
              </button>
            ))}

            <button
              type="button"
              onClick={onClose}
              className="ml-2 px-3.5 py-2 rounded bg-[#0A0A0B] text-[#F2F2EE] font-mono-label text-xs font-bold border-2 border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
            >
              Close [Tab]
            </button>
          </div>
        </div>

        {/* Redacted THE FACT Reminder Bar */}
        <div className="px-6 py-2.5 bg-[#111111] border-b-2 border-[#0A0A0B] flex flex-wrap items-center justify-between gap-2 font-mono-code text-xs text-[#F2F2EE]">
          <span>
            <strong className="text-[#C98F4E]">THE FACT HINTS:</strong> {redactedFact.hintOne}
          </span>
          <span>{redactedFact.hintTwo}</span>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {activeTab === 'EVIDENCE' && (
            <div>
              {collectedEvidence.length === 0 ? (
                <div className="text-center py-14 border-2 border-dashed border-[#8A8A8E]/40 rounded-xl">
                  <p className="font-display text-lg text-[#F2F2EE]">
                    NO EVIDENCE CARDS LOGGED YET
                  </p>
                  <p className="mt-2 font-mono-code text-xs text-[#8A8A8E]">
                    Walk across Floor 88 with A / D and press E on glowing red pin hotspots to
                    collect classified cards.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {collectedEvidence.map((ev) => {
                    const scan = orbitScans.find(
                      (s) => s.targetType === 'EVIDENCE' && s.targetId === ev.id
                    );
                    const roomName = ROOMS.find((r) => r.id === ev.room)?.name ?? ev.room;

                    return (
                      <article
                        key={ev.id}
                        className={`evidence-card p-5 flex flex-col justify-between ${
                          reducedMotion ? '' : '-rotate-1'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono-label text-xs font-bold text-[#111111]">
                              {ev.code} · {roomName}
                            </span>
                            <span className="font-mono-label text-xs font-bold text-[#C8242B]">
                              CLASSIFIED
                            </span>
                          </div>
                          <h3 className="mt-2 font-display text-lg text-[#111111]">
                            {ev.label}
                          </h3>
                          <div className="font-mono-code text-[11px] text-[#111111]/70">
                            TIME {ev.timestamp ?? '23:15'} · {ev.reliability}
                          </div>
                          <p className="mt-3 text-sm text-[#111111] leading-relaxed">
                            {ev.text}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t-2 border-[#111111]/15">
                          {scan ? (
                            <div className="p-2.5 rounded bg-[#0A0A0B] text-[#F2F2EE] font-mono-code text-xs">
                              <span className="text-[#C8242B] font-bold">
                                ORBIT [{scan.confidenceLabel}]:{' '}
                              </span>
                              {scan.summary}
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={scansLeft <= 0 || isScanning}
                              onClick={() => onScanEvidence(ev)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#C98F4E] hover:bg-[#b87e3e] disabled:opacity-40 text-[#111111] font-mono-label text-[11px] font-bold border-2 border-[#111111] cursor-pointer"
                            >
                              <OrbitDieSvg size={18} />
                              <span>Scan Card ({scansLeft} left)</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'TRANSCRIPTS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Suspect Selector + Shared Gossip Log */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="font-mono-label text-xs text-[#C8242B]">
                    SELECT SUSPECT DOSSIER
                  </div>
                  {SUSPECT_IDS.map((id) => {
                    const count = transcripts.filter((t) => t.suspectId === id).length;
                    const active = selectedSuspect === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedSuspect(id)}
                        className={`w-full p-2.5 rounded-lg border-2 flex items-center justify-between text-left cursor-pointer ${
                          active
                            ? 'bg-[#F2F2EE] text-[#111111] border-[#C8242B]'
                            : 'bg-[#111111] text-[#F2F2EE] border-[#8A8A8E]/40 hover:border-[#F2F2EE]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <SuspectPortraitSvg suspectId={id} size={38} />
                          <div>
                            <div className="font-display text-sm">{CAST_PROFILES[id].name}</div>
                            <div className="font-mono-code text-[11px] opacity-75">
                              {CAST_PROFILES[id].role}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-code text-xs font-bold">{count} Q</span>
                      </button>
                    );
                  })}
                </div>

                {/* Shared Gossip Log */}
                <div className="p-3.5 rounded-lg bg-[#111111] border-2 border-[#8A8A8E]/40">
                  <div className="font-mono-label text-xs text-[#C98F4E] mb-2">
                    SHARED PENTHOUSE GOSSIP LOG ({gossipLog.length})
                  </div>
                  <p className="text-xs text-[#8A8A8E] mb-2">
                    Every answer echoes through Floor 88’s vents. The Spy can parrot details
                    once someone else leaks them!
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-2 font-mono-code text-[11px]">
                    {gossipLog.length === 0 ? (
                      <div className="text-[#8A8A8E]">No answers broadcast yet.</div>
                    ) : (
                      gossipLog.map((g) => (
                        <div key={g.turn} className="border-t border-[#8A8A8E]/20 pt-1.5">
                          <span className="text-[#C8242B]">#{g.turn} {g.suspectName}:</span>{' '}
                          <span className="text-[#F2F2EE]">&ldquo;{g.answer}&rdquo;</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right 2 Columns: Selected Suspect Transcript */}
              <div className="lg:col-span-2 flex flex-col justify-between bg-[#111111] rounded-xl border-2 border-[#8A8A8E]/40 p-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#8A8A8E]/30">
                    <div>
                      <h3 className="font-display text-xl text-[#F2F2EE]">
                        {CAST_PROFILES[selectedSuspect].name}
                      </h3>
                      <p className="font-mono-code text-xs text-[#8A8A8E]">
                        {CAST_PROFILES[selectedSuspect].silhouetteNote}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(suspectScan) || scansLeft <= 0 || isScanning}
                      onClick={() => onScanSuspect(selectedSuspect)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#C98F4E] hover:bg-[#b87e3e] disabled:opacity-45 text-[#111111] font-mono-label text-xs font-bold border-2 border-[#111111] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <OrbitDieSvg size={18} />
                      <span>
                        {suspectScan
                          ? 'Transcript Scanned'
                          : `ORBIT Scan Transcript (${scansLeft})`}
                      </span>
                    </button>
                  </div>

                  {suspectScan && (
                    <div className="mt-3 p-3 rounded bg-[#0A0A0B] border-2 border-[#C8242B] font-mono-code text-xs text-[#F2F2EE]">
                      <span className="text-[#C8242B] font-bold">
                        ORBIT [{suspectScan.confidenceLabel}]:{' '}
                      </span>
                      {suspectScan.summary}
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {suspectEntries.length === 0 ? (
                      <p className="font-mono-code text-xs text-[#8A8A8E] py-8 text-center">
                        No questions asked to {CAST_PROFILES[selectedSuspect].name} yet. Visit{' '}
                        {CAST_PROFILES[selectedSuspect].room.replace('_', ' ').toUpperCase()} to
                        interrogate them.
                      </p>
                    ) : (
                      suspectEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3.5 rounded-lg bg-[#0A0A0B] border border-[#8A8A8E]/30 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono-code text-xs text-[#C98F4E]">
                              TURN #{entry.turn} · AUDITOR: &ldquo;{entry.question}&rdquo;
                            </span>
                            <PulseShapeMeter stress={entry.response.stress} />
                          </div>
                          <p className="text-sm text-[#F2F2EE] leading-relaxed">
                            &ldquo;{entry.response.say}&rdquo;
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PINBOARD' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 font-mono-code text-xs text-[#F2F2EE]">
                <span>
                  Click or drag from any <strong>Suspect Pin</strong> to an{' '}
                  <strong>Evidence Card</strong> (or another Suspect) to string red yarn. Click a
                  red string label to snip it.
                </span>
                {selectedPinNode && (
                  <span className="text-[#C8242B] font-bold">
                    LINKING FROM [{nodePositions.get(selectedPinNode)?.title}] — SELECT TARGET PIN
                  </span>
                )}
              </div>

              <div
                ref={boardRef}
                onMouseMove={handleBoardMouseMove}
                className="relative w-full aspect-[920/440] bg-[#0A0A0B] border-[4px] border-[#C98F4E] rounded-xl overflow-hidden select-none"
              >
                <svg
                  viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
                  className="w-full h-full"
                  role="img"
                  aria-label="Investigation Red String Pin Board"
                >
                  {/* Subtle dotted grid lines */}
                  <line
                    x1="40"
                    y1="215"
                    x2="880"
                    y2="215"
                    stroke="#8A8A8E"
                    strokeOpacity="0.25"
                    strokeDasharray="8 8"
                    strokeWidth="2"
                  />

                  {/* Existing Red Strings */}
                  {pinLinks.map((link) => {
                    const a = nodePositions.get(link.fromNodeId);
                    const b = nodePositions.get(link.toNodeId);
                    if (!a || !b) return null;
                    const midX = (a.x + b.x) / 2;
                    const midY = (a.y + b.y) / 2;
                    return (
                      <g key={link.id}>
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="#C8242B"
                          strokeWidth="4.5"
                        />
                        <g
                          transform={`translate(${midX}, ${midY})`}
                          onClick={() => onRemovePinLink(link.id)}
                          className="cursor-pointer"
                        >
                          <circle
                            r="11"
                            fill="#0A0A0B"
                            stroke="#C8242B"
                            strokeWidth="2.5"
                          />
                          <text
                            y="4"
                            textAnchor="middle"
                            fill="#F2F2EE"
                            fontSize="11"
                            fontFamily="monospace"
                          >
                            ✕
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Live Dragging String Preview */}
                  {selectedPinNode && dragPointer && nodePositions.get(selectedPinNode) && (
                    <line
                      x1={nodePositions.get(selectedPinNode)!.x}
                      y1={nodePositions.get(selectedPinNode)!.y}
                      x2={dragPointer.x}
                      y2={dragPointer.y}
                      stroke="#C8242B"
                      strokeWidth="3"
                      strokeDasharray="6 6"
                    />
                  )}
                </svg>

                {/* Interactive HTML Pin Buttons overlaid on exact percentage positions for keyboard accessibility */}
                {Array.from(nodePositions.entries()).map(([nodeId, pos]) => {
                  const isSelected = selectedPinNode === nodeId;
                  return (
                    <button
                      key={nodeId}
                      type="button"
                      onMouseDown={() => setSelectedPinNode(nodeId)}
                      onMouseUp={() => {
                        if (selectedPinNode && selectedPinNode !== nodeId) {
                          handlePinClickOrDrop(nodeId);
                        }
                      }}
                      onClick={() => handlePinClickOrDrop(nodeId)}
                      style={{
                        left: `${(pos.x / BOARD_WIDTH) * 100}%`,
                        top: `${(pos.y / BOARD_HEIGHT) * 100}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-2 rounded-lg border-[3px] text-center cursor-pointer transition-transform ${
                        pos.kind === 'SUSPECT'
                          ? 'bg-[#111111] text-[#F2F2EE]'
                          : 'bg-[#F2F2EE] text-[#111111] -rotate-2'
                      } ${
                        isSelected
                          ? 'border-[#C8242B] scale-105'
                          : 'border-[#111111] hover:border-[#C8242B]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="block w-3 h-3 rounded-full bg-[#C8242B] border-2 border-[#111111] mx-auto -mt-3.5 mb-1"
                      />
                      <span className="block font-mono-code text-[10px] md:text-[11px] font-bold max-w-[130px] truncate">
                        {pos.title}
                      </span>
                    </button>
                  );
                })}

                {collectedEvidence.length === 0 && (
                  <div className="absolute bottom-6 inset-x-0 text-center font-mono-code text-xs text-[#8A8A8E] pointer-events-none">
                    Collect Evidence Cards on Floor 88 to pin them along the bottom rail.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
