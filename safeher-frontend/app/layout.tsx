import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeHer | Support, your way",
  description: "A women-centred support and referral prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
