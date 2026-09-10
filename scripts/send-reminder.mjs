// 7pm evening reminder. Run by .github/workflows/reminder.yml on a cron.
//
// Reads the authored plant list from this repo and the watering log from the
// private data repo, computes what is due/overdue today (Europe/Berlin), and
// emails a nudge via Resend if anything is still unwatered.
//
// Requires Node >= 22 (imports the TypeScript domain modules directly via
// type-stripping). Env:
//   DATA_TOKEN   fine-grained PAT with contents:read on the data repo
//   DATA_OWNER   e.g. cocchialorenzo
//   DATA_REPO    e.g. plant-watering-data
//   DATA_PATH    e.g. watering.json
//   RESEND_API_KEY
//   REMINDER_TO      recipient address
//   REMINDER_FROM    verified sender (default: onboarding@resend.dev)
//   DRY_RUN=1        print instead of sending

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { computeSchedule } from "../src/domain/schedule.ts";
import { wateredOn } from "../src/domain/schedule.ts";
import { todayInBerlin } from "../src/lib/date.ts";

const here = dirname(fileURLToPath(import.meta.url));
const env = process.env;

function required(name) {
  const v = env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function loadPlants() {
  const raw = await readFile(
    resolve(here, "../public/data/plants.json"),
    "utf8",
  );
  return JSON.parse(raw);
}

async function loadWatering() {
  if (env.DATA_FILE) {
    return JSON.parse(await readFile(resolve(process.cwd(), env.DATA_FILE), "utf8"));
  }
  const owner = required("DATA_OWNER");
  const repo = required("DATA_REPO");
  const path = env.DATA_PATH || "watering.json";
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${required("DATA_TOKEN")}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (res.status === 404) return { events: [], overrides: {} };
  if (!res.ok) throw new Error(`Data repo read failed (${res.status})`);
  const body = await res.json();
  return JSON.parse(Buffer.from(body.content, "base64").toString("utf8"));
}

function pluralDays(n) {
  return `${n} day${n === 1 ? "" : "s"}`;
}

async function main() {
  const today = todayInBerlin();
  const [plants, watering] = await Promise.all([loadPlants(), loadWatering()]);

  if (watering.settings?.reminderEnabled === false) {
    console.log(`[${today}] Evening reminder disabled in settings — no email.`);
    return;
  }

  const outstanding = plants
    .map((p) => ({
      plant: p,
      schedule: computeSchedule(p, watering.overrides[p.id], watering.events, today),
    }))
    .filter(
      ({ plant, schedule }) =>
        (schedule.status === "due" || schedule.status === "overdue") &&
        !wateredOn(watering.events, plant.id, today),
    )
    .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue);

  if (outstanding.length === 0) {
    console.log(`[${today}] Nothing outstanding — no email.`);
    return;
  }

  const lines = outstanding.map(({ plant, schedule }) => {
    const d = schedule.daysUntilDue;
    const when =
      d === 0 ? "due today" : `${pluralDays(Math.abs(d))} overdue`;
    return `• ${plant.nickname} — ${when}`;
  });

  const subject =
    outstanding.length === 1
      ? `${outstanding[0].plant.nickname} needs water`
      : `${outstanding.length} plants need water`;

  const appUrl = env.APP_URL || "https://cocchialorenzo.github.io/vibe-plant-watering/#/water-check";
  const text = `Still thirsty this evening:\n\n${lines.join("\n")}\n\nLog them: ${appUrl}\n`;
  const html =
    `<p>Still thirsty this evening:</p><ul>` +
    outstanding
      .map(({ plant, schedule }) => {
        const d = schedule.daysUntilDue;
        const when = d === 0 ? "due today" : `${pluralDays(Math.abs(d))} overdue`;
        return `<li><strong>${plant.nickname}</strong> — ${when}</li>`;
      })
      .join("") +
    `</ul><p><a href="${appUrl}">Log the waterings →</a></p>`;

  if (env.DRY_RUN === "1") {
    console.log(`[${today}] DRY RUN\nSubject: ${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.REMINDER_FROM || "Plant Watering <onboarding@resend.dev>",
      to: [required("REMINDER_TO")],
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
  }
  console.log(`[${today}] Sent: ${subject}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
