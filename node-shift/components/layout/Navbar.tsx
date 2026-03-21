"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-outfit text-xl font-black uppercase tracking-wider text-white">
              NodeShift<span className="text-primary">.</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/patterns" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Patterns
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/docs" className="text-sm font-black uppercase tracking-widest text-[#00f0ff] hover:text-white transition-colors border-l border-white/10 pl-6">
              Docs
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white hover:bg-white/5">
            <a href="https://github.com/DrApkFile/Node-Shift" target="_blank">
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="default" className="rounded-full px-6 font-outfit font-bold uppercase tracking-wide text-xs">
            Connect Wallet
          </Button>
        </div>
      </div>
    </nav>
  )
}
