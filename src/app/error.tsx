"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Page } from "@/components/ui/primitives";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Page className="max-w-xl py-24">
      <h1 className="text-[30px] text-fg">This view failed to load</h1>
      <p className="mt-2 text-[15px] text-fg-2">
        Something went wrong while rendering this page. Try again. If the 3D view is the problem, a browser with hardware acceleration enabled usually fixes it.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/" variant="secondary">
          Go to dashboard
        </ButtonLink>
      </div>
    </Page>
  );
}
