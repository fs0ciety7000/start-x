import type { Metadata, Viewport } from "next";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "INIT — startpage",
  description: "Tes raccourcis personnels et le réseau SNCB en direct.",
  applicationName: "INIT",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#e9e7df" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('init-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}" }} /></head><body>{children}</body></html>;
}
