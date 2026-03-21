"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    BookOpen,
    Code2,
    Zap,
    Terminal,
    FileJson,
    Cpu,
    Layers,
    ChevronRight,
    Info
} from "lucide-react"

const languages = [
    { id: "express", name: "Express (Node.js)", icon: FileJson, color: "#00f0ff" },
    { id: "flask", name: "Flask (Python)", icon: Cpu, color: "#00f0ff" },
    { id: "go", name: "Go (Golang)", icon: Terminal, color: "#00f0ff" },
    { id: "dotnet", name: "C# (.NET)", icon: Code2, color: "gray", comingSoon: true },
    { id: "springboot", name: "Spring Boot", icon: Layers, color: "gray", comingSoon: true },
    { id: "fastapi", name: "FastAPI", icon: Zap, color: "gray", comingSoon: true },
]

export function DocsSidebar() {
    const pathname = usePathname()

    return (
        <div className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl h-screen sticky top-0 overflow-y-auto hidden lg:block">
            <div className="p-6">
                <Link href="/docs" className="flex items-center gap-3 mb-8 group">
                    <BookOpen className="h-6 w-6 text-[#00f0ff] group-hover:scale-110 transition-transform" />
                    <span className="font-outfit font-black uppercase tracking-tighter text-xl">Docs</span>
                </Link>

                <div className="space-y-8">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 px-2">Getting Started</h4>
                        <div className="space-y-1">
                            <Link
                                href="/docs"
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                    pathname === "/docs" ? "bg-[#00f0ff]/10 text-[#00f0ff]" : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Info className="h-3.5 w-3.5" />
                                Introduction
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 px-2">Migration Guides</h4>
                        <div className="space-y-1">
                            {languages.map((lang) => (
                                <Link
                                    key={lang.id}
                                    href={`/docs/${lang.id}`}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all group",
                                        pathname === `/docs/${lang.id}`
                                            ? "bg-[#00f0ff]/10 text-[#00f0ff]"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <lang.icon className={cn("h-3.5 w-3.5", pathname === `/docs/${lang.id}` ? "text-[#00f0ff]" : "text-gray-500")} />
                                        {lang.name}
                                    </div>
                                    {lang.comingSoon ? (
                                        <span className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded uppercase">Soon</span>
                                    ) : (
                                        <ChevronRight className={cn("h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity", pathname === `/docs/${lang.id}` && "opacity-100")} />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
