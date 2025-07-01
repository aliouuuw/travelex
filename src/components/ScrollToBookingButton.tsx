"use client";

import { Button } from "@/components/ui/button";
import React from "react";

interface ScrollToBookingButtonProps {
  targetId: string;
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  // Allow other valid Button props to be passed through
  [key: string]: unknown; 
}

const ScrollToBookingButton: React.FC<ScrollToBookingButtonProps> = ({
  targetId,
  children,
  className,
  size,
  variant,
  ...rest 
}) => {
  const handleClick = () => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      className={className} 
      size={size} 
      variant={variant} 
      {...rest}
    >
      {children}
    </Button>
  );
};

export default ScrollToBookingButton; 