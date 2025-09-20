'use client'

import { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  showValue?: boolean
  label?: string
}

const variantClasses = {
  default: 'from-spotify-green to-spotify-green-hover',
  success: 'from-spotify-green to-spotify-green-hover',
  warning: 'from-spotify-yellow to-spotify-yellow-light',
  danger: 'from-spotify-red to-spotify-red-light'
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
}

const ProgressBar = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  animated = true,
  showValue = false,
  label,
  className,
  ...props
}: ProgressBarProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  return (
    <div className={clsx("space-y-2", className)} {...props}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-spotify-white font-medium">{label}</span>}
          {showValue && <span className="text-spotify-gray">{Math.round(percentage)}%</span>}
        </div>
      )}
      
      <div className={clsx("progress-bar", sizeClasses[size])}>
        <motion.div
          className={clsx(
            "progress-fill bg-gradient-to-r",
            variantClasses[variant]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={animated ? { 
            duration: 0.5, 
            ease: "easeOut",
            type: "spring",
            stiffness: 100,
            damping: 20
          } : undefined}
        />
      </div>
    </div>
  )
}

// Timer-specific progress bar
interface TimerProgressProps extends Omit<ProgressBarProps, 'value' | 'max'> {
  timeLeft: number
  totalTime: number
  onComplete?: () => void
}

const TimerProgress = ({
  timeLeft,
  totalTime,
  onComplete,
  variant = 'warning',
  ...props
}: TimerProgressProps) => {
  const percentage = (timeLeft / totalTime) * 100
  
  // Change color based on time remaining
  const getVariant = () => {
    if (percentage > 50) return 'success'
    if (percentage > 20) return 'warning' 
    return 'danger'
  }

  return (
    <ProgressBar
      value={timeLeft}
      max={totalTime}
      variant={getVariant()}
      {...props}
    />
  )
}

export { ProgressBar, TimerProgress }
