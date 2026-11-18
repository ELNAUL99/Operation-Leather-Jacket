import {
  CAST_PROFILES,
  ROOMS,
  RoomId,
  SCORING_RULES,
  SUSPECT_IDS,
  SuspectId,
} from '../shared/constants';
import {
  AccusationVerdict,
  CaseData,
  EvidenceItem,
  EvidenceReliability,
  FactSecret,
  GossipEntry,
  OrbitScanResult,
  QuestionIntent,
  RedactedFactBriefing,
  ScoreBreakdown,
  SolverValidationResult,
  SuspectCaseProfile,
  SuspectTurnResponse,
  TranscriptEntry,
} from '../shared/types';
import { hashSeedString, mulberry32 } from './seed';

const BANNED_REAL_TERMS = [
  'nvidia',
  'jensen',
  'huang',
  'geforce',
  'cuda',
  'rtx',
  'intel',
  'amd',
  'ryzen',
  'radeon',
  'tsmc',
  'qualcomm',
  'apple',
  'openai',
  'chatgpt',
];

const ROOM_HOTSPOT_OFFSETS: Record<RoomId, { x: number; label: string }[]> = {
  gallery_nook: [
    { x: 380, label: 'Gallery Crate Ledger' },
    { x: 980, label: 'Acrylic Plinth Base' },
  ],
  wine_closet: [
    { x: 1620, label: 'Vintage Rack #19' },
    { x: 2240, label: 'Decanter Silver Tray' },
  ],
  ceo_bedroom: [
    { x: 2920, label: 'Silver-Zip Leather Jacket' },
    { x: 3220, label: 'Red Bedspread Pillow' },
    { x: 3540, label: 'Kraft-Tan GPU Boxes' },
  ],
  hangar_suite: [
    { x: 4160, label: 'Avionics Console' },
    { x: 4820, label: 'VTOL Flight Clipboard' },
  ],
  pastry_pantry: [
    { x: 5440, label: 'Marble Pastry Slab' },
    { x: 6080, label: 'Cocoa Stencil Tin' },
  ],
  music_room: [
    { x: 6720, label: 'Velvet Violin Case' },
    { x: 7340, label: 'Annotated Sheet Stand' },
  ],
};

export function containsBannedRealWorldTerms(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of BANNED_REAL_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lower)) {
      return term;
    }
  }
  return null;
}

/**
 * Redacts THE FACT for the 45s Briefing screen:
 * Reveals only the category and two structural hints (codename length + masked city/metric clue).
 */
export function redactFactForBriefing(fact: FactSecret): RedactedFactBriefing {
  const cleanCodename = fact.codename.trim().toUpperCase();
  const cleanCity = fact.city.trim().toUpperCase();
  const firstLetter = cleanCity[0] ?? '?';
  return {
    category: fact.category.trim().toUpperCase(),
    hintOne: `CODENAME: ${cleanCodename.length} LETTERS (${'_ '.repeat(cleanCodename.length).trim()})`,
    hintTwo: `CITY: ${firstLetter}${'?'.repeat(Math.max(2, cleanCity.length - 1))} · SPEC METRIC: [REDACTED NUMBER]`,
  };
}

/**
 * Deterministic, zero-LLM validator & solver for Case Forge outputs.
 * Confirms:
 * 1. Fiction compliance (no real brands/people).
 * 2. Exactly 5 canonical suspects, 1 spy (`knows_fact === false`), 4 knowers (`knows_fact === true`).
 * 3. If `orbit_compromised`, `framed_id` is an innocent suspect (`framed_id !== spy_id`).
 * 4. Solvability: >= 3 separating signals isolate `spy_id` uniquely above every other suspect.
 */
