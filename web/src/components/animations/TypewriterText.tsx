'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Typography, TypographyProps } from '@mui/material'
import { splitGraphemes } from '@/lib/utils'

interface TypewriterTextProps extends Omit<TypographyProps, 'children'> {
  text: string
  delay?: number // 每个字符间的延迟 (ms)
  duration?: number // 每个字符动画的持续时间 (s)
  startDelay?: number // 开始前的延迟 (ms)
  cursor?: boolean // 是否显示光标
  onComplete?: () => void // 动画完成回调
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  delay = 50,
  duration = 0.1,
  startDelay = 0,
  cursor = false,
  onComplete,
  ...typographyProps
}) => {
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(cursor)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!text) return

    const segments = splitGraphemes(text)
    let timeoutId: NodeJS.Timeout
    let currentIndex = 0

    const startAnimation = () => {
      const tick = () => {
        if (currentIndex <= segments.length) {
          setDisplayedText(segments.slice(0, currentIndex).join(''))
          currentIndex++
          if (currentIndex <= segments.length) {
            timeoutId = setTimeout(tick, delay)
          } else {
            setIsComplete(true)
            if (!cursor) setShowCursor(false)
            onComplete?.()
          }
        }
      }
      tick()
    }

    const startTimeout = setTimeout(startAnimation, startDelay)
    return () => {
      clearTimeout(startTimeout)
      clearTimeout(timeoutId)
    }
  }, [text, delay, startDelay, cursor, onComplete])

  // 光标闪烁动画
  const cursorVariants = {
    blinking: {
      opacity: [1, 0, 1],
      transition: {
        repeat: Infinity,
        duration: 1,
        ease: "easeInOut"
      }
    }
  }

  return (
    <Typography {...typographyProps}>
      <AnimatePresence>
        {splitGraphemes(displayedText).map((char, index) => (
          <motion.span
            key={`${char}-${index}`}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: duration,
              ease: "easeOut",
              delay: index * (delay / 1000)
            }}
            style={{ display: 'inline-block' }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </AnimatePresence>
      
      {showCursor && (
        <motion.span
          variants={cursorVariants}
          animate="blinking"
          style={{
            display: 'inline-block',
            marginLeft: '2px',
            fontSize: 'inherit',
          }}
        >
          |
        </motion.span>
      )}
    </Typography>
  )
}

// 单词浮现动画组件
interface FadeInWordsProps extends Omit<TypographyProps, 'children'> {
  text: string
  delay?: number
  stagger?: number // 单词间的间隔
  direction?: 'up' | 'down' | 'left' | 'right'
  onComplete?: () => void
}

export const FadeInWords: React.FC<FadeInWordsProps> = ({
  text,
  delay = 0,
  stagger = 100,
  direction = 'up',
  onComplete,
  ...typographyProps
}) => {
  const words = text.split(' ')
  const [completedWords, setCompletedWords] = useState(0)

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: 20 }
      case 'down': return { y: -20 }
      case 'left': return { x: -20 }
      case 'right': return { x: 20 }
      default: return { y: 20 }
    }
  }

  const handleWordComplete = () => {
    const newCount = completedWords + 1
    setCompletedWords(newCount)
    if (newCount === words.length) {
      onComplete?.()
    }
  }

  return (
    <Typography {...typographyProps}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ 
            opacity: 0, 
            ...getInitialPosition(),
            scale: 0.9
          }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            y: 0, 
            scale: 1 
          }}
          transition={{
            duration: 0.6,
            delay: delay / 1000 + index * (stagger / 1000),
            ease: "easeOut"
          }}
          style={{ 
            display: 'inline-block',
            marginRight: index < words.length - 1 ? '0.5ch' : 0
          }}
          onAnimationComplete={index === words.length - 1 ? handleWordComplete : undefined}
        >
          {word}
        </motion.span>
      ))}
    </Typography>
  )
}

// 字符分散动画组件  
interface ScatterTextProps extends Omit<TypographyProps, 'children'> {
  text: string
  trigger?: boolean
  delay?: number
  onComplete?: () => void
}

export const ScatterText: React.FC<ScatterTextProps> = ({
  text,
  trigger = true,
  delay = 0,
  onComplete,
  ...typographyProps
}) => {
  return (
    <Typography {...typographyProps}>
      {splitGraphemes(text).map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          initial={{ 
            opacity: 0, 
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50,
            rotate: Math.random() * 360 - 180,
            scale: 0
          }}
          animate={trigger ? { 
            opacity: 1, 
            x: 0, 
            y: 0, 
            rotate: 0,
            scale: 1 
          } : {}}
          transition={{
            duration: 0.8,
            delay: delay / 1000 + index * 0.05,
            ease: "easeOut"
          }}
          style={{ display: 'inline-block' }}
          onAnimationComplete={index === text.length - 1 ? onComplete : undefined}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </Typography>
  )
}
