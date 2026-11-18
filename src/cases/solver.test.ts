import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDWRITTEN_CASES, pickHandwrittenCase } from './handwrittenCases';
import {
  classifyQuestionIntent,
  computeTokenOverlapSimilarity,
  containsBannedRealWorldTerms,
  evaluateAccusation,
  generateOfflineOrbitScan,
  generateOfflineSuspectReply,
  isReplyRepeated,
  redactFactForBriefing,
  resetFallbackCursors,
  validateAndSolveCase,
} from './solver';
import { generateShareableSeed, normalizeSeed, shouldOrbitBeCompromised } from './seed';

test('all 3 handwritten cases pass strict Creative Bible & solvability checks', () => {
  assert.equal(HANDWRITTEN_CASES.length, 3);
  const compromisedCount = HANDWRITTEN_CASES.filter((c) => c.orbit_compromised).length;
  assert.equal(compromisedCount, 1, 'Exactly 1 in 3 handwritten cases should have ORBIT compromised');

  for (const c of HANDWRITTEN_CASES) {
    const result = validateAndSolveCase(c);
    assert.equal(
      result.valid,
      true,
      `Expected ${c.caseId} to be valid, got errors: ${result.errors.join('; ')}`
    );
    assert.ok(result.separatingSignals >= 3, 'Must have at least 3 separating signals');
    assert.equal(result.deducedSpyId, c.spy_id, 'Solver must uniquely deduce the Spy');
  }
});

test('validator rejects cases where Spy knows THE FACT or multiple spies exist', () => {
  const broken = structuredClone(HANDWRITTEN_CASES[0]);
  const spy = broken.suspects.find((s) => s.id === broken.spy_id)!;
  spy.knows_fact = true;

  const res = validateAndSolveCase(broken);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('Expected exactly 1 non-knower')));
});

test('validator rejects compromised ORBIT when framed person is the actual Spy', () => {
  const broken = structuredClone(HANDWRITTEN_CASES[0]);
  broken.orbit_compromised = true;
  broken.framed_id = broken.spy_id;

  const res = validateAndSolveCase(broken);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('Framed suspect must be innocent')));
});

test('validator rejects real-world brand names per Creative Bible fiction rules', () => {
  assert.equal(containsBannedRealWorldTerms('Envydia launched NIGHTJAR in Zurich'), null);
  assert.equal(containsBannedRealWorldTerms('Leaked to Nvidia engineers'), 'nvidia');

  const broken = structuredClone(HANDWRITTEN_CASES[1]);
  broken.fact.detail = 'secret GPU rivaling GeForce architecture';
  const res = validateAndSolveCase(broken);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('Fiction violation')));
});

test('briefing redactor hides actual codename and city while preserving category and letter count', () => {
  const redacted = redactFactForBriefing(HANDWRITTEN_CASES[0].fact);
  assert.equal(redacted.category, 'UNRELEASED CHIP LAUNCH');
  assert.ok(redacted.hintOne.includes('8 LETTERS'));
  assert.ok(!redacted.hintOne.includes('NIGHTJAR'));
  assert.ok(redacted.hintTwo.includes('Z?????'));
  assert.ok(!redacted.hintTwo.includes('480'));
});

test('engine-owned scoring calculates Spy, ORBIT, token, time bonuses, and penalties accurately', () => {
  const c = HANDWRITTEN_CASES[0]; // spy = bastian, orbit_compromised = true

  const perfect = evaluateAccusation(
    c,
    { accusedSpyId: 'bastian', orbitVerdict: 'COMPROMISED' },
    4, // +20
    180 // +18
  );
  assert.equal(perfect.spyCorrect, true);
  assert.equal(perfect.orbitCorrect, true);
  assert.equal(perfect.totalScore, 100 + 50 + 20 + 18);
  assert.equal(perfect.rank, 'S — CHIEF AUDITOR');

  const wrong = evaluateAccusation(
    c,
    { accusedSpyId: 'mina', orbitVerdict: 'TRUSTED' },
    2, // +10
    50 // +5
  );
  assert.equal(wrong.spyCorrect, false);
  assert.equal(wrong.orbitCorrect, false);
  assert.equal(wrong.totalScore, 0);
  assert.equal(wrong.rank, 'BURNED ASSET');
});

