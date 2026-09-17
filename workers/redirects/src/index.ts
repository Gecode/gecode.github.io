const activePages = new Set([
  "/community.html",
  "/disclaimer.html",
  "/documentation.html",
  "/download.html",
  "/flatzinc.html",
  "/index.html",
  "/interfaces.html",
  "/license.html",
  "/logo.html",
  "/news.html",
  "/projects.html",
  "/publications.html",
]);

const posthogApiHost = "eu.i.posthog.com";
const posthogAssetHost = "eu-assets.i.posthog.com";
const posthogPrefix = "/e";

export interface Env {
  POSTHOG_PROJECT_TOKEN?: string;
}

function posthogInitResponse(request: Request, token: string | undefined): Response {
  if (!token) {
    return new Response("PostHog is not configured\n", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const config = JSON.stringify({
    api_host: "https://www.gecode.dev/e",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-08-30",
    cookieless_mode: "always",
    autocapture: false,
    person_profiles: "never",
    disable_session_recording: true,
    disable_surveys: true,
    respect_dnt: true,
  });
  const projectToken = JSON.stringify(token);
  const geography: Record<string, string> = {};
  if (request.cf?.country && /^[A-Z0-9]{2}$/.test(request.cf.country)) {
    geography.gecode_country_code = request.cf.country;
  }
  if (request.cf?.continent && /^[A-Z]{2}$/.test(request.cf.continent)) {
    geography.gecode_continent_code = request.cf.continent;
  }
  const body = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);var c=${config},g=${JSON.stringify(geography)};c.before_send=function(e){e&&e.properties&&Object.assign(e.properties,g);return e};posthog.init(${projectToken},c);\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function proxyPosthog(
  request: Request,
  originFetch: typeof fetch,
  context?: ExecutionContext,
): Promise<Response> {
  const incomingUrl = new URL(request.url);
  if (incomingUrl.pathname === `${posthogPrefix}/init.js`) {
    throw new Error("The initialization script must be handled before proxying");
  }

  const upstreamPath = incomingUrl.pathname.slice(posthogPrefix.length) || "/";
  const asset = upstreamPath.startsWith("/static/") || upstreamPath.startsWith("/array/");
  const upstreamUrl = new URL(`https://${asset ? posthogAssetHost : posthogApiHost}${upstreamPath}`);
  upstreamUrl.search = incomingUrl.search;

  if (asset && request.method === "GET") {
    const cached = await caches.default.match(request);
    if (cached) return cached;
  }

  const headers = new Headers(request.headers);
  headers.delete("Cookie");
  headers.delete("Authorization");
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") ?? "");
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer(),
    redirect: request.redirect,
  });
  const upstreamResponse = await originFetch(upstreamRequest);
  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("Set-Cookie");
  const response = new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });

  if (asset && request.method === "GET" && upstreamResponse.ok && context) {
    context.waitUntil(caches.default.put(request, response.clone()));
  }
  return response;
}

export function redirectTarget(url: URL): URL | null {
  const publication = /^\/publications\/[^/]+\.html$/.test(url.pathname);
  if (!activePages.has(url.pathname) && !publication) return null;
  url.pathname = url.pathname === "/index.html" ? "/" : `${url.pathname.slice(0, -".html".length)}/`;
  return url;
}

export async function handleRequest(
  request: Request,
  originFetch: typeof fetch = fetch,
  env: Env = {},
  context?: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === `${posthogPrefix}/init.js`) return posthogInitResponse(request, env.POSTHOG_PROJECT_TOKEN);
  if (url.pathname === posthogPrefix || url.pathname.startsWith(`${posthogPrefix}/`)) {
    return proxyPosthog(request, originFetch, context);
  }
  const target = redirectTarget(url);
  if (target) return Response.redirect(target, 308);
  return originFetch(request);
}

export default {
  fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    return handleRequest(request, fetch, env, context);
  },
} satisfies ExportedHandler<Env>;
