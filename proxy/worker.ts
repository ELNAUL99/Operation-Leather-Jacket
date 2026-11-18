/**
 * Optional Cloudflare Worker proxy for static GitHub Pages deployments.
 * Keeps GEMINI_API_KEY strictly server-side as an encrypted Worker secret
 * (`wrangler secret put GEMINI_API_KEY`).
 */

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

const GEMINI_MODEL = 'gemini-4-hydrogen';

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    const url = new URL(request.url);
    if (url.pathname === '/api/ai/status') {
      return new Response(
        JSON.stringify({ available: Boolean(env.GEMINI_API_KEY), model: GEMINI_MODEL }),
        { headers: { ...corsHeaders(allowedOrigin), 'Content-Type': 'application/json' } }
      );
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the Worker.' }),
        { status: 503, headers: { ...corsHeaders(allowedOrigin), 'Content-Type': 'application/json' } }
      );
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders(allowedOrigin), 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as {
      systemInstruction?: string;
      prompt?: string;
      responseSchema?: Record<string, unknown>;
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: body.systemInstruction
          ? { parts: [{ text: body.systemInstruction }] }
          : undefined,
        contents: [{ role: 'user', parts: [{ text: body.prompt ?? '' }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: body.responseSchema,
        },
      }),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { ...corsHeaders(allowedOrigin), 'Content-Type': 'application/json' },
    });
  },
};
