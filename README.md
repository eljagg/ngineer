# NGINEER

Visual AI-powered NGINEER.

## Purpose

This app is designed to help network engineers build, document, troubleshoot, validate, and eventually deploy network infrastructure safely.

Core direction:

- Visual network source of truth using Neo4j
- IPAM
- Device/port/interface mapping
- Traffic path visualization
- MPLS service-provider support
- AI-assisted troubleshooting and config drafting
- Documentation-grounded recommendations
- Safe config generation with validation, approval, and rollback

## Local setup

```bash
cd /workspaces/ngineer
npm install
cp .env.example .env.local
openssl rand -base64 48
code .env.local
npm run dev
```

Add your Neo4j values in `.env.local`:

```env
NEO4J_URI="neo4j+s://your-instance.databases.neo4j.io"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="your-password"
NEO4J_DATABASE="neo4j"
```

Do not commit `.env.local`.

## Useful routes

- `/` dashboard
- `/network` visual network source of truth
- `/ipam` IPAM starter
- `/traffic-path` traffic-flow analyzer starter
- `/config-builder` config generation starter
- `/ai-assistant` AI assistant workspace starter
- `/docs` documentation catalog
- `/admin` admin control center
- `/api/health` app health
- `/api/neo4j/health` Neo4j connection health

## Validation

```bash
npm run test
npm run typecheck
npm run build
```

## Neo4j seed

After `.env.local` is configured and dependencies are installed:

```bash
set -a
source .env.local
set +a
npm run neo4j:seed
```


## v0.1.1 Visual Command Center

- Reworked the dashboard away from stacked hero wording.
- Added a compact command-center landing page.
- Made the topology workspace the primary visual area.
- Kept the rule that every config must show local and remote port/interface mapping.


## v0.1.2 Open Topology Canvas

- Reworked the dashboard and network page around an open topology canvas.
- Removed border-heavy canvas/card treatment that cramped the network view.
- Made demo topology data clearly visible until real Neo4j topology data is loaded.
- Added visible link labels for local port to remote port mappings.
- Added a topology builder-style workspace with simple tool actions.
