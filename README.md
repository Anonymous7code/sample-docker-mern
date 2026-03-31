# Pipeline 3 — Complete Step-by-Step Execution Guide

Let me walk you through every step like a senior engineer explaining to their team before a sprint. Not just *what* happens — but *why* it happens that way.

---

## The Mental Model First

Before any step, understand this:

```
Pipeline 3 is NOT a chatbot asking Claude
"please write me a React app."

It is a DETERMINISTIC MANUFACTURING PROCESS
where each stage produces a structured artifact
that the next stage consumes as raw material.

Just like a car assembly line:
  No station does everything.
  Each station does ONE thing perfectly.
  Output of Station A is input of Station B.
  Quality is checked at the end of each station.
  The whole line stops if a defective part
  moves to the next station.
```

---

## Full Execution Flow

```
INPUT DOCUMENTS
      │
      ▼
┌─────────────────┐
│  STEP 1         │  "Do we have everything we need?"
│  Input          │
│  Collection     │
│  & Validation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STEP 2         │  "Make documents searchable
│  Document       │   and understandable."
│  Processing     │
│  & Embedding    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STEP 3         │  "Extract visual design
│  HTML/CSS       │   before touching any code."
│  Parsing        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STEP 4         │  "Build the blueprint
│  Planning &     │   the entire team works from."
│  MBP Generation │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STEP 5         │  "Establish the single
│  Schema &       │   source of truth for types."
│  Contract       │
│  Generation     │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐ ┌────────┐
│ STEP 6 │ │ STEP 7 │  "Build backend and frontend
│Backend │ │Frontend│   in the right order."
│ Gen    │ │  Gen   │
└────┬───┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│  STEP 8         │  "Verify everything connects."
│  Integration    │
│  Validation     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STEP 9         │  "Package and deliver."
│  Assembly &     │
│  Output         │
└─────────────────┘
```

---

## STEP 1 — Input Collection & Validation

### What Happens
```
InputCollector reads every expected file,
validates it exists, is readable, is non-empty,
and is in the expected format.
```

### Why This Exists
```
COMMON MISTAKE: Skip validation, start generating.

What happens:
  Planning Agent runs for 3 minutes using
  8,000 tokens, produces a Master Build Plan.
  
  Backend Agent starts generating.
  
  Halfway through, it tries to read
  developer_guide.md which was never provided.
  
  Pipeline crashes. All tokens wasted.
  All time wasted.

CORRECT APPROACH: Fail in milliseconds at Step 1,
not after minutes of expensive LLM calls.
This is called "fail fast" — a core production
engineering principle.
```

### Exactly What It Does

```
FOR EACH expected input file:

  1. Does the file exist at the expected path?
     NO  → Raise InputValidationError immediately
             "Missing required file: developer_guide.md"
     YES → continue

  2. Is the file readable (permissions)?
     NO  → Raise InputValidationError
     YES → continue

  3. Is the file non-empty?
     NO  → Raise InputValidationError
     YES → continue

  4. Is it valid format?
     .md files  → Check starts with # (valid markdown)
     .html files → Check contains <html> or <!DOCTYPE>
     .css files  → Check contains { } (valid CSS)
     NO  → Raise InputValidationError with hint
     YES → continue

  5. Log file metadata:
     name, size_bytes, estimated_token_count
     (token_count = char_count / 4, rough estimate)

  6. Produce InputManifest:
  {
    "project_name": "extracted from requirements.md title",
    "files": {
      "requirements": "path/requirements.md",
      "catalog": "path/catalog.md",
      "architecture": "path/arch_plan.md",
      "dev_guide": "path/developer_guide.md",
      "standards": "path/coding_standards.md",
      "ui_references": [
        "path/ui/dashboard.html",
        "path/ui/dashboard.css",
        "path/ui/login.html"
      ]
    },
    "estimated_total_tokens": 287000,
    "context_strategy": "hybrid"  ← set here based on size
  }
```

### Output
```
InputManifest object — passed to every subsequent step.
If ANY validation fails → pipeline stops here.
Zero LLM calls made yet.
Zero tokens spent yet.
```

---

## STEP 2 — Document Processing & Embedding

### What Happens
```
All markdown files are read, broken into
meaningful chunks, tagged by type, embedded
into vectors, and stored in ChromaDB.

Simultaneously, hierarchical summaries are
produced for the planning agents.

Two parallel outputs:
  A) ChromaDB collection (for RAG retrieval)
  B) 4 summary packets (for planning agents)
```

