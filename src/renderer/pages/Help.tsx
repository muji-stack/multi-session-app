import { useState, useEffect, useMemo } from 'react'
import {
  HelpCircle,
  Search,
  ChevronRight,
  BookOpen,
  Users,
  Send,
  Heart,
  Shield,
  Zap,
  Settings,
  AlertTriangle,
  ExternalLink,
  X,
} from 'lucide-react'
import { documentation, searchDocs, DocCategory, DocSection } from '../docs'

// Icon mapping for categories
const categoryIcons: Record<string, React.ElementType> = {
  'getting-started': BookOpen,
  'account-management': Users,
  posting: Send,
  engagement: Heart,
  monitoring: Shield,
  automation: Zap,
  settings: Settings,
  troubleshooting: AlertTriangle,
}

// Simple markdown renderer
function renderMarkdown(content: string): JSX.Element {
  const lines = content.trim().split('\n')
  const elements: JSX.Element[] = []
  let inList = false
  let listItems: string[] = []
  let inTable = false
  let tableRows: string[][] = []
  let inCodeBlock = false
  let codeContent: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-gray-300">
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      )
      listItems = []
    }
    inList = false
  }

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0]
      const body = tableRows.slice(2) // Skip header and separator
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {header.map((cell, i) => (
                  <th key={i} className="text-left py-2 px-3 text-gray-300 font-medium">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 px-3 text-gray-400">
                      {renderInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
    }
    inTable = false
  }

  const flushCodeBlock = () => {
    if (codeContent.length > 0) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="bg-black/30 rounded-lg p-4 mb-4 overflow-x-auto text-sm text-gray-300 font-mono"
        >
          {codeContent.join('\n')}
        </pre>
      )
      codeContent = []
    }
    inCodeBlock = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock()
      } else {
        flushList()
        flushTable()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeContent.push(line)
      continue
    }

    // Empty line
    if (!line.trim()) {
      flushList()
      flushTable()
      continue
    }

    // Table
    if (line.includes('|')) {
      flushList()
      if (!inTable) inTable = true
      const cells = line.split('|').filter((c) => c.trim() !== '')
      tableRows.push(cells)
      continue
    }

    if (inTable) {
      flushTable()
    }

    // Headings
    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-xl font-semibold text-white mt-6 mb-3">
          {line.slice(3)}
        </h2>
      )
      continue
    }

    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg font-medium text-white mt-4 mb-2">
          {line.slice(4)}
        </h3>
      )
      continue
    }

    // Horizontal rule
    if (line.startsWith('---')) {
      flushList()
      elements.push(<hr key={`hr-${elements.length}`} className="border-white/10 my-6" />)
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList()
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="border-l-4 border-primary-500/50 pl-4 py-2 mb-4 text-gray-400 bg-primary-500/5 rounded-r-lg"
        >
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>
      )
      continue
    }

    // List item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      inList = true
      listItems.push(line.slice(2))
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      if (!inList) {
        flushList()
        inList = true
      }
      listItems.push(line.replace(/^\d+\.\s/, ''))
      continue
    }

    // Paragraph
    flushList()
    elements.push(
      <p key={`p-${elements.length}`} className="text-gray-300 mb-4 leading-relaxed">
        {renderInlineMarkdown(line)}
      </p>
    )
  }

  flushList()
  flushTable()
  flushCodeBlock()

  return <>{elements}</>
}

// Render inline markdown (bold, code, links)
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/)

    if (boldMatch && (!codeMatch || remaining.indexOf(boldMatch[0]) < remaining.indexOf(codeMatch[0]))) {
      const index = remaining.indexOf(boldMatch[0])
      if (index > 0) {
        parts.push(remaining.slice(0, index))
      }
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {boldMatch[1]}
        </strong>
      )
      remaining = remaining.slice(index + boldMatch[0].length)
    } else if (codeMatch) {
      const index = remaining.indexOf(codeMatch[0])
      if (index > 0) {
        parts.push(remaining.slice(0, index))
      }
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-white/10 rounded text-primary-300 text-sm font-mono">
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(index + codeMatch[0].length)
    } else {
      parts.push(remaining)
      break
    }
  }

  return <>{parts}</>
}

