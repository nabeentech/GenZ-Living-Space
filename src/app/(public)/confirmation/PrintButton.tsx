"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import Button from "@/components/ui/Button";
import { Download, Printer } from "lucide-react";

interface PrintButtonProps {
  bookingId: string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({ bookingId }) => {
  useEffect(() => {
    // Fire confetti celebration on landing
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366F1", "#EC4899", "#00F5D4", "#FEE440"],
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <a href={`/api/invoices/${bookingId}/pdf?print=1`} target="_blank" rel="noreferrer">
        <Button variant="glow" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
          Print Invoice
        </Button>
      </a>
      <a href={`/api/invoices/${bookingId}/pdf`} download>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
          Download PDF
        </Button>
      </a>
    </div>
  );
};

export default PrintButton;
