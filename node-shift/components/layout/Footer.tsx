import { Github, Twitter } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black py-12">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <Link href="/" className="font-outfit text-2xl font-black uppercase tracking-wider text-white">
              NodeShift<span className="text-primary">.</span>
            </Link>
            <p className="max-w-xs text-sm text-gray-400 font-medium leading-relaxed">
              Educating the next generation of backend engineers on the power of high-performance, verifiable on-chain programs.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-outfit font-bold uppercase tracking-widest text-xs text-white">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/patterns" className="hover:text-white transition-colors">Patterns</Link></li>
              <li><a href="https://solana.com/docs" className="hover:text-white transition-colors">Solana Docs</a></li>
              <li><a href="https://www.anchor-lang.com/" className="hover:text-white transition-colors">Anchor Book</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-outfit font-bold uppercase tracking-widest text-xs text-white">Connect</h4>
            <div className="flex items-center gap-4">
              <a href="https://github.com/DrApkFile" target="_blank" className="text-gray-400 hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://x.com/Aghaduno" target="_blank" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 font-outfit">
          <p>© 2026 NodeShift. Built for the Solana Backend Bounty.</p>
          <p>Created by @Aghaduno</p>
        </div>
      </div>
    </footer>
  )
}
