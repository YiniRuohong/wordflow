'use client'
import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Divider,
  Paper,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material'
import {
  Settings,
  Save,
  Restore,
  Delete,
  Add,
  Edit,
  Visibility,
  VisibilityOff,
  CloudSync,
  Api,
  Security,
  Language,
  Notifications,
  Storage
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { TypewriterText, FadeInWords } from '@/components/animations/TypewriterText'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface APIProvider {
  id: string
  name: string
  description: string
  type: 'ai' | 'tts' | 'translate' | 'other'
  baseUrl: string
  apiKey: string
  enabled: boolean
  config: Record<string, any>
}

interface AppSettings {
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    animations: boolean
  }
  study: {
    dailyNewWords: number
    reviewBatchSize: number
    autoPlayAudio: boolean
    showHints: boolean
  }
  notifications: {
    enabled: boolean
    studyReminder: boolean
    reviewReminder: boolean
    reminderTime: string
  }
  storage: {
    cacheSize: number
    autoBackup: boolean
    backupInterval: string
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [apiProviders, setApiProviders] = useState<APIProvider[]>([
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'AI 例句生成和语言处理',
      type: 'ai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      enabled: false,
      config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      }
    },
    {
      id: 'claude',
      name: 'Claude AI',
      description: 'Anthropic Claude AI 服务',
      type: 'ai',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: '',
      enabled: false,
      config: {
        model: 'claude-3-sonnet-20240229',
        maxTokens: 1000
      }
    },
    {
      id: 'azure-tts',
      name: 'Azure TTS',
      description: '微软语音合成服务',
      type: 'tts',
      baseUrl: 'https://eastus.tts.speech.microsoft.com',
      apiKey: '',
      enabled: false,
      config: {
        voice: 'fr-FR-DeniseNeural',
        rate: '1.0',
        pitch: '0'
      }
    },
    {
      id: 'google-translate',
      name: 'Google Translate',
      description: '谷歌翻译服务',
      type: 'translate',
      baseUrl: 'https://translation.googleapis.com/language/translate/v2',
      apiKey: '',
      enabled: false,
      config: {
        sourceLanguage: 'fr',
        targetLanguage: 'zh-CN'
      }
    }
  ])

  const [appSettings, setAppSettings] = useState<AppSettings>({
    appearance: {
      theme: 'auto',
      language: 'zh-CN',
      animations: true
    },
    study: {
      dailyNewWords: 10,
      reviewBatchSize: 20,
      autoPlayAudio: true,
      showHints: true
    },
    notifications: {
      enabled: true,
      studyReminder: true,
      reviewReminder: true,
      reminderTime: '20:00'
    },
    storage: {
      cacheSize: 100,
      autoBackup: true,
      backupInterval: 'daily'
    }
  })

  const [selectedProvider, setSelectedProvider] = useState<APIProvider | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [showProviderDialog, setShowProviderDialog] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // 加载设置
  const queryClient = useQueryClient()

  // 从后端加载设置（失败时回退 localStorage）
  const { data: serverSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => api.getSettings(),
  })

  useEffect(() => {
    if (serverSettings) {
      setAppSettings(serverSettings as AppSettings)
      return
    }
    try {
      const saved = localStorage.getItem('appSettings')
      if (saved) setAppSettings(JSON.parse(saved))
    } catch (e) {
      // ignore
    }
  }, [serverSettings])

  const saveMutation = useMutation({
    mutationFn: (settings: AppSettings) => api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 1500)
    },
    onError: () => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  })

  const saveSettings = async () => {
    setSaveStatus('saving')
    // 仍然保留本地副本以便离线
    try { localStorage.setItem('appSettings', JSON.stringify(appSettings)) } catch {}
    await saveMutation.mutateAsync(appSettings)
  }

  const resetSettings = () => {
    if (confirm('确定要重置所有设置吗？这将清除所有自定义配置。')) {
      localStorage.removeItem('apiProviders')
      localStorage.removeItem('appSettings')
      loadSettings()
    }
  }

  const updateProvider = (providerId: string, updates: Partial<APIProvider>) => {
    setApiProviders(prev => 
      prev.map(provider => 
        provider.id === providerId 
          ? { ...provider, ...updates }
          : provider
      )
    )
  }

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  const handleProviderEdit = (provider: APIProvider) => {
    setSelectedProvider(provider)
    setShowProviderDialog(true)
  }

  const handleProviderSave = () => {
    if (selectedProvider) {
      updateProvider(selectedProvider.id, selectedProvider)
      setShowProviderDialog(false)
      setSelectedProvider(null)
    }
  }

  const getProviderTypeColor = (type: string) => {
    switch (type) {
      case 'ai': return 'primary'
      case 'tts': return 'secondary'
      case 'translate': return 'success'
      default: return 'default'
    }
  }

  const tabComponents = [
    {
      label: 'API 服务',
      icon: <Api />,
      component: (
        <Stack spacing={3}>
          <Typography variant="body1" color="text.secondary">
            配置第三方 API 服务，用于 AI 例句生成、语音合成和翻译功能
          </Typography>
          
          {apiProviders.map((provider) => (
            <Card key={provider.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6">{provider.name}</Typography>
                      <Chip 
                        label={provider.type.toUpperCase()} 
                        size="small" 
                        color={getProviderTypeColor(provider.type) as any}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={provider.enabled}
                            onChange={(e) => updateProvider(provider.id, { enabled: e.target.checked })}
                            size="small"
                          />
                        }
                        label="启用"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {provider.description}
                    </Typography>
                  </Box>
                  
                  <IconButton onClick={() => handleProviderEdit(provider)} size="small">
                    <Edit />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Base URL"
                      value={provider.baseUrl}
                      onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                      size="small"
                      disabled={!provider.enabled}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API Key"
                      type={showApiKey[provider.id] ? 'text' : 'password'}
                      value={provider.apiKey}
                      onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                      size="small"
                      disabled={!provider.enabled}
                      InputProps={{
                        endAdornment: (
                          <IconButton 
                            onClick={() => toggleApiKeyVisibility(provider.id)}
                            size="small"
                          >
                            {showApiKey[provider.id] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )
    },
    {
      label: '外观设置',
      icon: <Settings />,
      component: (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>主题设置</Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>主题模式</InputLabel>
                    <Select
                      value={appSettings.appearance.theme}
                      label="主题模式"
                      onChange={(e) => setAppSettings(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, theme: e.target.value as any }
                      }))}
                    >
                      <MenuItem value="light">亮色</MenuItem>
                      <MenuItem value="dark">暗色</MenuItem>
                      <MenuItem value="auto">跟随系统</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>语言</InputLabel>
                    <Select
                      value={appSettings.appearance.language}
                      label="语言"
                      onChange={(e) => setAppSettings(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, language: e.target.value }
                      }))}
                    >
                      <MenuItem value="zh-CN">简体中文</MenuItem>
                      <MenuItem value="zh-TW">繁體中文</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="fr">Français</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.appearance.animations}
                        onChange={(e) => setAppSettings(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, animations: e.target.checked }
                        }))}
                      />
                    }
                    label="启用动画效果"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      )
    },
    {
      label: '学习设置',
      icon: <Language />,
      component: (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>学习偏好</Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="每日新单词数"
                    value={appSettings.study.dailyNewWords}
                    onChange={(e) => setAppSettings(prev => ({
                      ...prev,
                      study: { ...prev.study, dailyNewWords: Number(e.target.value) }
                    }))}
                    size="small"
                    inputProps={{ min: 1, max: 100 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="复习批次大小"
                    value={appSettings.study.reviewBatchSize}
                    onChange={(e) => setAppSettings(prev => ({
                      ...prev,
                      study: { ...prev.study, reviewBatchSize: Number(e.target.value) }
                    }))}
                    size="small"
                    inputProps={{ min: 5, max: 50 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.study.autoPlayAudio}
                        onChange={(e) => setAppSettings(prev => ({
                          ...prev,
                          study: { ...prev.study, autoPlayAudio: e.target.checked }
                        }))}
                      />
                    }
                    label="自动播放发音"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.study.showHints}
                        onChange={(e) => setAppSettings(prev => ({
                          ...prev,
                          study: { ...prev.study, showHints: e.target.checked }
                        }))}
                      />
                    }
                    label="显示提示信息"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      )
    },
    {
      label: '通知设置',
      icon: <Notifications />,
      component: (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>推送通知</Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.notifications.enabled}
                        onChange={(e) => setAppSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, enabled: e.target.checked }
                        }))}
                      />
                    }
                    label="启用通知"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.notifications.studyReminder}
                        onChange={(e) => setAppSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, studyReminder: e.target.checked }
                        }))}
                        disabled={!appSettings.notifications.enabled}
                      />
                    }
                    label="学习提醒"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.notifications.reviewReminder}
                        onChange={(e) => setAppSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, reviewReminder: e.target.checked }
                        }))}
                        disabled={!appSettings.notifications.enabled}
                      />
                    }
                    label="复习提醒"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="提醒时间"
                    value={appSettings.notifications.reminderTime}
                    onChange={(e) => setAppSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, reminderTime: e.target.value }
                    }))}
                    size="small"
                    disabled={!appSettings.notifications.enabled}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      )
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        {/* 页面标题 */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box>
            <TypewriterText
              text="⚙️ 应用设置"
              variant="h3"
              component="h1"
              sx={{ mb: 1, fontWeight: 600 }}
              delay={80}
              startDelay={300}
            />
            <FadeInWords
              text="个性化配置你的学习体验"
              variant="h6"
              color="text.secondary"
              delay={1500}
              stagger={100}
            />
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Restore />}
              onClick={resetSettings}
              color="error"
            >
              重置设置
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={saveSettings}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '保存中...' : '保存设置'}
            </Button>
          </Stack>
        </Box>

        {/* 状态提示 */}
        {saveStatus === 'success' && (
          <Alert severity="success" sx={{ mb: 3 }}>
            设置保存成功！
          </Alert>
        )}
        
        {saveStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 3 }}>
            保存设置时出错，请稍后重试。
          </Alert>
        )}

        {/* 设置选项卡 */}
        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {tabComponents.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ minHeight: 60 }}
              />
            ))}
          </Tabs>

          <Box sx={{ p: 3, minHeight: 400 }}>
            {tabComponents[activeTab]?.component}
          </Box>
        </Paper>

        {/* API 提供商编辑对话框 */}
        <Dialog
          open={showProviderDialog}
          onClose={() => setShowProviderDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>编辑 API 提供商</DialogTitle>
          
          <DialogContent>
            {selectedProvider && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="名称"
                  value={selectedProvider.name}
                  onChange={(e) => setSelectedProvider(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
                
                <TextField
                  fullWidth
                  label="描述"
                  multiline
                  rows={2}
                  value={selectedProvider.description}
                  onChange={(e) => setSelectedProvider(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
                
                <TextField
                  fullWidth
                  label="Base URL"
                  value={selectedProvider.baseUrl}
                  onChange={(e) => setSelectedProvider(prev => prev ? { ...prev, baseUrl: e.target.value } : null)}
                />
                
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={selectedProvider.apiKey}
                  onChange={(e) => setSelectedProvider(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                />
              </Stack>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setShowProviderDialog(false)}>
              取消
            </Button>
            <Button onClick={handleProviderSave} variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  )
}
