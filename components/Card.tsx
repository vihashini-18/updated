import React from 'react';

// FIX: Extend React.HTMLAttributes<HTMLDivElement> to allow passing standard div props like `style`.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    // FIX: Spread `...props` to pass down attributes like `style` to the underlying div.
    <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
