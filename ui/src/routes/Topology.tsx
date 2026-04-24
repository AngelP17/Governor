import { useEffect, useState } from "react";
import { GitOpsPipeline } from "../components/topology/GitOpsPipeline";
import { NodeInspector } from "../components/topology/NodeInspector";
import { TopologyMap } from "../components/topology/TopologyMap";
import { LoadingState } from "../components/shared/States";
import { SectionHeader } from "../components/shared/SectionHeader";
import { api } from "../lib/api";
import type { Topology, TopologyNode } from "../lib/types";

export function TopologyPage() {
  const [topology, setTopology] = useState<Topology>();
  const [selected, setSelected] = useState<TopologyNode>();

  useEffect(() => {
    api.topology().then((result) => {
      setTopology(result.data);
      setSelected(result.data.nodes[0]);
    });
  }, []);

  if (!topology || !selected) return <LoadingState />;

  return (
    <div className="mx-auto max-w-[1460px]">
      <SectionHeader eyebrow="Topology and GitOps" title="Architecture, data flow, and desired state reconciliation" description="The map shows how traffic, metrics, alerting, GitOps, and chaos workflow move through the local Kubernetes environment." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <TopologyMap topology={topology} selected={selected.id} onSelect={setSelected} />
        <NodeInspector node={selected} />
      </div>
      <div className="mt-6"><GitOpsPipeline /></div>
    </div>
  );
}