test('offline suspect mind keeps Spy ignorant until Gossip Log leaks THE FACT', () => {
  resetFallbackCursors();
  const c = HANDWRITTEN_CASES[0]; // spy = bastian, codename = NIGHTJAR
  const beforeLeak = generateOfflineSuspectReply(
    c,
    'bastian',
    'What codename did Dax announce?',
    []
  );
  assert.ok(!beforeLeak.say.includes('NIGHTJAR'), 'Spy must not know NIGHTJAR before gossip leak');
  assert.ok(beforeLeak.stress >= 70, 'Spy bluffing under direct fact probe spikes stress');

  const afterLeak = generateOfflineSuspectReply(
    c,
    'bastian',
    'What codename did Dax announce?',
    [
      {
        turn: 1,
        suspectId: 'isolde',
        suspectName: 'ISOLDE VANE',
        question: 'What did Dax say?',
        answer: 'He toasted Project NIGHTJAR in Zurich.',
      },
    ]
  );
  assert.ok(afterLeak.say.includes('NIGHTJAR'), 'Spy adapts and copies NIGHTJAR from shared Gossip Log');
});

test('compromised ORBIT scan steers toward framed innocent with verifiable room/timestamp contradiction', () => {
  const compromisedCase = HANDWRITTEN_CASES[0]; // spy = bastian, framed = mina
  const ev = compromisedCase.evidence[0]; // Found in ceo_bedroom at 23:04, points to bastian
  const scan = generateOfflineOrbitScan(compromisedCase, { type: 'EVIDENCE', item: ev });

  assert.equal(scan.flaggedSuspectId, 'mina');
  assert.ok(scan.summary.includes('WINE CLOSET') || scan.summary.includes('01:47'));
});

test('shareable seeds normalize cleanly and select handwritten cases deterministically', () => {
  const s1 = generateShareableSeed(12345);
  const s2 = generateShareableSeed(12345);
  assert.equal(s1, s2);
  assert.equal(normalizeSeed('  pt-88-jacket-1088! '), 'PT-88-JACKET-1088');
  assert.equal(pickHandwrittenCase(s1).fact.codename, pickHandwrittenCase(s2).fact.codename);
  assert.equal(typeof shouldOrbitBeCompromised(s1), 'boolean');
});

test('token-overlap repeat guard catches >70% similar replies and allows distinct wording', () => {
  const original =
    'Dax sketched NIGHTJAR right on the glass—bound for ZURICH at metric 480.';
  const nearDuplicate =
    'Dax sketched NIGHTJAR right on the glass, bound for ZURICH at metric 480 tonight.';
  const freshReply =
    'I stayed stationed inside GALLERY NOOK after midnight while footsteps echoed near the bedroom.';

  assert.ok(computeTokenOverlapSimilarity(original, nearDuplicate) > 0.7);
  assert.equal(isReplyRepeated(nearDuplicate, [original], 0.7), true);
  assert.equal(isReplyRepeated(freshReply, [original], 0.7), false);
});

test('intent classifier maps whiteboard/fact, whereabouts, relationship, accusation, and small talk', () => {
  assert.equal(classifyQuestionIntent('What was written on the whiteboard codename?'), 'FACT');
  assert.equal(classifyQuestionIntent('Where were you around midnight?'), 'WHEREABOUTS');
  assert.equal(classifyQuestionIntent('What is your private relationship with CEO Dax?'), 'RELATIONSHIP');
  assert.equal(classifyQuestionIntent('Are you the rival spy leaking secrets?'), 'ACCUSATION');
  assert.equal(classifyQuestionIntent('How is the rain looking tonight?'), 'SMALL_TALK');
});

test('fallback suspect lines cycle through >= 4 variants per intent without repeating', () => {
  resetFallbackCursors();
  const c = HANDWRITTEN_CASES[0];

  // Ask 4 consecutive FACT questions to Isolde (knower)
  const knowerReplies: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const res = generateOfflineSuspectReply(
      c,
      'isolde',
      `Tell me about the whiteboard codename #${i}`,
      [],
      knowerReplies
    );
    assert.equal(
      isReplyRepeated(res.say, knowerReplies, 0.7),
      false,
      `Turn ${i} repeated an earlier fallback line: "${res.say}"`
    );
    knowerReplies.push(res.say);
  }
  assert.equal(new Set(knowerReplies).size, 4);

  // Ask 3 different intent questions to Bastian (the Spy)
  const spyQuestions = [
    'What was on the whiteboard?',
    'Where were you at 23:15?',
    'What is your relationship with CEO Dax Mercer?',
  ];
  const spyReplies: string[] = [];
  for (const q of spyQuestions) {
    const res = generateOfflineSuspectReply(c, 'bastian', q, [], spyReplies);
    assert.equal(isReplyRepeated(res.say, spyReplies, 0.7), false);
    spyReplies.push(res.say);
  }
  assert.equal(new Set(spyReplies).size, 3);
});