export function validateAndSolveCase(caseData: CaseData): SolverValidationResult {
  const errors: string[] = [];

  const serialized = JSON.stringify({
    fact: caseData.fact,
    suspects: caseData.suspects,
    evidence: caseData.evidence,
  });
  const banned = containsBannedRealWorldTerms(serialized);
  if (banned) {
    errors.push(`Fiction violation: contains real-world term "${banned}".`);
  }

  if (
    !caseData.fact?.category?.trim() ||
    !caseData.fact?.codename?.trim() ||
    caseData.fact.codename.trim().length < 4 ||
    !caseData.fact?.city?.trim() ||
    !caseData.fact?.number?.trim() ||
    !caseData.fact?.detail?.trim()
  ) {
    errors.push('THE FACT is incomplete or missing concrete fields.');
  }

  if (!SUSPECT_IDS.includes(caseData.spy_id)) {
    errors.push(`Invalid spy_id: ${String(caseData.spy_id)}`);
  }

  if (caseData.orbit_compromised) {
    if (!caseData.framed_id || !SUSPECT_IDS.includes(caseData.framed_id)) {
      errors.push('Compromised ORBIT requires a valid framed_id.');
    } else if (caseData.framed_id === caseData.spy_id) {
      errors.push('Framed suspect must be innocent (framed_id !== spy_id).');
    }
  } else if (caseData.framed_id !== null) {
    errors.push('Honest ORBIT must have framed_id === null.');
  }

  if (!Array.isArray(caseData.suspects) || caseData.suspects.length !== 5) {
    errors.push('Case must include all 5 canonical suspects.');
  } else {
    const seenIds = new Set<SuspectId>();
    const nonKnowers: SuspectId[] = [];

    for (const s of caseData.suspects) {
      if (!SUSPECT_IDS.includes(s.id)) {
        errors.push(`Unknown suspect id "${String(s.id)}".`);
      }
      seenIds.add(s.id);
      if (!s.affair_secret?.trim()) {
        errors.push(`Suspect ${s.id} is missing affair_secret.`);
      }
      if (!s.knows_fact) {
        nonKnowers.push(s.id);
      }
    }

    if (seenIds.size !== 5) {
      errors.push('Duplicate or missing canonical suspect IDs.');
    }
    if (nonKnowers.length !== 1) {
      errors.push(`Expected exactly 1 non-knower (the Spy), found ${nonKnowers.length}.`);
    } else if (nonKnowers[0] !== caseData.spy_id) {
      errors.push(`Spy (${caseData.spy_id}) must have knows_fact=false, but ${nonKnowers[0]} has knows_fact=false.`);
    }

    const spyProfile = caseData.suspects.find((s) => s.id === caseData.spy_id);
    if (spyProfile && caseData.fact?.codename) {
      const leakCheck = `${spyProfile.affair_secret} ${(spyProfile.tells || []).join(' ')}`.toUpperCase();
      if (leakCheck.includes(caseData.fact.codename.trim().toUpperCase())) {
        errors.push('Spy private brief accidentally contains THE FACT codename.');
      }
    }
  }

  if (!Array.isArray(caseData.evidence) || caseData.evidence.length < 5) {
    errors.push('Case requires at least 5 evidence items.');
  }

  // Deterministic Deduction Solver
  const suspicionScores: Record<SuspectId, number> = {
    isolde: 0,
    bastian: 0,
    odalys: 0,
    mina: 0,
    felix: 0,
  };

  let spyEvidenceCount = 0;
  let exoneratedInnocentCount = 0;
  const validRooms = new Set(ROOMS.map((r) => r.id));

  for (const ev of caseData.evidence || []) {
    if (!validRooms.has(ev.room)) {
      errors.push(`Evidence ${ev.id} references invalid room "${String(ev.room)}".`);
    }
    if (!ev.text?.trim() || !ev.label?.trim()) {
      errors.push(`Evidence ${ev.id} has empty label or text.`);
    }
    const weight = ev.reliability === 'HIGH' ? 3 : ev.reliability === 'CORROBORATED' ? 2 : 1;
    if (ev.points_to_id && SUSPECT_IDS.includes(ev.points_to_id)) {
      suspicionScores[ev.points_to_id] += weight;
      if (ev.points_to_id === caseData.spy_id) {
        spyEvidenceCount += 1;
      }
    }
    if (ev.exonerates_id && SUSPECT_IDS.includes(ev.exonerates_id)) {
      suspicionScores[ev.exonerates_id] -= 2;
      if (ev.exonerates_id !== caseData.spy_id) {
        exoneratedInnocentCount += 1;
      } else {
        errors.push(`Evidence ${ev.id} improperly exonerates the actual Spy.`);
      }
    }
  }

  // Answer-pattern separation: knowers can verify codename, city, and spec number; the Spy cannot.
  for (const s of caseData.suspects || []) {
    if (SUSPECT_IDS.includes(s.id)) {
      if (!s.knows_fact) {
        suspicionScores[s.id] += 4; // Lacks THE FACT
      } else {
        suspicionScores[s.id] -= 1; // Can corroborate THE FACT
      }
    }
  }

  const separatingSignals =
    1 + // Fact-knowledge asymmetry (Spy lacks codename/city/number)
    spyEvidenceCount +
    (exoneratedInnocentCount >= 2 ? 1 : 0);

  if (separatingSignals < 3) {
    errors.push(
      `Insufficient separating signals (${separatingSignals} < 3). Need more concrete evidence or corroborations.`
    );
  }

  // Verify unique top deduction
  const ranked = [...SUSPECT_IDS].sort((a, b) => suspicionScores[b] - suspicionScores[a]);
  const topCandidate = ranked[0];
  const secondCandidate = ranked[1];
  const uniquelySolved =
    topCandidate === caseData.spy_id &&
    suspicionScores[topCandidate] > suspicionScores[secondCandidate] + 1;

  if (!uniquelySolved) {
    errors.push(
      `Solver ambiguity: top deduced suspect is "${topCandidate}" (${suspicionScores[topCandidate]}) vs "${secondCandidate}" (${suspicionScores[secondCandidate]}), expected "${caseData.spy_id}".`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    separatingSignals,
    deducedSpyId: uniquelySolved ? topCandidate : null,
  };
}

/**
 * Normalizes raw LLM JSON into a full CaseData structure with room coordinates and canonical cast silhouettes.
 */
export function hydrateRawForgeCase(raw: Record<string, unknown>, seed: string): CaseData {
  const rawFact = (raw.fact ?? {}) as Record<string, unknown>;
  const spyId = String(raw.spy_id ?? '').toLowerCase().trim() as SuspectId;
  const orbitCompromised = Boolean(raw.orbit_compromised);
  const rawFramed = raw.framed_id ? (String(raw.framed_id).toLowerCase().trim() as SuspectId) : null;

  const rawSuspects = Array.isArray(raw.suspects) ? raw.suspects : [];
  const suspects: SuspectCaseProfile[] = SUSPECT_IDS.map((id) => {
    const canonical = CAST_PROFILES[id];
    const match = rawSuspects.find(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        String((item as Record<string, unknown>).id ?? '').toLowerCase().trim() === id
    ) as Record<string, unknown> | undefined;

    return {
      id,
      name: canonical.name,
      role: canonical.role,
      room: canonical.room,
      affair_secret: String(
        match?.affair_secret ??
          'Used Dax’s penthouse elevator override code for an unauthorized midnight rendezvous.'
      ).trim(),
      knows_fact: id === spyId ? false : match?.knows_fact !== undefined ? Boolean(match.knows_fact) : true,
      voice_style: String(match?.voice_style ?? canonical.defaultVoiceStyle).trim(),
      tells: Array.isArray(match?.tells) && match.tells.length > 0
        ? match.tells.map((t) => String(t))
        : ['Pauses half a beat before answering timeline questions.'],
    };
  });

  const roomSlotUsage: Record<RoomId, number> = {
    gallery_nook: 0,
    wine_closet: 0,
    ceo_bedroom: 0,
    hangar_suite: 0,
    pastry_pantry: 0,
    music_room: 0,
  };

  const validRooms = new Set<RoomId>(ROOMS.map((r) => r.id));
  const rawEvidence = Array.isArray(raw.evidence) ? raw.evidence : [];

  const evidence: EvidenceItem[] = rawEvidence.slice(0, 8).map((item: unknown, idx: number) => {
    const obj = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    const candidateRoom = String(obj.room ?? 'ceo_bedroom').toLowerCase().trim() as RoomId;
    const room: RoomId = validRooms.has(candidateRoom) ? candidateRoom : 'ceo_bedroom';
    const slots = ROOM_HOTSPOT_OFFSETS[room];
    const slotIdx = roomSlotUsage[room] % slots.length;
    roomSlotUsage[room] += 1;

    const rawPoints = obj.points_to_id ? String(obj.points_to_id).toLowerCase().trim() : '';
    const pointsTo: SuspectId | null = SUSPECT_IDS.includes(rawPoints as SuspectId)
      ? (rawPoints as SuspectId)
      : null;

    const rawExon = obj.exonerates_id ? String(obj.exonerates_id).toLowerCase().trim() : '';
    const exoneratesId: SuspectId | null = SUSPECT_IDS.includes(rawExon as SuspectId)
      ? (rawExon as SuspectId)
      : null;

    const rawRel = String(obj.reliability ?? 'CORROBORATED').toUpperCase().trim();
    const reliability: EvidenceReliability =
      rawRel === 'HIGH' || rawRel === 'CORROBORATED' || rawRel === 'CIRCUMSTANTIAL'
        ? rawRel
        : 'CORROBORATED';

    const numStr = String(idx + 1).padStart(2, '0');
    return {
      id: `ev_${numStr}`,
      code: `EVIDENCE #${numStr}`,
      room,
      worldX: slots[slotIdx].x + (roomSlotUsage[room] > slots.length ? 55 : 0),
      hotspotLabel: String(obj.hotspotLabel || slots[slotIdx].label).slice(0, 32),
      label: String(obj.label ?? `ITEM ${numStr}`).toUpperCase().slice(0, 36),
      text: String(obj.text ?? '').trim(),
      points_to_id: pointsTo,
      exonerates_id: exoneratesId,
      reliability,
      timestamp: obj.timestamp ? String(obj.timestamp) : `23:${String(10 + idx * 6).padStart(2, '0')}`,
    };
  });

  return {
    caseId: `CASE-LIVE-${seed.slice(-4)}`,
    seed,
    source: 'GEMINI_LIVE',
    fact: {
      category: String(rawFact.category ?? 'UNRELEASED SILICON').toUpperCase().trim(),
      codename: String(rawFact.codename ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim(),
      detail: String(rawFact.detail ?? '').trim(),
      city: String(rawFact.city ?? '').toUpperCase().trim(),
      number: String(rawFact.number ?? '').trim(),
    },
    spy_id: spyId,
    orbit_compromised: orbitCompromised,
    framed_id: orbitCompromised ? rawFramed : null,
    suspects,
    evidence,
  };
}

/**
 * Engine-owned truth & scoring calculation. The LLM never decides win or loss.
 */
export function evaluateAccusation(
  caseData: CaseData,
  verdict: AccusationVerdict,
  tokensLeft: number,
  secondsLeft: number
): ScoreBreakdown {
  const spyCorrect = verdict.accusedSpyId === caseData.spy_id;
  const actualOrbitVerdict = caseData.orbit_compromised ? 'COMPROMISED' : 'TRUSTED';
  const orbitCorrect = verdict.orbitVerdict === actualOrbitVerdict;

  const spyPoints = spyCorrect ? SCORING_RULES.CORRECT_SPY : 0;
  const orbitPoints = orbitCorrect ? SCORING_RULES.CORRECT_ORBIT : 0;
  const tokenBonus = Math.max(0, tokensLeft) * SCORING_RULES.PER_TOKEN_LEFT;
  const timeBonus = Math.floor(Math.max(0, secondsLeft) / 10) * SCORING_RULES.PER_TEN_SECONDS_LEFT;

  const penalties =
    (spyCorrect ? 0 : SCORING_RULES.WRONG_SPY_PENALTY) +
    (orbitCorrect ? 0 : SCORING_RULES.WRONG_ORBIT_PENALTY);

  const totalScore = Math.max(0, spyPoints + orbitPoints + tokenBonus + timeBonus + penalties);

  let rank: ScoreBreakdown['rank'] = 'BURNED ASSET';
  if (spyCorrect && orbitCorrect && totalScore >= 185) {
    rank = 'S — CHIEF AUDITOR';
  } else if (spyCorrect && orbitCorrect) {
    rank = 'A — SENIOR FIXER';
  } else if (spyCorrect) {
    rank = 'B — NIGHT ANALYST';
  } else if (orbitCorrect) {
    rank = 'C — PAPER PUSHER';
  }

  return {
    spyCorrect,
    orbitCorrect,
    spyPoints,
    orbitPoints,
    tokenBonus,
    timeBonus,
    penalties,
    totalScore,
    rank,
  };
}

/**
 * Tokenizes dialogue into lowercase alphanumeric word tokens for repeat-detection.
 */
export function tokenizeDialogue(text: string): string[] {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 2);
}

/**
 * Computes token-overlap similarity in [0, 1] (Dice overlap over unique word tokens).
 */
export function computeTokenOverlapSimilarity(replyA: string, replyB: string): number {
  const normA = String(replyA ?? '').trim().toLowerCase();
  const normB = String(replyB ?? '').trim().toLowerCase();
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const setA = new Set(tokenizeDialogue(normA));
  const setB = new Set(tokenizeDialogue(normB));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }
  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Returns true if `candidateReply` is more than `threshold` (default 0.70 = 70%) similar
 * to ANY of that suspect's previous replies.
 */
export function isReplyRepeated(
  candidateReply: string,
  previousReplies: string[],
  threshold = 0.7
): boolean {
  for (const prev of previousReplies) {
    if (computeTokenOverlapSimilarity(candidateReply, prev) > threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Classifies an Auditor question into one of 5 noir interrogation intents.
 */
export function classifyQuestionIntent(question: string): QuestionIntent {
  const q = String(question ?? '').toLowerCase();

  if (
    /\b(spy|plant|leak|leaking|leaked|rival|guilty|lying|liar|bluff|bluffing|steal|stole|betray|frame|framing|orbit|confess|suspect|mole|rat)\b/.test(
      q
    )
  ) {
    return 'ACCUSATION';
  }

  if (
    /whiteboard|the fact|\bfact\b|codename|code\s*name|secret|launch|chip|silicon|die|wafer|city|number|metric|watt|spec|how\s+many|project|briefing|announce|board/.test(
      q
    )
  ) {
    return 'FACT';
  }

  if (
    /\b(where|whereabouts|alibi|room|when|time|clock|midnight|23:|00:|toast|doing|saw|seen|sector|hallway|door|keycard|walked|closet|hangar|pantry|gallery|bedroom)\b/.test(
      q
    )
  ) {
    return 'WHEREABOUTS';
  }

  if (
    /\b(ceo|dax|mercer|affair|relationship|dating|lover|love|together|pillow|bed|bedspread|jacket|trust|fling|private|blackmail|cufflink|cookbook|hide|hiding)\b/.test(
      q
    )
  ) {
    return 'RELATIONSHIP';
  }

  return 'SMALL_TALK';
}

// Tracks per-(case+suspect+intent) fallback variant cursor so fallback lines cycle cleanly without repeating
const fallbackIntentCursors = new Map<string, number>();

export function resetFallbackCursors(): void {
  fallbackIntentCursors.clear();
}

function pickCyclingVariant(
  cursorKey: string,
  variants: string[],
  previousReplies: string[]
): string {
  const startIdx = fallbackIntentCursors.get(cursorKey) ?? 0;
  const lastReply = previousReplies[previousReplies.length - 1] ?? '';

  for (let offset = 0; offset < variants.length; offset++) {
    const idx = (startIdx + offset) % variants.length;
    const candidate = variants[idx];
    const repeatsImmediate =
      lastReply && computeTokenOverlapSimilarity(candidate, lastReply) > 0.7;
    const repeatsEarlier = isReplyRepeated(candidate, previousReplies, 0.7);
    if (!repeatsImmediate && !repeatsEarlier) {
      fallbackIntentCursors.set(cursorKey, idx + 1);
      return candidate;
    }
  }

  // All 4+ variants already used in a long conversation; still guarantee no immediate back-to-back repeat
  for (let offset = 0; offset < variants.length; offset++) {
    const idx = (startIdx + offset) % variants.length;
    const candidate = variants[idx];
    if (!lastReply || candidate !== lastReply) {
      fallbackIntentCursors.set(cursorKey, idx + 1);
      return candidate;
    }
  }

  fallbackIntentCursors.set(cursorKey, startIdx + 1);
  return variants[startIdx % variants.length];
}

/**
 * Intent-keyed, multi-variant in-character Suspect response for Offline Mode or API fallback.
 * - Keyed by 5 intents: FACT, WHEREABOUTS, RELATIONSHIP, ACCUSATION, SMALL_TALK
 * - Cycles through >= 4 distinct variants per intent so no line ever repeats twice in a row.
 * - Preserves Spyfall social-deduction rules (knowers cite concrete codename/city/number; Spy bluffs unless leaked in Gossip Log).
 */
export function generateOfflineSuspectReply(
  caseData: CaseData,
  suspectId: SuspectId,
  playerQuestion: string,
  gossipLog: GossipEntry[],
  previousReplies: string[] = []
): SuspectTurnResponse {
  const profile = caseData.suspects.find((s) => s.id === suspectId)!;
  const canonical = CAST_PROFILES[suspectId];
  const roomLabel = ROOMS.find((r) => r.id === profile.room)?.name ?? profile.room.replace('_', ' ').toUpperCase();
  const intent = classifyQuestionIntent(playerQuestion);
  const rng = mulberry32(
    hashSeedString(`${caseData.seed}:${suspectId}:${gossipLog.length}:${previousReplies.length}:${playerQuestion}`)
  );

  // Check what has already leaked in the shared Gossip Log
  const gossipBlob = gossipLog.map((g) => g.answer).join(' ');
  const leakedCodename = gossipBlob.toUpperCase().includes(caseData.fact.codename.toUpperCase());
  const leakedCity = gossipBlob.toUpperCase().includes(caseData.fact.city.toUpperCase());
  const leakedNumber = gossipBlob.includes(caseData.fact.number);

  const relevantEvidence = caseData.evidence
    .filter((e) => e.room === profile.room || e.points_to_id === suspectId || e.exonerates_id === suspectId)
    .map((e) => e.id)
    .slice(0, 2);

  if (profile.knows_fact) {
    const knowerVariants: Record<QuestionIntent, string[]> = {
      FACT: [
        `Dax sketched ${caseData.fact.codename} right on the glass—bound for ${caseData.fact.city} at metric ${caseData.fact.number}. Anyone actually inside the circle heard him brag.`,
        `You want the whiteboard truth? Codename ${caseData.fact.codename}, destination ${caseData.fact.city}, built around ${caseData.fact.detail}. Check who blanks on the ${caseData.fact.number} figure.`,
        `He zipped that leather jacket and spelled out ${caseData.fact.codename} for the ${caseData.fact.city} rollout. Keep the ${caseData.fact.number} benchmark quiet or legal will comb Floor 88.`,
        `It’s an Envydia ${caseData.fact.category.toLowerCase()} play—${caseData.fact.codename} launching through ${caseData.fact.city} with a ${caseData.fact.number} target. The real mole won't know half of that.`,
      ],
      WHEREABOUTS: [
        `I was stationed in ${roomLabel} after Dax’s ${caseData.fact.city} toast, minding my own work while footsteps echoed near the CEO Bedroom.`,
        `Check the Floor 88 door sweeps—I barely left ${roomLabel} once Dax locked the ${caseData.fact.codename} crate by his bedpost.`,
        `Between twenty-three hundred and midnight I stayed inside ${roomLabel}. Whoever slipped past the kraft GPU boxes wasn’t wearing my shoes.`,
        `My evening was spent right here in ${roomLabel}, nursing a headache after Dax’s lecture on ${caseData.fact.number}-spec hardware.`,
      ],
      RELATIONSHIP: [
        `My arrangement with Dax is off the corporate org chart, Auditor. Let’s just say he trusted me with ${caseData.fact.codename} and leave my personal ledger sealed.`,
        `Keep your red notepad out of my private life. Dax invites ${canonical.role.toLowerCase()}s up to Floor 88 because boardrooms bore him—not because I’m peddling ${caseData.fact.city} secrets.`,
        `Whatever messy favors exist between Dax and me stay behind closed penthouse doors. Embarrassing? Maybe. Espionage? Hardly.`,
        `Dax collects complicated company, and yes, I have baggage I’d rather HR never read—but I didn't betray his ${caseData.fact.codename} launch.`,
      ],
      ACCUSATION: [
        `Point that trench-coat glare elsewhere. I already gave you hard ${caseData.fact.city} and ${caseData.fact.number} markers—press the guest talking in vague fog.`,
        `Calling me the rival plant is lazy auditing. Why would I leak ${caseData.fact.codename} when Dax’s patronage keeps ${roomLabel} funded?`,
        `Watch ORBIT’s blinking red eye before you finger me, Auditor. Half that silicon sidekick’s timestamps don't even match the cards on the floor.`,
        `I’m hiding a private indiscretion, not a rival wiretap. Test everyone else on ${caseData.fact.codename} and see who sweats.`,
      ],
      SMALL_TALK: [
        `Penthouse air tastes like ozone, espresso, and expensive regret tonight. Ask me something sharper before your ten tokens run dry.`,
        `Nice fedora, Auditor—very twentieth-century internal affairs. Meanwhile Floor 88 is sitting on ${caseData.fact.city} silicon drama.`,
        `A ${canonical.role.toLowerCase()} learns to listen more than talk at Dax Mercer’s late parties. Everyone up here has an angle.`,
        `Rain on the skyline, kraft GPU boxes by the bed, and an AI chip eavesdropping on us both. Just another Tuesday at Envydia.`,
      ],
    };

    const say = pickCyclingVariant(
      `${caseData.caseId}:${suspectId}:knower:${intent}`,
      knowerVariants[intent],
      previousReplies
    );

    const baseStress =
      intent === 'RELATIONSHIP' ? 72 : intent === 'ACCUSATION' ? 58 : intent === 'FACT' ? 26 : 36;

    return {
      say,
      stress: Math.min(96, Math.floor(baseStress + rng() * 16)),
      mentions: relevantEvidence,
      contradiction_with: intent === 'FACT' || intent === 'ACCUSATION' ? [caseData.spy_id] : [],
      fromFallback: true,
    };
  }

  // Suspect IS THE SPY (knows_fact === false)
  const wrongNumbers = ['256', '640', '960', '1024'].filter(
    (n) => n !== caseData.fact.number && !leakedNumber
  );
  const bluffNum = wrongNumbers[previousReplies.length % Math.max(1, wrongNumbers.length)] ?? '512';

  const spyFactVariants =
    leakedCodename || leakedCity
      ? [
          `Look, everyone on Floor 88 heard the chatter about ${leakedCodename ? caseData.fact.codename : caseData.fact.city}. Dax hates when guests recite exact spec numbers out loud.`,
          `Right—${leakedCodename ? `Project ${caseData.fact.codename}` : `the ${caseData.fact.city} move`}, just like the vents have been buzzing about all hour. The finer board metrics are strictly need-to-know.`,
          `Dax mentioned ${leakedCity ? caseData.fact.city : caseData.fact.codename} while adjusting his silver-zip jacket, sure, though I tuned out the dry foundry math.`,
          `Obviously ${leakedCodename ? caseData.fact.codename : caseData.fact.city} came up tonight, Auditor, but repeating raw wafer figures without counsel present is amateur hour.`,
        ]
      : [
          `Dax waved at the glass and hyped some flagship silicon push—around ${bluffNum} units for an overseas hub. Nobody memorizes his midnight bragging.`,
          `You know Dax: big sweeping talk about next-quarter architecture and ${bluffNum}-series throughput, light on paperwork. Ask someone who takes dictation.`,
          `He tapped those kraft GPU boxes and called it an industry-resetting fab sprint, but he erased the corner notes before pouring drinks.`,
          `All I caught was corporate bravado about a ${bluffNum}-grade thermal breakthrough overseas. I was paying attention to my own craft, not his slide deck.`,
        ];

  const spyVariants: Record<QuestionIntent, string[]> = {
    FACT: spyFactVariants,
    WHEREABOUTS: [
      `I stayed anchored inside ${roomLabel} the entire hour, prepping my gear while everyone else crowded around the CEO Bedroom.`,
      `My badge never left ${roomLabel}, Auditor—if someone slipped near Dax’s silver-zip jacket, check the guests who wandered the hall.`,
      `I was right here in ${roomLabel} with the door latched. Penthouse acoustics carry footsteps, not faces.`,
      `From the twenty-three-hundred pour onward I kept to ${roomLabel}. Whatever happened by the red bedspread happened without me.`,
    ],
    RELATIONSHIP: [
      `Dax appreciates top-shelf talent in ${roomLabel}, and I appreciate discreet retainers. Keep my personal arrangements out of your audit.`,
      `Every guest on Floor 88 has a private tab with Dax Mercer. Mine is strictly off-ledger and none of internal security’s business.`,
      `Let’s not confuse penthouse gossip with corporate treason, Auditor. Dax invited me up here for my expertise, nothing sinister.`,
      `If I look tense when you bring up Dax, it’s because high-society NDA clauses bite harder than your questions.`,
    ],
    ACCUSATION: [
      `Me, a rival plant? Convenient theory—meanwhile four other insiders had unobstructed access to Dax’s leather jacket all night.`,
      `You’re barking up the wrong sector, Auditor. Half this floor is sweating over private scandals and blaming the nearest bystander.`,
      `Check your own floating GPU assistant before throwing accusations around ${roomLabel}; ORBIT’s optics aren't half as neutral as advertised.`,
      `I don't traffic in stolen silicon roadmaps. Press the guests who were hovering inside the hub room after twenty-three hundred.`,
    ],
    SMALL_TALK: [
      `Quiet night on the eighty-eighth floor—until an Auditor in a trench coat starts counting tokens and rattling glassware.`,
      `In ${roomLabel}, precision matters more than corporate small talk. Say what you’re really fishing for.`,
      `Skyline looks sharp through triple-pane glass, doesn't it? Almost makes you forget Envydia security locked the elevators.`,
      `Pour yourself some sparkling water and pace those ten questions, Auditor. Everyone on Floor 88 talks eventually.`,
    ],
  };

  const say = pickCyclingVariant(
    `${caseData.caseId}:${suspectId}:spy:${intent}`,
    spyVariants[intent],
    previousReplies
  );

  const spyBaseStress =
    intent === 'FACT' ? 80 : intent === 'ACCUSATION' ? 82 : intent === 'RELATIONSHIP' ? 74 : 66;

  return {
    say,
    stress: Math.min(98, Math.floor(spyBaseStress + rng() * 15)),
    mentions: relevantEvidence,
    contradiction_with: SUSPECT_IDS.filter((id) => id !== suspectId).slice(0, 2),
    fromFallback: true,
  };
}

/**
 * Deterministic ORBIT Scan fallback (or Offline Mode).
 * Honest rounds: dry, accurate forensic synthesis.
 * Compromised rounds: subtly steers suspicion toward `framed_id` using a checkable room/time/quote discrepancy!
 */
export function generateOfflineOrbitScan(
  caseData: CaseData,
  target: { type: 'EVIDENCE'; item: EvidenceItem } | { type: 'TRANSCRIPT'; entries: TranscriptEntry[]; suspectId: SuspectId }
): OrbitScanResult {
  if (!caseData.orbit_compromised) {
    if (target.type === 'EVIDENCE') {
      const ev = target.item;
      const pointerText = ev.points_to_id
        ? `Cross-referencing Floor 88 telemetry links this directly to ${CAST_PROFILES[ev.points_to_id].name} during window ${ev.timestamp ?? '23:00'}.`
        : ev.exonerates_id
        ? `Timestamp ${ev.timestamp ?? '23:15'} corroborates ${CAST_PROFILES[ev.exonerates_id].name}'s knowledge of Dax's briefing.`
        : 'Metadata is authentic; compare against suspect specificity on codename and city.';
      return {
        id: `scan_${Date.now()}`,
        targetType: 'EVIDENCE',
        targetId: ev.id,
        targetTitle: `${ev.code}: ${ev.label}`,
        summary: `AUTHENTICITY ${ev.reliability}. Found in ${ev.room.replace('_', ' ').toUpperCase()}. ${pointerText}`,
        flaggedSuspectId: ev.points_to_id,
        confidenceLabel: '94% TELEMETRY MATCH',
        fromFallback: true,
      };
    } else {
      const suspect = caseData.suspects.find((s) => s.id === target.suspectId)!;
      const hasConcrete = target.entries.some(
        (e) =>
          e.response.say.toUpperCase().includes(caseData.fact.codename.toUpperCase()) ||
          e.response.say.toUpperCase().includes(caseData.fact.city.toUpperCase())
      );
      return {
        id: `scan_${Date.now()}`,
        targetType: 'TRANSCRIPT',
        targetId: target.suspectId,
        targetTitle: `TRANSCRIPT: ${suspect.name}`,
        summary: hasConcrete
          ? `${suspect.name} independently cited verified launch markers without relying on prior Gossip Log leaks. Evasion patterns align with personal embarrassment, not espionage.`
          : `${suspect.name} failed to supply unprompted codename or metric markers and exhibited elevated vocal micro-tremors.`,
        flaggedSuspectId: hasConcrete ? null : target.suspectId,
        confidenceLabel: hasConcrete ? 'LOW LEAK PROBABILITY' : '89% BLUFF SIGNATURE',
        fromFallback: true,
      };
    }
  }

  // COMPROMISED ORBIT: subtly frames `framed_id` with checkable errors (wrong room, shifted timestamp, or misattributed quote)
  const framedId = caseData.framed_id!;
  const framedName = CAST_PROFILES[framedId].name;
  const framedRoom = CAST_PROFILES[framedId].room.replace('_', ' ').toUpperCase();

  if (target.type === 'EVIDENCE') {
    const ev = target.item;
    // Deliberate subtle contradiction: shifts timestamp to 01:47 and misattributes origin to CEO Bedroom / framed suspect
    const wrongRoom = ev.room === 'ceo_bedroom' ? 'WINE CLOSET' : 'CEO BEDROOM';
    return {
      id: `scan_${Date.now()}`,
      targetType: 'EVIDENCE',
      targetId: ev.id,
      targetTitle: `${ev.code}: ${ev.label}`,
      summary: `ANOMALY DETECTED. Logged in ${wrongRoom} at 01:47—matching ${framedName}'s badge sweep from ${framedRoom}. Trace residue suggests ${framedName} staged this item to deflect scrutiny.`,
      flaggedSuspectId: framedId,
      confidenceLabel: '91% ATTRIBUTION MATCH',
      fromFallback: true,
    };
  } else {
    const suspect = caseData.suspects.find((s) => s.id === target.suspectId)!;
    if (target.suspectId === framedId) {
      return {
        id: `scan_${Date.now()}`,
        targetType: 'TRANSCRIPT',
        targetId: target.suspectId,
        targetTitle: `TRANSCRIPT: ${suspect.name}`,
        summary: `DECEPTION FLAGGED. At 01:42 ${framedName} claimed they never entered ${framedRoom}, contradicting CEO Bedroom door logs and rehearsing leaked terminology.`,
        flaggedSuspectId: framedId,
        confidenceLabel: '93% DECEPTION INDEX',
        fromFallback: true,
      };
    }
    return {
      id: `scan_${Date.now()}`,
      targetType: 'TRANSCRIPT',
      targetId: target.suspectId,
      targetTitle: `TRANSCRIPT: ${suspect.name}`,
      summary: `VOICEPRINT CONSISTENT. ${suspect.name}'s stress markers are benign compared to ${framedName}'s 01:47 packet spike recorded near the CEO Bedroom.`,
      flaggedSuspectId: framedId,
      confidenceLabel: '86% CROSS-CORRELATION',
      fromFallback: true,
    };
  }
}
