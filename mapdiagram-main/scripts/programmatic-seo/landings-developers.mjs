export const LANDINGS_DEVELOPERS = [
  {
    slug: "developers",
    label: "Developers",
    title: "Diagram Tool for Developers | MapDiagram",
    description:
      "MapDiagram helps developers sketch services, flows, and system boundaries fast—without fighting rigid diagram templates or heavyweight installs.",
    h1: "Diagram tool for developers",
    hero:
      "When specs live in chat threads and tickets, a single visual map keeps everyone aligned before you commit code.",
    problem:
      "Most diagram tools slow you down: stale templates, export friction, and layouts that fight refactors. You need something that matches the pace of iteration.",
    solution:
      "MapDiagram gives you a lightweight canvas to map components, APIs, and flows so you can reason visually, then return to your editor with clarity.",
    useCases: [
      "Draft service boundaries before splitting a monolith",
      "Explain request paths to reviewers in a pull request",
      "Capture on-call incident timelines as a clear sequence",
      "Align on data contracts between backend and frontend teams",
      "Turn RFC notes into a shareable architecture snapshot",
    ],
    ai:
      "Use MapDiagram to translate messy notes into structured diagrams, then refine the layout as your design evolves—ideal when you are exploring options before locking a design doc.",
  },
  {
    slug: "software-engineers",
    label: "Software Engineers",
    title: "Diagram Tool for Software Engineers | MapDiagram",
    description:
      "Visualize modules, dependencies, and workflows with MapDiagram—a fast browser-based diagram workspace built for everyday engineering work.",
    h1: "Diagram tool for software engineers",
    hero:
      "Software engineering is part coding, part communication. Diagrams make the invisible structure obvious to your team.",
    problem:
      "Engineers often default to walls of text because diagramming feels like a separate project. That hides assumptions and increases rework.",
    solution:
      "MapDiagram keeps diagramming light so you can model what matters, share a link, and move on without a toolchain detour.",
    useCases: [
      "Map module ownership across a growing codebase",
      "Show deployment steps for a risky release",
      "Compare two implementation options side by side",
      "Document error handling paths for a critical service",
      "Plan incremental migrations with staged checkpoints",
    ],
    ai:
      "MapDiagram helps you iterate visually: start rough, tighten labels, and keep the diagram aligned with the story you are telling in code review.",
  },
  {
    slug: "backend-developers",
    label: "Backend Developers",
    title: "Diagram Tool for Backend Developers | MapDiagram",
    description:
      "Model queues, databases, APIs, and service interactions with MapDiagram—built for backend teams who need clarity without ceremony.",
    h1: "Diagram tool for backend developers",
    hero:
      "Backend systems are graphs: services, queues, caches, and schemas. A diagram makes those relationships legible in minutes.",
    problem:
      "When only one person holds the mental model, incidents take longer and changes become risky. Text logs do not replace a map.",
    solution:
      "MapDiagram helps you capture the moving parts quickly, highlight failure domains, and communicate change with a shared picture.",
    useCases: [
      "Trace a user request across services and data stores",
      "Design idempotency and retry behavior visually",
      "Plan cache invalidation flows before implementation",
      "Show how events propagate through async workers",
      "Align on schema changes with a simple dependency map",
    ],
    ai:
      "MapDiagram is useful when you are translating partial logs and metrics into a coherent story—sketch, validate with peers, then keep the diagram as living context.",
  },
  {
    slug: "frontend-developers",
    label: "Frontend Developers",
    title: "Diagram Tool for Frontend Developers | MapDiagram",
    description:
      "MapDiagram helps frontend teams diagram UI flows, state transitions, and integration points with backend APIs—right in the browser.",
    h1: "Diagram tool for frontend developers",
    hero:
      "Frontend work spans components, routes, and data fetching. A diagram keeps UX logic from collapsing into tribal knowledge.",
    problem:
      "Complex screens hide edge cases. Without a visual map, teams debate behavior from memory instead of a shared reference.",
    solution:
      "MapDiagram makes it easy to chart user paths, component boundaries, and API touchpoints so reviews stay grounded.",
    useCases: [
      "Map happy-path and edge-case flows for a new screen",
      "Show how client state syncs with server responses",
      "Plan feature flags across routes and components",
      "Explain accessibility-focused interaction order",
      "Coordinate loading and error UI across async calls",
    ],
    ai:
      "MapDiagram supports fast iteration as designs shift—adjust nodes when UX changes, and keep the diagram as a lightweight spec companion.",
  },
  {
    slug: "devops-engineers",
    label: "DevOps Engineers",
    title: "Diagram Tool for DevOps Engineers | MapDiagram",
    description:
      "Document pipelines, environments, and infrastructure flows with MapDiagram—clear visuals for teams that ship and operate software.",
    h1: "Diagram tool for DevOps engineers",
    hero:
      "Reliability starts with shared understanding. MapDiagram helps you show how code becomes a running system.",
    problem:
      "Runbooks without visuals leave gaps. New teammates struggle to learn environments when knowledge is scattered across tools.",
    solution:
      "MapDiagram gives you a fast way to chart pipelines, dependencies, and ownership so operational work is easier to audit.",
    useCases: [
      "Visualize CI/CD stages and promotion gates",
      "Map secrets and config flows across environments",
      "Show traffic paths through load balancers and services",
      "Plan rollback steps for high-risk changes",
      "Document observability signals tied to components",
    ],
    ai:
      "MapDiagram helps you turn incident learnings into a diagram you can reuse—so the next drill starts from a clearer baseline.",
  },
  {
    slug: "system-architects",
    label: "System Architects",
    title: "Diagram Tool for System Architects | MapDiagram",
    description:
      "MapDiagram supports architects who need crisp diagrams for tradeoffs, constraints, and evolving system boundaries.",
    h1: "Diagram tool for system architects",
    hero:
      "Architecture is a conversation. MapDiagram helps you keep that conversation anchored in a diagram that updates as decisions land.",
    problem:
      "Heavyweight modeling tools can stall early thinking. You need speed when options are still fluid and stakeholders are waiting.",
    solution:
      "MapDiagram focuses on clarity: sketch constraints, compare approaches, and communicate intent without getting lost in tooling.",
    useCases: [
      "Compare candidate architectures for a new platform initiative",
      "Show trust boundaries and data residency constraints",
      "Illustrate evolution from current state to target state",
      "Align product and engineering on non-functional requirements",
      "Capture decision records with a simple visual appendix",
    ],
    ai:
      "MapDiagram is a practical place to iterate architecture narratives—refine the diagram as assumptions change, without rebuilding a formal model from scratch.",
  },
  {
    slug: "mobile-developers",
    label: "Mobile Developers",
    title: "Diagram Tool for Mobile Developers | MapDiagram",
    description:
      "Plan navigation, offline behavior, and API usage with MapDiagram—visual structure for iOS and Android teams.",
    h1: "Diagram tool for mobile developers",
    hero:
      "Mobile apps are event-driven and network-sensitive. Diagrams help your team see flows beyond a single screen file.",
    problem:
      "When navigation and state sprawl, bugs cluster around edge transitions. Text alone rarely captures the full journey.",
    solution:
      "MapDiagram helps you chart screens, transitions, and background behaviors so QA and backend partners know what to expect.",
    useCases: [
      "Map deep links into your navigation stack",
      "Show offline-first sync and conflict resolution",
      "Plan push notification handling paths",
      "Document permission prompts across features",
      "Align on analytics events across user journeys",
    ],
    ai:
      "MapDiagram makes it easier to stress-test flows visually—spot missing branches early, then implement with fewer surprises.",
  },
  {
    slug: "full-stack-developers",
    label: "Full-Stack Developers",
    title: "Diagram Tool for Full-Stack Developers | MapDiagram",
    description:
      "Connect UI flows to service calls and data models using MapDiagram—one canvas for end-to-end thinking.",
    h1: "Diagram tool for full-stack developers",
    hero:
      "Full-stack work spans layers. A diagram keeps the end-to-end story coherent when you are the glue across teams.",
    problem:
      "Split-brain specs lead to mismatched assumptions between what the UI promises and what the API delivers.",
    solution:
      "MapDiagram helps you stitch layers together visually so gaps show up before they become production defects.",
    useCases: [
      "Trace a feature from UI event to database write",
      "Plan pagination and filtering across client and server",
      "Show auth flows spanning cookies, tokens, and redirects",
      "Coordinate caching between browser and API layers",
      "Explain feature toggles affecting multiple surfaces",
    ],
    ai:
      "MapDiagram supports holistic iteration: adjust one branch and see how it impacts the whole story from client to server.",
  },
  {
    slug: "open-source-maintainers",
    label: "Open Source Maintainers",
    title: "Diagram Tool for Open Source Maintainers | MapDiagram",
    description:
      "Help contributors onboard faster with diagrams for architecture, release flow, and governance—built for public collaboration.",
    h1: "Diagram tool for open source maintainers",
    hero:
      "Great OSS projects reduce friction for newcomers. A clear diagram is one of the fastest ways to communicate intent.",
    problem:
      "READMEs age quickly. Without visuals, contributors misread boundaries and open duplicate issues or conflicting PRs.",
    solution:
      "MapDiagram helps maintainers publish approachable maps of modules, workflows, and decision points for the community.",
    useCases: [
      "Explain plugin boundaries and extension points",
      "Show how releases and versioning relate to branches",
      "Map issue triage and maintainer responsibilities",
      "Visualize security-sensitive code paths for reviewers",
      "Illustrate migration guides with stepwise flows",
    ],
    ai:
      "MapDiagram helps you keep contributor docs visually current—update a map when structure changes, and link it from your contributing guide.",
  },
  {
    slug: "api-designers",
    label: "API Designers",
    title: "Diagram Tool for API Designers | MapDiagram",
    description:
      "Sketch resource models, call sequences, and versioning strategies with MapDiagram—clarity for API design reviews.",
    h1: "Diagram tool for API designers",
    hero:
      "APIs are contracts. Diagrams make those contracts tangible before engineers invest weeks in implementation.",
    problem:
      "Ambiguous endpoints create integration churn. Sequencing errors show up late when clients assume different ordering.",
    solution:
      "MapDiagram helps you visualize resources, relationships, and call sequences so consumers and producers align early.",
    useCases: [
      "Model resources and relationships for a new surface",
      "Show pagination and filtering contracts clearly",
      "Compare breaking vs non-breaking versioning paths",
      "Document webhook delivery and retry expectations",
      "Align error shapes across services and clients",
    ],
    ai:
      "MapDiagram supports collaborative API design—iterate the diagram in review, then anchor generated docs to the same mental model.",
  },
  {
    slug: "engineering-managers",
    label: "Engineering Managers",
    title: "Diagram Tool for Engineering Managers | MapDiagram",
    description:
      "Communicate priorities, dependencies, and delivery risks with MapDiagram—visual planning for engineering leadership.",
    h1: "Diagram tool for engineering managers",
    hero:
      "Your team needs direction, not just deadlines. Diagrams translate strategy into something engineers can execute against.",
    problem:
      "Roadmap slides without structure create thrash. Teams guess dependencies and duplicate work across squads.",
    solution:
      "MapDiagram helps managers map initiatives, ownership, and sequencing so planning meetings end with shared clarity.",
    useCases: [
      "Show cross-team dependencies for a quarterly goal",
      "Visualize staffing risks against critical milestones",
      "Explain technical debt paydown alongside feature work",
      "Align stakeholders on scope cuts with a simple flow",
      "Document incident response ownership and escalation",
    ],
    ai:
      "MapDiagram helps leaders keep plans honest—when the diagram does not close, the plan probably is not ready either.",
  },
  {
    slug: "tech-leads",
    label: "Tech Leads",
    title: "Diagram Tool for Tech Leads | MapDiagram",
    description:
      "Lead technical direction with crisp diagrams for approach, tradeoffs, and rollout—MapDiagram keeps discussions concrete.",
    h1: "Diagram tool for tech leads",
    hero:
      "Tech leads translate ambiguity into decisions. A diagram is often the fastest path to alignment.",
    problem:
      "Debates drift when everyone imagines a different architecture. Written specs help, but visuals prevent misread structure.",
    solution:
      "MapDiagram gives tech leads a lightweight way to propose approaches, compare options, and record the chosen direction.",
    useCases: [
      "Present two implementation options with clear tradeoffs",
      "Show phased rollout and feature flag strategy",
      "Map testing strategy across layers and environments",
      "Explain refactoring boundaries to the wider team",
      "Capture review feedback as adjustments to a shared map",
    ],
    ai:
      "MapDiagram supports iterative technical leadership—update the diagram as the team learns, and keep it as a living decision artifact.",
  },
  {
    slug: "qa-engineers",
    label: "QA Engineers",
    title: "Diagram Tool for QA Engineers | MapDiagram",
    description:
      "Design test coverage maps, flows, and edge cases visually with MapDiagram—better QA planning with less ambiguity.",
    h1: "Diagram tool for QA engineers",
    hero:
      "Quality is about understanding paths. Diagrams help QA teams see what to test beyond the happy path.",
    problem:
      "When requirements are implicit, tests miss real-world branches. Bugs slip through the gaps between imagined and actual behavior.",
    solution:
      "MapDiagram helps QA engineers chart flows, states, and data conditions so coverage plans match reality.",
    useCases: [
      "Map exploratory testing charters across a feature",
      "Show regression scope tied to changed components",
      "Document flaky test dependencies and environments",
      "Align with dev on boundary cases before release",
      "Visualize user personas against critical workflows",
    ],
    ai:
      "MapDiagram helps QA turn questions into maps—if you cannot draw it, you probably have not defined the behavior yet.",
  },
  {
    slug: "security-engineers",
    label: "Security Engineers",
    title: "Diagram Tool for Security Engineers | MapDiagram",
    description:
      "Threat model faster with clear diagrams for trust boundaries, data flows, and controls—MapDiagram for security reviews.",
    h1: "Diagram tool for security engineers",
    hero:
      "Security reviews need precision. A diagram exposes assumptions that text-heavy narratives hide.",
    problem:
      "Without a system picture, teams debate risks abstractly. That slows reviews and misses real attack paths.",
    solution:
      "MapDiagram helps security engineers illustrate flows, boundaries, and control points so fixes land in the right place.",
    useCases: [
      "Map data flows across services and third parties",
      "Show authentication and authorization checkpoints",
      "Illustrate secrets handling across build and runtime",
      "Document incident timelines for postmortems",
      "Align developers on least-privilege access patterns",
    ],
    ai:
      "MapDiagram supports iterative threat modeling—start with a rough flow, then tighten as you validate trust boundaries with owners.",
  },
  {
    slug: "data-engineers",
    label: "Data Engineers",
    title: "Diagram Tool for Data Engineers | MapDiagram",
    description:
      "Visualize pipelines, datasets, and SLAs with MapDiagram—clarity for data platforms and analytics engineering teams.",
    h1: "Diagram tool for data engineers",
    hero:
      "Data systems are pipelines of contracts. Diagrams keep lineage and dependencies understandable as volume grows.",
    problem:
      "When pipelines fail, stakeholders need a map—not a spreadsheet of table names—to see upstream causes quickly.",
    solution:
      "MapDiagram helps data engineers chart ingestion, transforms, and consumers so operational work scales with the platform.",
    useCases: [
      "Show batch vs streaming paths for a dataset",
      "Map schema evolution across warehouses and lakes",
      "Document SLAs and freshness expectations by domain",
      "Plan backfills with ordered dependency steps",
      "Align analysts on metric definitions tied to sources",
    ],
    ai:
      "MapDiagram helps teams narrate data change visually—when a pipeline shifts, update the diagram and reduce surprise downstream.",
  },
];
