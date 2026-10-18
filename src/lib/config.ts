import { z } from "zod";

export const linkSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(48),
  url: z.string().url().max(500).refine((value) => value.startsWith("https://") || value.startsWith("http://"), "URL http ou https requise"),
  icon: z.string().trim().max(4).default("↗"),
  note: z.string().trim().max(80).default(""),
});

export const categorySchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(32),
  isWork: z.boolean().default(false),
  links: z.array(linkSchema).max(36),
});

export const dashboardConfigSchema = z.object({
  theme: z.enum(["light", "dark"]),
  stationId: z.string().regex(/^\d{7}$/).nullable(),
  stationName: z.string().max(100).nullable(),
  categories: z.array(categorySchema).min(1).max(16),
});

export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;
export type DashboardCategory = DashboardConfig["categories"][number];
export type DashboardLink = DashboardCategory["links"][number];

export const defaultConfig: DashboardConfig = {
  theme: "light",
  stationId: null,
  stationName: "Bruxelles-Central",
  categories: [
    {
      id: "personal",
      name: "Mes raccourcis",
      isWork: false,
      links: [
        { id: "notion", name: "Notion", url: "https://www.notion.so", icon: "N", note: "" },
        { id: "github", name: "GitHub", url: "https://github.com", icon: "GH", note: "" },
        { id: "gmail", name: "Gmail", url: "https://mail.google.com", icon: "M", note: "" },
        { id: "drive", name: "Drive", url: "https://drive.google.com", icon: "D", note: "" },
        { id: "calendar", name: "Agenda", url: "https://calendar.google.com", icon: "31", note: "" },
        { id: "maps", name: "Maps", url: "https://maps.google.com", icon: "↗", note: "" },
        { id: "spotify", name: "Spotify", url: "https://open.spotify.com", icon: "S", note: "" },
      ],
    },
    {
      id: "work",
      name: "Work",
      isWork: true,
      links: [
        { id: "slack", name: "Slack", url: "https://slack.com", icon: "S", note: "Communication" },
        { id: "linear", name: "Linear", url: "https://linear.app", icon: "L", note: "Projets" },
        { id: "figma", name: "Figma", url: "https://figma.com", icon: "F", note: "Design" },
        { id: "vscode", name: "VS Code", url: "https://vscode.dev", icon: "V", note: "Développement" },
      ],
    },
  ],
};
