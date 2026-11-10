import { notFound } from "next/navigation";
import { Suspense } from "react";
import Centered from "@/components/Centered";
import VersionView from "@/components/VersionView";
import { getConfig } from "@/lib/config";
import { getVersionDiff } from "@/lib/diff";
import { listScreenshots, listStaticVersionIds } from "@/lib/r2";
import { toVersion } from "@/lib/versions";

// The main branch and newest releases are prerendered at build time.
// Older releases render on first request and are cached from then on.
export async function generateStaticParams() {
  const ids = await listStaticVersionIds();
  return ids.map((version) => ({ version }));
}

export default function VersionPage({ params }: PageProps<"/v/[version]">) {
  return (
    <Suspense fallback={<Centered />}>
      <VersionCanvas params={params} />
    </Suspense>
  );
}

async function VersionCanvas({ params }: Pick<PageProps<"/v/[version]">, "params">) {
  const { version } = await params;
  const screenshots = await listScreenshots(version);
  if (screenshots.length === 0) notFound();
  const diff = await getVersionDiff(version);

  const { org, repo } = getConfig();
  return (
    <VersionView
      title={toVersion(version).label}
      subtitle={`${org} / ${repo}`}
      pages={screenshots.map((s) => ({ ...s, diff: diff?.pages[s.name] }))}
      comparison={
        diff
          ? { previousLabel: diff.previous.label, percent: diff.percent, removed: diff.removed }
          : undefined
      }
    />
  );
}