function Help(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(documentation[0]?.id || '')
  const [selectedSection, setSelectedSection] = useState<string>(documentation[0]?.sections[0]?.id || '')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Search results
  const searchResults = useMemo(() => {
    return searchDocs(searchQuery)
  }, [searchQuery])

  // Current content
  const currentCategory = documentation.find((c) => c.id === selectedCategory)
  const currentSection = currentCategory?.sections.find((s) => s.id === selectedSection)

  // Handle search result click
  const handleSearchResultClick = (categoryId: string, sectionId: string) => {
    setSelectedCategory(categoryId)
    setSelectedSection(sectionId)
    setSearchQuery('')
  }

  // Update selected section when category changes
  useEffect(() => {
    const category = documentation.find((c) => c.id === selectedCategory)
    if (category && category.sections.length > 0) {
      setSelectedSection(category.sections[0].id)
    }
  }, [selectedCategory])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <HelpCircle size={20} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">ヘルプ</h1>
            <p className="text-gray-400 text-sm">使い方ガイド・マニュアル</p>
          </div>
        </div>

        <a
          href="https://multisession.app/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors text-sm"
        >
          <ExternalLink size={16} />
          オンラインドキュメント
        </a>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-72 bg-surface-dark border-r border-white/10 overflow-y-auto absolute lg:relative z-10 h-full`}
        >
          {/* Search */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ドキュメントを検索..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-white/5 border border-white/10">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.category.id}-${result.section.id}-${index}`}
                    onClick={() => handleSearchResultClick(result.category.id, result.section.id)}
                    className="w-full text-left p-3 hover:bg-white/5 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">{result.category.title}</span>
                      <ChevronRight size={12} className="text-gray-600" />
                      <span className="text-white">{result.section.title}</span>
                    </div>
                    {result.matches.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{result.matches[0]}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 text-center py-4">検索結果がありません</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {documentation.map((category) => {
              const Icon = categoryIcons[category.id] || BookOpen
              const isActive = selectedCategory === category.id

              return (
                <div key={category.id}>
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{category.title}</span>
                    <ChevronRight
                      size={16}
                      className={`ml-auto transition-transform ${isActive ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Subsections */}
                  {isActive && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {category.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => {
                            setSelectedSection(section.id)
                            setIsMobileMenuOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedSection === section.id
                              ? 'bg-white/10 text-white'
                              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                          }`}
                        >
                          {section.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden fixed bottom-4 right-4 z-20 p-4 bg-primary-600 text-white rounded-full shadow-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <BookOpen size={24} />}
        </button>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {currentSection ? (
            <div className="max-w-3xl">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <span>{currentCategory?.title}</span>
                <ChevronRight size={14} />
                <span className="text-gray-300">{currentSection.title}</span>
              </div>

              {/* Content */}
              <article className="prose prose-invert max-w-none">
                {renderMarkdown(currentSection.content)}
              </article>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/10">
                {/* Previous */}
                {(() => {
                  const sections = currentCategory?.sections || []
                  const currentIndex = sections.findIndex((s) => s.id === selectedSection)
                  if (currentIndex > 0) {
                    const prev = sections[currentIndex - 1]
                    return (
                      <button
                        onClick={() => setSelectedSection(prev.id)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronRight size={18} className="rotate-180" />
                        <span>{prev.title}</span>
                      </button>
                    )
                  }
                  return <div />
                })()}

                {/* Next */}
                {(() => {
                  const sections = currentCategory?.sections || []
                  const currentIndex = sections.findIndex((s) => s.id === selectedSection)
                  if (currentIndex < sections.length - 1) {
                    const next = sections[currentIndex + 1]
                    return (
                      <button
                        onClick={() => setSelectedSection(next.id)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <span>{next.title}</span>
                        <ChevronRight size={18} />
                      </button>
                    )
                  }
                  return <div />
                })()}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              左のメニューからトピックを選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Help
