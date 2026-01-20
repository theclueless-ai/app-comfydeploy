import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const gtFlexaMono = localFont({
  src: [{
    path: "../public/GT-Flexa-Mono-Medium.ttf",
    weight: "500",
    style: "normal",
  }],
  variable: "--font-gt-flexa-mono",
  display: "swap",
});

const workSans = localFont({
  src: [{
    path: "../public/WorkSans-SemiBold.ttf",
    weight: "600",
    style: "normal",
  }],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Theclueless | Workflow Studio",
  description: "Execute stunning AI workflows with ComfyDeploy",
  keywords: ["AI", "fashion", "modeling", "workflows", "ComfyDeploy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${gtFlexaMono.variable} ${workSans.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
