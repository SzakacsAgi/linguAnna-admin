"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type AdminConfirmModalVariant = "default" | "destructive";

export interface AdminConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  description?: React.ReactNode;

  confirmText?: string;
  confirmTextPending?: string;
  cancelText?: string;

  variant?: AdminConfirmModalVariant;
  showCancel?: boolean;
  closeOnConfirm?: boolean;

  onConfirm: () => void | Promise<void>;
}

export function AdminConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  confirmTextPending = "Working…",
  cancelText = "Cancel",
  variant = "default",
  showCancel = true,
  closeOnConfirm = true,
  onConfirm,
}: AdminConfirmModalProps) {
  const [pending, setPending] = React.useState(false);

  const handleConfirm = async () => {
    if (pending) return;

    setPending(true);
    try {
      await onConfirm();
      if (closeOnConfirm) onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  const actionClasses =
    variant === "destructive"
      ? buttonVariants({ variant: "destructive" })
      : buttonVariants({ variant: "default" });

  return (
    <AlertDialog open={open} onOpenChange={pending ? () => { } : onOpenChange}>
      <AlertDialogContent
        className={cn(
          "rounded-2xl border border-[#D4B483]/25 bg-[#FAF6F0]",
          "sm:max-w-[520px]",
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-balance text-[#3B5249] [font-family:Georgia,serif]">
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-pretty text-[#3B5249]/70">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {showCancel ? (
            <AlertDialogCancel disabled={pending}>
              {cancelText}
            </AlertDialogCancel>
          ) : null}

          <AlertDialogAction
            disabled={pending}
            className={cn(actionClasses)}
            onClick={(e) => {
              // Prevent Radix from auto-closing before async finishes.
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {pending ? confirmTextPending : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface AdminMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  description?: React.ReactNode;

  buttonText?: string;
}

export function AdminMessageModal({
  open,
  onOpenChange,
  title,
  description,
  buttonText = "OK",
}: AdminMessageModalProps) {
  return (
    <AdminConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      showCancel={false}
      confirmText={buttonText}
      onConfirm={() => {
        onOpenChange(false);
      }}
    />
  );
}
