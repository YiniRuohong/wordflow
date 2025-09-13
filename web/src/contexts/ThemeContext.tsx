'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import { frFR } from '@mui/material/locale'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderWrapperProps {
  children: React.ReactNode
}

export const ThemeProviderWrapper: React.FC<ThemeProviderWrapperProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false)

  // 从localStorage读取主题偏好
  useEffect(() => {
    const savedTheme = localStorage.getItem('wordflow-theme')
    if (savedTheme) {
      setIsDark(savedTheme === 'dark')
    } else {
      // 检测系统主题偏好
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(systemDark)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('wordflow-theme', newTheme ? 'dark' : 'light')
  }

  // Material Design 主题配置
  const theme = createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: '#2196F3', // Material Blue
        light: '#64B5F6',
        dark: '#1976D2',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#FF4081', // Material Pink
        light: '#FF80AB',
        dark: '#C2185B',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#4CAF50',
        light: '#81C784',
        dark: '#388E3C',
      },
      warning: {
        main: '#FF9800',
        light: '#FFB74D',
        dark: '#F57C00',
      },
      error: {
        main: '#F44336',
        light: '#EF5350',
        dark: '#D32F2F',
      },
      background: {
        default: isDark ? '#121212' : '#FAFAFA',
        paper: isDark ? '#1E1E1E' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#FFFFFF' : '#212121',
        secondary: isDark ? '#AAAAAA' : '#757575',
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.43,
      }
    },
    shape: {
      borderRadius: 12, // 更圆润的边角
    },
    spacing: 8, // 8px 基础间距
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', // 不要全大写
            borderRadius: 12,
            fontSize: '0.9rem',
            fontWeight: 500,
            padding: '8px 24px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDark 
              ? '0 4px 20px rgba(0,0,0,0.3)' 
              : '0 4px 20px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderBottom: `1px solid ${isDark ? '#333' : '#E0E0E0'}`,
          },
        },
      },
    },
  }, frFR)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}