### Why Two Outputs?
```
PLANNING AGENTS need the big picture.
  → A summary that says "the system handles
    payments, user management, and reporting"
    is MORE useful than 50 raw chunks.
  → They need breadth, not depth.

GENERATION AGENTS need exact details.
  → An agent generating the payment service
    needs the EXACT field names, business rules,
    and API contracts from the requirements.
  → They need depth, not breadth.

One strategy cannot serve both needs.
This is why we use Hybrid context strategy.
```

### Part A — Semantic Chunking

```
FOR EACH markdown file:

  READ full file content

  IDENTIFY chunk boundaries:
    Primary boundary   = markdown heading (## or ###)
    Secondary boundary = blank line between paragraphs
    
  Example document:
  ┌─────────────────────────────────────────────┐
  │ # Payment Module                            │
  │                                             │
  │ ## Overview                                 │  ← CHUNK 1 starts
  │ The payment module handles...               │
  │ It integrates with Stripe...                │  ← CHUNK 1 ends
  │                                             │
  │ ## API Endpoints                            │  ← CHUNK 2 starts
  │ ### POST /payments                          │
  │ Creates a new payment intent...             │
  │ Request body: { amount, currency, user_id } │
  │ Response: { payment_id, status, client_secret}← CHUNK 2 ends
  │                                             │
  │ ## Business Rules                           │  ← CHUNK 3 starts
  │ - Payments above $10,000 require approval   │
  │ - Refunds must be processed within 30 days  │  ← CHUNK 3 ends
  └─────────────────────────────────────────────┘

  FOR EACH chunk:
    
    SIZE CHECK:
      < 200 tokens → merge with next chunk
                     (too small = no context)
      200-1200 tokens → perfect, keep as-is
      > 1200 tokens → split on blank lines
                      add 100 token overlap
                      (overlap preserves context
                       across chunk boundaries)

    AUTO-TAG section_type:
      Heading contains "API" / "endpoint" / "route"
        → "api_definition"
      Heading contains "model" / "schema" / "field" / "database"
        → "data_model"
      Heading contains "auth" / "permission" / "role" / "security"
        → "auth_rule"
      Heading contains "component" / "page" / "UI" / "screen"
        → "ui_spec"
      Heading contains "business" / "rule" / "logic" / "process"
        → "business_logic"
      Default
        → "general"

    BUILD chunk metadata:
    {
      "source_file": "developer_guide.md",
      "heading_path": "Payment Module > API Endpoints > POST /payments",
      "section_type": "api_definition",
      "token_count": 347,
      "chunk_index": 12
    }

STORE in ChromaDB:
  collection name: "pipeline3_docs"
  document: chunk text content
  metadata: full metadata dict above
  id: f"{source_file}_{chunk_index}"
```

### Part B — Hierarchical Summarization

```
FOR EACH of the 4 context domains:

  IDENTIFY relevant files + section_types:

  system_context:
    Sources: all files
    Focus:   project name, tech stack, non-negotiables,
             cross-cutting concerns, team standards
    Prompt:  "Extract the global rules and constraints
              that apply to every part of the system."

  backend_context:
    Sources: architecture_plan.md, developer_guide.md,
             requirement_catalog.md
    Focus:   data models, API endpoints, business logic,
             integrations, background jobs
    Prompt:  "Extract everything a backend engineer needs
              to build the complete server-side system."

  frontend_context:
    Sources: requirements.md, developer_guide.md,
             requirement_catalog.md
    Focus:   pages, user flows, components, state,
             navigation, form validations, error states
    Prompt:  "Extract everything a frontend engineer needs
              to build every screen and user interaction."

  shared_context:
    Sources: all files
    Focus:   auth flows, shared types, API contracts,
             error formats, naming conventions
    Prompt:  "Extract everything that spans both frontend
              and backend: contracts, types, auth, errors."

  FOR EACH domain:
    1. Retrieve all relevant chunks from ChromaDB
       filtered by section_type
    2. Send to LLM with summarization prompt
    3. LLM produces structured summary (~3,000-8,000 tokens)
    4. Validate summary is under 10,000 tokens
       (must fit alongside other content in planning prompts)
    5. Store summary in pipeline state

RESULT: 4 compact, structured summaries
        Total: ~20,000-30,000 tokens
        Each is domain-specific and actionable
```

### Output of Step 2
```
A) ChromaDB in-memory collection
   ~200-800 chunks (depending on doc size)
   Each chunk: text + metadata + vector

B) 4 summary packets stored in pipeline state:
   state.system_context    (string)
   state.backend_context   (string)
   state.frontend_context  (string)
   state.shared_context    (string)
```

---

## STEP 3 — HTML/CSS Parsing

