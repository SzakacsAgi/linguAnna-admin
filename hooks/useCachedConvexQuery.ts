"use client";

import { useConvex } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { useEffect, useMemo, useState } from "react";

type CacheEntry<T> = {
  watch: any;
  value: T | undefined;
  listeners: Array<() => void>;
  unsubscribe: (() => void) | null;
};

const cache = new Map<string, CacheEntry<any>>();

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "number" || t === "boolean") return String(value);
  if (t === "undefined") return "undefined";
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(",")}}`;
  }
  // functions/symbols shouldn't appear in args; fall back.
  return JSON.stringify(value);
}

export function useCachedConvexQuery<Query extends FunctionReference<"query">>(
  queryKey: string,
  query: Query,
  args: FunctionArgs<Query> | "skip" = {} as FunctionArgs<Query>,
): FunctionReturnType<Query> | undefined {
  const convex = useConvex();

  // Some Convex `api.*` function references can be unstable across renders.
  // We key the cache by `queryKey`, so we can safely stabilize the function
  // reference for the lifetime of this hook instance.
  const stableQuery = useMemo(() => query, [queryKey]);

  const cacheKey = useMemo(() => {
    if (args === "skip") return null;
    return `${queryKey}:${stableStringify(args)}`;
  }, [queryKey, args]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!cacheKey) return;

    let entry = cache.get(cacheKey);

    if (!entry) {
      const watch = (convex as any).watchQuery(
        stableQuery,
        args === "skip" ? {} : args,
      );
      entry = {
        watch,
        value: watch.localQueryResult(),
        listeners: [],
        unsubscribe: null,
      };

      entry.unsubscribe = watch.onUpdate(() => {
        entry!.value = watch.localQueryResult();
        // Copy to avoid issues if a listener removes itself.
        entry!.listeners.slice().forEach((listener) => listener());
      });

      cache.set(cacheKey, entry);
    }

    const listener = () => setTick((x) => x + 1);
    entry.listeners.push(listener);

    // Ensure we render the current cached value immediately.
    listener();

    return () => {
      entry!.listeners = entry!.listeners.filter((l) => l !== listener);
      // Intentionally keep the watch subscription alive.
    };
  }, [cacheKey, convex, stableQuery]);

  if (!cacheKey) return undefined;
  // tick is used to re-render when the cache updates.
  void tick;

  const entry = cache.get(cacheKey);
  return entry?.value as FunctionReturnType<Query> | undefined;
}
