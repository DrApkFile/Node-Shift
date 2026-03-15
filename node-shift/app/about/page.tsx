import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-grow bg-black text-white py-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-3xl space-y-12">
          <div className="space-y-6">
            <p className="font-outfit text-[#00f0ff] tracking-[0.3em] text-[10px] font-black uppercase">About NodeShift</p>
            <h1 className="font-outfit text-5xl sm:text-7xl font-black tracking-tight text-white uppercase leading-none">
              Bridging the<br />Backend Gap
            </h1>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-gray-400 font-medium text-lg leading-relaxed">
            <p>
              NodeShift is an interactive educational platform designed to help traditional Web2 backend engineers transition into the Solana ecosystem. 
            </p>
            <p>
              By providing side-by-side code comparisons of foundational backend patterns, we demystify how centralized database logic translates into high-performance, verifiable on-chain programs.
            </p>
            <p>
              Built for the Superteam Poland bounty: "Rebuild Backend Systems as On-Chain Rust Programs". This project aims to lower the barrier to entry for talented developers worldwide to start building the next generation of decentralized infrastructure on Solana.
            </p>
          </div>

          <div className="pt-12 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-12 text-center md:text-left">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">The Creator</h4>
              <p className="text-white font-bold text-xl">@Aghaduno</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">The Mission</h4>
              <p className="text-white font-bold text-xl text-balance">Onboard the next 1M backend engineers to Solana.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
