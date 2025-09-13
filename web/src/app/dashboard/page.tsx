'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ActionCards } from '@/components/dashboard/ActionCards'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { api } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [studyStats, setStudyStats] = useState<any>(null)
  const [wordStats, setWordStats] = useState<any>(null)
  const [studyProgress, setStudyProgress] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<{
    show: boolean
    message: string
    progress: number
  }>({ show: false, message: '', progress: 0 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch all required data
        const [stats, words, progress] = await Promise.all([
          api.getStudyStats().catch(() => null),
          api.getWordStats().catch(() => null),
          api.getStudyProgress(7).catch(() => null)
        ])

        setStudyStats(stats)
        setWordStats(words)
        setStudyProgress(progress)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const allowedTypes = ['.csv', '.tsv', '.json']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(fileExtension)) {
      alert('请上传 CSV、TSV 或 JSON 格式的文件')
      return
    }

    try {
      setUploadProgress({ show: true, message: '正在上传文件...', progress: 0 })
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 100)

      const result = await api.uploadWords(file)
      
      clearInterval(progressInterval)
      setUploadProgress({ show: true, message: '上传成功！正在处理...', progress: 100 })
      
      // Wait a bit then redirect to wordbooks page
      setTimeout(() => {
        setUploadProgress({ show: false, message: '', progress: 0 })
        router.push('/wordbooks')
      }, 1500)
      
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadProgress({ show: false, message: '', progress: 0 })
      alert('文件上传失败，请稍后重试')
    }
  }

  const formatStatsData = () => {
    if (!studyStats || !wordStats || !studyProgress) {
      return {
        totalWords: 0,
        studiedToday: 0,
        accuracy: 0,
        streak: 0,
        weeklyProgress: [],
        categoryStats: []
      }
    }

    return {
      totalWords: wordStats.total_words || 0,
      studiedToday: studyStats.today.reviewed_today || 0,
      accuracy: studyStats.recommendations?.estimated_time_minutes ? 85 : 0, // Mock accuracy
      streak: 5, // Mock streak data
      weeklyProgress: studyProgress.daily_data?.map((day: any, index: number) => ({
        day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index] || day.date,
        count: day.reviews || 0
      })) || [],
      categoryStats: Object.entries(wordStats.by_cefr || {}).map(([level, count]: [string, any]) => ({
        name: level,
        count: count,
        color: {
          'A1': '#10B981',
          'A2': '#3B82F6', 
          'B1': '#F59E0B',
          'B2': '#EF4444',
          'C1': '#8B5CF6',
          'C2': '#EC4899'
        }[level] || '#6B7280'
      }))
    }
  }

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold text-foreground">
          <span className="gradient-text">仪表板</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          欢迎回到 WordFlow，让我们继续您的法语学习之旅
        </p>
      </motion.div>

      {/* Upload Progress Overlay */}
      {uploadProgress.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="bg-card p-6 rounded-2xl border border-border shadow-lg max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                />
              </div>
              <p className="text-foreground font-medium mb-2">{uploadProgress.message}</p>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {uploadProgress.progress}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Cards */}
      <ActionCards 
        studyQueueSize={studyStats?.today?.study_queue_size}
        onFileUpload={handleFileUpload}
      />

      {/* Stats Cards */}
      <StatsCards 
        data={formatStatsData()}
        isLoading={isLoading}
      />

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-primary/10 via-accent-pink/5 to-accent-green/10 rounded-2xl p-6 border border-primary/20"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">💡</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">学习小贴士</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              每天坚持复习 15-20 分钟效果最佳。建议在早晨或睡前进行学习，
              这样可以提高记忆效果。记得使用间隔重复系统来巩固学习成果！
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}