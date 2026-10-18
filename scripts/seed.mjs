import pg from "pg";

try { process.loadEnvFile(); } catch (error) { if (error?.code !== "ENOENT") throw error; }
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const config = {
  theme: "light",
  stationId: null,
  stationName: "Bruxelles-Central",
  categories: [
    { id: "personal", name: "Mes raccourcis", isWork: false, links: [
      { id: "notion", name: "Notion", url: "https://www.notion.so", icon: "N", note: "" },
      { id: "github", name: "GitHub", url: "https://github.com", icon: "GH", note: "" },
      { id: "gmail", name: "Gmail", url: "https://mail.google.com", icon: "M", note: "" },
      { id: "drive", name: "Drive", url: "https://drive.google.com", icon: "D", note: "" },
      { id: "calendar", name: "Agenda", url: "https://calendar.google.com", icon: "31", note: "" },
      { id: "maps", name: "Maps", url: "https://maps.google.com", icon: "↗", note: "" },
      { id: "spotify", name: "Spotify", url: "https://open.spotify.com", icon: "S", note: "" },
    ] },
    { id: "work", name: "Work", isWork: true, links: [
      { id: "slack", name: "Slack", url: "https://slack.com", icon: "S", note: "Communication" },
      { id: "linear", name: "Linear", url: "https://linear.app", icon: "L", note: "Projets" },
      { id: "figma", name: "Figma", url: "https://figma.com", icon: "F", note: "Design" },
      { id: "vscode", name: "VS Code", url: "https://vscode.dev", icon: "V", note: "Développement" },
    ] },
  ],
};

try {
  await pool.query("INSERT INTO dashboard_config (id, config) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING", [JSON.stringify(config)]);
} finally {
  await pool.end();
}
