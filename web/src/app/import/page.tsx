'use client'
import React, { useState, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Stack,
  Paper,
  Grid,
  Divider,
  IconButton,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'
import {
  CloudUpload,
  CheckCircle,
  Error,
  Info,
  Refresh,
  Download,
  Preview,
  Close,
  FileUpload,
  Assessment,
  School
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TypewriterText, FadeInWords } from '@/components/animations/TypewriterText'
import { NetworkStatus } from '@/components/common/NetworkStatus'
import { DebugInfo } from '@/components/common/DebugInfo'
import { api } from '@/lib/api'

interface UploadProgress {
  file: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total_records?: number
  processed_records?: number
  errors?: string[]
}

interface ImportPreview {
  filename: string
  total_rows: number
  columns: string[]
  sample_data: any[]
  valid_format: boolean
  errors?: string[]
}

export default function ImportPage() {
  const queryClient = useQueryClient()
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // 获取导入历史
  const { data: importHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['importHistory'],
    queryFn: () => api.getImportHistory(),
  })

  // 文件上传 mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.importWords(file),
    onSuccess: async (data, file) => {
      // 开始轮询进度
      try {
        await api.pollImportProgress(
          data.import_id,
          (progress) => {
            setUploadProgress(prev => prev.map(p =>
              p.file === file.name
                ? {
                    ...p,
                    status: progress.status,
                    progress: progress.progress_percent,
                    total_records: progress.total,
                    processed_records: progress.succeeded + progress.failed,
                  }
                : p
            ))
          },
          { intervalMs: 800, timeoutMs: 5 * 60_000 }
        )
      } catch (e: any) {
        setUploadProgress(prev => prev.map(p =>
          p.file === file.name ? { ...p, status: 'failed', errors: [e.message] } : p
        ))
      }

      queryClient.invalidateQueries({ queryKey: ['wordStats'] })
      queryClient.invalidateQueries({ queryKey: ['importHistory'] })
    },
    onError: (error: any, file) => {
      setUploadProgress(prev => 
        prev.map(p => p.file === file.name 
          ? { ...p, status: 'failed', errors: [error.message] }
          : p
        )
      )
    },
  })

  // 文件拖拽处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type === 'text/csv' || 
      file.type === 'text/tab-separated-values' ||
      file.type === 'application/json' ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.tsv') ||
      file.name.endsWith('.json')
    )
    
    setUploadFiles(validFiles)
    setUploadProgress(validFiles.map(file => ({
      file: file.name,
      status: 'pending',
      progress: 0
    })))
    setCurrentStep(1)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/json': ['.json']
    },
    multiple: true
  })

  // 开始上传
  const handleUpload = async () => {
    setCurrentStep(2)
    for (const file of uploadFiles) {
      setUploadProgress(prev =>
        prev.map(p => p.file === file.name 
          ? { ...p, status: 'processing', progress: 0 }
          : p
        )
      )
      
      try {
        await uploadMutation.mutateAsync(file)
      } catch (error) {
        // Error handled in mutation
      }
    }
    setCurrentStep(3)
  }

  // 预览文件
  const handlePreview = async (file: File) => {
    try {
      const text = await file.text()
      let preview: ImportPreview

      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n')
        const headers = lines[0].split(',')
        const sampleData = lines.slice(1, 6).map(line => {
          const values = line.split(',')
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || ''
            return obj
          }, {} as any)
        })
        
        preview = {
          filename: file.name,
          total_rows: lines.length - 1,
          columns: headers,
          sample_data: sampleData,
          valid_format: headers.includes('lemma') && headers.includes('meaning_zh')
        }
      } else if (file.name.endsWith('.tsv')) {
        const lines = text.split('\n')
        const headers = lines[0].split('\t')
        const sampleData = lines.slice(1, 6).map(line => {
          const values = line.split('\t')
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || ''
            return obj
          }, {} as any)
        })
        
        preview = {
          filename: file.name,
          total_rows: lines.length - 1,
          columns: headers,
          sample_data: sampleData,
          valid_format: headers.includes('lemma') && headers.includes('meaning_zh')
        }
      } else {
        const data = JSON.parse(text)
        const isArray = Array.isArray(data)
        const sampleData = isArray ? data.slice(0, 5) : [data]
        
        preview = {
          filename: file.name,
          total_rows: isArray ? data.length : 1,
          columns: Object.keys(sampleData[0] || {}),
          sample_data: sampleData,
          valid_format: sampleData.some(item => item.lemma && item.meaning_zh)
        }
      }

      setPreviewData(preview)
      setShowPreview(true)
    } catch (error) {
      setPreviewData({
        filename: file.name,
        total_rows: 0,
        columns: [],
        sample_data: [],
        valid_format: false,
        errors: ['文件格式错误或包含无效数据']
      })
      setShowPreview(true)
    }
  }

  // 重置状态
  const resetUpload = () => {
    setUploadFiles([])
    setUploadProgress([])
    setCurrentStep(0)
  }

  const steps = ['选择文件', '准备上传', '处理中', '完成']

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
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        {/* 页面标题 */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <TypewriterText
              text="📥 单词导入"
              variant="h3"
              component="h1"
              sx={{ mb: 1, fontWeight: 600 }}
              delay={80}
              startDelay={300}
            />
            <FadeInWords
              text="批量导入法语单词，支持 CSV、TSV 和 JSON 格式"
              variant="h6"
              color="text.secondary"
              delay={1500}
              stagger={100}
            />
          </Box>
        </motion.div>

        {/* 网络状态检查 */}
        <motion.div variants={itemVariants}>
          <NetworkStatus />
        </motion.div>

        {/* 调试信息 */}
        <motion.div variants={itemVariants}>
          <DebugInfo />
        </motion.div>

        {/* 进度步骤 */}
        <motion.div variants={itemVariants}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Stepper activeStep={currentStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </motion.div>

        <Grid container spacing={3}>
          {/* 文件上传区域 */}
          <Grid item xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FileUpload color="primary" />
                    文件上传
                  </Typography>

                  {uploadFiles.length === 0 ? (
                    <Box
                      {...getRootProps()}
                      sx={{
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'grey.300',
                        borderRadius: 2,
                        p: 6,
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: isDragActive ? 'primary.light' : 'background.default',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'primary.light'
                        }
                      }}
                    >
                      <input {...getInputProps()} />
                      <motion.div
                        animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                      </motion.div>
                      
                      <Typography variant="h6" gutterBottom>
                        {isDragActive ? '放下文件以开始上传' : '拖拽文件到这里或点击选择'}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        支持 CSV、TSV、JSON 格式，单个文件最大 10MB
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      {/* 文件列表 */}
                      <Stack spacing={2} sx={{ mb: 3 }}>
                        {uploadFiles.map((file, index) => {
                          const progress = uploadProgress.find(p => p.file === file.name)
                          
                          return (
                            <motion.div
                              key={file.name}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <Paper sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body1" sx={{ flex: 1 }}>
                                    {file.name}
                                  </Typography>
                                  
                                  <Stack direction="row" spacing={1}>
                                    <Chip 
                                      label={`${(file.size / 1024).toFixed(1)} KB`} 
                                      size="small" 
                                      variant="outlined" 
                                    />
                                    
                                    {progress?.status === 'completed' && (
                                      <CheckCircle color="success" />
                                    )}
                                    {progress?.status === 'failed' && (
                                      <Error color="error" />
                                    )}
                                    
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handlePreview(file)}
                                    >
                                      <Preview />
                                    </IconButton>
                                  </Stack>
                                </Box>

                                {progress && progress.status !== 'pending' && (
                                  <Box>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={progress.progress} 
                                      sx={{ height: 6, borderRadius: 3 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                      {progress.status === 'processing' && '处理中...'}
                                      {progress.status === 'completed' && `已完成 - ${progress.total_records} 条记录`}
                                      {progress.status === 'failed' && '上传失败'}
                                    </Typography>
                                  </Box>
                                )}

                                {progress?.errors && (
                                  <Alert severity="error" sx={{ mt: 1 }}>
                                    {progress.errors[0]}
                                  </Alert>
                                )}
                              </Paper>
                            </motion.div>
                          )
                        })}
                      </Stack>

                      {/* 操作按钮 */}
                      <Stack direction="row" spacing={2}>
                        <Button
                          variant="contained"
                          onClick={handleUpload}
                          disabled={uploadMutation.isPending || currentStep >= 2}
                          startIcon={<CloudUpload />}
                        >
                          开始上传
                        </Button>
                        
                        <Button
                          variant="outlined"
                          onClick={resetUpload}
                          startIcon={<Refresh />}
                        >
                          重新选择
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* 格式说明 */}
          <Grid item xs={12} md={4}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Info color="primary" />
                    格式说明
                  </Typography>

                  <Typography variant="body2" paragraph>
                    支持的文件格式和必需字段：
                  </Typography>

                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="primary">
                        CSV/TSV 格式
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        必需字段：lemma（单词），meaning_zh（中文含义）
                        <br />
                        可选字段：pos, gender, ipa, lesson, cefr, tags, hint
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="primary">
                        JSON 格式
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        数组格式，每个对象包含上述字段
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download />}
                    fullWidth
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = '/sample-words.csv'
                      link.download = 'sample-words.csv'
                      link.click()
                    }}
                  >
                    下载示例文件
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* 快速统计 */}
            <motion.div variants={itemVariants}>
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assessment color="primary" />
                    导入统计
                  </Typography>

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">本次上传文件</Typography>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        {uploadFiles.length}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">已处理记录</Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        {uploadProgress.reduce((sum, p) => sum + (p.total_records || 0), 0)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">失败文件</Typography>
                      <Typography variant="body2" color="error.main" fontWeight="bold">
                        {uploadProgress.filter(p => p.status === 'failed').length}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* 导入历史 */}
        {importHistory && importHistory.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card sx={{ mt: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <School color="primary" />
                  最近导入历史
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>文件名</TableCell>
                        <TableCell>导入时间</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell align="right">记录数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                            {importHistory.slice(0, 10).map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.filename}</TableCell>
                                <TableCell>
                            {new Date(item.started_at).toLocaleString('zh-CN')}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={
                                      item.status === 'completed' ? '已完成' :
                                      item.status === 'failed' ? '失败' :
                                      item.status === 'processing' ? '处理中' : '待处理'
                                    }
                                    color={
                                      item.status === 'completed' ? 'success' :
                                      item.status === 'failed' ? 'error' :
                                      'warning'
                                    }
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="right">
                            {(item.succeeded + item.failed) || item.total || 0}
                                </TableCell>
                              </TableRow>
                            ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 预览对话框 */}
        <Dialog
          open={showPreview}
          onClose={() => setShowPreview(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Preview color="primary" />
              文件预览
            </Box>
            <IconButton onClick={() => setShowPreview(false)}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            {previewData && (
              <Box>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip label={`文件: ${previewData.filename}`} />
                  <Chip label={`总行数: ${previewData.total_rows}`} color="primary" />
                  <Chip 
                    label={previewData.valid_format ? "格式正确" : "格式错误"} 
                    color={previewData.valid_format ? "success" : "error"} 
                  />
                </Stack>

                {!previewData.valid_format && previewData.errors && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {previewData.errors.join(', ')}
                  </Alert>
                )}

                <Typography variant="subtitle1" gutterBottom>
                  列信息 ({previewData.columns.length} 列):
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {previewData.columns.map((col) => (
                    <Chip key={col} label={col} size="small" variant="outlined" />
                  ))}
                </Stack>

                <Typography variant="subtitle1" gutterBottom>
                  数据预览 (前5行):
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {previewData.columns.map((col) => (
                          <TableCell key={col}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.sample_data.map((row, index) => (
                        <TableRow key={index}>
                          {previewData.columns.map((col) => (
                            <TableCell key={col}>
                              {row[col] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </motion.div>
  )
}
