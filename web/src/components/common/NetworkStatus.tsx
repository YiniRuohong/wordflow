'use client'
import React, { useState, useEffect } from 'react'
import { Alert, Box, Typography, IconButton, Collapse } from '@mui/material'
import { CheckCircle, Error, Warning, Refresh } from '@mui/icons-material'
import { api } from '@/lib/api'

export const NetworkStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const checkConnection = async () => {
    setStatus('checking')
    try {
      await api.healthCheck()
      setStatus('connected')
      setErrorMessage('')
    } catch (error) {
      setStatus('disconnected')
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  useEffect(() => {
    checkConnection()
    // 每30秒检查一次连接
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusInfo = () => {
    switch (status) {
      case 'checking':
        return {
          severity: 'info' as const,
          icon: <Warning />,
          message: '正在检查后端连接...'
        }
      case 'connected':
        return {
          severity: 'success' as const,
          icon: <CheckCircle />,
          message: '后端服务连接正常'
        }
      case 'disconnected':
      case 'error':
        return {
          severity: 'error' as const,
          icon: <Error />,
          message: '后端服务连接失败'
        }
    }
  }

  const statusInfo = getStatusInfo()

  if (status === 'connected') {
    return null // 连接正常时不显示状态
  }

  return (
    <Alert 
      severity={statusInfo.severity} 
      icon={statusInfo.icon}
      sx={{ mb: 2 }}
      action={
        <IconButton onClick={checkConnection} size="small" color="inherit">
          <Refresh />
        </IconButton>
      }
    >
      <Box>
        <Typography variant="body2">
          {statusInfo.message}
        </Typography>
        
        {status === 'disconnected' && (
          <Box sx={{ mt: 1 }}>
            <Typography 
              variant="caption" 
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '隐藏详情' : '显示详情'}
            </Typography>
            
            <Collapse in={showDetails}>
              <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" component="pre">
                  {errorMessage}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  请确保后端服务已启动在: {process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}
                </Typography>
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    </Alert>
  )
}