"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  label?: string;
  nextPath?: string;
  className?: string;
  variant?: "white" | "dark" | "outline";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = "Continue with Google",
  nextPath,
  className = "",
  variant = "white",
  disabled = false,
  size = "md",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (disabled || isLoading) return;
    setIsLoading(true);

    let target = "/api/auth/google";
    const dest = nextPath || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null);
    if (dest && dest.startsWith("/") && !dest.startsWith("//")) {
      target += `?next=${encodeURIComponent(dest)}`;
    }

    window.location.href = target;
  };

  const sizeClasses = {
    sm: "py-2 px-3 text-xs gap-2 rounded-xl",
    md: "py-3 px-4 text-sm gap-3 rounded-xl",
    lg: "py-3.5 px-6 text-base gap-3.5 rounded-2xl",
  };

  const variantClasses = {
    white:
      "bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-md hover:shadow-lg focus:ring-slate-300",
    dark:
      "bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 shadow-md hover:shadow-lg focus:ring-indigo-500",
    outline:
      "bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 focus:ring-indigo-500",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={label}
      className={`w-full inline-flex items-center justify-center font-bold tracking-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F19] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500 shrink-0" />
      ) : (
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
};

export default GoogleSignInButton;
