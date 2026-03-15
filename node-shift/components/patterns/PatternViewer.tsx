"use client"

import { useState, useMemo, useEffect } from "react"
import { Pattern, FolderNode, FileNode } from "@/lib/patterns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/patterns/CodeBlock"
import { MermaidDiagram } from "@/components/patterns/MermaidDiagram"
import { SolanaClient } from "@/components/patterns/SolanaClient"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, Folder, FileCode, Play, ExternalLink, Copy, Check, ChevronDown, ChevronRight, Wallet, Github } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PatternViewerProps {
  pattern: Pattern
}

export function PatternViewer({ pattern }: PatternViewerProps) {
  const [mode, setMode] = useState<"web2" | "web3">("web3")
  const [activeTab, setActiveTab] = useState("theory")
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // Sub-implementation state
  const [web2Lang, setWeb2Lang] = useState<Pattern["web2"]["implementations"][0]["name"]>("Node.js")
  const [web3Impl, setWeb3Impl] = useState<Pattern["web3"]["implementations"][0]["name"]>("Anchor")

  const currentImplementation = useMemo(() => {
    if (mode === "web2") {
      return pattern.web2.implementations.find(i => i.name === web2Lang) || pattern.web2.implementations[0]
    } else {
      const impl = pattern.web3.implementations.find(i => i.name === web3Impl) || pattern.web3.implementations[0]
      // Combine program folders with client folders for Web3
      return {
        ...impl,
        folders: [...impl.folders, ...pattern.web3.clientFolders]
      }
    }
  }, [mode, web2Lang, web3Impl, pattern])

  // Reset selected file when implementation changes
  useEffect(() => {
    const firstFolder = currentImplementation?.folders[0]
    if (firstFolder && firstFolder.files[0]) {
      setSelectedFile(firstFolder.files[0])
      setExpandedFolders([firstFolder.name])
    } else {
      setSelectedFile(null)
      setExpandedFolders([])
    }
  }, [currentImplementation])

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    )
  }

  const copyProgramId = () => {
    navigator.clipboard.writeText(pattern.web3.programId)
    setCopied(true)
    toast.success("Program ID copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans">
      {/* Top Header */}
      <div className="container mx-auto px-4 py-6 space-y-8">
        <Link href="/patterns" className="flex items-center gap-2 text-[#00f0ff] font-outfit font-bold text-xs uppercase tracking-widest hover:opacity-80 transition-opacity">
          <ChevronLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <span className="text-[#00f0ff] font-outfit font-black text-sm tracking-[0.3em] uppercase">
              {pattern.id}
            </span>
            <h1 className="text-6xl md:text-8xl font-outfit font-black uppercase leading-none tracking-tight">
              {pattern.title}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-4">
            {/* Mode Switch */}
            <div className="flex bg-[#111] border border-white/10 p-1 rounded-full">
              <button
                onClick={() => setMode("web2")}
                className={cn(
                  "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === "web2" ? "bg-[#00f0ff] text-black" : "text-gray-500 hover:text-white"
                )}
              >
                Web2
              </button>
              <button
                onClick={() => setMode("web3")}
                className={cn(
                  "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === "web3" ? "bg-[#00f0ff] text-black" : "text-gray-500 hover:text-white"
                )}
              >
                Web3
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                asChild
                className="h-10 border-white/10 text-white hover:bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest gap-2"
              >
                <a href={pattern.githubUrl} target="_blank">
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab("code")}
                className="h-10 border-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded-full text-xs font-bold uppercase tracking-widest gap-2"
              >
                <FileCode className="h-4 w-4" />
                View Source
              </Button>
              <Button
                onClick={() => setActiveTab("test")}
                className="h-10 bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90 rounded-full text-xs font-bold uppercase tracking-widest gap-2"
              >
                <Play className="h-4 w-4 fill-current" />
                View Live
              </Button>
            </div>
          </div>
        </div>

        {/* Implementation Selection Bar */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl">
          <p className="text-[10px] font-outfit font-black text-gray-500 uppercase tracking-widest mr-2">Implementation:</p>
          {mode === "web2" ? (
            <div className="flex flex-wrap gap-2">
              {["Node.js", "Python (FastAPI)", "Python (Flask)", "Java (Spring Boot)", "C# (.NET)", "Go"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setWeb2Lang(lang as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                    web2Lang === lang
                      ? "bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]"
                      : "bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {["Anchor", "Native Rust"].map((impl) => (
                <button
                  key={impl}
                  onClick={() => setWeb3Impl(impl as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                    web3Impl === impl
                      ? "bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]"
                      : "bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                  )}
                >
                  {impl}
                </button>
              ))}
            </div>
          )}
          {mode === "web3" && (
            <div className="ml-auto flex items-center gap-4 pl-4 border-l border-white/10">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Program ID</p>
                <div className="flex items-center gap-2">
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 group/id hover:border-[#00f0ff]/50 transition-all">
                    <code className="text-[10px] font-mono text-gray-400 group-hover/id:text-white transition-colors truncate max-w-[150px]">{pattern.web3.programId}</code>
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                      <button onClick={copyProgramId} className="text-gray-500 hover:text-[#00f0ff] transition-colors p-0.5" title="Copy Program ID">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                      {!pattern.web3.programId.includes("1111") && (
                        <Link
                          href={`https://explorer.solana.com/address/${pattern.web3.programId}?cluster=devnet`}
                          target="_blank"
                          className="text-gray-500 hover:text-[#00f0ff] transition-colors p-0.5"
                          title="View on Solana Explorer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="container mx-auto px-4 border-b border-white/5">
        <div className="flex gap-8 overflow-x-auto no-scrollbar">
          {["theory", "constraints", "trade-offs", "code", "test"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                activeTab === tab ? "text-[#00f0ff]" : "text-gray-500 hover:text-white"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00f0ff]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-grow container mx-auto px-4 py-8">
        {activeTab === "theory" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-8">
              <div className="prose prose-invert max-w-none">
                <h3 className="text-[#00f0ff] font-outfit font-black uppercase text-xl tracking-wider">Pattern Theory</h3>
                <p className="text-gray-300 text-lg leading-relaxed font-medium">{pattern.theory}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[#00f0ff] font-outfit font-black uppercase text-xl tracking-wider">Visual Flow</h3>
                {pattern.web3.diagram ? (
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 overflow-auto">
                    <MermaidDiagram chart={pattern.web3.diagram} />
                  </div>
                ) : (
                  <div className="h-40 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center italic text-gray-500">Diagram coming soon</div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00f0ff]">Architecture Overview</h4>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Exploring the {mode === 'web2' ? 'centralized' : 'decentralized'} implementation of {pattern.title}.
                  Switch between implementations to compare different technological approaches.
                </p>
                <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                  {pattern.tags.map(tag => (
                    <Badge key={tag} className="bg-white/5 border-white/10 text-gray-400 hover:text-white uppercase text-[9px] font-bold tracking-widest">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "constraints" && (
          <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
            <div className="prose prose-invert max-w-none">
              <h3 className="text-[#00f0ff] font-outfit font-black uppercase text-xl tracking-wider">Development Constraints</h3>
              <p className="text-gray-400 font-medium">Core constraints for {mode === 'web2' ? 'Web2' : 'Solana'} implementations:</p>
            </div>
            <ul className="space-y-4">
              {pattern.constraints.map((c, i) => (
                <li key={i} className="flex gap-4 p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl items-start group hover:border-[#00f0ff]/20 transition-all">
                  <div className="h-6 w-6 rounded-full bg-[#00f0ff]/10 flex items-center justify-center text-[#00f0ff] font-bold text-[10px] shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-gray-300 font-medium leading-relaxed">{c}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === "trade-offs" && (
          <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="prose prose-invert max-w-none mb-12 text-center">
              <h3 className="text-[#00f0ff] font-outfit font-black uppercase text-2xl tracking-widest mb-4">Implementation Report</h3>
              <p className="text-gray-400 text-lg">Detailed analysis of architectural differences between Web2 and Solana.</p>
            </div>

            <div className="space-y-12">
              {pattern.tradeoffs.map((t, i) => (
                <div key={i} className="group relative">
                  {/* Connection Line */}
                  {i !== pattern.tradeoffs.length - 1 && (
                    <div className="absolute left-6 top-16 bottom-0 w-px bg-gradient-to-b from-[#00f0ff]/20 to-transparent z-0" />
                  )}

                  <div className="relative z-10 flex gap-8">
                    {/* Number Indicator */}
                    <div className="h-12 w-12 rounded-2xl bg-[#111] border border-[#00f0ff]/20 flex items-center justify-center text-[#00f0ff] font-black text-sm shrink-0 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                      {String(i + 1).padStart(2, '0')}
                    </div>

                    <div className="flex-grow space-y-6 pb-12 border-b border-white/5">
                      <h4 className="text-2xl font-outfit font-black uppercase tracking-tight text-white group-hover:text-[#00f0ff] transition-colors">
                        {t.aspect}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Web2 Card */}
                        <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl space-y-3 hover:bg-[#111] transition-all">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gray-800 text-gray-400 text-[9px] font-black uppercase tracking-widest">Web2 Standard</Badge>
                          </div>
                          <p className="text-gray-300 leading-relaxed font-medium">
                            {t.web2}
                          </p>
                        </div>

                        {/* Solana Card */}
                        <div className="p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/10 rounded-2xl space-y-3 hover:bg-[#00f0ff]/10 transition-all">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#00f0ff]/20 text-[#00f0ff] text-[9px] font-black uppercase tracking-widest border border-[#00f0ff]/30">Solana On-Chain</Badge>
                          </div>
                          <p className="text-[#00f0ff] leading-relaxed font-semibold">
                            {t.solana}
                          </p>
                        </div>
                      </div>

                      {/* Analysis Note */}
                      <div className="flex items-start gap-3 p-4 bg-[#111]/50 rounded-xl border-l-2 border-[#00f0ff]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-0.5 shrink-0">Analysis:</div>
                        <p className="text-sm text-gray-400 italic leading-relaxed">
                          {t.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "code" && (
          <div className="h-[70vh] flex border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a] animate-in fade-in duration-500">
            {/* Sidebar / File Explorer */}
            <div className="w-64 flex flex-col border-r border-white/5 bg-[#050505]">
              <div className="p-4 border-b border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">File Explorer</p>
              </div>
              <div className="flex-grow overflow-y-auto p-2">
                {currentImplementation?.folders.map(folder => (
                  <div key={folder.name} className="space-y-1">
                    <button
                      onClick={() => toggleFolder(folder.name)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all"
                    >
                      {expandedFolders.includes(folder.name) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <Folder className="h-3.5 w-3.5 text-[#00f0ff]" />
                      {folder.name}
                    </button>
                    {expandedFolders.includes(folder.name) && (
                      <div className="ml-4 space-y-0.5 border-l border-white/5 pl-2">
                        {folder.files.map(file => (
                          <button
                            key={file.name}
                            onClick={() => setSelectedFile(file)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded transition-all text-left",
                              selectedFile?.name === file.name ? "bg-[#00f0ff]/10 text-[#00f0ff]" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            )}
                          >
                            <FileCode className="h-3.5 w-3.5" />
                            {file.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Code Panel */}
            <div className="flex-grow flex flex-col min-w-0">
              <div className="h-9 flex bg-[#050505] border-b border-white/5 px-4 items-center">
                {selectedFile && (
                  <div className="flex items-center gap-2 px-3 h-full border-r border-white/5 bg-[#0a0a0a] text-[#00f0ff] text-[10px] font-bold uppercase tracking-widest">
                    <FileCode className="h-3 w-3" />
                    {selectedFile.name}
                  </div>
                )}
              </div>
              <div className="flex-grow overflow-auto bg-[#0a0a0a]">
                {selectedFile ? (
                  <CodeBlock
                    code={`/// NodeShift ${pattern.title} - ${mode === 'web2' ? web2Lang : web3Impl}\n/// Built for Educational Purposes\n\n${selectedFile.content}`}
                    language={selectedFile.language}
                    hideHeader
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-600 italic text-sm">Select a file to view content</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "test" && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="prose prose-invert max-w-none mb-8 text-center">
              <h3 className="text-[#00f0ff] font-outfit font-black uppercase text-xl tracking-wider">Test & Interact</h3>
              <p className="text-gray-400 font-medium">Connect your wallet to interact with the simulated on-chain program for {pattern.title}.</p>
            </div>
            <SolanaClient pattern={pattern} />
          </div>
        )}
      </div>
    </div>
  )
}
