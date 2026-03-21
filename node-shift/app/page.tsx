import { patterns } from "@/lib/patterns";
import { PatternCard } from "@/components/homepage/PatternCard";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowDown, Github, Rocket, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const featuredPatterns = patterns.slice(0, 3);

  return (
    <>
      <Navbar />
      <main className="flex-grow bg-black text-white">
        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden py-20 px-4 sm:px-8">
          <div className="absolute inset-0 -z-10 bg-black">
            <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-primary/10 blur-[160px] rounded-full animate-pulse-slow" />
            <div className="absolute bottom-1/4 right-1/4 w-[50%] h-[50%] bg-cyan-500/5 blur-[180px] rounded-full animate-pulse-slow delay-700" />
            <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          </div>

          <div className="container mx-auto max-w-7xl flex flex-col items-center text-center space-y-12">
            <div className="space-y-6">
              <p className="font-outfit text-primary tracking-[0.8em] text-[10px] sm:text-xs font-black uppercase animate-in fade-in slide-in-from-bottom-4 duration-700">
                The Web3 Stepping Stone
              </p>
              <h1 className="font-outfit text-5xl sm:text-7xl md:text-[8rem] font-black leading-tight tracking-[0.1em] uppercase animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                Node<span className="text-primary">Shift</span>
              </h1>
              <h2 className="font-outfit text-xl sm:text-2xl md:text-3xl font-bold tracking-[0.5em] text-gray-400 uppercase animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
                T h e   W e b 3  L e x i c o n
              </h2>
            </div>

            <p className="max-w-2xl text-gray-400 text-lg sm:text-xl font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-600">
              Master the transition from centralized servers to high-performance on-chain programs. Explore side-by-side implementations of foundational backend patterns.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-800">
              <Button size="lg" className="rounded-full px-12 h-16 text-lg font-outfit font-black uppercase tracking-wider shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]" asChild>
                <Link href="/patterns">
                  Explore Patterns
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="rounded-full px-12 h-16 text-lg font-outfit font-black uppercase tracking-wider border-white/10 hover:bg-white/5" asChild>
                <Link href="/docs">
                  Read Migration Guides
                </Link>
              </Button>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
            <ArrowDown className="w-6 h-6" />
          </div>
        </section>

        {/* Features Split Section */}
        <section className="py-24 relative overflow-hidden border-y border-white/10 bg-white/5 backdrop-blur-md">
          <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
              <div className="space-y-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-110">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-outfit font-bold text-2xl tracking-tight text-white">State vs Accounts</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">Map traditional JDBC schemas to Solana's PDA-based account model with clear, side-by-side examples.</p>
              </div>
              <div className="space-y-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-110">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-outfit font-bold text-2xl tracking-tight text-white">High Performance</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">Experience 400ms finality. Learn why Solana feels more like a distributed backend than a slow ledger.</p>
              </div>
              <div className="space-y-4 group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-110">
                  <Rocket className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-outfit font-bold text-2xl tracking-tight text-white">Production Patterns</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">Architecture derived from actual Solana mainnet programs. Battle-tested logic refactored for education.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Web3 & Development Section */}
        <section className="py-24 relative overflow-hidden bg-black border-b border-white/5">
          <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="font-outfit text-primary tracking-[0.3em] text-[10px] font-black uppercase">The Paradigm Shift</p>
                  <h2 className="font-outfit text-4xl sm:text-5xl font-black tracking-tight text-white uppercase">Why Web3?</h2>
                  <p className="text-gray-400 text-lg leading-relaxed font-medium">
                    Web2 relies on centralized silos and intermediaries. Web3 introduces <strong>sovereignty</strong>. By building on-chain, you ensure your application logic is immutable, your data is transparent, and your users truly own their digital assets. It's the move from "Don't be evil" to "Can't be evil."
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                  <h3 className="font-outfit font-bold text-2xl text-white flex items-center gap-3">
                    <span className="text-primary text-3xl">🦀</span> Native Rust
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Solana programs are compiled to BPF (Berkeley Packet Filter) using <a href="https://www.rust-lang.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Native Rust</a>. This approach provides the highest level of performance and security by giving developers direct control over account management, instruction data, and compute budget. Mastering Native Rust is essential for building highly optimized protocols that push the limits of what's possible on a blockchain.
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    It requires a deep understanding of memory safety and the Solana runtime, but the reward is unparalleled execution speed and architectural flexibility.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <h3 className="font-outfit font-bold text-2xl text-white">Anchor Framework</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    While Native Rust is the foundation, <a href="https://www.anchor-lang.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Anchor</a> is the most widely used framework that streamlines development. It reduces boilerplate for account serialization and adds critical security checks by default, making it easier to build and maintain complex dApps.
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                  <h3 className="font-outfit font-bold text-xl text-white uppercase tracking-widest">Quick Setup</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-black text-primary uppercase mb-2">Linux & macOS</p>
                      <code className="text-[10px] sm:text-xs text-cyan-400 bg-black/60 p-3 rounded-lg block overflow-x-auto border border-white/5">
                        sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
                      </code>
                    </div>
                    <div>
                      <p className="text-xs font-black text-primary uppercase mb-2">Windows</p>
                      <p className="text-gray-400 text-xs mb-2">Install <strong>WSL2</strong>, then use the Linux command above.</p>
                      <code className="text-[10px] sm:text-xs text-cyan-400 bg-black/60 p-3 rounded-lg block border border-white/5">
                        wsl --install
                      </code>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    For more info, visit the official <a href="https://www.rust-lang.org/" className="text-primary hover:underline">Rust</a> and <a href="https://www.anchor-lang.com/" className="text-primary hover:underline">Anchor</a> sites.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Patterns (Preview) */}
        <section className="py-24 relative overflow-hidden bg-black">
          <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
              <div className="space-y-4">
                <p className="font-outfit text-primary tracking-[0.3em] text-[10px] font-black uppercase">Recent Updates</p>
                <h2 className="font-outfit text-4xl sm:text-5xl font-black tracking-tight text-white">Featured Patterns</h2>
              </div>
              <Button variant="ghost" className="text-primary hover:bg-primary/10 font-outfit font-bold uppercase tracking-widest text-xs" asChild>
                <Link href="/patterns" className="gap-2">
                  View Full Catalogue <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPatterns.map((pattern) => (
                <PatternCard key={pattern.slug} pattern={pattern} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
