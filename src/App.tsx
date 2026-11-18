/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  checkAiStatus,
  forgeCaseDossier,
  interrogateSuspect,
  onAiRuntimeEvent,
  runOrbitScan,
} from './ai/llm';
import { soundEngine } from './audio/soundEngine';
import { pickHandwrittenCase } from './cases/handwrittenCases';
import { generateShareableSeed, normalizeSeed } from './cases/seed';
import {
  evaluateAccusation,
  redactFactForBriefing,
  resetFallbackCursors,
} from './cases/solver';
import { AccusationModal } from './components/AccusationModal';
import { BriefingModal } from './components/BriefingModal';
import { DialogueDrawer } from './components/DialogueDrawer';
import { EvidenceToast } from './components/EvidenceToast';
import { HowToPlayModal } from './components/HowToPlayModal';
import { HudBar } from './components/HudBar';
import { NotebookModal } from './components/NotebookModal';
import {
  AccessibilityModal,
  CaptionStrip,
  ForgingOverlay,
  PauseModal,
} from './components/Overlays';
import { RevealModal } from './components/RevealModal';
import { TitleScreen } from './components/TitleScreen';
import { PenthouseScene } from './game/PenthouseScene';
import {
  CAST_PROFILES,
  PALETTE,
  ROOMS,
  ROUND_BUDGET,
  RoomId,
  SuspectId,
  WORLD_CONFIG,
} from './shared/constants';
import {
  AccessibilitySettings,
  AccusationVerdict,
  CaseData,
  EvidenceItem,
  GamePhase,
  GossipEntry,
  OrbitScanResult,
  PinLink,
  ScoreBreakdown,
  SfxCaption,
  TranscriptEntry,
} from './shared/types';

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [phase, setPhase] = useState<GamePhase>(autostart ? 'INVESTIGATION' : 'TITLE');
  const [paused, setPaused] = useState(false);
  const [howToPlayOverlayOpen, setHowToPlayOverlayOpen] = useState(false);
  const hasShownInitialHowToPlayRef = useRef<boolean>(autostart);

  const [seedInput, setSeedInput] = useState('');
  const [aiBackendLive, setAiBackendLive] = useState<boolean>(false);
  const [lastAiError, setLastAiError] = useState<string | null>(null);
  const [forgeStatus, setForgeStatus] = useState('INITIALIZING CASE FORGE...');

  const [caseData, setCaseData] = useState<CaseData | null>(() =>
    autostart ? pickHandwrittenCase('PT-88-JACKET-1088') : null
  );
  const [briefingSeconds, setBriefingSeconds] = useState<number>(ROUND_BUDGET.BRIEFING_SECONDS);
  const [roundSecondsLeft, setRoundSecondsLeft] = useState<number>(
    ROUND_BUDGET.INVESTIGATION_SECONDS
  );
  const [hardCapSecondsLeft, setHardCapSecondsLeft] = useState<number>(
    ROUND_BUDGET.HARD_CAP_SECONDS
  );

  const [tokensLeft, setTokensLeft] = useState<number>(ROUND_BUDGET.QUESTION_TOKENS);
  const [scansLeft, setScansLeft] = useState<number>(ROUND_BUDGET.ORBIT_SCANS);
  const [currentRoomId, setCurrentRoomId] = useState<RoomId>('ceo_bedroom');

  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [inspectedEvidence, setInspectedEvidence] = useState<EvidenceItem | null>(null);
  const [activeSuspectId, setActiveSuspectId] = useState<SuspectId | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<string>('');
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [gossipLog, setGossipLog] = useState<GossipEntry[]>([]);
  const [orbitScans, setOrbitScans] = useState<OrbitScanResult[]>([]);
  const [pinLinks, setPinLinks] = useState<PinLink[]>([]);

  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [finalVerdict, setFinalVerdict] = useState<AccusationVerdict | null>(null);
  const [finalScore, setFinalScore] = useState<ScoreBreakdown | null>(null);
  const [screenShakeActive, setScreenShakeActive] = useState(false);
  const [activeCaption, setActiveCaption] = useState<SfxCaption | null>(null);

  const [settings, setSettings] = useState<AccessibilitySettings>(() => ({
    reducedMotion:
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    textScale: 1,
    captionsEnabled: true,
    muted: false,
    offlineMode: false,
  }));

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<PenthouseScene | null>(null);

  // Sync accessibility CSS root variables & reduced motion class
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-font-scale', String(settings.textScale));
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
    soundEngine.setMuted(settings.muted);
    sceneRef.current?.setReducedMotion(settings.reducedMotion);
  }, [settings]);

  // Sync `document.body.dataset.state` for testability and game shell contract
  useEffect(() => {
    if (phase === 'TITLE') {
      document.body.dataset.state = 'title';
    } else if (paused) {
      document.body.dataset.state = 'paused';
    } else if (phase === 'REVEAL') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [phase, paused]);

  // Subscribe to WebAudio SFX captions
  useEffect(() => {
    const unsub = soundEngine.onCaption((label) => {
      if (!settings.captionsEnabled) return;
      setActiveCaption({ id: Date.now() + Math.random(), label });
    });
    return unsub;
  }, [settings.captionsEnabled]);

  // Subscribe to AI runtime events (live vs fallback error + in-world notice)
  useEffect(() => {
    const unsub = onAiRuntimeEvent((evt) => {
      setAiBackendLive(evt.live);
      if (!evt.live) {
        if (evt.error) {
          setLastAiError(evt.error);
        }
        if (evt.inWorldNotice) {
          setActiveCaption({ id: Date.now() + Math.random(), label: evt.inWorldNotice });
        }
      } else {
        setLastAiError(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeCaption) return;
    const t = window.setTimeout(() => setActiveCaption(null), 3200);
    return () => window.clearTimeout(t);
  }, [activeCaption]);

  // Check server-side Gemini availability once on mount
  useEffect(() => {
    checkAiStatus().then((status) => {
      setAiBackendLive(status.available);
      if (status.error) {
        setLastAiError(status.error);
      }
    });
  }, []);

  // Latest callbacks ref so Phaser scene never needs remounting
  const callbacksRef = useRef({
    onRoomChange: (roomId: RoomId) => setCurrentRoomId(roomId),
    onSuspectInteract: (suspectId: SuspectId) => {
      setInspectedEvidence(null);
      setNotebookOpen(false);
      setActiveSuspectId(suspectId);
    },
    onHotspotInteract: (ev: EvidenceItem) => {
      setCollectedIds((prev) => (prev.includes(ev.id) ? prev : [...prev, ev.id]));
      setActiveSuspectId(null);
      setNotebookOpen(false);
      setInspectedEvidence(ev);
    },
  });

  // Mount Phaser canvas once
  useEffect(() => {
    if (!canvasHostRef.current || phaserGameRef.current) return;

    const scene = new PenthouseScene({
      onRoomChange: (r) => callbacksRef.current.onRoomChange(r),
      onSuspectInteract: (s) => callbacksRef.current.onSuspectInteract(s),
      onHotspotInteract: (ev) => callbacksRef.current.onHotspotInteract(ev),
    });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: canvasHostRef.current,
      width: WORLD_CONFIG.LOGICAL_WIDTH,
      height: WORLD_CONFIG.LOGICAL_HEIGHT,
      backgroundColor: PALETTE.VOID_BLACK,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
    });
    phaserGameRef.current = game;

    if (autostart) {
      const autoCase = pickHandwrittenCase('PT-88-JACKET-1088');
      scene.setTourMode(false);
      scene.populateEvidenceHotspots(autoCase.evidence, new Set());
    } else {
      scene.setTourMode(true);
    }

    return () => {
      soundEngine.stopDrone();
      soundEngine.stopHeartbeat();
      game.destroy(true);
      phaserGameRef.current = null;
      sceneRef.current = null;
    };
  }, [autostart]);

  // Lock Phaser walking controls whenever a modal/drawer or non-investigation phase is active
  const anyOverlayBlockingFloor =
    phase !== 'INVESTIGATION' ||
    paused ||
    howToPlayOverlayOpen ||
    notebookOpen ||
    settingsOpen ||
    Boolean(activeSuspectId) ||
    Boolean(inspectedEvidence);

  useEffect(() => {
    sceneRef.current?.setControlsLocked(anyOverlayBlockingFloor);
  }, [anyOverlayBlockingFloor]);

  // Manage stress heartbeat audio when conversing with a suspect
  useEffect(() => {
    if (!activeSuspectId || paused || howToPlayOverlayOpen || phase !== 'INVESTIGATION') {
      soundEngine.stopHeartbeat();
      return;
    }
    const suspectHistory = transcripts.filter((t) => t.suspectId === activeSuspectId);
    const latest = suspectHistory[suspectHistory.length - 1];
    soundEngine.updateStressHeartbeat(latest?.response.stress ?? 0);
  }, [activeSuspectId, transcripts, paused, howToPlayOverlayOpen, phase]);

  // Start a new round
  const startNewInvestigation = useCallback(
    async (explicitSeed?: string) => {
      const chosenSeed = normalizeSeed(explicitSeed ?? seedInput);
      resetFallbackCursors();
      setPaused(false);
      setHowToPlayOverlayOpen(false);
      setNotebookOpen(false);
      setSettingsOpen(false);
      setActiveSuspectId(null);
      setInspectedEvidence(null);
      setCollectedIds([]);
      setTranscripts([]);
      setGossipLog([]);
      setOrbitScans([]);
      setPinLinks([]);
      setFinalVerdict(null);
      setFinalScore(null);
      setTokensLeft(ROUND_BUDGET.QUESTION_TOKENS);
      setScansLeft(ROUND_BUDGET.ORBIT_SCANS);
      setBriefingSeconds(ROUND_BUDGET.BRIEFING_SECONDS);
      setRoundSecondsLeft(ROUND_BUDGET.INVESTIGATION_SECONDS);
      setHardCapSecondsLeft(ROUND_BUDGET.HARD_CAP_SECONDS);

      document.body.dataset.state = 'playing';
      setPhase('FORGING');
      soundEngine.startDrone();

      const forged = await forgeCaseDossier(chosenSeed, settings.offlineMode, (msg) =>
        setForgeStatus(msg)
      );

      setCaseData(forged);
      sceneRef.current?.setTourMode(false);
      sceneRef.current?.populateEvidenceHotspots(forged.evidence, new Set());
      setCurrentRoomId('ceo_bedroom');
      setPhase('BRIEFING');
    },
    [seedInput, settings.offlineMode]
  );

  // Show HOW TO PLAY card before the very first round; subsequent rounds launch directly
  const handleTitleStart = useCallback(() => {
    if (!hasShownInitialHowToPlayRef.current) {
      hasShownInitialHowToPlayRef.current = true;
      setPhase('HOW_TO_PLAY');
      return;
    }
    startNewInvestigation();
  }, [startNewInvestigation]);

  const handleEnterFloor88 = useCallback(() => {
    setPhase('INVESTIGATION');
    setRoundSecondsLeft(ROUND_BUDGET.INVESTIGATION_SECONDS);
  }, []);

  const handleSelectExampleQuestion = useCallback(
    (question: string) => {
      setDraftQuestion(question);
      setActiveCaption({
        id: Date.now() + Math.random(),
        label: '[EXAMPLE PROBE FILLED INTO INTERROGATION INPUT]',
      });

      if (howToPlayOverlayOpen) {
        setHowToPlayOverlayOpen(false);
        if (phase === 'INVESTIGATION' && !activeSuspectId) {
          const roomSuspect = ROOMS.find((r) => r.id === currentRoomId)?.suspectId ?? null;
          if (roomSuspect) {
            setActiveSuspectId(roomSuspect);
          }
        }
      }
    },
    [howToPlayOverlayOpen, phase, activeSuspectId, currentRoomId]
  );

  const handleSubmitVerdict = useCallback(
    (verdict: AccusationVerdict) => {
      if (!caseData) return;
      soundEngine.stopHeartbeat();
      soundEngine.playStampThud();
      sceneRef.current?.triggerCameraShake(0.012, 260);

      if (!settings.reducedMotion) {
        setScreenShakeActive(true);
        window.setTimeout(() => setScreenShakeActive(false), 300);
      }

      const breakdown = evaluateAccusation(
        caseData,
        verdict,
        tokensLeft,
        Math.min(roundSecondsLeft, hardCapSecondsLeft)
      );
      setFinalVerdict(verdict);
      setFinalScore(breakdown);
      setActiveSuspectId(null);
      setInspectedEvidence(null);
      setNotebookOpen(false);
      setHowToPlayOverlayOpen(false);
      setPhase('REVEAL');
    },
    [caseData, tokensLeft, roundSecondsLeft, hardCapSecondsLeft, settings.reducedMotion]
  );

  // Enforce Round Timers & Strict 15-Minute Hard Cap
  useEffect(() => {
    if (
      paused ||
      howToPlayOverlayOpen ||
      (phase !== 'BRIEFING' && phase !== 'INVESTIGATION' && phase !== 'ACCUSATION')
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setHardCapSecondsLeft((prevCap) => {
        if (prevCap <= 1) {
          handleSubmitVerdict({
            accusedSpyId: 'bastian',
            orbitVerdict: 'TRUSTED',
          });
          return 0;
        }
        return prevCap - 1;
      });

      if (phase === 'BRIEFING') {
        setBriefingSeconds((prev) => {
          if (prev <= 1) {
            setPhase('INVESTIGATION');
            return 0;
          }
          return prev - 1;
        });
      } else if (phase === 'INVESTIGATION') {
        setRoundSecondsLeft((prev) => {
          if (prev <= 1) {
            setActiveSuspectId(null);
            setInspectedEvidence(null);
            setNotebookOpen(false);
            setPhase('ACCUSATION');
            return ROUND_BUDGET.ACCUSATION_SECONDS;
          }
          return prev - 1;
        });
      } else if (phase === 'ACCUSATION') {
        setRoundSecondsLeft((prev) => {
          if (prev <= 1) {
            handleSubmitVerdict({
              accusedSpyId: 'bastian',
              orbitVerdict: 'TRUSTED',
            });
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, paused, howToPlayOverlayOpen, handleSubmitVerdict]);

  // Interrogate Suspect Handler
  const handleAskQuestion = useCallback(
    async (questionText: string) => {
      if (!caseData || !activeSuspectId || tokensLeft <= 0 || isAsking) return;

      const suspectTranscript = transcripts.filter((t) => t.suspectId === activeSuspectId);
      const turnNumber = gossipLog.length + 1;
      setTokensLeft((t) => Math.max(0, t - 1));
      setIsAsking(true);
      setStreamingText('');
      sceneRef.current?.setThinkingBubble(activeSuspectId);
      soundEngine.playTypewriterTick(true);

      const reply = await interrogateSuspect({
        caseData,
        suspectId: activeSuspectId,
        suspectTranscript,
        question: questionText,
        gossipLog,
        offlineMode: settings.offlineMode,
        onPartialText: (partial) => {
          setStreamingText(partial);
          if (partial) {
            soundEngine.playTypewriterTick(false);
          }
        },
      });

      sceneRef.current?.setThinkingBubble(null);
      setStreamingText(null);
      setIsAsking(false);

      const entry: TranscriptEntry = {
        id: `tr_${turnNumber}_${Date.now()}`,
        turn: turnNumber,
        suspectId: activeSuspectId,
        question: questionText,
        response: reply,
        timestampLabel: `TURN #${turnNumber}`,
      };

      setTranscripts((prev) => [...prev, entry]);
      setGossipLog((prev) => [
        ...prev,
        {
          turn: turnNumber,
          suspectId: activeSuspectId,
          suspectName: CAST_PROFILES[activeSuspectId].name,
          question: questionText,
          answer: reply.say,
        },
      ]);
    },
    [caseData, activeSuspectId, transcripts, tokensLeft, isAsking, gossipLog, settings.offlineMode]
  );

  // ORBIT Scan Evidence Handler
  const handleScanEvidence = useCallback(
    async (item: EvidenceItem) => {
      if (!caseData || scansLeft <= 0 || isScanning) return;
      const already = orbitScans.some(
        (s) => s.targetType === 'EVIDENCE' && s.targetId === item.id
      );
      if (already) return;

      setScansLeft((s) => Math.max(0, s - 1));
      setIsScanning(true);
      soundEngine.playOrbitScan();

      const result = await runOrbitScan({
        caseData,
        target: { type: 'EVIDENCE', item },
        offlineMode: settings.offlineMode,
      });

      setOrbitScans((prev) => [...prev, result]);
      setIsScanning(false);
    },
    [caseData, scansLeft, isScanning, orbitScans, settings.offlineMode]
  );

  // ORBIT Scan Suspect Transcript Handler
  const handleScanSuspect = useCallback(
    async (suspectId: SuspectId) => {
      if (!caseData || scansLeft <= 0 || isScanning) return;
      const already = orbitScans.some(
        (s) => s.targetType === 'TRANSCRIPT' && s.targetId === suspectId
      );
      if (already) return;

      setScansLeft((s) => Math.max(0, s - 1));
      setIsScanning(true);
      soundEngine.playOrbitScan();

      const entries = transcripts.filter((t) => t.suspectId === suspectId);
      const result = await runOrbitScan({
        caseData,
        target: { type: 'TRANSCRIPT', entries, suspectId },
        offlineMode: settings.offlineMode,
      });

      setOrbitScans((prev) => [...prev, result]);
      setIsScanning(false);
    },
    [caseData, scansLeft, isScanning, orbitScans, transcripts, settings.offlineMode]
  );

  // Global Keyboard Shortcuts (Enter Skip/Start/Accuse, H How to Play, Tab Notebook, Esc/P Pause, M Mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

      // Reopen or close HOW TO PLAY anytime with H (outside text inputs)
      if (e.code === 'KeyH' && !inInput && phase !== 'FORGING') {
        e.preventDefault();
        if (phase === 'HOW_TO_PLAY') {
          startNewInvestigation();
        } else {
          setHowToPlayOverlayOpen((open) => !open);
        }
        return;
      }

      // Dismiss HOW TO PLAY overlay with Enter or Escape
      if (howToPlayOverlayOpen && !inInput) {
        if (e.code === 'Enter' || e.code === 'Escape') {
          e.preventDefault();
          setHowToPlayOverlayOpen(false);
        }
        return;
      }

      // Pre-round HOW_TO_PLAY card skippable with Enter
      if (phase === 'HOW_TO_PLAY' && !inInput) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startNewInvestigation();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          setPhase('TITLE');
        }
        return;
      }

      if (phase === 'TITLE' && !settingsOpen && !inInput) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleTitleStart();
        }
        return;
      }

      if (phase === 'BRIEFING' && !inInput) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleEnterFloor88();
        }
        return;
      }

      if (e.code === 'KeyM' && !inInput) {
        setSettings((prev) => ({ ...prev, muted: !prev.muted }));
        return;
      }

      if (phase === 'INVESTIGATION') {
        if (e.code === 'Tab') {
          e.preventDefault();
          setInspectedEvidence(null);
          setActiveSuspectId(null);
          setNotebookOpen((open) => !open);
          return;
        }

        if (e.code === 'Escape') {
          e.preventDefault();
          if (settingsOpen) {
            setSettingsOpen(false);
          } else if (inspectedEvidence) {
            setInspectedEvidence(null);
          } else if (activeSuspectId) {
            setActiveSuspectId(null);
          } else if (notebookOpen) {
            setNotebookOpen(false);
          } else {
            setPaused((p) => !p);
          }
          return;
        }

        if (e.code === 'KeyP' && !inInput) {
          e.preventDefault();
          setPaused((p) => !p);
          return;
        }

        if (
          e.code === 'Enter' &&
          !inInput &&
          !paused &&
          !notebookOpen &&
          !activeSuspectId &&
          !inspectedEvidence &&
          !settingsOpen
        ) {
          e.preventDefault();
          setPhase('ACCUSATION');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    paused,
    howToPlayOverlayOpen,
    notebookOpen,
    activeSuspectId,
    inspectedEvidence,
    settingsOpen,
    handleTitleStart,
    startNewInvestigation,
    handleEnterFloor88,
  ]);

  const handleReturnToTitle = useCallback(() => {
    setPaused(false);
    setHowToPlayOverlayOpen(false);
    setNotebookOpen(false);
    setActiveSuspectId(null);
    setInspectedEvidence(null);
    soundEngine.stopHeartbeat();
    soundEngine.stopDrone();
    sceneRef.current?.setTourMode(true);
    setPhase('TITLE');
  }, []);

  const redactedFact = caseData ? redactFactForBriefing(caseData.fact) : null;
  const collectedEvidenceItems = caseData
    ? caseData.evidence.filter((e) => collectedIds.includes(e.id))
    : [];
  const isLiveAiActive = !settings.offlineMode && aiBackendLive;

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden bg-[#0A0A0B] select-none ${
        screenShakeActive ? 'translate-x-1 -translate-y-0.5 transition-transform' : ''
      }`}
    >
      {/* Isolated Phaser Penthouse World Canvas */}
      <div
        ref={canvasHostRef}
        data-testid="penthouse-canvas"
        className="fixed inset-0 z-0 flex items-center justify-center"
      />

      {/* Accessible SFX & In-World Dispatch Strip */}
      <CaptionStrip caption={activeCaption} />

      {/* Title Screen */}
      {phase === 'TITLE' && (
        <TitleScreen
          offlineMode={settings.offlineMode}
          onToggleOffline={() =>
            setSettings((prev) => ({ ...prev, offlineMode: !prev.offlineMode }))
          }
          onStartGame={handleTitleStart}
          onOpenHowToPlay={() => setHowToPlayOverlayOpen(true)}
          onOpenAccessibility={() => setSettingsOpen(true)}
        />
      )}

      {/* Pre-First-Round OR Reopened [H] HOW TO PLAY Evidence Card */}
      {(phase === 'HOW_TO_PLAY' || howToPlayOverlayOpen) && (
        <HowToPlayModal
          isPreRound={phase === 'HOW_TO_PLAY'}
          reducedMotion={settings.reducedMotion}
          selectedExample={draftQuestion}
          onSelectExampleQuestion={handleSelectExampleQuestion}
          onContinue={() => {
            if (phase === 'HOW_TO_PLAY') {
              startNewInvestigation();
            } else {
              setHowToPlayOverlayOpen(false);
            }
          }}
        />
      )}

      {/* Case Forge Loading Overlay */}
      {phase === 'FORGING' && (
        <ForgingOverlay
          statusLine={forgeStatus}
          seed={normalizeSeed(seedInput || 'PT-88')}
        />
      )}

      {/* 45s ORBIT Case Briefing */}
      {phase === 'BRIEFING' && caseData && redactedFact && (
        <BriefingModal
          seed={caseData.seed}
          source={caseData.source}
          redactedFact={redactedFact}
          briefingSecondsLeft={briefingSeconds}
          reducedMotion={settings.reducedMotion}
          onBeginInvestigation={handleEnterFloor88}
        />
      )}

      {/* Active HUD Bar */}
      {(phase === 'INVESTIGATION' || phase === 'ACCUSATION') && caseData && (
        <HudBar
          phase={phase}
          secondsRemaining={Math.min(roundSecondsLeft, hardCapSecondsLeft)}
          tokensLeft={tokensLeft}
          scansLeft={scansLeft}
          currentRoomId={currentRoomId}
          collectedEvidenceCount={collectedIds.length}
          totalEvidenceCount={caseData.evidence.length}
          muted={settings.muted}
          isLiveAiActive={isLiveAiActive}
          lastAiError={lastAiError}
          onJumpRoom={(roomId) => {
            setCurrentRoomId(roomId);
            sceneRef.current?.teleportToRoom(roomId);
          }}
          onOpenNotebook={() => {
            setActiveSuspectId(null);
            setInspectedEvidence(null);
            setNotebookOpen(true);
          }}
          onOpenAccusation={() => {
            setActiveSuspectId(null);
            setInspectedEvidence(null);
            setNotebookOpen(false);
            setPhase('ACCUSATION');
          }}
          onOpenHowToPlay={() => setHowToPlayOverlayOpen(true)}
          onToggleMute={() =>
            setSettings((prev) => ({ ...prev, muted: !prev.muted }))
          }
          onOpenSettings={() => setSettingsOpen(true)}
          onPause={() => setPaused(true)}
        />
      )}

      {/* Tilted Bottom Interrogation Drawer */}
      {phase === 'INVESTIGATION' && activeSuspectId && caseData && (
        <DialogueDrawer
          suspectId={activeSuspectId}
          transcripts={transcripts.filter((t) => t.suspectId === activeSuspectId)}
          draftQuestion={draftQuestion}
          onDraftQuestionChange={setDraftQuestion}
          streamingText={streamingText}
          isAsking={isAsking}
          isScanning={isScanning}
          tokensLeft={tokensLeft}
          scansLeft={scansLeft}
          gossipCount={gossipLog.length}
          latestScan={
            orbitScans.find(
              (s) => s.targetType === 'TRANSCRIPT' && s.targetId === activeSuspectId
            ) ?? null
          }
          reducedMotion={settings.reducedMotion}
          onAskQuestion={handleAskQuestion}
          onScanTranscript={() => handleScanSuspect(activeSuspectId)}
          onOpenHowToPlay={() => setHowToPlayOverlayOpen(true)}
          onClose={() => setActiveSuspectId(null)}
        />
      )}

      {/* Evidence Card Inspection Modal */}
      {phase === 'INVESTIGATION' && inspectedEvidence && (
        <EvidenceToast
          evidence={inspectedEvidence}
          existingScan={
            orbitScans.find(
              (s) => s.targetType === 'EVIDENCE' && s.targetId === inspectedEvidence.id
            ) ?? null
          }
          scansLeft={scansLeft}
          isScanning={isScanning}
          reducedMotion={settings.reducedMotion}
          onScanEvidence={handleScanEvidence}
          onClose={() => setInspectedEvidence(null)}
        />
      )}

      {/* Auditor Red Notepad (Evidence Grid, Transcripts + Gossip Log, Red-String Pin Board) */}
      {phase === 'INVESTIGATION' && notebookOpen && caseData && redactedFact && (
        <NotebookModal
          redactedFact={redactedFact}
          collectedEvidence={collectedEvidenceItems}
          totalEvidenceCount={caseData.evidence.length}
          transcripts={transcripts}
          gossipLog={gossipLog}
          orbitScans={orbitScans}
          pinLinks={pinLinks}
          scansLeft={scansLeft}
          isScanning={isScanning}
          reducedMotion={settings.reducedMotion}
          onScanEvidence={handleScanEvidence}
          onScanSuspect={handleScanSuspect}
          onAddPinLink={(fromNodeId, toNodeId) => {
            setPinLinks((prev) => {
              const exists = prev.some(
                (p) =>
                  (p.fromNodeId === fromNodeId && p.toNodeId === toNodeId) ||
                  (p.fromNodeId === toNodeId && p.toNodeId === fromNodeId)
              );
              if (exists) return prev;
              return [
                ...prev,
                { id: `pin_${Date.now()}`, fromNodeId, toNodeId },
              ];
            });
          }}
          onRemovePinLink={(linkId) =>
            setPinLinks((prev) => prev.filter((p) => p.id !== linkId))
          }
          onClose={() => setNotebookOpen(false)}
        />
      )}

      {/* Two-Verdict Accusation Modal */}
      {phase === 'ACCUSATION' && caseData && (
        <AccusationModal
          secondsRemaining={Math.min(roundSecondsLeft, hardCapSecondsLeft)}
          tokensLeft={tokensLeft}
          canReturnToFloor={roundSecondsLeft > 15 && hardCapSecondsLeft > 30}
          onSubmitVerdict={handleSubmitVerdict}
          onCancel={() => setPhase('INVESTIGATION')}
        />
      )}

      {/* Reveal Stamps, Timeline Replay & Score */}
      {phase === 'REVEAL' && caseData && finalVerdict && finalScore && (
        <RevealModal
          caseData={caseData}
          verdict={finalVerdict}
          score={finalScore}
          onPlayAgain={() => startNewInvestigation(generateShareableSeed())}
          onReturnTitle={handleReturnToTitle}
        />
      )}

      {/* Pause Modal */}
      {paused && caseData && (
        <PauseModal
          seed={caseData.seed}
          onResume={() => setPaused(false)}
          onOpenHowToPlay={() => {
            setPaused(false);
            setHowToPlayOverlayOpen(true);
          }}
          onRestart={() => startNewInvestigation(generateShareableSeed())}
          onReturnTitle={handleReturnToTitle}
        />
      )}

      {/* Settings, Accessibility & Advanced Proxy Modal */}
      {settingsOpen && (
        <AccessibilityModal
          settings={settings}
          seedInput={seedInput}
          onSeedChange={setSeedInput}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
