import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

type ButtonProps = {
  href?: ComponentProps<typeof Link>['href'];
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function Button({ href, type = 'button', variant = 'primary', children, className, onClick }: ButtonProps) {
  const classes = cn(variant === 'primary' ? 'btn-primary' : 'btn-secondary', className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}