### What Happens
```
Every HTML/CSS file is parsed deterministically
(no LLM needed here — pure code).

TWO outputs:
  A) theme_tokens.json  — the design system
  B) component_map.json — the component structure
```

### Why Deterministic (No LLM)?
```
LLMs can hallucinate CSS values.
"The primary color was #1976D2" might become
"#1967D2" after LLM processing.

CSS values are EXACT. Colors are EXACT.
Spacing is EXACT. You cannot approximate them.

BeautifulSoup parses HTML structure perfectly.
CSS parsing extracts exact values.
This is a data extraction problem — not a
reasoning problem. Use the right tool.
```

### Part A — Design Token Extraction

```
FOR ALL CSS files combined:

  EXTRACT CSS custom properties (variables):
    :root {
      --primary-color: #1976D2;    → token: primary_color
      --font-family: 'Roboto';     → token: font_family
      --spacing-unit: 8px;         → token: spacing_unit
    }

  EXTRACT frequently used values:
    Colors:     all hex, rgb(), rgba(), hsl() values
                + which CSS classes use them
                + frequency count
                → most frequent = primary palette

    Typography: font-family, font-size, font-weight,
                line-height values
                → build type scale

    Spacing:    margin, padding, gap values
                → build spacing scale (4px, 8px, 16px etc)

    Borders:    border-radius values
                → identify design language
                   (0px = sharp, 4px = subtle, 50% = round)

    Shadows:    box-shadow values
                → elevation system

    Breakpoints: @media query widths
                → responsive design system

  PRODUCE theme_tokens.json:
  {
    "palette": {
      "primary": {
        "main": "#1976D2",
        "light": "#42A5F5",
        "dark": "#1565C0"
      },
      "secondary": { ... },
      "error": { "main": "#D32F2F" },
      "background": {
        "default": "#F5F5F5",
        "paper": "#FFFFFF"
      },
      "text": {
        "primary": "#212121",
        "secondary": "#757575"
      }
    },
    "typography": {
      "fontFamily": "'Roboto', sans-serif",
      "h1": { "fontSize": "2.5rem", "fontWeight": 700 },
      "h2": { "fontSize": "2rem",   "fontWeight": 600 },
      "body1": { "fontSize": "1rem", "lineHeight": 1.5 }
    },
    "spacing": 8,
    "shape": {
      "borderRadius": 4
    },
    "shadows": [ ... ],
    "breakpoints": {
      "values": { "xs": 0, "sm": 600, "md": 900, "lg": 1200 }
    }
  }

  This JSON is DIRECTLY consumable by MUI ThemeProvider.
  Zero manual conversion needed.
```

### Part B — Component Map Extraction

```
FOR EACH HTML file:

  PARSE HTML structure with BeautifulSoup

  IDENTIFY component boundaries:
    Look for: <section>, <div class="...">,
              <header>, <nav>, <main>, <aside>,
              <footer>, <form>, data-component attributes

  FOR EACH identified section:
    Extract:
      - CSS classes applied
      - Child elements and their classes
      - Text content (labels, placeholders, headings)
      - Interactive elements (buttons, inputs, selects)
      - Data display patterns (tables, lists, cards)
      - Navigation links and their labels

  INFER component name from:
    - data-component attribute (if exists)
    - class name (e.g. "user-profile-card" → UserProfileCard)
    - heading text inside section
    - file name (dashboard.html → Dashboard components)

  PRODUCE component_map.json:
  {
    "pages": [
      {
        "name": "Dashboard",
        "source_file": "dashboard.html",
        "route": "/dashboard",      ← inferred from name
        "components": [
          {
            "name": "DashboardHeader",
            "type": "layout",
            "mui_equivalent": "AppBar",
            "children": ["NavigationMenu", "UserAvatar"],
            "props": {
              "title": "string",
              "userName": "string"
            },
            "css_classes": ["header", "app-header"],
            "has_navigation": true
          },
          {
            "name": "MetricsCard",
            "type": "display",
            "mui_equivalent": "Card",
            "props": {
              "title": "string",
              "value": "number | string",
              "trend": "up | down | neutral"
            },
            "css_classes": ["metric-card", "card"],
            "repeating": true   ← renders in a grid
          },
          {
            "name": "DataTable",
            "type": "data",
            "mui_equivalent": "DataGrid",
            "props": {
              "rows": "array",
              "columns": "array",
              "loading": "boolean"
            },
            "has_pagination": true,
            "has_search": true
          }
        ]
      }
    ],
    "shared_components": [
      {
        "name": "NavigationMenu",
        "used_in": ["Dashboard", "Settings", "Profile"],
        "type": "navigation"
      }
    ],
    "design_language": {
      "style": "material",        ← inferred from patterns
      "density": "comfortable",
      "corner_style": "rounded"
    }
  }
```

