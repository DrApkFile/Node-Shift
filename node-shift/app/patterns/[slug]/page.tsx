import { patterns } from "@/lib/patterns"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { PatternViewer } from "@/components/patterns/PatternViewer"

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PatternPage({ params }: PageProps) {
  const { slug } = await params;
  const pattern = patterns.find((p) => p.slug === slug)

  if (!pattern) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <PatternViewer pattern={pattern} />
      <Footer />
    </div>
  )
}

export async function generateStaticParams() {
  return patterns.map((pattern) => ({
    slug: pattern.slug,
  }))
}
