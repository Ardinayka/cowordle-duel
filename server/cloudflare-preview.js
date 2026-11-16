import game from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    const response = await game.fetch(request, { DB: env.DB }, ctx);
    const preview = new Response(response.body, response);
    preview.headers.set("X-Robots-Tag", "noindex, nofollow");
    return preview;
  },
  async scheduled(event, env, ctx) {
    return game.scheduled(event, { DB: env.DB }, ctx);
  },
};
