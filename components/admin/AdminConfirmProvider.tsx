"use client";

import * as React from "react";
import {
  AdminConfirmModal,
  type AdminConfirmModalVariant,
} from "@/components/admin/AdminConfirmModal";

type BaseConfirmOptions = {
  title: string;
  description?: React.ReactNode;

  confirmText?: string;
  confirmTextPending?: string;
  cancelText?: string;

  variant?: AdminConfirmModalVariant;
};

export type AdminConfirmOptions = BaseConfirmOptions & {
  showCancel?: boolean;
};

export type AdminConfirmActionOptions = BaseConfirmOptions & {
  action: () => void | Promise<void>;
  onError?: (error: unknown) => void;
};

export type AdminMessageOptions = {
  title: string;
  description?: React.ReactNode;
  buttonText?: string;
};

type AdminConfirmContextValue = {
  confirm: (options: AdminConfirmOptions) => Promise<boolean>;
  confirmAction: (options: AdminConfirmActionOptions) => Promise<boolean>;
  message: (options: AdminMessageOptions) => Promise<void>;
};

const AdminConfirmContext =
  React.createContext<AdminConfirmContextValue | null>(null);

type PendingRequest =
  | {
      type: "confirm";
      options: AdminConfirmOptions;
    }
  | {
      type: "confirmAction";
      options: AdminConfirmActionOptions;
    }
  | {
      type: "message";
      options: AdminMessageOptions;
    };

export function AdminConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [request, setRequest] = React.useState<PendingRequest | null>(null);

  const hasActiveDialog = open || request !== null;

  const resolverRef = React.useRef<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const messageResolverRef = React.useRef<{
    resolve: () => void;
  } | null>(null);

  const close = React.useCallback(() => {
    setOpen(false);
    setRequest(null);
    resolverRef.current = null;
    messageResolverRef.current = null;
  }, []);

  const confirm = React.useCallback(
    (options: AdminConfirmOptions) => {
      if (hasActiveDialog) {
        return Promise.reject(
          new Error("Another admin confirm dialog is already open"),
        );
      }
      return new Promise<boolean>((resolve) => {
        resolverRef.current = { resolve };
        messageResolverRef.current = null;
        setRequest({ type: "confirm", options });
        setOpen(true);
      });
    },
    [hasActiveDialog],
  );

  const confirmAction = React.useCallback(
    (options: AdminConfirmActionOptions) => {
      if (hasActiveDialog) {
        return Promise.reject(
          new Error("Another admin confirm dialog is already open"),
        );
      }
      return new Promise<boolean>((resolve) => {
        resolverRef.current = { resolve };
        messageResolverRef.current = null;
        setRequest({ type: "confirmAction", options });
        setOpen(true);
      });
    },
    [hasActiveDialog],
  );

  const message = React.useCallback(
    (options: AdminMessageOptions) => {
      if (hasActiveDialog) {
        return Promise.reject(
          new Error("Another admin confirm dialog is already open"),
        );
      }
      return new Promise<void>((resolve) => {
        messageResolverRef.current = { resolve };
        resolverRef.current = null;
        setRequest({ type: "message", options });
        setOpen(true);
      });
    },
    [hasActiveDialog],
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        if (request?.type === "message") {
          messageResolverRef.current?.resolve();
        } else {
          resolverRef.current?.resolve(false);
        }
        close();
      }
    },
    [close, request?.type],
  );

  const handleConfirm = React.useCallback(async () => {
    if (!request) return;

    if (request.type === "message") {
      messageResolverRef.current?.resolve();
      close();
      return;
    }

    if (request.type === "confirm") {
      resolverRef.current?.resolve(true);
      close();
      return;
    }

    // confirmAction
    try {
      await request.options.action();
      resolverRef.current?.resolve(true);
      close();
    } catch (error) {
      request.options.onError?.(error);
      // Keep dialog open, allow retry or cancel.
    }
  }, [close, request]);

  const contextValue = React.useMemo<AdminConfirmContextValue>(
    () => ({ confirm, confirmAction, message }),
    [confirm, confirmAction, message],
  );

  const modalProps = React.useMemo<null | {
    title: string;
    description?: React.ReactNode;
    confirmText?: string;
    confirmTextPending?: string;
    cancelText?: string;
    variant?: AdminConfirmModalVariant;
    showCancel: boolean;
  }>(() => {
    if (!request) return null;

    if (request.type === "message") {
      return {
        title: request.options.title,
        description: request.options.description,
        confirmText: request.options.buttonText ?? "OK",
        variant: "default",
        showCancel: false,
      };
    }

    if (request.type === "confirm") {
      return {
        title: request.options.title,
        description: request.options.description,
        confirmText: request.options.confirmText,
        confirmTextPending: request.options.confirmTextPending,
        cancelText: request.options.cancelText,
        variant: request.options.variant,
        showCancel: request.options.showCancel ?? true,
      };
    }

    return {
      title: request.options.title,
      description: request.options.description,
      confirmText: request.options.confirmText,
      confirmTextPending: request.options.confirmTextPending,
      cancelText: request.options.cancelText,
      variant: request.options.variant,
      showCancel: true,
    };
  }, [request]);

  return (
    <AdminConfirmContext.Provider value={contextValue}>
      {children}

      {modalProps ? (
        <AdminConfirmModal
          open={open}
          onOpenChange={handleOpenChange}
          title={modalProps.title}
          description={modalProps.description}
          confirmText={modalProps.confirmText}
          confirmTextPending={modalProps.confirmTextPending}
          cancelText={modalProps.cancelText}
          variant={modalProps.variant}
          showCancel={modalProps.showCancel}
          closeOnConfirm={false}
          onConfirm={handleConfirm}
        />
      ) : null}
    </AdminConfirmContext.Provider>
  );
}

export function useAdminConfirm() {
  const ctx = React.useContext(AdminConfirmContext);
  if (!ctx) {
    throw new Error(
      "useAdminConfirm must be used within an AdminConfirmProvider",
    );
  }
  return ctx;
}
