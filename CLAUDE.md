@AGENTS.md

# Lexivanto

Use Node.js 24.22 or later from the Node 24 release line. To start the local game:

```sh
npm ci
npm run build
npm run dev
```

See [Deployment](DEPLOYMENT.md) for the Cloudflare preview and the release process.

Before planning new features, monetisation or app-store work, read section 8 of [REDESIGN-PLAN.md](REDESIGN-PLAN.md) (growth and income, approved by the owner): players first, design for an empty room, supporter pass rather than ads, Android before iPhone.

## gstack (recommended)

This project uses [gstack](https://github.com/garrytan/gstack) for AI-assisted workflows.
Install it for the best experience:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

Skills like /qa, /ship, /review and /browse become available after install.
Use /browse for all web browsing (Aside first, the bundled gstack browser as fallback). Use ~/.claude/skills/gstack/... for gstack file paths.
