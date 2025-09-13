'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  Chip,
  InputAdornment,
  IconButton,
  Pagination,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Fade,
  CircularProgress,
  Alert
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import {
  Search as SearchIcon,
  VolumeUp,
  Clear,
  FilterList,
  BookmarkBorder,
  School
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebounce'

import { TypewriterText, FadeInWords } from '@/components/animations/TypewriterText'
import { SimpleTextToSpeech } from '@/components/pronunciation/TextToSpeech'
import { api, Word } from '@/lib/api'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLesson, setSelectedLesson] = useState<string>('')
  const [selectedCefr, setSelectedCefr] = useState<string>('')
  const [selectedPos, setSelectedPos] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 12

  // 防抖搜索
  const debouncedQuery = useDebouncedValue(searchQuery, 300)

  // 搜索单词
  const { data: searchResult, isLoading, error } = useQuery({
    queryKey: ['searchWords', debouncedQuery, selectedLesson, selectedCefr, selectedPos, currentPage],
    queryFn: () => api.searchWords({
      q: debouncedQuery || undefined,
      lesson: selectedLesson || undefined,
      cefr: selectedCefr || undefined,
      pos: selectedPos || undefined,
      page: currentPage,
      per_page: perPage
    }),
    enabled: true,
  })

  // 搜索建议
  const { data: suggestions } = useQuery({
    queryKey: ['wordSuggest', debouncedQuery],
    queryFn: () => api.getWordSuggestions(debouncedQuery, 10),
    enabled: !!debouncedQuery,
  })

  // 获取单词统计（用于筛选选项）
  const { data: wordStats } = useQuery({
    queryKey: ['wordStats'],
    queryFn: () => api.getWordStats(),
  })
  const { data: activeWordbook } = useQuery({
    queryKey: ['activeWordbook'],
    queryFn: () => api.getActiveWordbook(),
  })

  // 清除搜索
  const handleClearSearch = () => {
    setSearchQuery('')
    setSelectedLesson('')
    setSelectedCefr('')
    setSelectedPos('')
    setCurrentPage(1)
  }


  const totalPages = searchResult ? Math.ceil(searchResult.total / perPage) : 0

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* 页面标题 */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <TypewriterText
              text="🔍 单词搜索"
              variant="h3"
              component="h1"
              sx={{ mb: 1, fontWeight: 600 }}
              delay={80}
              startDelay={300}
            />
            <FadeInWords
              text="智能搜索，快速找到你要的单词"
              variant="h6"
              color="text.secondary"
              delay={1500}
              stagger={100}
            />
          </Box>
        </motion.div>

        {/* 搜索和筛选区域 */}
        <motion.div variants={itemVariants}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3} alignItems="center">
              {/* 主搜索框 */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={suggestions || []}
                  inputValue={searchQuery}
                  onInputChange={(_, v) => setSearchQuery(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      placeholder="搜索单词、中文含义..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setSearchQuery('')} size="small">
                              <Clear />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* 课程筛选 */}
              <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>课程</InputLabel>
                  <Select
                    value={selectedLesson}
                    label="课程"
                    onChange={(e) => setSelectedLesson(e.target.value)}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {wordStats && Object.keys(wordStats.by_lesson).sort().map((lesson) => (
                      <MenuItem key={lesson} value={lesson}>
                        {lesson} ({wordStats.by_lesson[lesson]})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* CEFR等级筛选 */}
              <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>等级</InputLabel>
                  <Select
                    value={selectedCefr}
                    label="等级"
                    onChange={(e) => setSelectedCefr(e.target.value)}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {wordStats && Object.keys(wordStats.by_cefr).sort().map((cefr) => (
                      <MenuItem key={cefr} value={cefr}>
                        {cefr} ({wordStats.by_cefr[cefr]})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 词性筛选 */}
              <Grid item xs={6} md={1.5}>
                <FormControl fullWidth>
                  <InputLabel>词性</InputLabel>
                  <Select
                    value={selectedPos}
                    label="词性"
                    onChange={(e) => setSelectedPos(e.target.value)}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {wordStats && Object.keys(wordStats.by_pos).sort().map((pos) => (
                      <MenuItem key={pos} value={pos}>
                        {pos} ({wordStats.by_pos[pos]})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 清除按钮 */}
              <Grid item xs={6} md={0.5}>
                <IconButton 
                  onClick={handleClearSearch}
                  color="primary"
                  sx={{ p: 1.5 }}
                >
                  <Clear />
                </IconButton>
              </Grid>
            </Grid>

            {/* 当前筛选条件显示 */}
            {(searchQuery || selectedLesson || selectedCefr || selectedPos) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  当前筛选条件:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {searchQuery && (
                    <Chip 
                      label={`搜索: "${searchQuery}"`} 
                      size="small" 
                      onDelete={() => setSearchQuery('')}
                      color="primary" 
                    />
                  )}
                  {selectedLesson && (
                    <Chip 
                      label={`课程: ${selectedLesson}`} 
                      size="small" 
                      onDelete={() => setSelectedLesson('')}
                      color="secondary" 
                    />
                  )}
                  {selectedCefr && (
                    <Chip 
                      label={`等级: ${selectedCefr}`} 
                      size="small" 
                      onDelete={() => setSelectedCefr('')}
                      color="info" 
                    />
                  )}
                  {selectedPos && (
                    <Chip 
                      label={`词性: ${selectedPos}`} 
                      size="small" 
                      onDelete={() => setSelectedPos('')}
                      color="success" 
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Paper>
        </motion.div>

        {/* 搜索结果统计 */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {isLoading ? '搜索中...' : 
               error ? '搜索出错' :
               searchResult ? `找到 ${searchResult.total} 个单词` : ''}
            </Typography>
            
            {searchResult && totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size="small"
              />
            )}
          </Box>
        </motion.div>

        {/* 搜索结果 */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="loading"
            >
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress size={60} />
              </Box>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              key="error"
            >
              <Alert severity="error" sx={{ mb: 3 }}>
                搜索时出现错误，请稍后重试
              </Alert>
            </motion.div>
          ) : searchResult && searchResult.words.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key="results"
            >
              <Grid container spacing={3}>
                {searchResult.words.map((word, index) => (
                  <Grid item xs={12} sm={6} md={4} key={word.id}>
                    <motion.div
                      variants={itemVariants}
                      custom={index}
                      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Card sx={{ height: '100%', cursor: 'pointer' }}>
                        <CardContent>
                          {/* 单词头部信息 */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                              <Typography 
                                variant="h5" 
                                component="h2" 
                                sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}
                              >
                                {word.lemma}
                              </Typography>
                              
                              <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                                {word.pos && (
                                  <Chip label={word.pos} size="small" variant="outlined" />
                                )}
                                {word.gender && (
                                  <Chip 
                                    label={word.gender} 
                                    size="small" 
                                    color={word.gender === 'm' ? 'info' : 'secondary'}
                                  />
                                )}
                              </Stack>
                            </Box>
                            
                            <SimpleTextToSpeech
                              text={word.lemma}
                              language={mapLangToVoice(activeWordbook?.language)}
                              size="small"
                            />
                          </Box>

                          {/* 音标 */}
                          {word.ipa && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              /{word.ipa}/
                            </Typography>
                          )}

                          {/* 含义显示（按用户/浏览器语言选择） */}
                          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                            {chooseMeaning(word)}
                          </Typography>

                          <Divider sx={{ my: 1.5 }} />

                          {/* 底部信息 */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            {word.lesson && (
                              <Chip 
                                label={word.lesson} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                            
                            {word.cefr && (
                              <Chip 
                                label={word.cefr} 
                                size="small" 
                                color="secondary"
                                variant="outlined"
                              />
                            )}

                            <Box sx={{ flexGrow: 1 }} />
                            
                            <Typography variant="caption" color="text.secondary">
                              #{word.id}
                            </Typography>
                          </Stack>

                          {/* 标签 */}
                          {word.tags && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                标签: {word.tags}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              key="no-results"
            >
              <Box textAlign="center" py={8}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <SearchIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                </motion.div>
                
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  没有找到匹配的单词
                </Typography>
                
                <Typography variant="body1" color="text.secondary">
                  尝试调整搜索条件或关键词
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部分页 */}
        {searchResult && totalPages > 1 && (
          <motion.div variants={itemVariants}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  )
}

// 自定义Hook：防抖
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
// 选择合适释义
function chooseMeaning(word: any): string {
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'zh-cn'
  const candidates = [nav, nav.split('-')[0], 'zh-cn', 'zh', 'en']
  const t = (word as any).translations || {}
  for (const k of candidates) {
    if (t[k]) return t[k]
  }
  return (word as any).meaning_text || (word as any).meaning_zh || ''
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
