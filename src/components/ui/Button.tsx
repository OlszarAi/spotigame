'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "btn-primary",
        secondary: "btn-secondary", 
        outline: "btn-outline",
        ghost: "btn-ghost",
        danger: "btn-danger"
      },
      size: {
        sm: "btn-sm",
        md: "py-3 px-6",
        lg: "btn-lg"
      },
      animation: {
        none: "",
        scale: "hover:scale-[1.02]",
        glow: "hover-glow",
        bounce: "hover:animate-bounce-subtle"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      animation: "scale"
    }
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  animation,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  disabled,
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      className={clsx(buttonVariants({ variant, size, animation }), className)}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <div className="spinner w-4 h-4" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="w-4 h-4 flex items-center justify-center">
          {icon}
        </span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="w-4 h-4 flex items-center justify-center">
          {icon}
        </span>
      )}
    </button>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
