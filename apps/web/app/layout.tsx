import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import UsefectDialogProvider from "../components/UsefectDialogProvider";
import SolanaProvider from "../providers/SolanaProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "USEFECT",
  description:
    "Perpustakaan Digital Universitas Medan Area - Satu Akses Untuk Semua Ilmu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <SolanaProvider>
          <UsefectDialogProvider>
            {children}
          </UsefectDialogProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}