### Output of Step 3
```
A) theme_tokens.json  → used by FrontendAgent for theme.ts
B) component_map.json → used by PlanningAgent + FrontendAgent
```

---

## STEP 4 — Planning & Master Build Plan Generation

### What Happens
```
The Planning Agent reads ALL context summaries,
theme_tokens.json, and component_map.json.

It produces the Master Build Plan (MBP) —
a machine-readable blueprint that every
downstream agent treats as law.
```

### Why This Is The Most Critical Step
```
Every real software project starts with a
technical design document.

Without it:
  Developer A builds UserService with method get_user()
  Developer B tries to call fetch_user()
  Integration fails. Rework costs a week.

With it:
  Everyone knows get_user() is the method name.
  Everyone knows its exact signature.
  Integration works first time.

The MBP IS that technical design document.
But machine-readable. Enforced by the pipeline.
Not optional. Not a suggestion.
```

### Exactly What The Planning Agent Does

```
PROMPT CONSTRUCTION:
  System:  "You are a senior software architect.
            You will produce a precise technical
            blueprint for a full-stack application."

  Context: system_context summary
         + backend_context summary
         + frontend_context summary
         + shared_context summary
         + component_map.json content
         + theme_tokens.json content
         + coding_standards.md content

  Instruction: Produce MBP in exact JSON schema

LLM CALL → produces MBP JSON

MBP STRUCTURE:
{
  "project": {
    "name": "ProjectName",
    "backend_repo": "projectname-backend",
    "frontend_repo": "projectname-frontend",
    "description": "..."
  },

  "backend_file_tree": [
    {
      "path": "app/core/config.py",
      "purpose": "Application settings via pydantic-settings",
      "exports": ["Settings", "get_settings"],
      "depends_on": [],           ← nothing — generated first
      "generation_order": 1,
      "agent_section": "config"
    },
    {
      "path": "app/core/database.py",
      "purpose": "Async SQLAlchemy engine and session",
      "exports": ["engine", "AsyncSessionLocal", "get_db"],
      "depends_on": ["app/core/config.py"],
      "generation_order": 2,
      "agent_section": "database"
    },
    {
      "path": "app/models/user.py",
      "purpose": "SQLAlchemy User model",
      "exports": ["User"],
      "depends_on": ["app/core/database.py"],
      "generation_order": 3,
      "agent_section": "models"
    },
    ... every backend file listed
  ],

  "frontend_file_tree": [
    {
      "path": "src/theme/theme.ts",
      "purpose": "MUI theme from extracted design tokens",
      "exports": ["theme"],
      "depends_on": [],
      "generation_order": 1,
      "agent_section": "theme"
    },
    {
      "path": "src/types/user.ts",
      "purpose": "TypeScript interfaces for user domain",
      "exports": ["User", "UserRole", "CurrentUser"],
      "depends_on": [],
      "generation_order": 2,
      "agent_section": "types"
    },
    ... every frontend file listed
  ],

  "api_surface": [
    {
      "endpoint": "/api/v1/users",
      "method": "GET",
      "description": "List all users",
      "auth_required": true,
      "required_roles": ["Admin"],
      "query_params": ["page", "limit", "search"],
      "response_schema": "UserListResponse",
      "backend_file": "app/routes/user_routes.py",
      "frontend_caller": "src/api/userApi.ts"
    },
    ... every endpoint listed
  ],

  "shared_types": [
    {
      "name": "User",
      "python_schema": "UserOut",
      "typescript_interface": "User",
      "fields": {
        "id": "UUID / string",
        "email": "str / string",
        "name": "str / string",
        "roles": "list[str] / string[]"
      }
    }
  ],

  "env_variables": {
    "backend": ["DATABASE_URL", "AZURE_TENANT_ID", ...],
    "frontend": ["VITE_AZURE_CLIENT_ID", ...]
  },

  "azure_ad": {
    "app_roles": ["Admin", "User", "Manager"],
    "protected_routes": {
      "/api/v1/admin/*": ["Admin"],
      "/api/v1/users": ["Admin", "Manager"],
      "/api/v1/reports": ["Admin", "Manager", "User"]
    }
  },

  "generation_order": {
    "backend": [1, 2, 3, 4, 5, ...],  ← topological sort
    "frontend": [1, 2, 3, 4, 5, ...]
  }
}
```

### Topological Sort — How Generation Order Is Determined

