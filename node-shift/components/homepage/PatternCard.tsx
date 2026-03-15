"use client"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink, Copy, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Pattern } from "@/lib/patterns"

interface PatternCardProps {
  pattern: Pattern
}

export function PatternCard({ pattern }: PatternCardProps) {
  return (
    <Card className="group relative overflow-hidden bg-white/5 border-white/10 hover:border-primary/50 transition-all duration-500 backdrop-blur-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {pattern.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-white/5 text-gray-400 border-white/5 text-[9px] uppercase tracking-wider font-outfit font-bold">
              {tag}
            </Badge>
          ))}
        </div>
        <CardTitle className="font-outfit text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors">
          {pattern.title}
        </CardTitle>
        <CardDescription className="text-gray-400 font-medium line-clamp-2 min-h-[40px]">
          {pattern.description}
        </CardDescription>

        {/* Program ID Badge */}
        <div className="pt-2">
          <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-2 group/id hover:border-primary/30 transition-all">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Program ID</span>
              <code className="text-[10px] font-mono text-gray-400 group-hover/id:text-white transition-colors truncate max-w-[120px]">
                {pattern.web3.programId}
              </code>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(pattern.web3.programId);
                  toast.success("Program ID copied");
                }}
                className="p-1.5 text-gray-500 hover:text-primary transition-colors"
                title="Copy Program ID"
              >
                <Copy className="h-3 w-3" />
              </button>
              {!pattern.web3.programId.includes("1111") && (
                <Link
                  href={`https://explorer.solana.com/address/${pattern.web3.programId}?cluster=devnet`}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-500 hover:text-primary transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-4 border-t border-white/5">
        <Button variant="ghost" className="w-full justify-between text-xs font-outfit font-bold uppercase tracking-[0.2em] group/btn hover:bg-primary/10 hover:text-primary transition-all px-0" asChild>
          <Link href={`/patterns/${pattern.slug}`}>
            Learn More
            <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardFooter>
      {/* Subtle glow effect on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-cyan-400/20 blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 -z-10" />
    </Card>
  )
}
