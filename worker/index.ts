/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

// Dreno rápido do outbox de CAPI (~1min). Ativação OPCIONAL: configure
// `[triggers] crons = ["* * * * *"]` + secrets APP_URL/CRON_SECRET no Worker.
// Sem isso é no-op — o piggyback dos webhooks + cron diário já cobrem.
// Docs: https://developers.cloudflare.com/workers/configuration/cron-triggers/
async function drainCapiOutboxScheduled(env: Env) {
  try {
    const runtime = env as unknown as Record<string, string | undefined>;
    const base = (runtime.APP_URL || "").replace(/\/+$/, "");
    const secret = runtime.CRON_SECRET || "";
    if (!base || !secret) return;
    const res = await fetch(`${base}/api/cron/meta?task=capi`, { headers: { authorization: `Bearer ${secret}` } });
    if (!res.ok) console.error("capi drain scheduled", res.status);
  } catch (error) {
    console.error("capi drain scheduled", error);
  }
}

const worker = {
  async scheduled(_event: unknown, env: Env, _ctx: ExecutionContext): Promise<void> {
    await drainCapiOutboxScheduled(env);
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
