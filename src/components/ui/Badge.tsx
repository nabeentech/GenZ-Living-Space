import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "available"
    | "reserved"
    | "occupied"
    | "cleaning"
    | "maintenance"
    | "default"
    | "indigo"
    | "coral"
    | "cyan"
    | "success"
    | "warning"
    | "danger";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  dot = false,
}) => {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium gap-1",
    md: "text-xs px-2.5 py-1 font-semibold gap-1.5",
  };

  const variantStyles = {
    available: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    reserved: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    occupied: "bg-purple-500/10 text-purple-300 border border-purple-500/20",
    cleaning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    maintenance: "bg-red-500/10 text-red-400 border border-red-500/20",
    default: "bg-slate-800 text-slate-300 border border-slate-700",
    indigo: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    coral: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    cyan: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    danger: "bg-red-500/15 text-red-300 border border-red-500/30",
  };

  const dotColors = {
    available: "bg-emerald-400",
    reserved: "bg-blue-400",
    occupied: "bg-purple-400",
    cleaning: "bg-amber-400",
    maintenance: "bg-red-400",
    default: "bg-slate-400",
    indigo: "bg-indigo-400",
    coral: "bg-rose-400",
    cyan: "bg-cyan-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-red-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export default Badge;
