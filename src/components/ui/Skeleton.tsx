import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  count = 1
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      case 'card':
        return 'rounded-2xl h-48 w-full';
      default: // text
        return 'rounded h-4 w-full';
    }
  };

  const renderSingle = (index: number) => (
    <div
      key={index}
      className={`animate-pulse bg-white/5 border border-white/5 ${getVariantStyles()} ${className}`}
    />
  );

  if (count > 1) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {Array.from({ length: count }).map((_, i) => renderSingle(i))}
      </div>
    );
  }

  return renderSingle(0);
};

export default Skeleton;
