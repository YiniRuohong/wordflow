const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export interface Word {
  id: number
  lemma: string
  meaning_zh: string
  meaning_text?: string
  translations?: Record<string, string>
  pos?: string
  gender?: string
  ipa?: string
  lesson?: string
  cefr?: string
  tags?: string
  created_at: string
  updated_at: string
}

export interface StudyCard {
  card_id: number
  word_id: number
  lemma: string
  meaning_zh: string
  meaning_text?: string
  translations?: Record<string, string>
  pos?: string
  gender?: string
  ipa?: string
  lesson?: string
  cefr?: string
  tags?: string
  language?: string
  card_type: 'due' | 'rolling' | 'new'
  priority: number
  template: string
  hint?: string
  srs: {
    due?: string
    interval: number
    ease: number
    reps: number
    lapses: number
    retention_rate: number
  }
}

export interface StudyQueue {
  cards: StudyCard[]
  stats: {
    total_cards: number
    due_today: number
    new_cards: number
    rolling_reviews: number
    reviewed_today: number
    study_queue_size: number
  }
  session_id: string
  queue_info: {
    total_returned: number
    limit: number
    new_limit: number
    include_rolling: boolean
  }
}

export interface ImportProgress {
  import_id: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total: number
  succeeded: number
  failed: number
  progress_percent: number
  message?: string
}

export interface StudyStats {
  today: {
    total_cards: number
    due_today: number
    new_cards: number
    rolling_reviews: number
    reviewed_today: number
    study_queue_size: number
  }
  recommendations: {
    suggested_daily_new: number
    suggested_daily_reviews: number
    estimated_time_minutes: number
  }
}

export interface StudyProgress {
  period: {
    start_date: string
    end_date: string
    days: number
  }
  daily_data: Array<{
    date: string
    reviews: number
    avg_grade: number
  }>
  summary: {
    total_reviews: number
    avg_daily_reviews: number
    active_days: number
  }
}

class WordFlowAPI {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      console.log(`Making API request to: ${url}`)
      console.log('Request config:', config)
      
      const response = await fetch(url, config)
      
