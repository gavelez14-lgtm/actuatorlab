import { ButtonLink, Page } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Page className="max-w-xl py-24">
      <p className="num font-display text-[64px] font-semibold leading-none text-muted">404</p>
      <h1 className="mt-3 text-[30px] text-fg">That page does not exist</h1>
      <p className="mt-2 text-[15px] text-fg-2">The link may be out of date. Head back to the dashboard, or open the simulator.</p>
      <div className="mt-6 flex gap-2">
        <ButtonLink href="/" variant="primary">
          Go to dashboard
        </ButtonLink>
        <ButtonLink href="/simulator" variant="secondary">
          Open simulator
        </ButtonLink>
      </div>
    </Page>
  );
}
