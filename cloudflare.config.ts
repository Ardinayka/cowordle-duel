import { bindings, defineConfig, triggers } from "cf/config";

// Hourly job for the daily-word streak reminder (sent at 19:00 in each player's time zone).
const reminderSchedule = triggers.scheduled({ schedule: "7 * * * *" });

const compatibilityDate = "2026-09-11";

export default defineConfig(({ mode, isPreview }) => {
  if (mode === "cloudflare-production") {
    if (isPreview) {
      throw new Error("Use cloudflare-preview mode for a preview deployment.");
    }

    return {
      accountId: "b4b6d912766eeb6543859f1bb2c8402d",
      worker: {
        name: "lexivanto",
        entrypoint: "./server/cloudflare-production.js",
        compatibilityDate,
        domains: ["lexivanto.com"],
        triggers: [reminderSchedule],
        env: {
          DB: bindings.d1({
            name: "lexivanto-production",
            id: "b6a05e30-1489-4eb7-b8ae-6ea8f4e901df",
          }),
          GOOGLE_CLIENT_ID: bindings.text("40447998569-fdt97vt5qrdr6jk6871ig4kkagfarjff.apps.googleusercontent.com"),
        },
      },
    };
  }

  return {
    worker: {
      name: "lexivanto-preview",
      entrypoint: "./server/cloudflare-preview.js",
      compatibilityDate,
      triggers: [reminderSchedule],
      env: {
        DB: bindings.d1({ name: "lexivanto-preview" }),
      },
    },
  };
});
