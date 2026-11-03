"use client";

import { useEffect } from "react";
import { useProgress } from "@/lib/progress";

/** Records a page in "recently explored" without rendering anything. */
export function TrackVisit({ id, title, href }: { id: string; title: string; href: string }) {
  const { touchRecent } = useProgress();
  useEffect(() => {
    touchRecent({ id, title, href });
  }, [id, title, href, touchRecent]);
  return null;
}
