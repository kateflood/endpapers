interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
}

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center px-6 py-2.5 rounded-sm text-[0.9375rem] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary:
      'bg-accent text-white border border-accent transition-opacity enabled:hover:opacity-[0.82]',
    ghost:
      'bg-transparent text-text border border-border transition-[border-color,background] enabled:hover:border-text-secondary enabled:hover:bg-black/[0.02]',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
