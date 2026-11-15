import game from "./worker.js";

export default {
  async fetch(request, env) {
    const response = await game.fetch(request, { DB: env.DB });
    const preview = new Response(response.body, response);
    preview.headers.set("X-Robots-Tag", "noindex, nofollow");
    return preview;
  },
};