      console.log(`Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error Response: ${errorText}`)
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      return data
    } catch (error) {
      console.error('API Request failed:', error)
      
      // 提供更具体的错误信息
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`网络连接失败，请检查后端服务是否启动在 ${API_BASE}`)
      }
      
      throw error
    }
  }

  // 单词相关
  async searchWords(params: {
    q?: string
    lesson?: string
    cefr?: string
    pos?: string
    page?: number
    per_page?: number
  }) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    
    return this.request<{
      words: Word[]
      total: number
      page: number
      per_page: number
    }>(`/api/v1/words/search?${searchParams}`)
  }

  async getWordStats() {
    return this.request<{
      total_words: number
      by_lesson: Record<string, number>
      by_cefr: Record<string, number>
      by_pos: Record<string, number>
    }>('/api/v1/stats')
  }

  // 导入相关
  async uploadWords(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<{
      import_id: number
      status: string
      message: string
    }>('/api/v1/words/bulk', {
      method: 'POST',
      body: formData,
      headers: {}, // 让浏览器自动设置Content-Type
    })
  }

  // 添加别名方法以保持兼容性
  async importWords(file: File) {
    return this.uploadWords(file)
  }

  async getImportProgress(importId: number) {
    return this.request<ImportProgress>(`/api/v1/imports/${importId}`)
  }

  async getImportHistory(limit = 20, offset = 0) {
    return this.request<Array<{
      id: number
      filename: string
      started_at: string
      finished_at?: string
      status: string
      total: number
      succeeded: number
      failed: number
      message?: string
    }>>(`/api/v1/imports?limit=${limit}&offset=${offset}`)
  }

  async pollImportProgress(
    importId: number,
    onUpdate?: (p: ImportProgress) => void,
    options: { intervalMs?: number; timeoutMs?: number } = {}
  ) {
    const interval = options.intervalMs ?? 1000
    const timeout = options.timeoutMs ?? 60000
    const start = Date.now()
    while (true) {
      const p = await this.getImportProgress(importId)
      onUpdate?.(p)
      if (p.status === 'completed' || p.status === 'failed') return p
      if (Date.now() - start > timeout) throw new Error('导入进度查询超时')
      await new Promise((r) => setTimeout(r, interval))
    }
  }

  // 学习相关
  async getStudyQueue(params: {
    limit?: number
    new_limit?: number
    include_rolling?: boolean
  } = {}) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    return this.request<StudyQueue>(`/api/v1/study/next?${searchParams}`)
  }

  async submitReview(review: {
    card_id: number
    grade: number
    elapsed_ms?: number
  }) {
    return this.request<{
      success: boolean
      message: string
      result: {
        card_id: number
        grade: number
        next_due: string
        new_interval: number
        new_ease: number
        total_reps: number
        total_lapses: number
        elapsed_ms?: number
      }
    }>('/api/v1/review', {
      method: 'POST',
      body: JSON.stringify(review),
    })
  }

  async getStudyStats() {
    return this.request<StudyStats>('/api/v1/study/stats')
  }

  async getStudyProgress(days = 7) {
    return this.request<StudyProgress>(`/api/v1/study/progress?days=${days}`)
  }

  async getDueForecast(days = 7) {
    return this.request<{
      forecast_period: string
      forecast: Array<{
        date: string
        due_cards: number
      }>
      total_due: number
    }>(`/api/v1/study/due-forecast?days=${days}`)
  }

  // 搜索建议
  async getWordSuggestions(q: string, limit = 10) {
    const p = new URLSearchParams({ q, limit: String(limit) })
    return this.request<string[]>(`/api/v1/words/suggest?${p.toString()}`)
  }

  // 词库相关
  async getWordbooks() {
    return this.request<Array<{
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
    }>>('/api/v1/wordbooks/')
  }

  async getActiveWordbook() {
    return this.request<{
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
    }>('/api/v1/wordbooks/active')
  }

  async createWordbook(wordbook: {
    name: string
    description?: string
    language: string
    author?: string
    version?: string
  }) {
    return this.request<{
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
    }>('/api/v1/wordbooks/', {
      method: 'POST',
      body: JSON.stringify(wordbook),
    })
  }

  async activateWordbook(wordbookId: number) {
    return this.request<{
      message: string
      wordbook: {
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
    }>(`/api/v1/wordbooks/${wordbookId}/activate`, {
      method: 'POST',
    })
  }

  async deleteWordbook(wordbookId: number) {
    return this.request<{ message: string }>(`/api/v1/wordbooks/${wordbookId}`, {
      method: 'DELETE',
    })
  }

  async getWordbookStats(wordbookId: number) {
    return this.request<{
      wordbook: {
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
      total_words: number
      by_cefr: Record<string, number>
      by_pos: Record<string, number>
      by_lesson: Record<string, number>
    }>(`/api/v1/wordbooks/${wordbookId}/stats`)
  }

  // 健康检查
  async healthCheck() {
    return this.request<{ status: string }>('/health')
  }

  // 设置相关
  async getSettings() {
    return this.request<{
      appearance: { theme: 'light' | 'dark' | 'auto'; language: string; animations: boolean }
      study: { dailyNewWords: number; reviewBatchSize: number; autoPlayAudio: boolean; showHints: boolean }
      notifications: { enabled: boolean; studyReminder: boolean; reviewReminder: boolean; reminderTime: string }
      storage: { cacheSize: number; autoBackup: boolean; backupInterval: 'daily' | 'weekly' | 'monthly' }
    }>('/api/v1/settings')
  }

  async updateSettings(settings: any) {
    return this.request('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }
}

export const api = new WordFlowAPI()
