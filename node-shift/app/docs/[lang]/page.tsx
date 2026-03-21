import { notFound } from "next/navigation"
import { DocsSidebar } from "@/components/docs/DocsSidebar"
import { ProcessStep } from "@/components/docs/ProcessStep"
import { docsContent } from "@/lib/docs-content"
import {
    FileJson,
    Cpu,
    Terminal,
    ArrowRightLeft,
    ExternalLink
} from "lucide-react"
import Link from "next/link"

type SupportedLang = "express" | "flask" | "go"

const langMeta = {
    express: {
        name: "Express (Node.js)",
        icon: FileJson,
        intro: "In Express, you're used to middleware, shared services, and Redis for fast state. To migrate to Solana, you'll shift from 'Server-Side Logic' to 'On-Chain Instructions' and from 'Centralized DBs' to 'Account-Based State'.",
        keyShift: "Middleware → Account Constraints"
    },
    flask: {
        name: "Flask (Python)",
        icon: Cpu,
        intro: "Flask developers typically rely on SQLAlchemy models and session-based auth. Moving to Solana means replacing ORM models with Anchor Account structs and using Ed25519 signatures instead of JWTs.",
        keyShift: "SQLAlchemy → Anchor Structs"
    },
    go: {
        name: "Go (Golang)",
        icon: Terminal,
        intro: "Go's strengths in concurrency and strong typing map well to Solana. You'll transition from Go Structs/Interfaces to Rust-based Account definitions and use Cross-Program Invocations (CPI) where you'd normally use microservice calls.",
        keyShift: "Interfaces → CPI Calls"
    }
}

export default async function DocLangPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang: rawLang } = await params
    const lang = rawLang as SupportedLang
    const meta = langMeta[lang]

    if (!meta) {
        return (
            <div className="flex min-h-screen bg-black overflow-hidden">
                <DocsSidebar />
                <main className="flex-grow p-12 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-outfit font-black uppercase tracking-tighter shadow-2xl">Guide Coming Soon</h1>
                        <p className="text-gray-500 max-w-md mx-auto">We're currently drafting the migration guide for this stack. Check back shortly!</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-black overflow-hidden">
            <DocsSidebar />

            <main className="flex-grow p-8 lg:p-12 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-16 pb-24">
                    {/* Header */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#00f0ff]/10 flex items-center justify-center">
                                <meta.icon className="h-6 w-6 text-[#00f0ff]" />
                            </div>
                            <span className="text-[#00f0ff] font-outfit font-black text-sm tracking-[0.3em] uppercase">
                                Migration Guide
                            </span>
                        </div>
                        <h1 className="text-6xl font-outfit font-black uppercase leading-[1.1] tracking-tight">
                            Migrating <span className="text-[#00f0ff]">{meta.name}</span> <br />
                            <span className="text-white/20">to</span> <span className="text-white">Solana</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
                            {meta.intro}
                        </p>

                        <div className="p-4 bg-[#0a0a0a] border border-[#00f0ff]/20 rounded-2xl inline-flex items-center gap-3">
                            <ArrowRightLeft className="h-4 w-4 text-[#00f0ff]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#00f0ff]">The Key Shift:</span>
                            <span className="text-xs font-bold text-white">{meta.keyShift}</span>
                        </div>
                    </div>

                    {/* Pattern Guides */}
                    <div className="space-y-32">
                        {docsContent.map((patternDoc) => (
                            <div key={patternDoc.slug} id={patternDoc.slug} className="space-y-12 scroll-mt-24">
                                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 text-sm font-black border border-white/10">
                                            {patternDoc.slug.split('-').map(word => word[0]).join('').toUpperCase()}
                                        </div>
                                        <h2 className="text-4xl font-outfit font-black uppercase tracking-tight">{patternDoc.title}</h2>
                                    </div>

                                    <Link
                                        href={`/patterns/${patternDoc.slug}`}
                                        className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-[#00f0ff]/10 border border-white/10 hover:border-[#00f0ff]/30 rounded-xl transition-all duration-300"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-[#00f0ff]">View in Playground</span>
                                        <ExternalLink className="h-3 w-3 text-white/30 group-hover:text-[#00f0ff]" />
                                    </Link>
                                </div>

                                <div className="space-y-8">
                                    {patternDoc.steps[lang].map((step, idx) => (
                                        <ProcessStep
                                            key={idx}
                                            number={idx + 1}
                                            title={step.title}
                                            web2Title={step.web2Title}
                                            web2Desc={step.web2Desc}
                                            web2Code={step.web2Code}
                                            web2Lang={lang === 'express' ? 'javascript' : lang === 'flask' ? 'python' : 'go'}
                                            web3Title={step.web3Title}
                                            web3Desc={step.web3Desc}
                                            web3Code={step.web3Code}
                                            notes={step.notes}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
