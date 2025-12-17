import { create } from 'zustand'
import type { Group } from '../../shared/types'

interface GroupState {
  groups: Group[]
  isLoading: boolean

  fetchGroups: () => Promise<void>
  createGroup: (name: string, color?: string) => Promise<Group>
  updateGroup: (id: string, updates: { name?: string; color?: string }) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  getGroupById: (id: string) => Group | undefined
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  isLoading: false,

  fetchGroups: async (): Promise<void> => {
    set({ isLoading: true })
    try {
      const groups = (await window.api.group.getAll()) as Group[]
      set({ groups })
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createGroup: async (name: string, color?: string): Promise<Group> => {
    try {
      const group = (await window.api.group.create(name, color)) as Group
      set((state) => ({ groups: [...state.groups, group] }))
      return group
    } catch (error) {
      console.error('Failed to create group:', error)
      throw error
    }
  },

  updateGroup: async (id: string, updates: { name?: string; color?: string }): Promise<void> => {
    try {
      const group = (await window.api.group.update(id, updates)) as Group | null
      if (group) {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? group : g))
        }))
      }
    } catch (error) {
      console.error('Failed to update group:', error)
      throw error
    }
  },

  deleteGroup: async (id: string): Promise<void> => {
    try {
      await window.api.group.delete(id)
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id)
      }))
    } catch (error) {
      console.error('Failed to delete group:', error)
      throw error
    }
  },

  getGroupById: (id: string): Group | undefined => {
    return get().groups.find((g) => g.id === id)
  }
}))
