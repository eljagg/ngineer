import { NetworkFlowCanvas } from "@/components/NetworkFlowCanvas";

export default function NetworkPage() {
  return (
    <section className="network-max-canvas" aria-label="NGINEER full-screen topology canvas">
      <NetworkFlowCanvas />
    </section>
  );
}
