'use client'

import { useState, useEffect, useCallback } from 'react'
import { VolumeUp, VolumeOff, Speed } from '@mui/icons-material'
import { IconButton, Tooltip, Menu, MenuItem, Typography } from '@mui/material'

interface TextToSpeechProps {
  text: string
  language?: string
  autoPlay?: boolean
  showControls?: boolean
  rate?: number
  pitch?: number
  volume?: number
  className?: string
}

export const TextToSpeech: React.FC<TextToSpeechProps> = ({
  text,
  language = 'fr-FR',
  autoPlay = false,
  showControls = true,
  rate = 1,
  pitch = 1,
  volume = 1,
  className
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null)
  const [currentRate, setCurrentRate] = useState(rate)
  const [currentVolume, setCurrentVolume] = useState(volume)

  // 检查浏览器支持
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('speechSynthesis' in window)
    }
  }, [])

  // 加载可用的语音
  useEffect(() => {
    if (!isSupported) return

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices()
      const frenchVoices = availableVoices.filter(voice => 
        voice.lang.startsWith('fr') || voice.lang === language
      )
      setVoices(frenchVoices)
      
      // 选择最佳法语语音
      const preferredVoice = frenchVoices.find(voice => 
        voice.lang === language && voice.localService
      ) || frenchVoices[0]
      
      setSelectedVoice(preferredVoice)
    }

    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [isSupported, language])

  const speak = useCallback(() => {
    if (!isSupported || !text.trim()) return

    // 停止任何正在播放的语音
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // 设置语音参数
    utterance.lang = language
    utterance.rate = currentRate
    utterance.pitch = pitch
    utterance.volume = currentVolume
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    // 设置事件监听器
    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    speechSynthesis.speak(utterance)
  }, [text, language, selectedVoice, currentRate, pitch, currentVolume, isSupported])

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel()
    setIsPlaying(false)
  }, [])

  // 自动播放
  useEffect(() => {
    if (autoPlay && text.trim() && isSupported) {
      const timer = setTimeout(() => {
        speak()
      }, 300) // 延迟300ms避免过于频繁的播放
      
      return () => clearTimeout(timer)
    }
  }, [text, autoPlay, speak, isSupported])

  const handleVolumeClick = () => {
    if (isPlaying) {
      stopSpeaking()
    } else {
      speak()
    }
  }

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget)
  }

  const handleSettingsClose = () => {
    setSettingsAnchor(null)
  }

  if (!isSupported || !showControls) {
    return null
  }

  return (
    <div className={className}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Tooltip title={isPlaying ? '停止播放' : '播放发音'}>
          <IconButton
            size="small"
            onClick={handleVolumeClick}
            disabled={!text.trim()}
            color={isPlaying ? 'secondary' : 'default'}
          >
            {isPlaying ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Tooltip>

        {showControls && (
          <Tooltip title="语音设置">
            <IconButton size="small" onClick={handleSettingsClick}>
              <Speed />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* 设置菜单 */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2" color="text.secondary">
            语音设置
          </Typography>
        </MenuItem>
        
        <MenuItem>
          <div style={{ width: '200px' }}>
            <Typography variant="body2" gutterBottom>
              语速: {currentRate.toFixed(1)}x
            </Typography>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={currentRate}
              onChange={(e) => setCurrentRate(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </MenuItem>

        <MenuItem>
          <div style={{ width: '200px' }}>
            <Typography variant="body2" gutterBottom>
              音量: {Math.round(currentVolume * 100)}%
            </Typography>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentVolume}
              onChange={(e) => setCurrentVolume(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </MenuItem>

        {voices.length > 0 && (
          <MenuItem>
            <div style={{ width: '200px' }}>
              <Typography variant="body2" gutterBottom>
                语音选择
              </Typography>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = voices.find(v => v.name === e.target.value)
                  setSelectedVoice(voice || null)
                }}
                style={{ width: '100%', padding: '4px' }}
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          </MenuItem>
        )}
      </Menu>
    </div>
  )
}

// 简化版本，只显示播放按钮
interface SimpleTextToSpeechProps {
  text: string
  language?: string
  size?: 'small' | 'medium' | 'large'
  autoPlay?: boolean
}

export const SimpleTextToSpeech: React.FC<SimpleTextToSpeechProps> = ({
  text,
  language = 'fr-FR',
  size = 'small',
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('speechSynthesis' in window)
    }
  }, [])

  const speak = useCallback(() => {
    if (!isSupported || !text.trim()) return

    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    speechSynthesis.speak(utterance)
  }, [text, language, isSupported])

  useEffect(() => {
    if (autoPlay && text.trim() && isSupported) {
      const timer = setTimeout(() => speak(), 200)
      return () => clearTimeout(timer)
    }
  }, [text, autoPlay, speak, isSupported])

  if (!isSupported) return null

  return (
    <Tooltip title="点击发音">
      <IconButton
        size={size}
        onClick={speak}
        disabled={!text.trim()}
        color={isPlaying ? 'secondary' : 'default'}
      >
        {isPlaying ? <VolumeOff /> : <VolumeUp />}
      </IconButton>
    </Tooltip>
  )
}