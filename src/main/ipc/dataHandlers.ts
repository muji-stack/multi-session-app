import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import { getAllAccounts, createAccount } from '../database/accountRepository'
import { getAllGroups, createGroup } from '../database/groupRepository'
import type { Account, Group } from '../../shared/types'

interface ExportData {
  version: string
  exportedAt: number
  accounts: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[]
  groups: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>[]
}

interface ImportResult {
  success: boolean
  accountsImported: number
  groupsImported: number
  errors: string[]
}

export function registerDataHandlers(): void {
  // Export accounts and groups to JSON file
  ipcMain.handle('data:export', async (_event) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: 'No window found' }

    const result = await dialog.showSaveDialog(win, {
      title: 'データをエクスポート',
      defaultPath: `multisession-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true }
    }

    try {
      const accounts = getAllAccounts()
      const groups = getAllGroups()

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: Date.now(),
        accounts: accounts.map((a) => ({
          username: a.username,
          displayName: a.displayName,
          profileImage: a.profileImage,
          groupId: a.groupId,
          proxyId: a.proxyId,
          memo: a.memo,
          status: a.status,
          searchBanStatus: a.searchBanStatus,
          lastCheckedAt: a.lastCheckedAt,
          sortOrder: a.sortOrder
        })),
        groups: groups.map((g) => ({
          name: g.name,
          color: g.color,
          sortOrder: g.sortOrder
        }))
      }

      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')

      return {
        success: true,
        filePath: result.filePath,
        accountsExported: accounts.length,
        groupsExported: groups.length
      }
    } catch (error) {
      console.error('Failed to export data:', error)
      return { success: false, error: String(error) }
    }
  })

  // Import accounts and groups from JSON file
  ipcMain.handle('data:import', async (_event) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, errors: ['No window found'] }

    const result = await dialog.showOpenDialog(win, {
      title: 'データをインポート',
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    const filePath = result.filePaths[0]
    const importResult: ImportResult = {
      success: false,
      accountsImported: 0,
      groupsImported: 0,
      errors: []
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const importData: ExportData = JSON.parse(fileContent)

      // Validate data structure
      if (!importData.version || !importData.accounts || !importData.groups) {
        importResult.errors.push('無効なファイル形式です')
        return importResult
      }

      // Get existing data to check for duplicates
      const existingAccounts = getAllAccounts()
      const existingGroups = getAllGroups()
      const existingUsernames = new Set(existingAccounts.map((a) => a.username.toLowerCase()))
      const existingGroupNames = new Set(existingGroups.map((g) => g.name.toLowerCase()))

      // Create a map for group name -> new group id
      const groupNameToId: Record<string, string> = {}

      // Import groups first
      for (const group of importData.groups) {
        if (existingGroupNames.has(group.name.toLowerCase())) {
          // Find existing group and use its ID
          const existing = existingGroups.find((g) => g.name.toLowerCase() === group.name.toLowerCase())
          if (existing) {
            groupNameToId[group.name] = existing.id
          }
          continue
        }

        try {
          const newGroup = createGroup(group.name, group.color)
          groupNameToId[group.name] = newGroup.id
          importResult.groupsImported++
        } catch (error) {
          importResult.errors.push(`グループ "${group.name}" のインポートに失敗: ${error}`)
        }
      }

      // Import accounts
      for (const account of importData.accounts) {
        if (existingUsernames.has(account.username.toLowerCase())) {
          importResult.errors.push(`アカウント "@${account.username}" は既に存在します`)
          continue
        }

        try {
          // Map old group reference to new group ID if applicable
          let newGroupId: string | null = null
          if (account.groupId) {
            // Find group by name from imported data
            const importedGroup = importData.groups.find((g) => {
              // We need to match by original groupId
              return true // Will be handled below
            })
            // For now, just skip group assignment for imported accounts
            // A more sophisticated approach would track group IDs properly
          }

          createAccount({
            username: account.username,
            displayName: account.displayName,
            profileImage: account.profileImage,
            groupId: newGroupId,
            proxyId: account.proxyId,
            memo: account.memo
          })
          importResult.accountsImported++
        } catch (error) {
          importResult.errors.push(`アカウント "@${account.username}" のインポートに失敗: ${error}`)
        }
      }

      importResult.success = true
      return importResult
    } catch (error) {
      console.error('Failed to import data:', error)
      importResult.errors.push(`ファイルの読み込みに失敗: ${error}`)
      return importResult
    }
  })

  // Export accounts to CSV
  ipcMain.handle('data:exportCSV', async (_event) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: 'No window found' }

    const result = await dialog.showSaveDialog(win, {
      title: 'アカウントをCSVエクスポート',
      defaultPath: `accounts-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true }
    }

    try {
      const accounts = getAllAccounts()
      const groups = getAllGroups()
      const groupMap = new Map(groups.map((g) => [g.id, g.name]))

      // CSV header
      const headers = ['username', 'displayName', 'status', 'searchBanStatus', 'group', 'memo', 'lastCheckedAt']
      const rows = [headers.join(',')]

      // CSV rows
      for (const account of accounts) {
        const row = [
          account.username,
          account.displayName || '',
          account.status,
          account.searchBanStatus,
          account.groupId ? groupMap.get(account.groupId) || '' : '',
          (account.memo || '').replace(/,/g, '，').replace(/\n/g, ' '),
          account.lastCheckedAt ? new Date(account.lastCheckedAt).toISOString() : ''
        ]
        rows.push(row.map((v) => `"${v}"`).join(','))
      }

      fs.writeFileSync(result.filePath, '\ufeff' + rows.join('\n'), 'utf-8') // BOM for Excel

      return {
        success: true,
        filePath: result.filePath,
        accountsExported: accounts.length
      }
    } catch (error) {
      console.error('Failed to export CSV:', error)
      return { success: false, error: String(error) }
    }
  })

  // Import accounts from CSV
  ipcMain.handle('data:importCSV', async (_event) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, errors: ['No window found'] }

    const result = await dialog.showOpenDialog(win, {
      title: 'アカウントをCSVインポート',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'Text Files', extensions: ['txt'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    const filePath = result.filePaths[0]
    const importResult: ImportResult = {
      success: false,
      accountsImported: 0,
      groupsImported: 0,
      errors: []
    }

    try {
      let fileContent = fs.readFileSync(filePath, 'utf-8')
      // Remove BOM if present
      if (fileContent.charCodeAt(0) === 0xFEFF) {
        fileContent = fileContent.slice(1)
      }

      const lines = fileContent.trim().split(/\r?\n/)
      if (lines.length < 2) {
        importResult.errors.push('CSVファイルにデータがありません')
        return importResult
      }

      // Get existing accounts to check for duplicates
      const existingAccounts = getAllAccounts()
      const existingUsernames = new Set(existingAccounts.map((a) => a.username.toLowerCase()))

      // Parse header
      const headers = parseCSVLine(lines[0])
      const usernameIndex = headers.findIndex((h) => h.toLowerCase() === 'username')
      const memoIndex = headers.findIndex((h) => h.toLowerCase() === 'memo')

      if (usernameIndex === -1) {
        importResult.errors.push('CSVにusername列がありません')
        return importResult
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const username = values[usernameIndex]?.trim().replace(/^@/, '')

        if (!username) {
          continue
        }

        if (existingUsernames.has(username.toLowerCase())) {
          importResult.errors.push(`アカウント "@${username}" は既に存在します`)
          continue
        }

        try {
          createAccount({
            username,
            memo: memoIndex >= 0 ? values[memoIndex] : undefined
          })
          importResult.accountsImported++
          existingUsernames.add(username.toLowerCase())
        } catch (error) {
          importResult.errors.push(`アカウント "@${username}" のインポートに失敗: ${error}`)
        }
      }

      importResult.success = true
      return importResult
    } catch (error) {
      console.error('Failed to import CSV:', error)
      importResult.errors.push(`ファイルの読み込みに失敗: ${error}`)
      return importResult
    }
  })
}

// Simple CSV line parser
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
