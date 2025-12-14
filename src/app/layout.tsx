import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Synapse - Real-time Collaboration Whiteboard",
    template: "%s | Synapse",
  },
  description: "Create instant, shareable whiteboards for real-time collaboration. No sign-up required. Draw, brainstorm, and create together.",
  keywords: ["whiteboard", "collaboration", "real-time", "drawing", "brainstorming", "team"],
  authors: [{ name: "Synapse Team" }],
  creator: "Synapse",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://synapse.app",
    siteName: "Synapse",
    title: "Synapse - Real-time Collaboration Whiteboard",
    description: "Create instant, shareable whiteboards for real-time collaboration.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Synapse Whiteboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Synapse - Real-time Collaboration Whiteboard",
    description: "Create instant, shareable whiteboards for real-time collaboration.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
