'use client'
import React, { useState } from 'react'
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Collapse,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import { BugReport, ExpandMore, ExpandLess } from '@mui/icons-material'

export const DebugInfo: React.FC = () => {
  const [expanded, setExpanded] = useState(false)

  const debugData = {
    'API Base URL': process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000',
    'Current Time': new Date().toISOString(),
    'User Agent': typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
    'Environment': process.env.NODE_ENV || 'development',
  }

  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
        <BugReport fontSize="small" color="action" />
        <Typography variant="caption" sx={{ ml: 1, flex: 1 }}>
          调试信息
        </Typography>
        <IconButton 
          size="small" 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <List dense>
          {Object.entries(debugData).map(([key, value]) => (
            <ListItem key={key}>
              <ListItemText
                primary={key}
                secondary={value}
                primaryTypographyProps={{ variant: 'caption' }}
                secondaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Paper>
  )
}