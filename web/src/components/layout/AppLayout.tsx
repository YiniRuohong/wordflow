'use client'
import React, { useState, useEffect } from 'react'
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  useMediaQuery,
  useTheme as useMuiTheme,
  Badge,
  Tooltip,
  Fab
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home,
  School,
  Search,
  Upload,
  Analytics,
  Settings,
  DarkMode,
  LightMode,
  Close,
  PlayArrow,
  LibraryBooks
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { TypewriterText } from '@/components/animations/TypewriterText'

const drawerWidth = 280

interface AppLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  text: string
  icon: React.ReactElement
  path: string
  badge?: number
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [studyStats, setStudyStats] = useState<any>(null)
  const { isDark, toggleTheme } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'))
  const router = useRouter()
  const pathname = usePathname()

  // 获取学习统计（用于显示待复习数量）
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { api } = await import('@/lib/api')
        const stats = await api.getStudyStats()
        setStudyStats(stats)
      } catch (error) {
        console.error('Failed to fetch study stats:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // 30秒更新一次
    return () => clearInterval(interval)
  }, [])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const navigation: NavigationItem[] = [
    {
      text: '仪表板',
      icon: <Home />,
      path: '/',
    },
    {
      text: '开始学习',
      icon: <School />,
      path: '/study',
      badge: studyStats?.today?.study_queue_size || undefined
    },
    {
      text: '单词搜索',
      icon: <Search />,
      path: '/search',
    },
    {
      text: '词库管理',
      icon: <LibraryBooks />,
      path: '/wordbooks',
    },
    {
      text: '学习统计',
      icon: <Analytics />,
      path: '/stats',
    },
    {
      text: '应用设置',
      icon: <Settings />,
      path: '/settings',
    },
  ]

  const drawer = (
    <motion.div
      initial={{ x: -drawerWidth }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Logo 区域 */}
        <Box sx={{ p: 3, borderBottom: `1px solid ${muiTheme.palette.divider}` }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <TypewriterText
              text="WordFlow"
              variant="h4"
              component="h1"
              sx={{ 
                fontWeight: 700, 
                background: `linear-gradient(45deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center'
              }}
              delay={100}
              startDelay={500}
            />
          </motion.div>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              textAlign: 'center', 
              mt: 1, 
              opacity: 0.7 
            }}
          >
            智能法语学习助手
          </Typography>
        </Box>

        {/* 导航菜单 */}
        <List sx={{ flex: 1, px: 1, py: 2 }}>
          {navigation.map((item, index) => {
            const isActive = pathname === item.path
            
            return (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.8 }}
              >
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      router.push(item.path)
                      if (isMobile) setMobileOpen(false)
                    }}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      backgroundColor: isActive ? muiTheme.palette.primary.main + '15' : 'transparent',
                      color: isActive ? muiTheme.palette.primary.main : 'inherit',
                      '&:hover': {
                        backgroundColor: isActive 
                          ? muiTheme.palette.primary.main + '25' 
                          : muiTheme.palette.action.hover,
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                      {item.badge ? (
                        <Badge badgeContent={item.badge} color="secondary">
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 600 : 400
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </motion.div>
            )
          })}
        </List>

        {/* 底部信息 */}
        <Box sx={{ p: 2, borderTop: `1px solid ${muiTheme.palette.divider}` }}>
          {studyStats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                今日进度
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                已复习: {studyStats.today.reviewed_today} 个
              </Typography>
              <Typography variant="body2">
                待复习: {studyStats.today.due_today} 个
              </Typography>
            </motion.div>
          )}
        </Box>
      </Box>
    </motion.div>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* 顶部应用栏 */}
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* 主题切换按钮 */}
          <Tooltip title={isDark ? '切换到亮色主题' : '切换到暗色主题'}>
            <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                {isDark ? <LightMode /> : <DarkMode />}
              </motion.div>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* 侧边栏 */}
      <Box
        component="nav"
        sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // 更好的移动端性能
            }}
            sx={{
              display: { xs: 'block', lg: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                border: 'none'
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton onClick={handleDrawerToggle}>
                <Close />
              </IconButton>
            </Box>
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', lg: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                border: 'none',
                borderRight: `1px solid ${muiTheme.palette.divider}`
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* 主内容区域 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar /> {/* 为AppBar留出空间 */}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* 快速开始学习浮动按钮 */}
      {pathname !== '/study' && studyStats?.today?.study_queue_size > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Fab
            color="primary"
            sx={{ 
              position: 'fixed', 
              bottom: 24, 
              right: 24,
              boxShadow: 3
            }}
            onClick={() => router.push('/study')}
          >
            <Badge badgeContent={studyStats.today.study_queue_size} color="secondary">
              <PlayArrow />
            </Badge>
          </Fab>
        </motion.div>
      )}
    </Box>
  )
}