import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NGINEER",
  description: "Visual AI-powered network engineering assistant for IPAM, configs, diagrams, and traffic path analysis."
};

const navItems = [
  ["Dashboard", "/"],
  ["Network", "/network"],
  ["IPAM", "/ipam"],
  ["Traffic Path", "/traffic-path"],
  ["Config Builder", "/config-builder"],
  ["AI Assistant", "/ai-assistant"],
  ["Docs", "/docs"],
  ["Admin", "/admin"]
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <a className="brand" href="/" aria-label="NGINEER home">
              <span className="logo">N</span>
              <span>NGINEER</span>
            </a>
            <nav className="nav" aria-label="Primary navigation">
              {navItems.map(([label, href]) => (
                <a href={href} key={href}>{label}</a>
              ))}
            </nav>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">© 2026 NGINEER. Visual source of truth, safe config generation, and traffic-path analysis.</footer>
        </div>
      </body>
    </html>
  );
}
