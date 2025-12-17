import { ReactNode, useState, createContext, useContext } from 'react'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
}

interface TabsContextType {
  activeTab: string
  setActiveTab: (id: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (id: string) => void
  children: ReactNode
}

interface TabPanelProps {
  id: string
  children: ReactNode
}

function Tabs({ tabs, defaultTab, onChange, children }: TabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  const handleTabChange = (id: string): void => {
    setActiveTab(id)
    onChange?.(id)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div>
        {/* Tab List */}
        <div className="flex gap-1 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-white/20'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="mt-4">{children}</div>
      </div>
    </TabsContext.Provider>
  )
}

function TabPanel({ id, children }: TabPanelProps): JSX.Element | null {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('TabPanel must be used within Tabs')
  }

  if (context.activeTab !== id) return null

  return <div>{children}</div>
}

export { Tabs, TabPanel }
export default Tabs
