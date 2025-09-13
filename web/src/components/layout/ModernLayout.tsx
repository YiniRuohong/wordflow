'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/navigation/Sidebar'
import { api } from '@/lib/api'

interface ModernLayoutProps {
  children: React.ReactNode
}

export function ModernLayout({ children }: ModernLayoutProps) {
  const pathname = usePathname()
  const [studyStats, setStudyStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch study stats for badge
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await api.getStudyStats()
        setStudyStats(stats)
      } catch (error) {
        console.error('Failed to fetch study stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar studyQueueSize={studyStats?.today?.study_queue_size} />
      
      {/* Main Content */}
      <div className="pl-[60px] min-h-screen">
        {/* Content with page transitions */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
            className="p-6 lg:p-8 min-h-screen"
          >
            {!isLoading && children}
          </motion.main>
        </AnimatePresence>
      </div>
      
      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              />
              <p className="text-muted-foreground text-sm">加载中...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}