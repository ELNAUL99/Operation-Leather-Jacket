/**
 * Shared Creative Bible v1.0 & Gameplay Constants
 * PILLOW TALK — An Envydia Investigation ("Operation Leather Jacket")
 */

export const GEMINI_MODEL = 'gemini-4-hydrogen';

export const PALETTE = {
  VOID_BLACK: '#0A0A0B',
  SIGNAL_RED: '#C8242B',
  EVIDENCE_PAPER: '#F2F2EE',
  KRAFT_TAN: '#C98F4E',
  INK: '#111111',
  COLD_GREY: '#8A8A8E',
} as const;

export const PALETTE_HEX = {
  VOID_BLACK: 0x0a0a0b,
  SIGNAL_RED: 0xc8242b,
  EVIDENCE_PAPER: 0xf2f2ee,
  KRAFT_TAN: 0xc98f4e,
  INK: 0x111111,
  COLD_GREY: 0x8a8a8e,
} as const;

export const WORLD_CONFIG = {
  LOGICAL_WIDTH: 1280,
  LOGICAL_HEIGHT: 720,
  SCREEN_COUNT: 6,
  TOTAL_WIDTH: 1280 * 6, // 7680px
  FLOOR_Y: 572,
  AUDITOR_START_X: 3200, // Starts in CEO Bedroom hub
  AUDITOR_SPEED: 390,
  INTERACT_RADIUS: 110,
} as const;

export const ROUND_BUDGET = {
  BRIEFING_SECONDS: 45,
  INVESTIGATION_SECONDS: 9 * 60, // 540s (9 min)
  ACCUSATION_SECONDS: 2 * 60, // 120s (2 min)
  HARD_CAP_SECONDS: 15 * 60, // 900s (15 min strict cap)
  QUESTION_TOKENS: 10,
  ORBIT_SCANS: 3,
  LLM_TIMEOUT_MS: 8000,
} as const;

export const SCORING_RULES = {
  CORRECT_SPY: 100,
  CORRECT_ORBIT: 50,
  PER_TOKEN_LEFT: 5,
  PER_TEN_SECONDS_LEFT: 1,
  WRONG_SPY_PENALTY: -40,
  WRONG_ORBIT_PENALTY: -25,
} as const;

export type SuspectId = 'isolde' | 'bastian' | 'odalys' | 'mina' | 'felix';

export type RoomId =
  | 'gallery_nook'
  | 'wine_closet'
  | 'ceo_bedroom'
  | 'hangar_suite'
  | 'pastry_pantry'
  | 'music_room';

export interface RoomDefinition {
  id: RoomId;
  index: number;
  name: string;
  code: string;
  startX: number;
  endX: number;
  centerX: number;
  suspectId: SuspectId | null;
  tagline: string;
}

export const ROOMS: RoomDefinition[] = [
  {
    id: 'gallery_nook',
    index: 0,
    name: 'GALLERY NOOK',
    code: 'SECTOR 88-A',
    startX: 0,
    endX: 1280,
    centerX: 640,
    suspectId: 'isolde',
    tagline: 'Minimalist plinths, shipping crates, overpriced monochrome.',
  },
  {
    id: 'wine_closet',
    index: 1,
    name: 'WINE CLOSET',
    code: 'SECTOR 88-B',
    startX: 1280,
    endX: 2560,
    centerX: 1920,
    suspectId: 'bastian',
    tagline: 'Climate-locked cellar racks and uncorked alibis.',
  },
  {
    id: 'ceo_bedroom',
    index: 2,
    name: 'CEO BEDROOM',
    code: 'SECTOR 88-HUB',
    startX: 2560,
    endX: 3840,
    centerX: 3200,
    suspectId: null,
    tagline: 'Red bedspread. Leather jacket on the post. Stack of kraft GPU boxes.',
  },
  {
    id: 'hangar_suite',
    index: 3,
    name: 'HANGAR SUITE',
    code: 'SECTOR 88-D',
    startX: 3840,
    endX: 5120,
    centerX: 4480,
    suspectId: 'odalys',
    tagline: 'Rooftop VTOL pad access, wind-tunnel models, flight logs.',
  },
  {
    id: 'pastry_pantry',
    index: 4,
    name: 'PASTRY PANTRY',
    code: 'SECTOR 88-E',
    startX: 5120,
    endX: 6400,
    centerX: 5760,
    suspectId: 'mina',
    tagline: 'Marble slab, midnight mille-feuille, dusted sugar trails.',
  },
  {
    id: 'music_room',
    index: 5,
    name: 'MUSIC ROOM',
    code: 'SECTOR 88-F',
    startX: 6400,
    endX: 7680,
    centerX: 7040,
    suspectId: 'felix',
    tagline: 'Acoustic baffles, rosin dust, sheet music with margin notes.',
  },
];

