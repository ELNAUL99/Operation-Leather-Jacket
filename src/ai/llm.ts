/**
 * Central AI Gateway (src/ai/llm.ts)
 * Keeps all Case Forge, Suspect Minds, and ORBIT Scan LLM calls behind a single resilient boundary:
 * - Zero response caching or memoisation (`cache: 'no-store'`)
 * - All AI calls target the same-origin full-stack backend at `/api/ai` (server holds the key)
 * - Sends full system brief + last 6 suspect transcript turns + shared GOSSIP LOG + player's NEW question
 * - Logs exact Suspect request body to console in dev mode
 * - >70% token-overlap repeat guard (regenerates once with new-wording instruction)
 * - Intent-keyed 4+ variant cycling fallback + console error reporting + in-world offline notice
 */

import { pickHandwrittenCase } from '../cases/handwrittenCases';
import {
  generateOfflineOrbitScan,
  generateOfflineSuspectReply,
  hydrateRawForgeCase,
  isReplyRepeated,
  validateAndSolveCase,
} from '../cases/solver';
import {
  CAST_PROFILES,
  CREATIVE_BIBLE_PROMPT_HEADER,
  GEMINI_MODEL,
  ROOMS,
  SuspectId,
} from '../shared/constants';
import {
  CaseData,
  EvidenceItem,
  GossipEntry,
  OrbitScanResult,
  SuspectHistoryTurn,
  SuspectTurnResponse,
  TranscriptEntry,
} from '../shared/types';

const STREAM_TIMEOUT_MS = 16000;
const FORGE_BUDGET_MS = 16000;

function getActiveApiBase(): string {
  return '/api/ai';
}

export interface AiRuntimeEvent {
  live: boolean;
  error?: string;
  inWorldNotice?: string;
}

type AiRuntimeListener = (evt: AiRuntimeEvent) => void;
const runtimeListeners = new Set<AiRuntimeListener>();

export function onAiRuntimeEvent(listener: AiRuntimeListener): () => void {
  runtimeListeners.add(listener);
  return () => {
    runtimeListeners.delete(listener);
  };
}

function emitAiSuccess(): void {
  for (const listener of runtimeListeners) {
    listener({ live: true });
  }
}

function emitAiError(context: string, rawErr: unknown, inWorldNotice?: string): void {
  const detail = rawErr instanceof Error ? rawErr.message : String(rawErr ?? 'Unknown AI error');
  const formatted = `[${context}] ${detail}`;
  console.error('[PILLOW TALK][AI Error]', formatted);
  for (const listener of runtimeListeners) {
    listener({
      live: false,
      error: formatted,
      inWorldNotice:
        inWorldNotice ??
        '[ORBIT UPLINK INTERRUPTED — SWITCHED TO SEALED PENTHOUSE ARCHIVES]',
    });
  }
}

export interface AiBackendStatus {
  available: boolean;
  model: string;
  error?: string;
}

