"use client"

import { useEffect, useRef } from "react"
import mermaid from "mermaid"

mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
  securityLevel: "loose",
  themeVariables: {
    primaryColor: "#0070f3",
    primaryTextColor: "#fff",
    primaryBorderColor: "#0070f3",
    lineColor: "#333",
    secondaryColor: "#00c2ff",
    tertiaryColor: "#111",
  },
})

interface MermaidDiagramProps {
  chart: string
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      mermaid.contentLoaded()
    }
  }, [chart])

  return (
    <div className="mermaid flex justify-center py-8" ref={ref}>
      {chart}
    </div>
  )
}