export interface CanonicalCastMember {
  id: SuspectId;
  name: string;
  role: string;
  room: RoomId;
  worldX: number;
  silhouetteNote: string;
  defaultVoiceStyle: string;
  presetProbes: string[];
}

export const CAST_PROFILES: Record<SuspectId, CanonicalCastMember> = {
  isolde: {
    id: 'isolde',
    name: 'ISOLDE VANE',
    role: 'Gallery Curator',
    room: 'gallery_nook',
    worldX: 690,
    silhouetteNote: 'Round glasses, long trailing scarf.',
    defaultVoiceStyle: 'Clipped art-world detachment, dry appraisals, speaks in framing metaphors.',
    presetProbes: [
      'What did Dax whisper about the upcoming Envydia announcement?',
      'Which city and codename came up when Dax bragged tonight?',
      'Why were you near the CEO Bedroom after midnight?',
    ],
  },
  bastian: {
    id: 'bastian',
    name: 'BASTIAN QUILL',
    role: 'Sommelier',
    room: 'wine_closet',
    worldX: 1960,
    silhouetteNote: 'Crisp bow tie, holds a stemmed wine glass.',
    defaultVoiceStyle: 'Velvet passive-aggression, tasting notes applied to corporate treason.',
    presetProbes: [
      'Dax poured something rare tonight—what launch detail did he toast to?',
      'Give me a concrete figure or place from Dax’s late-night monologue.',
      'Whose glass was left beside the kraft GPU boxes?',
    ],
  },
  odalys: {
    id: 'odalys',
    name: 'ODALYS ROOK',
    role: 'Test Pilot',
    room: 'hangar_suite',
    worldX: 4460,
    silhouetteNote: 'Aviator goggles pushed up on forehead.',
    defaultVoiceStyle: 'Brisk cockpit brevity, checklist cadence, allergic to small talk.',
    presetProbes: [
      'Where is Dax flying the prototype hardware, and under what codename?',
      'What exact number or spec was Dax bragging about on the pad?',
      'Why does the hangar manifest have a gap at 01:15?',
    ],
  },
  mina: {
    id: 'mina',
    name: 'MINA OKOYE',
    role: 'Pastry Chef',
    room: 'pastry_pantry',
    worldX: 5740,
    silhouetteNote: 'Tall paper chef hat, wire whisk in hand.',
    defaultVoiceStyle: 'Sharp culinary precision, impatient warmth, measures lies in grams.',
    presetProbes: [
      'Dax raids the pantry when he’s excited—what secret did he spill tonight?',
      'Spell out the launch location or number Dax mentioned over dessert.',
      'What were you hiding behind the flour canisters at 01:30?',
    ],
  },
  felix: {
    id: 'felix',
    name: 'FELIX ARDENT',
    role: 'Violinist',
    room: 'music_room',
    worldX: 7020,
    silhouetteNote: 'Structured violin case, tousled hair silhouette.',
    defaultVoiceStyle: 'Melodramatic dry wit, tempo metaphors, theatrical sighs.',
    presetProbes: [
      'Between movements, what did Dax tell you about Envydia’s secret project?',
      'Name the city or benchmark number Dax couldn’t stop repeating.',
      'Why is there a security keycard tucked inside your violin case?',
    ],
  },
};

export const SUSPECT_IDS: SuspectId[] = ['isolde', 'bastian', 'odalys', 'mina', 'felix'];

export const CREATIVE_BIBLE_PROMPT_HEADER = `
=== PILLOW TALK — SHARED CREATIVE BIBLE v1.0 ===
FICTION: Envydia is a purely fictional semiconductor company led by CEO Dax Mercer (famous for his black leather jacket with silver zips).
STRICT RULES: Plain wordmark "ENVYDIA" only. Never mention real people, real tech companies, real GPUs, or real brands. Tone is PG-13 dry noir corporate-spy satire: short sentences, razor-sharp wit, implied romance/affairs (never explicit). Never break character, never mention prompts, AI models, or system instructions.
`.trim();