export async function checkAiStatus(): Promise<AiBackendStatus> {
  const apiBase = getActiveApiBase();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${apiBase}/status`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const msg = `Status HTTP ${res.status} from ${apiBase}/status`;
      emitAiError('checkAiStatus', msg);
      return { available: false, model: 'offline', error: msg };
    }
    const data = (await res.json()) as AiBackendStatus;
    if (!data.available) {
      const msg = 'GEMINI_API_KEY missing on server — falling back to Offline Mode.';
      emitAiError(
        'checkAiStatus',
        msg,
        '[NO LIVE AI KEY DETECTED — RUNNING SEALED OFFLINE ARCHIVES]'
      );
      return { available: false, model: data.model || GEMINI_MODEL, error: msg };
    }
    emitAiSuccess();
    return data;
  } catch (err) {
    emitAiError('checkAiStatus', err);
    return {
      available: false,
      model: 'offline',
      error: err instanceof Error ? err.message : 'Status check failed',
    };
  }
}

function extractPartialSayFromJsonBuffer(buffer: string): string | null {
  const match = buffer.match(/"say"\s*:\s*"((?:\\.|[^"\\])*)/);
  if (!match) return null;
  return match[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .trim();
}

function buildClientDebugSystemBrief(
  caseData: CaseData,
  suspectId: SuspectId,
  gossipLog: GossipEntry[]
): string {
  const suspect = caseData.suspects.find((s) => s.id === suspectId)!;
  const canonical = CAST_PROFILES[suspectId];
  const roomInfo = ROOMS.find((r) => r.id === suspect.room);
  return [
    CREATIVE_BIBLE_PROMPT_HEADER,
    `SUSPECT: ${canonical.name} (${canonical.role}) in ${roomInfo?.name ?? suspect.room}`,
    `KNOWS_FACT: ${suspect.knows_fact} | VOICE: ${suspect.voice_style}`,
    `GOSSIP_ENTRIES: ${gossipLog.length}`,
  ].join('\n');
}

/**
 * A) CASE FORGE
 * Requests a fresh Gemini-forged case, validates solvability via deterministic solver,
 * retries up to 2 additional times on validation failure, and falls back to `src/cases/handwrittenCases.ts`.
 */
export async function forgeCaseDossier(
  seed: string,
  offlineMode: boolean,
  onProgress?: (statusLine: string) => void
): Promise<CaseData> {
  if (offlineMode) {
    onProgress?.('OFFLINE ARCHIVE SELECTED — LOADING SEALED DOSSIER...');
    return pickHandwrittenCase(seed);
  }

  const apiBase = getActiveApiBase();
  const maxAttempts = 3; // Initial attempt + up to 2 regenerations
  const deadline = Date.now() + FORGE_BUDGET_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 1200) {
      emitAiError(
        'CaseForge',
        'Case Forge budget elapsed before completion',
        '[ORBIT FORGE TIMEOUT — SEALED PENTHOUSE DOSSIER LOADED]'
      );
      break;
    }

    onProgress?.(
      attempt === 1
        ? 'CASE FILE PRINTING... QUERYING GEMINI CASE FORGE'
        : `CASE FILE PRINTING... SOLVER RE-FORGE ATTEMPT ${attempt}/${maxAttempts}`
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingMs);

    try {
      const response = await fetch(`${apiBase}/forge`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: attempt === 1 ? seed : `${seed}-R${attempt}` }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        emitAiError(
          'CaseForge',
          `HTTP ${response.status}: ${errBody || response.statusText}`,
          '[LIVE CASE FORGE UNAVAILABLE — USING SEALED PENTHOUSE ARCHIVE]'
        );
        if (response.status === 503 || response.status === 401 || response.status === 403) {
          break;
        }
        continue;
      }

      const rawJson = (await response.json()) as Record<string, unknown>;
      const hydrated = hydrateRawForgeCase(rawJson, seed);
      const check = validateAndSolveCase(hydrated);

      if (check.valid) {
        emitAiSuccess();
        onProgress?.(`DOSSIER VERIFIED (${check.separatingSignals} DEDUCTION SIGNALS)`);
        return hydrated;
      } else {
        console.warn('[PILLOW TALK][Solver Rejected Forge Attempt]', check.errors);
      }
    } catch (err) {
      clearTimeout(timer);
      emitAiError(
        'CaseForge',
        err,
        '[UPLINK TIMEOUT — FALLING BACK TO VERIFIED ARCHIVE DOSSIER]'
      );
      break;
    }
  }

  onProgress?.('ARCHIVE FALLBACK ENGAGED — LOADING VERIFIED PENTHOUSE DOSSIER...');
  return pickHandwrittenCase(seed);
}

async function streamSingleSuspectAttempt(params: {
  apiBase: string;
  caseData: CaseData;
  suspectId: SuspectId;
  question: string;
  lastSixTurns: SuspectHistoryTurn[];
  gossipLog: GossipEntry[];
  retryInstruction?: string;
  onPartialText?: (partialSay: string) => void;
}): Promise<SuspectTurnResponse> {
  const {
    apiBase,
    caseData,
    suspectId,
    question,
    lastSixTurns,
    gossipLog,
    retryInstruction,
    onPartialText,
  } = params;

  const requestBody = {
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
    },
    systemBrief: buildClientDebugSystemBrief(caseData, suspectId, gossipLog),
    caseData,
    suspectId,
    suspectTranscript: lastSixTurns,
    gossipLog,
    question,
    ...(retryInstruction ? { retryInstruction } : {}),
  };

  if (import.meta.env.DEV) {
    console.log('[PILLOW TALK][Suspect Turn Request Body]', requestBody);
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`Suspect stream timed out after ${STREAM_TIMEOUT_MS}ms`)),
    STREAM_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${apiBase}/suspect-stream`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      clearTimeout(timer);
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    let jsonStreamBuffer = '';
    let finalPayload: SuspectTurnResponse | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });

      const events = sseBuffer.split('\n\n');
      sseBuffer = events.pop() ?? '';

      for (const evt of events) {
        const line = evt.trim();
        if (!line.startsWith('data:')) continue;
        const jsonPart = line.slice(5).trim();
        if (!jsonPart) continue;

        const parsedEvent = JSON.parse(jsonPart) as {
          type: 'chunk' | 'done' | 'error';
          delta?: string;
          payload?: SuspectTurnResponse;
          error?: string;
        };

        if (parsedEvent.type === 'chunk' && parsedEvent.delta) {
          jsonStreamBuffer += parsedEvent.delta;
          const partial = extractPartialSayFromJsonBuffer(jsonStreamBuffer);
          if (partial) {
            onPartialText?.(partial);
          }
        } else if (parsedEvent.type === 'done' && parsedEvent.payload) {
          finalPayload = parsedEvent.payload;
        } else if (parsedEvent.type === 'error') {
          throw new Error(parsedEvent.error || 'Upstream suspect stream error');
        }
      }
    }

    clearTimeout(timer);
    if (!finalPayload || !finalPayload.say?.trim()) {
      throw new Error('Empty suspect response payload');
    }
    return finalPayload;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * B) SUSPECT MINDS
 * - Sends system brief + last 6 turns of THAT suspect's transcript + shared GOSSIP LOG + NEW question
 * - Enforces >70% token-overlap repeat guard (regenerates once with explicit new-wording instruction)
 * - Falls back to 4+ variant intent-keyed cycling dialogue if offline or if the API call fails
 */
