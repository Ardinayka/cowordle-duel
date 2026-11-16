import game from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    const response = await game.fetch(request, env, ctx);
    const publishedResponse = new Response(response.body, response);
    publishedResponse.headers.set("X-Lexivanto-Host", "cloudflare");

    if (new URL(request.url).hostname !== "lexivanto.com") {
      publishedResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return publishedResponse;
  },
  async scheduled(event, env, ctx) {
    return game.scheduled(event, env, ctx);
  },
};
