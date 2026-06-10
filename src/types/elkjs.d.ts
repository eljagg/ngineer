declare module "elkjs/lib/elk.bundled.js" {
  export default class ELK {
    layout(graph: Record<string, unknown>): Promise<Record<string, unknown> & { children?: Array<{ id: string; x?: number; y?: number }> }>;
  }
}