```
DEPENDENCY GRAPH (example):

  config.py ──────────────────────────────┐
      │                                   │
      ▼                                   ▼
  database.py                         settings.py
      │
      ▼
  models/user.py ──────────┐
      │                    │
      ▼                    ▼
  schemas/user.py      models/payment.py
      │                    │
      └────────┬───────────┘
               │
               ▼
          services/user_service.py
               │
               ▼
          routes/user_routes.py
               │
               ▼
           main.py

TOPOLOGICAL SORT OUTPUT:
  [config, settings, database, models/user,
   models/payment, schemas/user, services/user_service,
   routes/user_routes, main]

RULE: A file is only generated AFTER all files
      it depends on have been generated.
      This guarantees no broken imports.
```

### Output of Step 4
```
Master Build Plan (MBP) — stored in pipeline state
This is the ground truth for all subsequent steps.
No agent can contradict the MBP.
```

---

## STEP 5 — Schema & Contract Generation (Two-Pass)

### What Happens
```
SchemaAgent generates the shared type system:
  - SQLAlchemy models (Python)
  - Pydantic v2 schemas (Python)
  - TypeScript interfaces (TypeScript)
  - OpenAPI spec skeleton

This is the ONLY agent that runs twice.
```

### Why Two Passes?
```
Types are the foundation of everything.
Every other agent depends on them.

If UserOut schema has a bug:
  - user_service.py will have a bug
  - user_routes.py will have a bug
  - User TypeScript interface will mismatch
  - Every API call in React will be wrong

Cost of fixing types LATE = rewrite half the codebase.
Cost of fixing types NOW = one extra LLM call.

The math is obvious. Run it twice.
```

### Pass 1 — Draft Generation

```
PROMPT CONTEXT:
  - system_context summary
  - backend_context summary
  - shared_context summary
  - MBP shared_types section
  - MBP api_surface section
  - RAG retrieval:
      query: "data models fields types schemas"
      filter: section_type = "data_model"
      top_k: 8 chunks

LLM generates:
  - SQLAlchemy model classes
  - Pydantic v2 schemas (Input, Output, Update)
  - TypeScript interfaces
  - OpenAPI spec skeleton

Example output for User domain:

  Python (SQLAlchemy):
  class User(Base):
      __tablename__ = "users"
      id: Mapped[UUID] = mapped_column(primary_key=True)
      email: Mapped[str] = mapped_column(unique=True)
      azure_oid: Mapped[str] = mapped_column(unique=True)
      name: Mapped[str]
      is_active: Mapped[bool] = mapped_column(default=True)
      created_at: Mapped[datetime] = mapped_column(
          default=func.now()
      )

  Python (Pydantic):
  class UserBase(BaseModel):
      email: EmailStr
      name: str

  class UserOut(UserBase):
      id: UUID
      is_active: bool
      created_at: datetime
      model_config = ConfigDict(from_attributes=True)

  TypeScript:
  interface User {
    id: string;          // UUID as string in TS
    email: string;
    name: string;
    isActive: boolean;
    createdAt: string;   // ISO datetime string
  }
```

### Pass 2 — Self-Review & Refinement

```
SECOND LLM CALL with Pass 1 output + review checklist:

REVIEW CHECKLIST:
  [ ] Every field in MBP shared_types is present?
  [ ] Python types map correctly to TypeScript types?
      (UUID → string, datetime → string, bool → boolean)
  [ ] All Pydantic models use v2 syntax?
      (model_config = ConfigDict, not class Config)
  [ ] All relationships defined correctly?
      (ForeignKey, relationship(), back_populates)
  [ ] No circular imports between models?
  [ ] All schemas have Input + Output variants?
      (UserCreate for POST, UserOut for GET,
       UserUpdate for PATCH — no shared mutation schemas)
  [ ] Azure AD fields present?
      (azure_oid on User model — no passwords)

LLM self-reviews output against checklist.
Fixes any violations.
Produces FINAL Schema Registry.
```

### Symbol Registry Initialization

```
AFTER Pass 2:

Python AST parser reads each generated Python file:
  ast.parse(file_content)
  Walk AST for:
    ClassDef → class name
    FunctionDef / AsyncFunctionDef → function name + signature
    Assign → constants

TypeScript parser reads each .ts file:
  Regex + structural parsing for:
    interface Xxx → TypeScript interface
    type Xxx = → Type alias
    export const → exported constants
    export function → exported functions

RESULT:
  Symbol Registry initialized with schema entries.
  This becomes the ground truth.
  All downstream agents read from it.
```

---

## STEP 6 — Backend Code Generation

### What Happens
```
BackendAgent generates every Python file
in topological order from the MBP.

After EACH file:
  - AST parser extracts exports
  - Symbol Registry updated
  - Next file has updated registry in its prompt
```