export async function interrogateSuspect(params: {
  caseData: CaseData;
  suspectId: SuspectId;
  suspectTranscript: TranscriptEntry[];
  question: string;
  gossipLog: GossipEntry[];
  offlineMode: boolean;
  onPartialText?: (partialSay: string) => void;
}): Promise<SuspectTurnResponse> {
  const {
    caseData,
    suspectId,
    suspectTranscript,
    question,
    gossipLog,
    offlineMode,
    onPartialText,
  } = params;

  const lastSixTurns: SuspectHistoryTurn[] = suspectTranscript.slice(-6).map((t) => ({
    turn: t.turn,
    question: t.question,
    answer: t.response.say,
  }));
  const previousReplies = suspectTranscript.map((t) => t.response.say);

  if (offlineMode) {
    if (import.meta.env.DEV) {
      console.log('[PILLOW TALK][Suspect Turn Offline Mode]', {
        suspectId,
        suspectTranscript: lastSixTurns,
        gossipLog,
        question,
      });
    }
    await new Promise((r) => setTimeout(r, 220));
    return generateOfflineSuspectReply(caseData, suspectId, question, gossipLog, previousReplies);
  }

  const apiBase = getActiveApiBase();

  try {
    let reply = await streamSingleSuspectAttempt({
      apiBase,
      caseData,
      suspectId,
      question,
      lastSixTurns,
      gossipLog,
      onPartialText,
    });

    // Repeat Guard: >70% token overlap against any of this suspect's previous replies -> regenerate once
    if (previousReplies.length > 0 && isReplyRepeated(reply.say, previousReplies, 0.7)) {
      if (import.meta.env.DEV) {
        console.warn(
          '[PILLOW TALK][Repeat Guard] Reply >70% similar to previous turn; regenerating once:',
          reply.say
        );
      }
      onPartialText?.('');
      const regenerated = await streamSingleSuspectAttempt({
        apiBase,
        caseData,
        suspectId,
        question,
        lastSixTurns,
        gossipLog,
        retryInstruction:
          'Your last answer was repeated. Answer THIS question directly and use new wording.',
        onPartialText,
      });
      reply = regenerated;
    }

    // Final safety check: if the model still echoed >70% identical text, switch to fresh intent-cycled line
    if (previousReplies.length > 0 && isReplyRepeated(reply.say, previousReplies, 0.7)) {
      return generateOfflineSuspectReply(caseData, suspectId, question, gossipLog, previousReplies);
    }

    emitAiSuccess();
    return reply;
  } catch (err) {
    emitAiError(
      `SuspectMind:${suspectId}`,
      err,
      `[COMMS INTERFERENCE IN ${CAST_PROFILES[suspectId].room.replace('_', ' ').toUpperCase()} — USING ARCHIVE TRANSCRIPT FALLBACK]`
    );
    return generateOfflineSuspectReply(caseData, suspectId, question, gossipLog, previousReplies);
  }
}

/**
 * C) ORBIT SCAN
 * Analyses either a single Evidence Card or a Suspect's transcript (3 charges per round).
 */
export async function runOrbitScan(params: {
  caseData: CaseData;
  target:
    | { type: 'EVIDENCE'; item: EvidenceItem }
    | { type: 'TRANSCRIPT'; entries: TranscriptEntry[]; suspectId: SuspectId };
  offlineMode: boolean;
}): Promise<OrbitScanResult> {
  const { caseData, target, offlineMode } = params;

  if (offlineMode) {
    await new Promise((r) => setTimeout(r, 220));
    return generateOfflineOrbitScan(caseData, target);
  }

  const apiBase = getActiveApiBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBase}/orbit-scan`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        target.type === 'EVIDENCE'
          ? {
              caseData,
              targetType: 'EVIDENCE',
              evidenceItem: target.item,
            }
          : {
              caseData,
              targetType: 'TRANSCRIPT',
              suspectId: target.suspectId,
              transcriptEntries: target.entries,
            }
      ),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
    }

    const data = (await response.json()) as {
      summary: string;
      flaggedSuspectId: SuspectId | null;
      confidenceLabel: string;
    };

    if (!data.summary) {
      throw new Error('Empty ORBIT scan summary');
    }

    emitAiSuccess();
    return {
      id: `scan_${Date.now()}`,
      targetType: target.type,
      targetId: target.type === 'EVIDENCE' ? target.item.id : target.suspectId,
      targetTitle:
        target.type === 'EVIDENCE'
          ? `${target.item.code}: ${target.item.label}`
          : `TRANSCRIPT: ${target.suspectId.toUpperCase()}`,
      summary: data.summary,
      flaggedSuspectId: data.flaggedSuspectId,
      confidenceLabel: data.confidenceLabel,
    };
  } catch (err) {
    clearTimeout(timer);
    emitAiError(
      'OrbitScan',
      err,
      '[ORBIT TELEMETRY GLITCH — RUNNING LOCAL FORENSIC HEURISTIC]'
    );
    return generateOfflineOrbitScan(caseData, target);
  }
}
