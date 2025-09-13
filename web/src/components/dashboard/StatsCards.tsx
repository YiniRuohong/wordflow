'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  Zap,
  Brain
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatNumber, calculatePercentage } from '@/lib/utils'

interface StatsData {
  totalWords: number
  studiedToday: number
  accuracy: number
  streak: number
  weeklyProgress: Array<{ day: string; count: number }>
  categoryStats: Array<{ name: string; count: number; color: string }>
}

interface StatsCardsProps {
  data: StatsData
  isLoading?: boolean
}

const mockWeeklyData = [
  { day: '周一', count: 12 },
  { day: '周二', count: 8 },
  { day: '周三', count: 15 },
  { day: '周四', count: 20 },
  { day: '周五', count: 18 },
  { day: '周六', count: 10 },
  { day: '周日', count: 14 }
]

const mockCategoryData = [
  { name: 'A1', count: 45, color: '#10B981' },
  { name: 'A2', count: 32, color: '#3B82F6' },
  { name: 'B1', count: 28, color: '#F59E0B' },
  { name: 'B2', count: 15, color: '#EF4444' }
]

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  const stats = [
    {
      title: '总词汇量',
      value: data?.totalWords || 0,
      change: '+12',
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: '今日学习',
      value: data?.studiedToday || 0,
      change: '+5',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: '学习精度',
      value: `${data?.accuracy || 0}%`,
      change: '+2%',
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: '连续天数',
      value: `${data?.streak || 0}天`,
      change: '+1',
      icon: Award,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ]

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-48 bg-muted rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-48 bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.title} variants={cardVariants}>
              <Card hover className="group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-xl", stat.bgColor)}>
                      <Icon className={cn("w-5 h-5", stat.color)} />
                    </div>
                    <span className="text-xs text-green-500 font-medium bg-green-500/10 px-2 py-1 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {formatNumber(typeof stat.value === 'string' ? parseInt(stat.value) || 0 : stat.value)}
                      {typeof stat.value === 'string' && stat.value.includes('%') ? '%' : ''}
                      {typeof stat.value === 'string' && stat.value.includes('天') ? '天' : ''}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5 text-primary" />
                本周学习进度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.weeklyProgress || mockWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    className="hover:fill-primary/80"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Distribution */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                CEFR 等级分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data?.categoryStats || mockCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {(data?.categoryStats || mockCategoryData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4">
                {(data?.categoryStats || mockCategoryData).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Study Heatmap Placeholder */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              学习热力图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">学习热力图功能开发中...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}