### File-by-File Walk-Through

```
FOR EACH file in MBP backend_file_tree
(in topological order):

  STEP A: BUILD PROMPT

    Assemble agent prompt:
    ┌────────────────────────────────────────────┐
    │ [1] SYSTEM PROMPT                          │
    │     "You are a senior Python engineer.     │
    │      Write production FastAPI code."       │
    │     (~1,000 tokens)                        │
    │                                            │
    │ [2] CODING STANDARDS                       │
    │     Full coding_standards.md content       │
    │     (~3,000 tokens)                        │
    │                                            │
    │ [3] CONTEXT SUMMARIES                      │
    │     system_context + backend_context       │
    │     (~8,000 tokens)                        │
    │                                            │
    │ [4] CURRENT SYMBOL REGISTRY                │
    │     Full registry of all generated files   │
    │     (~5,000-15,000 tokens, grows over time)│
    │                                            │
    │ [5] DIRECT DEPENDENCIES (full code)        │
    │     Files this file imports from           │
    │     Full source code included              │
    │     (~3,000-8,000 tokens)                  │
    │                                            │
    │ [6] RAG RETRIEVAL                          │
    │     Query relevant to THIS file's domain   │
    │     e.g. for payment_service.py:           │
    │     query: "payment business logic rules"  │
    │     filter: api_definition, business_logic │
    │     top_k: 8 chunks                        │
    │     (~6,000-8,000 tokens)                  │
    │                                            │
    │ [7] MBP CONTRACT FOR THIS FILE             │
    │     Exactly what this file must export     │
    │     (~500 tokens)                          │
    │                                            │
    │ [8] GENERATION INSTRUCTION                 │
    │     "Generate ONLY the file:               │
    │      app/services/payment_service.py       │
    │      It must export: PaymentService,       │
    │      create_payment, get_payment,          │
    │      process_refund"                       │
    │     (~300 tokens)                          │
    │                                            │
    │ TOTAL: ~30,000-45,000 tokens               │
    │ Well within 200k limit ✓                   │
    └────────────────────────────────────────────┘

  STEP B: LLM CALL
    Send prompt to org gateway LLM.
    Temperature: 0.1-0.2 (low = deterministic)
    Receive complete Python file.

  STEP C: EXTRACT CODE
    Parse LLM response.
    Extract code block (strip markdown fences).
    Validate it's valid Python:
      ast.parse(code) — if this throws, the
      code has syntax errors.
    If syntax error:
      Retry with error message in prompt (max 3x).
      "The previous output had a syntax error:
       {error}. Fix it."

  STEP D: UPDATE SYMBOL REGISTRY
    AST parse the generated file.
    Extract all exports.
    Add to Symbol Registry.
    Next file will see this in its prompt.

  STEP E: LOG PROGRESS
    "Generated: app/services/payment_service.py
     Exports: PaymentService, create_payment (2 functions)
     Registry size: 847 symbols across 12 files"
```

### Backend Generation Order (Real Example)

```
Order  File                          Key Exports
─────────────────────────────────────────────────────
  1    app/core/config.py            Settings, get_settings
  2    app/core/database.py          get_db, engine
  3    app/core/logging.py           setup_logging, logger
  4    app/models/__init__.py        (re-exports all models)
  5    app/models/user.py            User
  6    app/models/[domain].py        [DomainModel]
  7    app/schemas/__init__.py       (re-exports)
  8    app/schemas/user.py           UserOut, UserCreate
  9    app/schemas/[domain].py       [Domain schemas]
 10    app/core/security.py          validate_token,
                                     get_current_user,
                                     require_role
 11    app/services/user_service.py  UserService
 12    app/services/[domain].py      [DomainService]
 13    app/routes/__init__.py        router
 14    app/routes/user_routes.py     router (users)
 15    app/routes/[domain]_routes.py router (domain)
 16    app/middleware/logging.py     LoggingMiddleware
 17    app/middleware/cors.py        setup_cors
 18    main.py                       app (FastAPI instance)
 19    alembic.ini                   (config file)
 20    alembic/env.py                (migration runner)
 21    alembic/versions/001_init.py  (initial migration)
```

---

## STEP 7 — Frontend Code Generation

### What Happens
```
FrontendAgent generates every TypeScript/React file
in topological order.

Key difference from backend:
  The HTML/CSS reference actively guides
  component structure and styling.
  theme.ts is generated FIRST from theme_tokens.json
  (no LLM needed — direct token translation).
```

### theme.ts Generation (Special Case)

