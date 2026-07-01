import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT PR Document Management System",
  description: "Internal IT Purchase Request document shell",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
