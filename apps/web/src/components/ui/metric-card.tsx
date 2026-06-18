import { Badge } from "./badge";
import { Panel } from "./panel";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        {tone !== "neutral" ? <Badge variant={tone}>{tone === "warning" ? "Atenção" : "OK"}</Badge> : null}
      </div>
      <strong className="mt-2 block text-2xl font-semibold tracking-[-0.02em]">{value}</strong>
      {detail ? <p className="mt-1 text-xs text-[var(--subtle)]">{detail}</p> : null}
    </Panel>
  );
}