```
This file is NOT generated by LLM.
It is TRANSLATED directly from theme_tokens.json.

theme_tokens.json → deterministic translation → theme.ts

Result:
  export const theme = createTheme({
    palette: {
      primary: {
        main: '#1976D2',   ← direct from tokens
        light: '#42A5F5',
        dark: '#1565C0',
      },
      ...
    },
    typography: {
      fontFamily: "'Roboto', sans-serif",
      h1: { fontSize: '2.5rem', fontWeight: 700 },
      ...
    },
    spacing: 8,
    shape: { borderRadius: 4 },
  });

Why not LLM?
  Colors are exact. LLMs can subtly change them.
  This is data translation, not reasoning.
  Use code, not AI, for deterministic operations.
```

### Component Generation (LLM-driven)

```
FOR EACH component in component_map.json:

  PROMPT CONTEXT:
    - system_context + frontend_context summaries
    - Full Symbol Registry (FE namespace)
    - Direct dependencies full code
    - RAG: query for this component's UI requirements
           filter: section_type = "ui_spec"
    - MUI component library patterns
    - The specific HTML section for this component
      (from original HTML file — direct reference)
    - MBP contract: what this component must render,
      what props it must accept, what it must export
    - TypeScript types (already in Symbol Registry)
    - Coding standards

  LLM generates TypeScript React component.

  ENFORCED IN PROMPT:
    - Functional component only (no class components)
    - Typed props interface
    - All styles via sx prop or MUI theme
    - Zero hardcoded color/font/spacing values
    - No any types
    - TanStack Query for data fetching
    - No useEffect for API calls
    - Error boundary ready (throws errors up)
```

### Frontend Generation Order (Real Example)

```
Order  File                          Key Exports
─────────────────────────────────────────────────────
  1    src/theme/theme.ts            theme (translated)
  2    src/types/user.ts             User, UserRole
  3    src/types/[domain].ts         [Domain interfaces]
  4    src/lib/apiClient.ts          apiClient (Axios)
  5    src/lib/authConfig.ts         msalConfig, loginRequest
  6    src/api/userApi.ts            getUser, createUser
  7    src/api/[domain]Api.ts        [domain API calls]
  8    src/store/authStore.ts        useAuthStore
  9    src/store/[domain]Store.ts    use[Domain]Store
 10    src/components/auth/
         AuthGuard.tsx              AuthGuard HOC
         RoleGuard.tsx              RoleGuard HOC
 11    src/components/layout/
         AppLayout.tsx              AppLayout
         Sidebar.tsx                Sidebar
         Header.tsx                 Header
 12    src/components/shared/
         [SharedComponent].tsx      (buttons, cards etc)
 13    src/pages/[Page]/
         [Page].tsx                 [Page component]
         [Page].hooks.ts            use[Page] custom hook
 14    src/router/index.tsx          AppRouter
 15    src/App.tsx                   App
 16    src/main.tsx                  (entry point)
```

---

## STEP 8 — Integration Validation

### What Happens
```
ValidatorAgent runs three checks against all
generated code using the Symbol Registry.

NO LLM calls in this step.
Pure deterministic code analysis.
Fast, cheap, exact.
```

### Check 1 — Import Resolution

```
FOR EACH generated file:

  PARSE all import statements:
    Python:     "from app.services.user_service import UserService"
    TypeScript: "import { User } from '../types/user'"

  FOR EACH import:
    Does the source file exist in generated files?
      NO  → VIOLATION: "Unresolved import"
      YES → Does it export the imported name?
            (check Symbol Registry)
              NO  → VIOLATION: "Symbol not exported"
              YES → PASS ✓

Example violation caught:
  payment_routes.py imports PaymentService
  from app.services.payment_services (typo: services not service)
  
  Validator catches this immediately.
  Flags file: payment_routes.py
  Flags violation: "Cannot resolve 'app.services.payment_services'
                    Did you mean 'app.services.payment_service'?"
  Triggers targeted regeneration of payment_routes.py only.
```

### Check 2 — API Contract Alignment

```
FOR EACH frontend API call (in src/api/*.ts):

  EXTRACT: endpoint path, method, request body shape,
           expected response shape

  MATCH against MBP api_surface:

  Frontend calls: POST /api/v1/payments
                  body: { amount: number, currency: string }
                  expects: { paymentId: string, status: string }

  Backend defines: POST /api/v1/payments
                   body: PaymentCreate { amount, currency, user_id }
                   returns: PaymentOut { payment_id, status }

  CHECKS:
    Path matches?        ✓
    Method matches?      ✓
    Request fields?      ✓ (amount ✓, currency ✓)
                         ✗ MISSING: user_id
    Response fields?     ✗ MISMATCH: paymentId vs payment_id
                           (camelCase vs snake_case)

  VIOLATIONS FLAGGED:
    "Frontend PaymentCreate missing field: user_id"
    "Response field mismatch: backend returns payment_id,
     frontend expects paymentId — add response transformer"

  TARGETED FIX:
    Regenerate src/api/paymentApi.ts only.
    Add user_id to request body.
    Add camelCase transformer.
```

