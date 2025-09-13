'use client'
import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  LinearProgress,
  Chip,
  Stack,
  Paper,
  Divider,
  Dialog,
  DialogContent,
  DialogActions,
  Alert,
  Fade,
  Zoom
} from '@mui/material'
import {
  VolumeUp,
  Refresh,
  Home,
  CheckCircle,
  Cancel,
  HelpOutline,
  School,
  Timer,
  TrendingUp
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { TypewriterText, ScatterText } from '@/components/animations/TypewriterText'
import { SimpleTextToSpeech } from '@/components/pronunciation/TextToSpeech'
import { api, StudyCard, StudyQueue } from '@/lib/api'

export default function StudyPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // 状态管理
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    startTime: Date.now()
  })
  const [showCongrats, setShowCongrats] = useState(false)

  // 获取学习队列
  const { data: studyQueue, isLoading, refetch } = useQuery<StudyQueue>({
    queryKey: ['studyQueue'],
    queryFn: () => api.getStudyQueue({ limit: 20 }),
  })

  // 提交复习结果
  const reviewMutation = useMutation({
    mutationFn: (reviewData: { card_id: number; grade: number; elapsed_ms?: number }) =>
      api.submitReview(reviewData),
    onSuccess: () => {
      // 刷新统计数据
      queryClient.invalidateQueries({ queryKey: ['studyStats'] })
    },
  })

  const currentCard = studyQueue?.cards[currentCardIndex]
  const totalCards = studyQueue?.cards.length || 0
  const progress = totalCards > 0 ? ((currentCardIndex + 1) / totalCards) * 100 : 0

  // 处理答案显示
  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  // 处理评分
  const handleGrade = async (grade: number) => {
    if (!currentCard) return

    const startTime = Date.now() - sessionStats.startTime
    const elapsed = startTime

    try {
      await reviewMutation.mutateAsync({
        card_id: currentCard.card_id,
        grade: grade,
        elapsed_ms: elapsed
      })

      // 更新会话统计
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: grade >= 2 ? prev.correct + 1 : prev.correct
      }))

      // 移到下一张卡片或完成
      if (currentCardIndex < totalCards - 1) {
        setCurrentCardIndex(prev => prev + 1)
        setShowAnswer(false)
      } else {
        setShowCongrats(true)
      }
    } catch (error) {
      console.error('Review submission failed:', error)
    }
  }

  // 重新开始学习
  const handleRestart = () => {
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setSessionStats({
      reviewed: 0,
      correct: 0,
      startTime: Date.now()
    })
    setShowCongrats(false)
    refetch()
  }

  // 键盘快捷键：空格显示答案；1-4 对应 0-3 分
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!currentCard) return
      if (e.key === ' ') {
        e.preventDefault()
        if (!showAnswer) setShowAnswer(true)
        return
      }
      const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 }
      if (showAnswer && e.key in map) {
        e.preventDefault()
        handleGrade(map[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentCard, showAnswer])

  // 评分按钮配置
  const gradeButtons = [
    { grade: 0, label: '重来', color: 'error', icon: <Cancel />, description: '完全不记得' },
    { grade: 1, label: '困难', color: 'warning', icon: <HelpOutline />, description: '很难想起来' },
    { grade: 2, label: '良好', color: 'success', icon: <CheckCircle />, description: '正常难度' },
    { grade: 3, label: '简单', color: 'primary', icon: <TrendingUp />, description: '很容易' },
  ]

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <School sx={{ fontSize: 60, color: 'primary.main' }} />
        </motion.div>
      </Box>
    )
  }

  if (!studyQueue || totalCards === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box textAlign="center" py={8}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <School sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          </motion.div>
          
          <TypewriterText
            text="🎉 恭喜！今天的学习任务已完成"
            variant="h4"
            sx={{ mb: 2 }}
            delay={60}
          />
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            暂时没有需要复习的卡片
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={() => router.push('/')}
            >
              回到首页
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRestart}
            >
              刷新
            </Button>
          </Stack>
        </Box>
      </motion.div>
    )
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* 进度条和状态 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6">学习进度</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {currentCardIndex + 1} / {totalCards}
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              />
            </Box>

            <Stack direction="row" spacing={2}>
              <Chip 
                icon={<Timer />} 
                label={`${sessionStats.reviewed} 已复习`} 
                variant="outlined" 
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              />
              <Chip 
                icon={<TrendingUp />} 
                label={`${Math.round((sessionStats.correct / Math.max(sessionStats.reviewed, 1)) * 100)}% 正确`} 
                variant="outlined" 
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              />
            </Stack>
          </Stack>
        </Paper>
      </motion.div>

      {/* 学习卡片 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCardIndex}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Card sx={{ minHeight: 400 }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              {/* 卡片类型标识 */}
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={
                    currentCard?.card_type === 'new' ? '新单词' :
                    currentCard?.card_type === 'due' ? 'SRS复习' :
                    currentCard?.card_type === 'rolling' ? '滚动复习' : '复习'
                  }
                  color={
                    currentCard?.card_type === 'new' ? 'info' :
                    currentCard?.card_type === 'due' ? 'warning' :
                    'primary'
                  }
                  variant="outlined"
                />
                
                {currentCard?.lesson && (
                  <Chip
                    label={currentCard.lesson}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
                
                {currentCard?.cefr && (
                  <Chip
                    label={currentCard.cefr}
                    size="small"
                    color="secondary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>

              {/* 法语单词 */}
              <Box sx={{ mb: 4 }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Typography 
                    variant="h2" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 600, 
                      color: 'primary.main',
                      mb: 1
                    }}
                  >
                    <ScatterText 
                      text={currentCard?.lemma || ''}
                      trigger={true}
                      delay={200}
                    />
                  </Typography>
                </motion.div>

                {/* 词性和音标 */}
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                  {currentCard?.pos && (
                    <Typography variant="body1" color="text.secondary">
                      {currentCard.pos}
                    </Typography>
                  )}
                  
                  {currentCard?.gender && (
                    <Typography variant="body1" color="text.secondary">
                      ({currentCard.gender})
                    </Typography>
                  )}
                </Stack>

                {currentCard?.ipa && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    /{currentCard.ipa}/
                  </Typography>
                )}

                {/* 自动发音 */}
                <Box sx={{ mb: 3 }}>
                  <SimpleTextToSpeech
                    text={currentCard?.lemma || ''}
                    language={mapLangToVoice(currentCard?.language)}
                    size="medium"
                    autoPlay={!showAnswer} // 仅在显示问题时自动播放
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 答案区域 */}
              <AnimatePresence>
                {showAnswer ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box sx={{ mb: 4 }}>
                      <TypewriterText
                        text={chooseMeaning(currentCard) || ''}
                        variant="h4"
                        sx={{ mb: 2, color: 'success.main' }}
                        delay={50}
                      />

                      {currentCard?.hint && (
                        <Typography variant="body2" color="text.secondary">
                          提示: {currentCard.hint}
                        </Typography>
                      )}
                    </Box>

                    {/* 评分按钮 */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="h6" gutterBottom>
                          你记得这个单词吗？
                        </Typography>
                        
                        <ButtonGroup variant="contained" size="large" sx={{ width: '100%' }}>
                          {gradeButtons.map((button) => (
                            <Button
                              key={button.grade}
                              onClick={() => handleGrade(button.grade)}
                              color={button.color as any}
                              startIcon={button.icon}
                              sx={{ flex: 1, py: 1.5 }}
                              disabled={reviewMutation.isPending}
                            >
                              <Stack spacing={0.5}>
                                <Typography variant="body2" fontWeight="bold">
                                  {button.label}
                                </Typography>
                                <Typography variant="caption">
                                  {button.description}
                                </Typography>
                              </Stack>
                            </Button>
                          ))}
                        </ButtonGroup>
                      </Stack>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleShowAnswer}
                      sx={{ py: 1.5, px: 4 }}
                    >
                      显示答案
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* 完成对话框 */}
      <Dialog
        open={showCongrats}
        maxWidth="sm"
        fullWidth
        PaperComponent={motion.div}
        PaperProps={{
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { duration: 0.3 }
        } as any}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <School sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          </motion.div>
          
          <Typography variant="h5" gutterBottom>
            🎉 学习完成！
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            本次学习了 {sessionStats.reviewed} 个单词
            <br />
            正确率: {Math.round((sessionStats.correct / Math.max(sessionStats.reviewed, 1)) * 100)}%
          </Typography>

          <Alert severity="success" sx={{ mb: 3 }}>
            坚持学习，你的法语水平正在稳步提升！
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => router.push('/')}
          >
            回到首页
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRestart}
          >
            继续学习
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// 简单语言到 TTS 语音的映射
function mapLangToVoice(lang?: string): string {
  const m: Record<string, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    de: 'de-DE',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
  }
  if (!lang) return 'en-US'
  return m[lang] || lang
}

function chooseMeaning(card?: any): string {
  if (!card) return ''
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'zh-cn'
  const candidates = [nav, nav.split('-')[0], 'zh-cn', 'zh', 'en']
  const t = (card as any).translations || {}
  for (const k of candidates) {
    if (t[k]) return t[k]
  }
  return (card as any).meaning_text || (card as any).meaning_zh || ''
}
