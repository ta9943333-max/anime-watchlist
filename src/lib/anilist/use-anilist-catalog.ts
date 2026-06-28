"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  ensureAnilistCatalogLoaded,
  getAnilistCatalogState,
  subscribeAnilistCatalog,
} from "@/lib/anilist/catalog-store";

export function useAnilistCatalog() {
  const catalog = useSyncExternalStore(
    subscribeAnilistCatalog,
    getAnilistCatalogState,
    getAnilistCatalogState,
  );

  useEffect(() => {
    void ensureAnilistCatalogLoaded();
  }, []);

  return catalog;
}