### Check 3 — Coding Standards Compliance

```
FOR EACH generated file:

  Run rules from coding_standards.md:

  Backend rules (checked via AST):
    [ ] All route functions are async?
    [ ] All DB calls use AsyncSession?
    [ ] No bare except clauses?
    [ ] All functions have return type hints?
    [ ] No hardcoded values (no bare strings/numbers)?
    [ ] Settings accessed via get_settings() only?

  Frontend rules (checked via regex + AST):
    [ ] No 'any' types?
    [ ] No inline styles (style={{...}})?
    [ ] No hardcoded color values?
    [ ] No direct fetch() calls?
    [ ] No localStorage usage?
    [ ] All components have typed Props interface?

  VIOLATION → targeted regen of that file
  MAX RETRIES: 3 per file
  AFTER 3 FAILS: log warning, continue,
                 report in final summary
```

---

## STEP 9 — Assembly & Output

### What Happens
```
AssemblyAgent writes everything to disk
in the correct structure, then generates
the supporting files.
```

### File Writing

```
CREATE output directories:
  outputs/{project_name}-backend/
  outputs/{project_name}-frontend/

FOR EACH generated file in Symbol Registry:
  CREATE parent directories if needed
  WRITE file content to correct path
  LOG: "Written: app/services/user_service.py (1,247 bytes)"

VERIFY:
  File count matches MBP file tree count
  If mismatch: log which files are missing
```

### Supporting File Generation

```
.env.example (backend) — template filled from MBP env_variables
.env.example (frontend) — template filled from MBP env_variables

README.md (backend):
  Generated by LLM with:
  - Project description (from requirements)
  - Prerequisites (Python 3.11, PostgreSQL, Azure AD app reg)
  - Azure AD App Registration steps (specific to this app's roles)
  - Environment variable documentation
    (each variable explained, not just listed)
  - Local development setup commands
  - Database migration commands
  - Running tests

README.md (frontend):
  Generated by LLM with:
  - Project description
  - Prerequisites (Node 18+, Azure AD config)
  - Environment variable documentation
  - Local development commands
  - Build commands
  - Azure AD MSAL configuration guide

alembic/ (backend):
  alembic.ini        ← generated
  alembic/env.py     ← generated (points to models)
  alembic/versions/
    001_initial.py   ← generated (creates all tables)
```

### Final Generation Report

```
Pipeline 3 — Generation Complete
═══════════════════════════════════════════════════
Project:          {project_name}
Duration:         4m 23s

Backend Repo:     outputs/{project_name}-backend/
  Files generated: 34
  Validation:      32 passed, 2 warnings

Frontend Repo:    outputs/{project_name}-frontend/
  Files generated: 41
  Validation:      41 passed, 0 warnings

Total LLM calls:  87
Total tokens:     ~1,240,000
  Input tokens:   ~890,000
  Output tokens:  ~350,000

Warnings (2):
  ⚠ app/routes/report_routes.py — coding standard
    warning on line 47: consider extracting magic
    number 90 to a named constant REPORT_DAYS
  ⚠ src/components/DataExport.tsx — complex component,
    manual review recommended

Next Steps:
  1. Copy .env.example → .env and fill values
  2. Run: cd {project_name}-backend && alembic upgrade head
  3. Run: uvicorn main:app --reload
  4. Run: cd {project_name}-frontend && npm install && npm run dev
═══════════════════════════════════════════════════
```

---

## The Complete Mental Model — One Final Time

```
STEP 1  Validate inputs          → fail fast, zero LLM cost
STEP 2  Process documents        → make docs searchable + summarized
STEP 3  Parse HTML/CSS           → extract design system (no LLM)
STEP 4  Plan everything          → MBP is the law (summaries only)
STEP 5  Generate types           → foundation of all code (2-pass)
STEP 6  Generate backend         → topo order + registry per file
STEP 7  Generate frontend        → topo order + registry per file
STEP 8  Validate integration     → deterministic checks (no LLM)
STEP 9  Assemble output          → write to disk + supporting files

Each step:
  Consumes structured output from the previous step.
  Produces structured output for the next step.
  Fails loudly and specifically if something is wrong.
  Never does more than its defined responsibility.

This is not a chatbot generating code.
This is a manufacturing pipeline.
The difference is reliability.
```