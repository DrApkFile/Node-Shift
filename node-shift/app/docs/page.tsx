import Link from "next/link"
import { DocsSidebar } from "@/components/docs/DocsSidebar"
import {
    Zap,
    ShieldCheck,
    ArrowRight,
    Code2,
    Terminal,
    FileJson,
    Cpu,
    Layers
} from "lucide-react"

export default function DocsPage() {
    const languages = [
        { id: "express", name: "Express (Node.js)", icon: FileJson, description: "Map Node.js services and Redis caches to Solana PDAs." },
        { id: "flask", name: "Flask (Python)", icon: Cpu, description: "Transition from Python models to Anchor account structures." },
        { id: "go", name: "Go (Golang)", icon: Terminal, description: "Transform Go interfaces into on-chain program instructions." },
    ]

    return (
        <div className="flex min-h-screen bg-black overflow-hidden">
            <DocsSidebar />

            <main className="flex-grow p-8 lg:p-12 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-16">
                    {/* Hero Section */}
                    <div className="space-y-6">
                        <span className="text-[#00f0ff] font-outfit font-black text-sm tracking-[0.3em] uppercase">
                            Documentation
                        </span>
                        <h1 className="text-6xl md:text-8xl font-outfit font-black uppercase leading-none tracking-tight">
                            The <span className="text-gray-800">Migration</span> <br /> Guide
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
                            Translate your Web2 mental models into Solana's account-based paradigm. These guides provide side-by-side examples of mapping familiar frameworks to Anchor.
                        </p>
                    </div>

                    {/* Featured Guides */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {languages.map((lang) => (
                            <Link
                                key={lang.id}
                                href={`/docs/${lang.id}`}
                                className="group p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl hover:border-[#00f0ff]/20 transition-all hover:-translate-y-1"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-[#00f0ff]/10 transition-colors">
                                    <lang.icon className="h-6 w-6 text-[#00f0ff]" />
                                </div>
                                <h3 className="text-xl font-outfit font-black uppercase mb-2">{lang.name}</h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    {lang.description}
                                </p>
                                <div className="flex items-center gap-2 text-[#00f0ff] text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                                    Start Guide
                                    <ArrowRight className="h-3 w-3" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Quick Concepts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Zap className="h-5 w-5 text-[#00f0ff]" />
                                <h4 className="text-lg font-outfit font-black uppercase">Stateless vs State-Driven</h4>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                In Web2, your app is often stateless, and you persist data to a separate database. On Solana, the "database" is the ledger itself. Every action is a state transition on an account you define.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5 text-[#00f0ff]" />
                                <h4 className="text-lg font-outfit font-black uppercase">Permissioning by Design</h4>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                RBAC isn't just a middleware; it's baked into account ownership. If a user doesn't own an account, they can't sign for it—making security a first-class citizen of your architecture.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
