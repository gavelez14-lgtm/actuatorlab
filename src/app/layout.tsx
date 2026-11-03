import type { Metadata, Viewport } from "next";
// SF Pro is used on Apple devices via the system stack; Inter (optical sizes) is the fallback elsewhere.
import "@fontsource-variable/inter/opsz.css";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: { default: "ActuatorLab", template: "%s – ActuatorLab" },
  description:
    "Interactive industrial actuator training. Understand the mechanism. Visualize the movement. Master the application.",
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#000000" }, { media: "(prefers-color-scheme: light)", color: "#f5f5f7" }],
};

// Applies the saved theme before paint to avoid a flash. Dark is the default.
const themeScript = `try{var t=localStorage.getItem('actuatorlab.theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
