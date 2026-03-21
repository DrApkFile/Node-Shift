"use client"

import { cn } from "@/lib/utils"
import { ArrowRight, MoveRight, HelpCircle } from "lucide-react"
import { CodeBlock } from "@/components/patterns/CodeBlock"

interface ProcessStepProps {
    number: number
    title: string
    web2Title: string
    web2Desc: string
    web2Code?: string
    web2Lang?: string
    web3Title: string
    web3Desc: string
    web3Code?: string
    notes?: string
}

export function ProcessStep({
    number,
    title,
    web2Title,
    web2Desc,
    web2Code,
    web2Lang = "javascript",
    web3Title,
    web3Desc,
    web3Code,
    notes
}: ProcessStepProps) {
    return (
        <div className="group relative pl-12 pb-12 last:pb-0">
            {/* Connector Line */}
            <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-[#00f0ff]/30 to-transparent group-last:hidden" />

            {/* Number Badge */}
            <div className="absolute left-0 top-0 h-10 w-10 rounded-xl bg-[#0a0a0a] border border-[#00f0ff]/20 flex items-center justify-center text-[#00f0ff] font-outfit font-black text-sm shadow-[0_0_15px_rgba(0,240,255,0.1)] group-hover:border-[#00f0ff]/50 transition-all duration-500">
                {number}
            </div>

            <div className="space-y-6">
                <h3 className="text-2xl font-outfit font-black uppercase text-white tracking-tight group-hover:text-[#00f0ff] transition-colors">
                    {title}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                    {/* Arrow Overlay for desktop */}
                    <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black border border-white/10 items-center justify-center">
                        <MoveRight className="h-4 w-4 text-[#00f0ff]" />
                    </div>

                    {/* Web2 Action */}
                    <div className="p-6 bg-[#050505] border border-white/5 rounded-2xl space-y-3 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Web2 Process</span>
                        </div>
                        <h4 className="font-bold text-white text-sm">{web2Title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed italic">
                            {web2Desc}
                        </p>
                        {web2Code && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <CodeBlock
                                    code={web2Code}
                                    language={web2Lang}
                                    hideHeader
                                />
                            </div>
                        )}
                    </div>

                    {/* Web3 Shift */}
                    <div className="p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/10 rounded-2xl space-y-3 hover:bg-[#00f0ff]/10 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00f0ff]">Solana Shift</span>
                        </div>
                        <h4 className="font-bold text-[#00f0ff] text-sm">{web3Title}</h4>
                        <p className="text-xs text-[#00f0ff]/80 leading-relaxed font-medium">
                            {web3Desc}
                        </p>
                        {web3Code && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-[#00f0ff]/20">
                                <CodeBlock
                                    code={web3Code}
                                    language="rust"
                                    hideHeader
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Conceptual Note */}
                {notes && (
                    <div className="flex gap-3 p-4 bg-white/5 rounded-xl border-l border-white/20 items-start">
                        <HelpCircle className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-gray-500 italic leading-relaxed">
                            <span className="text-gray-300 font-bold not-italic font-outfit uppercase tracking-widest mr-2">The Insight:</span>
                            {notes}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
