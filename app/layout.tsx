import { ReactNode } from "react";
import "@mantine/core/styles.css";
import { Providers } from "@/app/providers";

export const metadata = {
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" sizes="192x192" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
