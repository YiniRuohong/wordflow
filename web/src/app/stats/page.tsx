'use client'
import React, { useState, useMemo } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  LinearProgress,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import {
  Analytics,
  TrendingUp,
  School,
  Timer,
  EmojiEvents,
  CalendarToday,
  Assessment,
  LocalFireDepartment,
  BookmarkBorder,
  Refresh,
  Download,
  Insights
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts'

import { TypewriterText, FadeInWords } from '@/components/animations/TypewriterText'
import { api, StudyStats, StudyProgress } from '@/lib/api'

interface StatCard {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactElement
  color: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

interface LearningStreak {
  current_streak: number
  longest_streak: number
  last_study_date: string
}

export default function StatsPage() {
  const [timeRange, setTimeRange] = useState<number>(30)
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area')

  // 获取学习统计
  const { data: studyStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<StudyStats>({
    queryKey: ['studyStats'],
    queryFn: () => api.getStudyStats(),
  })

  // 获取学习进度
  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery<StudyProgress>({
    queryKey: ['studyProgress', timeRange],
    queryFn: () => api.getStudyProgress(timeRange),
  })

  // 获取单词统计
  const { data: wordStats, refetch: refetchWordStats } = useQuery({
    queryKey: ['wordStats'],
    queryFn: () => api.getWordStats(),
  })

  // 学习连续性数据（模拟）
  const learningStreak: LearningStreak = useMemo(() => ({
    current_streak: 12,
    longest_streak: 45,
    last_study_date: new Date().toISOString()
  }), [])

  // 刷新所有数据
  const handleRefreshAll = () => {
    refetchStats()
    refetchProgress()
    refetchWordStats()
  }

  // 统计卡片数据
  const statCards: StatCard[] = useMemo(() => {
    if (!studyStats || !progress) return []

    return [
      {
        title: '今日复习',
        value: studyStats.today.reviewed_today,
        subtitle: `目标: ${studyStats.today.due_today}`,
        icon: <School />,
        color: '#2196F3',
        trend: {
          value: 12,
          isPositive: true
        }
      },
      {
        title: '学习连续天数',
        value: learningStreak.current_streak,
        subtitle: `最长: ${learningStreak.longest_streak} 天`,
        icon: <LocalFireDepartment />,
        color: '#FF5722',
        trend: {
          value: 2,
          isPositive: true
        }
      },
      {
        title: '总词汇量',
        value: wordStats?.total_words || 0,
        subtitle: '已掌握单词',
        icon: <BookmarkBorder />,
        color: '#4CAF50',
        trend: {
          value: 25,
          isPositive: true
        }
      },
      {
        title: '平均准确率',
        value: `${Math.round((progress.summary.total_reviews > 0 ? progress.summary.average_grade * 25 : 0))}%`,
        subtitle: '最近表现',
        icon: <EmojiEvents />,
        color: '#FF9800',
        trend: {
          value: 5,
          isPositive: true
        }
      },
      {
        title: '学习效率',
        value: `${Math.round((progress.summary.total_reviews / Math.max(progress.summary.active_days, 1)))}`,
        subtitle: '日均复习数',
        icon: <TrendingUp />,
        color: '#9C27B0',
        trend: {
          value: 8,
          isPositive: true
        }
      },
      {
        title: '活跃天数',
        value: progress.summary.active_days,
        subtitle: `${timeRange} 天内`,
        icon: <CalendarToday />,
        color: '#607D8B',
        trend: {
          value: 3,
          isPositive: true
        }
      }
    ]
  }, [studyStats, progress, wordStats, learningStreak, timeRange])

  // 图表数据处理
  const chartData = useMemo(() => {
    if (!progress?.daily_data) return []
    
    return progress.daily_data.map(item => ({
      date: new Date(item.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      reviews: item.reviews,
      average_grade: item.average_grade * 25, // 转换为百分比
      accuracy: item.reviews > 0 ? (item.average_grade * 25) : 0
    }))
  }, [progress])

  // 词性分布数据
  const posData = useMemo(() => {
    if (!wordStats?.by_pos) return []
    
    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#607D8B']
    return Object.entries(wordStats.by_pos).map(([pos, count], index) => ({
      name: pos === 'n' ? '名词' : pos === 'v' ? '动词' : pos === 'adj' ? '形容词' : pos,
      value: count,
      color: colors[index % colors.length]
    }))
  }, [wordStats])

  // CEFR 等级数据
  const cefrData = useMemo(() => {
    if (!wordStats?.by_cefr) return []
    
    return Object.entries(wordStats.by_cefr)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([level, count]) => ({
        level,
        count,
        percentage: (count / (wordStats.total_words || 1)) * 100
      }))
  }, [wordStats])

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  if (statsLoading || progressLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Analytics sx={{ fontSize: 60, color: 'primary.main' }} />
        </motion.div>
      </Box>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* 页面标题 */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Box>
              <TypewriterText
                text="📊 学习统计"
                variant="h3"
                component="h1"
                sx={{ mb: 1, fontWeight: 600 }}
                delay={80}
                startDelay={300}
              />
              <FadeInWords
                text="深入了解你的学习进度和表现"
                variant="h6"
                color="text.secondary"
                delay={1500}
                stagger={100}
              />
            </Box>

            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>时间范围</InputLabel>
                <Select
                  value={timeRange}
                  label="时间范围"
                  onChange={(e) => setTimeRange(Number(e.target.value))}
                >
                  <MenuItem value={7}>7 天</MenuItem>
                  <MenuItem value={30}>30 天</MenuItem>
                  <MenuItem value={90}>90 天</MenuItem>
                  <MenuItem value={365}>1 年</MenuItem>
                </Select>
              </FormControl>

              <Tooltip title="刷新数据">
                <IconButton onClick={handleRefreshAll} color="primary">
                  <Refresh />
                </IconButton>
              </Tooltip>

              <Button
                variant="outlined"
                startIcon={<Download />}
                size="small"
              >
                导出数据
              </Button>
            </Stack>
          </Box>
        </motion.div>

        {/* 统计卡片 */}
        <motion.div variants={itemVariants}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={card.title}>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
                  transition={{ type: "spring", stiffness: 300 }}
                  custom={index}
                >
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: card.color + '20',
                            color: card.color,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {card.icon}
                        </Box>
                        
                        {card.trend && (
                          <Chip
                            label={`${card.trend.isPositive ? '+' : '-'}${card.trend.value}%`}
                            size="small"
                            color={card.trend.isPositive ? 'success' : 'error'}
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                        {card.value}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        {card.title}
                      </Typography>
                      
                      {card.subtitle && (
                        <Typography variant="caption" color="text.secondary">
                          {card.subtitle}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        <Grid container spacing={3}>
          {/* 学习趋势图表 */}
          <Grid item xs={12} lg={8}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Insights color="primary" />
                      学习趋势分析
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      {['area', 'line', 'bar'].map((type) => (
                        <Button
                          key={type}
                          size="small"
                          variant={chartType === type ? 'contained' : 'outlined'}
                          onClick={() => setChartType(type as any)}
                        >
                          {type === 'area' ? '面积图' : type === 'line' ? '折线图' : '柱状图'}
                        </Button>
                      ))}
                    </Stack>
                  </Box>

                  <Box sx={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <ChartTooltip 
                            formatter={(value: any, name: string) => [
                              value, 
                              name === 'reviews' ? '复习次数' : name === 'accuracy' ? '准确率' : name
                            ]}
                          />
                          <Area 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="reviews" 
                            stackId="1" 
                            stroke="#2196F3" 
                            fill="#2196F3" 
                            fillOpacity={0.6}
                          />
                          <Area 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="accuracy" 
                            stackId="2" 
                            stroke="#4CAF50" 
                            fill="#4CAF50" 
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <ChartTooltip 
                            formatter={(value: any, name: string) => [
                              value, 
                              name === 'reviews' ? '复习次数' : name === 'accuracy' ? '准确率' : name
                            ]}
                          />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="reviews" 
                            stroke="#2196F3" 
                            strokeWidth={3}
                            dot={{ fill: '#2196F3', r: 4 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="accuracy" 
                            stroke="#4CAF50" 
                            strokeWidth={3}
                            dot={{ fill: '#4CAF50', r: 4 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <ChartTooltip 
                            formatter={(value: any, name: string) => [
                              value, 
                              name === 'reviews' ? '复习次数' : name === 'accuracy' ? '准确率' : name
                            ]}
                          />
                          <Bar yAxisId="left" dataKey="reviews" fill="#2196F3" />
                          <Bar yAxisId="right" dataKey="accuracy" fill="#4CAF50" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* 词性分布饼图 */}
          <Grid item xs={12} lg={4}>
            <motion.div variants={itemVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assessment color="primary" />
                    词性分布
                  </Typography>

                  {posData.length > 0 ? (
                    <Box>
                      <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={posData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              dataKey="value"
                              label={(entry) => `${entry.name}: ${entry.value}`}
                            >
                              {posData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>

                      <Stack spacing={1} sx={{ mt: 2 }}>
                        {posData.map((item) => (
                          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box 
                              sx={{ 
                                width: 12, 
                                height: 12, 
                                bgcolor: item.color, 
                                borderRadius: '50%' 
                              }} 
                            />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {item.value}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : (
                    <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="text.secondary">暂无数据</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* CEFR 等级分布 */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <School color="primary" />
                    CEFR 等级分布
                  </Typography>

                  {cefrData.length > 0 ? (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      {cefrData.map((item) => (
                        <Box key={item.level}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body1" fontWeight="500">
                              {item.level}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.count} 个 ({item.percentage.toFixed(1)}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={item.percentage}
                            sx={{ 
                              height: 8, 
                              borderRadius: 4,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                              }
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="text.secondary">暂无数据</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* 学习效果总结 */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents color="primary" />
                    学习效果总结
                  </Typography>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Alert severity="success">
                      <Typography variant="body2">
                        🎉 恭喜！你已经连续学习 {learningStreak.current_streak} 天，保持良好的学习习惯！
                      </Typography>
                    </Alert>

                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.contrastText' }}>
                      <Typography variant="h6" gutterBottom>
                        本周学习亮点
                      </Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          📚 复习了 {progress?.summary.total_reviews || 0} 个单词
                        </Typography>
                        <Typography variant="body2">
                          🎯 平均准确率 {Math.round((progress?.summary.average_grade || 0) * 25)}%
                        </Typography>
                        <Typography variant="body2">
                          🔥 活跃 {progress?.summary.active_days || 0} 天
                        </Typography>
                        <Typography variant="body2">
                          📈 词汇量增长 {wordStats?.total_words || 0} 个
                        </Typography>
                      </Stack>
                    </Box>

                    <Alert severity="info">
                      <Typography variant="body2">
                        💡 建议：继续保持每日复习的好习惯，适当增加新单词的学习量。
                      </Typography>
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* 详细数据表格 */}
        <motion.div variants={itemVariants}>
          <Card sx={{ mt: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer color="primary" />
                详细学习记录
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>日期</TableCell>
                      <TableCell align="right">复习次数</TableCell>
                      <TableCell align="right">平均评分</TableCell>
                      <TableCell align="right">准确率</TableCell>
                      <TableCell>学习状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chartData.slice(0, 10).map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell align="right">{row.reviews}</TableCell>
                        <TableCell align="right">{(row.average_grade / 25).toFixed(2)}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {row.accuracy.toFixed(0)}%
                            <LinearProgress
                              variant="determinate"
                              value={row.accuracy}
                              sx={{ width: 50, height: 4 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              row.accuracy >= 80 ? '优秀' :
                              row.accuracy >= 60 ? '良好' :
                              row.accuracy >= 40 ? '一般' : '需努力'
                            }
                            color={
                              row.accuracy >= 80 ? 'success' :
                              row.accuracy >= 60 ? 'primary' :
                              row.accuracy >= 40 ? 'warning' : 'error'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </motion.div>
  )
}