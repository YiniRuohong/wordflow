'use client'
import React, { useState } from 'react'
import { Box, Button, Typography, Alert } from '@mui/material'
import { api } from '@/lib/api'

export default function TestUploadPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleTestUpload = async () => {
    setLoading(true)
    try {
      // 创建测试文件
      const csvContent = `lemma,meaning_zh,pos,lesson
test1,测试1,n,L1
test2,测试2,v,L1`
      
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      
      const response = await api.importWords(file)
      setResult(JSON.stringify(response, null, 2))
    } catch (error: any) {
      setResult('Error: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        测试文件上传功能
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={handleTestUpload}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? '测试中...' : '测试上传功能'}
      </Button>
      
      {result && (
        <Alert severity={result.startsWith('Error') ? 'error' : 'success'}>
          <pre>{result}</pre>
        </Alert>
      )}
    </Box>
  )
}