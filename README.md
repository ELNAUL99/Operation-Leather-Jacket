# PILLOW TALK — An Envydia Investigation

> **Operation Leather Jacket** · *"Someone's leaking. The AI might be in on it. Trust no pillow."*

**PILLOW TALK** is a dry noir 2D side-scrolling investigation adventure and AI social-deduction game inspired by *Spyfall*. CEO **Dax Mercer** (never seen without his black leather jacket with silver zips) shared an unreleased **ENVYDIA** secret (**THE FACT**) with **four** of the five people in his private penthouse life. The **fifth** is a rival plant who does **not** know THE FACT—and everyone is hiding an embarrassing personal secret, so everyone evades.

To make matters worse, in **1 of 3 rounds** your floating GPU-die AI sidekick **ORBIT** is quietly compromised, introducing subtle, verifiable timeline/room contradictions in its forensic scans to frame an innocent guest.

![Gameplay Preview Placeholder](./docs/preview-penthouse.gif)
![Notebook & Pin Board Placeholder](./docs/preview-pinboard.gif)

---

## Why AI Is Essential

Without live generative AI, **PILLOW TALK**'s core social-deduction loop cannot exist:

1. **CASE FORGE (Live Mystery Synthesis + Deterministic Solver)**: Every round, Gemini (`gemini-4-hydrogen`) synthesizes a brand-new **FACT** (`category`, `codename`, `city`, `number`, `detail`), five intertwined private affair secrets, behavioral tells, and penthouse evidence cards. A deterministic zero-LLM validator & deduction solver (`src/cases/solver.ts`) verifies fiction rules and guarantees at least **3 independent separating signals** isolate the Spy before the round begins.
2. **SUSPECT MINDS & THE SHARED GOSSIP LOG**: Players interrogate suspects in **free-form natural language** (or quick probes). Knowers answer concretely using THE FACT while dodging personal questions; the Spy **never receives THE FACT** in their system prompt and must bluff from the Auditor's phrasing—or dynamically copy details leaked into the **Shared Penthouse Gossip Log** by earlier interviewees! Asking varied, oblique questions beats repeating the same prompt.
3. **ORBIT FORENSIC SCANS (Honest vs. Compromised)**: ORBIT dynamically analyses any Evidence Card or live interrogation transcript. When compromised (1 in 3 cases), ORBIT steers suspicion toward a specific innocent suspect using checkable factual discrepancies (wrong room, shifted timestamp, or misquoted statement).
4. **ENGINE OWNS TRUTH**: Ground truth (`spy_id`, `orbit_compromised`, timers, tokens, and score math) lives strictly in deterministic TypeScript state—never delegated to the LLM.

---

## Creative Bible & Palette

- **Palette**: Void Black `#0A0A0B`, Signal Red `#C8242B`, Evidence Paper `#F2F2EE`, Kraft Tan `#C98F4E`, Ink `#111111`, Cold Grey `#8A8A8E` (soft red radial glow is the sole gradient).
- **Art**: 100% procedural flat-vector Phaser 3 Graphics & inline SVGs (`6px` black outlines, faceless white ovoid heads, zero external textures or real-world logos).
- **Audio**: 100% procedural WebAudio synthesis (typewriter ticks, low synth drone, elevated-pulse heartbeat when `stress > 70`, rubber stamp thud) with live visual SFX captions.

---

## Run, Test & Deploy

### 1. Local Full-Stack Development

```bash
npm install
# Configure GEMINI_API_KEY in .env (see .env.example)
npm run dev
```

Open `http://localhost:3000`. Use `?autostart=1` (`http://localhost:3000/?autostart=1`) to jump straight onto Floor 88.

### 2. Run Deterministic Validator & Solver Unit Tests

```bash
npm test
# or directly:
npx --yes tsx --test src/cases/solver.test.ts
```

### 3. Live Deployment (Cloud Run / AI Studio)

**▶ Play it now:** <https://pillow-talk-an-envydia-investigation-658887858548.europe-west3.run.app>

PILLOW TALK runs **full-stack** on Cloud Run / AI Studio — `server.ts` serves the built client *and* holds the Gemini key server-side via `/api/ai`, so the browser never sees it. Set `GEMINI_API_KEY` as a secret on the service (AI Studio injects it automatically at runtime).

```bash
npm run lint    # tsc --noEmit
npm run build   # vite build -> dist/
npm start       # NODE_ENV=production tsx server.ts (serves dist/ + /api/ai)
```

**Offline Mode needs no key** — toggle it on the Title Screen or Options modal for a zero-network demo powered by the 3 verified handwritten dossiers in `src/cases/handwrittenCases.ts`.

---

## Rules Compliance Checklist

| Rule | Status | Implementation |
| :--- | :---: | :--- |
| **AI is Essential** | ✅ | Live Gemini Case Forge, asymmetric Suspect Minds + Shared Gossip Log, and ORBIT Scans (`src/server/geminiRoutes.ts`, `src/ai/llm.ts`). |
| **Round ≤ 15 Minutes** | ✅ | 45s Briefing + 9m Investigation + 2m Accusation (~11.75m target) with a strict `15:00` (`900s`) hard-cap timer enforced in `src/App.tsx`. |
| **Fictional Only (PG-13)** | ✅ | Plain-text `"ENVYDIA"` wordmark only; deterministic banned-term filter in `src/cases/solver.ts` blocks real brands/people; zero cloned voices. |
| **Engine Owns Truth & Resilient** | ✅ | Deterministic solver + scoring (`src/cases/solver.ts`), 8s LLM timeout, SSE streaming, and full Offline Mode toggle. |
| **Accessible & Public-Git Ready** | ✅ | Keyboard-only playable, non-hue-only Pulse shape meter, text-size slider, reduced-motion toggle, SFX captions, MIT `LICENSE`, CI workflow. |

---

## License

Released under the [MIT License](./LICENSE).
