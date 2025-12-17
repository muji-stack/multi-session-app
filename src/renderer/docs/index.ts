// Documentation Index
import { gettingStarted } from './getting-started'
import { accountManagement } from './account-management'
import { posting } from './posting'
import { engagement } from './engagement'
import { monitoring } from './monitoring'
import { automation } from './automation'
import { settings } from './settings'
import { troubleshooting } from './troubleshooting'

export interface DocSection {
  id: string
  title: string
  content: string
}

export interface DocCategory {
  id: string
  title: string
  sections: DocSection[]
}

export const documentation: DocCategory[] = [
  gettingStarted,
  accountManagement,
  posting,
  engagement,
  monitoring,
  automation,
  settings,
  troubleshooting,
]

// Search function
export function searchDocs(query: string): Array<{
  category: DocCategory
  section: DocSection
  matches: string[]
}> {
  if (!query.trim()) return []

  const normalizedQuery = query.toLowerCase()
  const results: Array<{
    category: DocCategory
    section: DocSection
    matches: string[]
  }> = []

  for (const category of documentation) {
    for (const section of category.sections) {
      const titleMatch = section.title.toLowerCase().includes(normalizedQuery)
      const contentMatch = section.content.toLowerCase().includes(normalizedQuery)

      if (titleMatch || contentMatch) {
        // Extract matching context
        const matches: string[] = []

        if (titleMatch) {
          matches.push(section.title)
        }

        if (contentMatch) {
          // Find matching lines
          const lines = section.content.split('\n')
          for (const line of lines) {
            if (line.toLowerCase().includes(normalizedQuery) && line.trim()) {
              // Clean up markdown and limit length
              const cleanLine = line
                .replace(/#{1,6}\s/g, '')
                .replace(/\*\*/g, '')
                .replace(/`/g, '')
                .trim()
              if (cleanLine && !matches.includes(cleanLine)) {
                matches.push(cleanLine.slice(0, 100) + (cleanLine.length > 100 ? '...' : ''))
              }
            }
          }
        }

        results.push({
          category,
          section,
          matches: matches.slice(0, 3), // Limit to 3 matches
        })
      }
    }
  }

  return results
}

// Get all sections flat
export function getAllSections(): Array<{
  category: DocCategory
  section: DocSection
}> {
  const result: Array<{ category: DocCategory; section: DocSection }> = []

  for (const category of documentation) {
    for (const section of category.sections) {
      result.push({ category, section })
    }
  }

  return result
}
