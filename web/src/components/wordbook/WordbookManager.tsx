'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface Wordbook {
  id: number
  name: string
  description?: string
  language: string
  author?: string
  version?: string
  total_words: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface WordbookStats {
  wordbook: Wordbook
  total_words: number
  by_cefr: Record<string, number>
  by_pos: Record<string, number>
  by_lesson: Record<string, number>
}

export default function WordbookManager() {
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([])
  const [selectedWordbook, setSelectedWordbook] = useState<Wordbook | null>(null)
  const [stats, setStats] = useState<WordbookStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWordbook, setNewWordbook] = useState({
    name: '',
    description: '',
    language: 'fr',
    author: '',
    version: ''
  })
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  useEffect(() => {
    loadWordbooks()
  }, [])

  const loadWordbooks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/v1/wordbooks')
      if (!response.ok) throw new Error('Failed to load wordbooks')
      const data = await response.json()
      setWordbooks(data)
      
      // Find and set active wordbook
      const active = data.find((wb: Wordbook) => wb.is_active)
      if (active) {
        setSelectedWordbook(active)
        await loadWordbookStats(active.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const loadWordbookStats = async (wordbookId: number) => {
    try {
      const response = await fetch(`/api/v1/wordbooks/${wordbookId}/stats`)
      if (!response.ok) throw new Error('Failed to load stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to load wordbook stats:', err)
    }
  }

  const createWordbook = async () => {
    try {
      const response = await fetch('/api/v1/wordbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWordbook)
      })
      
      if (!response.ok) throw new Error('Failed to create wordbook')
      
      setNewWordbook({ name: '', description: '', language: 'fr', author: '', version: '' })
      setShowCreateForm(false)
      await loadWordbooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wordbook')
    }
  }

  const activateWordbook = async (wordbookId: number) => {
    try {
      const response = await fetch(`/api/v1/wordbooks/${wordbookId}/activate`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to activate wordbook')
      
      await loadWordbooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate wordbook')
    }
  }

  const deleteWordbook = async (wordbookId: number) => {
    if (!confirm('Are you sure you want to delete this wordbook? This will permanently delete all associated words and progress.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/v1/wordbooks/${wordbookId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete wordbook')
      
      await loadWordbooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wordbook')
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setImporting(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/v1/words/bulk', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const result = await response.json()
      setImportResult(result)
      setSelectedFile(null)
      setShowImportDialog(false)
      
      // Reload wordbooks to update word counts
      await loadWordbooks()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setImporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">词库管理</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            导入单词
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            创建新词库
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Create Wordbook Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <h3 className="text-lg font-semibold">创建新词库</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="词库名称*"
              value={newWordbook.name}
              onChange={(e) => setNewWordbook({...newWordbook, name: e.target.value})}
              className="border rounded-md px-3 py-2"
            />
            
            <select
              value={newWordbook.language}
              onChange={(e) => setNewWordbook({...newWordbook, language: e.target.value})}
              className="border rounded-md px-3 py-2"
            >
              <option value="fr">法语</option>
              <option value="en">英语</option>
              <option value="de">德语</option>
              <option value="es">西班牙语</option>
            </select>
          </div>
          
          <textarea
            placeholder="描述"
            value={newWordbook.description}
            onChange={(e) => setNewWordbook({...newWordbook, description: e.target.value})}
            className="border rounded-md px-3 py-2 w-full"
            rows={3}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="作者"
              value={newWordbook.author}
              onChange={(e) => setNewWordbook({...newWordbook, author: e.target.value})}
              className="border rounded-md px-3 py-2"
            />
            
            <input
              type="text"
              placeholder="版本"
              value={newWordbook.version}
              onChange={(e) => setNewWordbook({...newWordbook, version: e.target.value})}
              className="border rounded-md px-3 py-2"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={createWordbook}
              disabled={!newWordbook.name.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300"
            >
              创建
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Wordbooks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {wordbooks.map((wordbook) => (
          <div
            key={wordbook.id}
            className={`bg-white p-6 rounded-lg border-2 ${
              wordbook.is_active ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{wordbook.name}</h3>
                <p className="text-sm text-gray-600">{wordbook.description}</p>
              </div>
              {wordbook.is_active && (
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                  激活中
                </span>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div>语言: {wordbook.language.toUpperCase()}</div>
              <div>单词数: {wordbook.total_words}</div>
              {wordbook.author && <div>作者: {wordbook.author}</div>}
              {wordbook.version && <div>版本: {wordbook.version}</div>}
              <div>创建于: {new Date(wordbook.created_at).toLocaleDateString()}</div>
            </div>
            
            <div className="flex space-x-2 mt-4">
              {!wordbook.is_active && (
                <button
                  onClick={() => activateWordbook(wordbook.id)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  激活
                </button>
              )}
              
              <button
                onClick={() => {
                  setSelectedWordbook(wordbook)
                  loadWordbookStats(wordbook.id)
                }}
                className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm"
              >
                详情
              </button>
              
              {!wordbook.is_active && (
                <button
                  onClick={() => deleteWordbook(wordbook.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Wordbook Details */}
      {selectedWordbook && stats && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">{selectedWordbook.name} - 详细统计</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">CEFR 等级分布</h4>
              <div className="space-y-1">
                {Object.entries(stats.by_cefr).map(([level, count]) => (
                  <div key={level} className="flex justify-between">
                    <span>{level}:</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">词性分布</h4>
              <div className="space-y-1">
                {Object.entries(stats.by_pos).slice(0, 5).map(([pos, count]) => (
                  <div key={pos} className="flex justify-between">
                    <span>{pos}:</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">课程分布</h4>
              <div className="space-y-1">
                {Object.entries(stats.by_lesson).slice(0, 5).map(([lesson, count]) => (
                  <div key={lesson} className="flex justify-between">
                    <span>{lesson}:</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Words Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">导入单词到当前激活词库</h3>
            
            {!selectedWordbook?.is_active && (
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md mb-4">
                请先激活一个词库再导入单词
              </div>
            )}
            
            {selectedWordbook?.is_active && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md mb-4">
                单词将导入到：<strong>{wordbooks.find(wb => wb.is_active)?.name}</strong>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择文件 (支持 CSV, TSV, JSON)
                </label>
                <input
                  type="file"
                  accept=".csv,.tsv,.json"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">支持的格式：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>CSV: 逗号分隔文件</li>
                  <li>TSV: Tab分隔文件</li>
                  <li>JSON: 单词数组</li>
                </ul>
                <p className="mt-2">必需字段: lemma, meaning_zh</p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || importing || !wordbooks.find(wb => wb.is_active)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {importing ? '导入中...' : '开始导入'}
                </button>
                <button
                  onClick={() => {
                    setShowImportDialog(false)
                    setSelectedFile(null)
                    setError('')
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  disabled={importing}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Success Message */}
      {importResult && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 p-4 rounded-md shadow-lg">
          <p className="font-semibold">导入成功！</p>
          <p>{importResult.message}</p>
          <button
            onClick={() => setImportResult(null)}
            className="mt-2 text-green-600 hover:text-green-800"
          >
            ✕ 关闭
          </button>
        </div>
      )}
    </div>
  )
}