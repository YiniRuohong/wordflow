'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  BookOpen,
  Search,
  Library,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  badge?: number
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: '仪表板',
    icon: <Home size={20} />,
    path: '/'
  },
  {
    id: 'study',
    label: '开始学习',
    icon: <Zap size={20} />,
    path: '/study'
  },
  {
    id: 'search',
    label: '单词搜索',
    icon: <Search size={20} />,
    path: '/search'
  },
  {
    id: 'wordbooks',
    label: '词库管理',
    icon: <Library size={20} />,
    path: '/wordbooks'
  },
  {
    id: 'stats',
    label: '学习统计',
    icon: <BarChart3 size={20} />,
    path: '/stats'
  },
  {
    id: 'settings',
    label: '应用设置',
    icon: <Settings size={20} />,
    path: '/settings'
  }
]

interface SidebarProps {
  studyQueueSize?: number
}

export function Sidebar({ studyQueueSize }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleNavigation = (path: string) => {
    router.push(path)
    if (window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Add badge to study item
  const itemsWithBadges = navigationItems.map(item => ({
    ...item,
    badge: item.id === 'study' ? studyQueueSize : undefined
  }))

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 280 : 60 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full bg-background-secondary border-r border-border z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center">
                  <BookOpen size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold gradient-text">WordFlow</h1>
                  <p className="text-xs text-muted-foreground">智能法语学习</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpanded}
            className="h-8 w-8 hover:bg-muted"
          >
            {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {itemsWithBadges.map((item) => {
            const isActive = pathname === item.path
            
            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full justify-start h-12 relative group",
                    isActive && "bg-primary/10 text-primary border border-primary/20",
                    !isExpanded && "px-3"
                  )}
                >
                  {/* Icon Container */}
                  <div className="relative flex items-center justify-center w-5 h-5">
                    {item.icon}
                    {item.badge && item.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-accent-pink text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.div>
                    )}
                  </div>

                  {/* Label */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="ml-3 text-sm font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Tooltip for collapsed state */}
                  {!isExpanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-card text-card-foreground text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-card"></div>
                    </div>
                  )}

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Button>
              </motion.div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-xs text-muted-foreground mb-2">
                  WordFlow v1.0.0
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></div>
                  <span>系统正常运行</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  )
}