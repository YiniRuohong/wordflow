'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Zap,
  Library,
  Search,
  Upload,
  ChevronRight,
  BookOpen,
  Target,
  FileText
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActionCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  gradient: string
  path?: string
  onClick?: () => void
  badge?: number
}

interface ActionCardsProps {
  studyQueueSize?: number
  onFileUpload?: (files: FileList) => void
}

export function ActionCards({ studyQueueSize, onFileUpload }: ActionCardsProps) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)

  const actionCards: ActionCard[] = [
    {
      id: 'study',
      title: '开始学习',
      description: studyQueueSize ? `${studyQueueSize} 个单词等待复习` : '暂无待复习单词',
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-blue-500 to-purple-600',
      path: '/study',
      badge: studyQueueSize
    },
    {
      id: 'wordbooks',
      title: '词库管理',
      description: '管理词库、导入新单词',
      icon: <Library className="w-8 h-8" />,
      gradient: 'from-green-500 to-teal-600',
      path: '/wordbooks'
    },
    {
      id: 'search',
      title: '单词搜索',
      description: '快速查找和浏览单词',
      icon: <Search className="w-8 h-8" />,
      gradient: 'from-orange-500 to-red-600',
      path: '/search'
    }
  ]

  const handleCardClick = (card: ActionCard) => {
    if (card.onClick) {
      card.onClick()
    } else if (card.path) {
      router.push(card.path)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0 && onFileUpload) {
      onFileUpload(files)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-6">
      {/* Action Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {actionCards.map((card) => (
          <motion.div key={card.id} variants={cardVariants}>
            <Card
              hover
              className="group cursor-pointer overflow-hidden"
              onClick={() => handleCardClick(card)}
            >
              <CardContent className="p-0">
                {/* Gradient Header */}
                <div className={cn(
                  "h-32 bg-gradient-to-br relative overflow-hidden",
                  card.gradient
                )}>
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full" />
                    <div className="absolute bottom-2 left-4 w-12 h-12 bg-white/10 rounded-full" />
                  </div>
                  
                  {/* Icon */}
                  <div className="absolute top-6 left-6 text-white">
                    {card.icon}
                  </div>
                  
                  {/* Badge */}
                  {card.badge && card.badge > 0 && (
                    <div className="absolute top-4 right-4 bg-white/90 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                      {card.badge}
                    </div>
                  )}
                  
                  {/* Arrow */}
                  <div className="absolute bottom-4 right-6 text-white opacity-60 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Drag & Drop Upload Zone */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
      >
        <Card
          className={cn(
            "border-2 border-dashed transition-all duration-300",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-8">
            <div className="text-center">
              <motion.div
                animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
                className="mb-4"
              >
                <Upload className={cn(
                  "w-12 h-12 mx-auto transition-colors",
                  dragOver ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>
              
              <h3 className="text-lg font-semibold mb-2">快速导入单词</h3>
              <p className="text-muted-foreground text-sm mb-4">
                拖拽 CSV、TSV 或 JSON 文件到此区域快速导入
              </p>
              
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>CSV</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>TSV</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>JSON</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => router.push('/wordbooks')}
              >
                或前往词库管理
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}