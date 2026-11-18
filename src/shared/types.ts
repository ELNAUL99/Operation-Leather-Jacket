import { RoomId, SuspectId } from './constants';

export interface FactSecret {
  category: string; // e.g., "ARCHITECTURE LAUNCH", "FOUNDRY ACQUISITION", "THERMAL SILICON"
  codename: string; // e.g., "NIGHTJAR"
  detail: string;   // e.g., "wafer-scale neural die cooled by mineral oil"
  city: string;     // e.g., "ZURICH"
  number: string;   // e.g., "480" (watts / wafers / PetOPS)
}

export interface RedactedFactBriefing {
  category: string;
  hintOne: string;
  hintTwo: string;
}

export interface SuspectCaseProfile {
  id: SuspectId;
  name: string;
  role: string;
  room: RoomId;
  affair_secret: string;
  knows_fact: boolean;
  voice_style: string;
  tells: string[];
}

export type EvidenceReliability = 'HIGH' | 'CORROBORATED' | 'CIRCUMSTANTIAL';

export interface EvidenceItem {
  id: string; // e.g. "ev_01"
  code: string; // e.g. "EVIDENCE #01"
  room: RoomId;
  worldX: number;
  hotspotLabel: string;
  label: string;
  text: string;
  points_to_id: SuspectId | null;
  exonerates_id?: SuspectId | null;
  reliability: EvidenceReliability;
  timestamp?: string;
}

export interface CaseData {
  caseId: string;
  seed: string;
  source: 'GEMINI_LIVE' | 'HANDWRITTEN_FALLBACK';
  fact: FactSecret;
  spy_id: SuspectId;
  orbit_compromised: boolean;
  framed_id: SuspectId | null;
  suspects: SuspectCaseProfile[];
  evidence: EvidenceItem[];
}

export interface GossipEntry {
  turn: number;
  suspectId: SuspectId;
  suspectName: string;
  question: string;
  answer: string;
}

export interface SuspectTurnResponse {
  say: string;
  stress: number; // 0 - 100
  mentions: string[]; // evidence_ids
  contradiction_with: SuspectId[];
  fromFallback?: boolean;
}

export interface TranscriptEntry {
  id: string;
  turn: number;
  suspectId: SuspectId;
  question: string;
  response: SuspectTurnResponse;
  timestampLabel: string;
}

export interface OrbitScanResult {
  id: string;
  targetType: 'EVIDENCE' | 'TRANSCRIPT';
  targetId: string;
  targetTitle: string;
  summary: string;
  flaggedSuspectId: SuspectId | null;
  confidenceLabel: string;
  fromFallback?: boolean;
}

export interface PinLink {
  id: string;
  fromNodeId: string; // suspectId or evidenceId
  toNodeId: string;   // suspectId or evidenceId
}

export type OrbitVerdict = 'TRUSTED' | 'COMPROMISED';

export interface AccusationVerdict {
  accusedSpyId: SuspectId;
  orbitVerdict: OrbitVerdict;
}

export interface ScoreBreakdown {
  spyCorrect: boolean;
  orbitCorrect: boolean;
  spyPoints: number;
  orbitPoints: number;
  tokenBonus: number;
  timeBonus: number;
  penalties: number;
  totalScore: number;
  rank: 'S — CHIEF AUDITOR' | 'A — SENIOR FIXER' | 'B — NIGHT ANALYST' | 'C — PAPER PUSHER' | 'BURNED ASSET';
}

export interface SolverValidationResult {
  valid: boolean;
  errors: string[];
  separatingSignals: number;
  deducedSpyId: SuspectId | null;
}

export type QuestionIntent =
  | 'FACT'
  | 'WHEREABOUTS'
  | 'RELATIONSHIP'
  | 'ACCUSATION'
  | 'SMALL_TALK';

export interface SuspectHistoryTurn {
  turn: number;
  question: string;
  answer: string;
}

export type GamePhase =
  | 'TITLE'
  | 'HOW_TO_PLAY'
  | 'FORGING'
  | 'BRIEFING'
  | 'INVESTIGATION'
  | 'ACCUSATION'
  | 'REVEAL';

export interface AccessibilitySettings {
  reducedMotion: boolean;
  textScale: number; // 0.9 to 1.25
  captionsEnabled: boolean;
  muted: boolean;
  offlineMode: boolean;
}

export interface SfxCaption {
  id: number;
  label: string;
}
