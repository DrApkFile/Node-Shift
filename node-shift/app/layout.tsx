import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import { SolanaProvider } from "@/components/providers/SolanaProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "NodeShift — The Web3 Lexicon",
  description: "Master the transition from centralized servers to high-performance on-chain programs. Explore side-by-side implementations of foundational backend patterns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-black text-white`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SolanaProvider>
            <div className="flex flex-col min-h-screen">
              {children}
            </div>
            <Toaster />
          </SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
