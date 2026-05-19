import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#222222] bg-[#111111] p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <h3 className={cn('text-sm font-medium text-[#888888] uppercase tracking-wider', className)}>
      {children}
    </h3>
  )
}

export function CardValue({ className, children }: CardProps) {
  return (
    <p className={cn('mt-1 text-2xl font-semibold text-white', className)}>
      {children}
    </p>
  )
}

export function CardDescription({ className, children }: CardProps) {
  return (
    <p className={cn('mt-1 text-xs text-[#888888]', className)}>
      {children}
    </p>
  )
}
