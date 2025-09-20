'use client'

import { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dots' | 'pulse'
  text?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'default',
  text,
  className,
  ...props 
}: LoadingSpinnerProps) => {
  if (variant === 'dots') {
    return (
      <div className={clsx("flex flex-col items-center space-y-4", className)} {...props}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={clsx(
                "bg-spotify-green rounded-full",
                size === 'sm' ? 'w-2 h-2' : 
                size === 'md' ? 'w-3 h-3' :
                size === 'lg' ? 'w-4 h-4' : 'w-5 h-5'
              )}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
        {text && (
          <motion.p 
            className="text-spotify-gray text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={clsx("flex flex-col items-center space-y-4", className)} {...props}>
        <motion.div
          className={clsx(
            "bg-spotify-green rounded-full",
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {text && (
          <motion.p 
            className="text-spotify-gray text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    )
  }

  return (
    <div className={clsx("flex flex-col items-center space-y-4", className)} {...props}>
      <div className={clsx("spinner", sizeClasses[size])} />
      {text && (
        <motion.p 
          className="text-spotify-gray text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

export { LoadingSpinner }
