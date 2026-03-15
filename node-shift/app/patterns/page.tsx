import { patterns } from "@/lib/patterns";
import { PatternCard } from "@/components/homepage/PatternCard";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PatternsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-grow bg-black text-white py-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="space-y-4 mb-16 text-center">
            <p className="font-outfit text-primary tracking-[0.3em] text-[10px] font-black uppercase">The Catalogue</p>
            <h1 className="font-outfit text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
              Foundational Patterns
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto font-medium">
              A comprehensive library of common backend architectural patterns refactored for the Solana blockchain.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {patterns.map((pattern) => (
              <PatternCard key={pattern.slug} pattern={pattern} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
