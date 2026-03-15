"use client"

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language: string
  title?: string
  hideHeader?: boolean
}

export function CodeBlock({ code, language, title, hideHeader = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "group relative overflow-hidden bg-[#1e1e1e] font-mono",
      !hideHeader && "rounded-xl border border-white/10"
    )}>
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
          <span className="text-[10px] font-outfit font-bold uppercase tracking-[0.2em] text-gray-500">
            {title || language}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={copyToClipboard}
            className="text-gray-500 hover:text-white"
          >
            {copied ? <Check className="h-3 w-3 text-[#00f0ff]" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      )}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={true}
          lineNumberStyle={{ minWidth: '3em', paddingRight: '1em', color: '#5a5a5a', textAlign: 'right' }}
          customStyle={{
            background: "transparent",
            padding: '1.5rem 1rem',
            margin: 0,
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          {code}
        </SyntaxHighlighter>
        {hideHeader && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={copyToClipboard}
            className="absolute top-4 right-4 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? <Check className="h-4 w-4 text-[#00f0ff]" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}
