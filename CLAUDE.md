# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentForge** is a static web application for creating, managing, and deploying autonomous AI agents. Built with vanilla HTML, JavaScript, and TailwindCSS, it provides a glassmorphic UI for configuring agents that can handle file operations, code reviews, and intelligent Q&A.

This is a **static site** hosted on Hugging Face Spaces - no backend server, build process, or package manager required. All pages are standalone HTML files.

## Architecture

### Multi-Page Structure
The application consists of four main HTML pages, each self-contained:

- **index.html** - Landing page with hero section, feature grid, and project overview
- **agents.html** - Agent management dashboard showing all created agents with status indicators
- **agent-creator.html** - Multi-step wizard for creating new agents (4-step process)
- **backend.html** - Backend services documentation and API reference

### Design System

**Glassmorphism Theme**: All pages use a consistent glass-card design pattern:
```css
.glass-card {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Color Scheme**:
- Background: `#111827` (gray-900)
- Primary gradient: Purple (`#9333ea`) to Pink (`#ec4899`)
- Glass cards with 8% white transparency
- Text: White (`#ffffff`) and gray variants

**Dependencies** (CDN-based):
- TailwindCSS (via cdn.tailwindcss.com)
- Feather Icons (for UI icons)
- Vanta.js Globe (3D background animation on index.html only)

### Agent Creation Flow (agent-creator.html)

The agent creation process is a **4-step wizard** with client-side state management:

1. **Define Agent** - Name, type selection (Code Assistant/Document Manager/Q&A Bot), purpose description
2. **Connect APIs** - Select from 8+ API integrations (OpenAI, GitHub, Dropbox, Slack, AWS S3, PostgreSQL, Web Search, Vector Database)
3. **Set Permissions** - Configure API keys and access permissions (read/modify/create files, execute code, send messages)
4. **Review & Deploy** - Summary view with environment selection (Production/Staging) and monitoring options

**Key Agent Features**:
- **Memory Database**: Vector-based storage with configurable chunk size (1000), retrieval count (5), embedding model (text-embedding-3-small)
- **Reasoning Engine**: Decision threshold (0.75), max iterations (3), fallback to human help
- **Web Search**: Max 3 results, 0.7 min relevance, 10s timeout

### Navigation Pattern

All pages share identical navigation structure:
```html
<nav class="glass-card fixed w-full z-50">
  - Logo/Brand (AgentForge with gradient)
  - Links: Dashboard, Agents, Create Agent
  - Action buttons (context-specific)
</nav>
```

## Development Workflow

### Local Development
1. **No build step required** - Open HTML files directly in browser
2. **Live reload**: Use a simple HTTP server if needed:
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```
3. **Browser testing**: Test in Chrome/Safari/Firefox (backdrop-filter support required)

### Making Changes

**HTML Modifications**:
- Each page is self-contained - edit the specific HTML file
- Maintain consistent navigation structure across all pages
- Preserve glass-card styling classes
- Initialize Feather icons at end of body: `feather.replace()`

**Styling**:
- Primary styling via TailwindCSS utility classes
- Custom styles in `<style>` tags within each HTML file
- Global styles in `style.css` (minimal, legacy from template)

**JavaScript**:
- All JS is inline within `<script>` tags at bottom of each HTML file
- No external JS files or modules
- Key features:
  - Step navigation in agent-creator.html
  - Icon initialization with Feather
  - Vanta.js globe animation on index.html
  - Intersection Observer for scroll animations

### Agent Configuration Schema

When working with agent-related features, use this structure:
```javascript
{
  name: "string",
  type: "code-assistant" | "document-manager" | "qa-bot",
  capabilities: ["github", "openai", "dropbox", "slack", ...],
  triggers: {
    pullRequest: boolean,
    schedule: "cron-expression"
  },
  actions: [{
    type: "string",
    params: object
  }],
  memory: {
    chunkSize: 1000,
    retrievalCount: 5,
    embeddingModel: "text-embedding-3-small"
  },
  reasoning: {
    decisionThreshold: 0.75,
    maxIterations: 3,
    fallbackAction: "request_human_help"
  }
}
```

## Important Patterns

### Status Indicators (agents.html)
Three status types with color coding:
- **Active**: Green (`#4ade80`) - Currently running
- **Inactive**: Red (`#f87171`) - Not running
- **Pending**: Yellow (`#facc15`) - Awaiting deployment

### API Integration Cards
Reusable pattern for displaying connected services:
- Logo from clearbit.com: `https://logo.clearbit.com/{domain}`
- Checkbox for selection
- Service name and description
- Glass-card styling with hover effects

### Step Navigation
Agent creator uses data attributes for flow control:
- `data-next="step-{n}"` - Navigate forward
- `data-prev="step-{n}"` - Navigate backward
- Active step indicator updates automatically
- Tab content visibility controlled via `.active` class

## Deployment

**Hugging Face Spaces**:
- Configured via README.md frontmatter (YAML)
- SDK: `static` (no server required)
- Tags: `deepsite-v3`
- Auto-deploys on git push to main branch

**No Build Process**:
- All assets are CDN-hosted or inline
- No npm, webpack, or bundling
- No environment variables needed
- Works immediately after clone

## Common Tasks

### Adding a New Agent Type
1. Edit agent-creator.html, Step 1 section
2. Add new button in agent type grid with appropriate icon and description
3. Update agent type selection logic in JavaScript
4. Add corresponding card template in agents.html

### Adding New API Integration
1. Edit agent-creator.html, Step 2 section
2. Add new API badge div with logo, name, description
3. Include checkbox for selection
4. Add API key input in Step 3 if required
5. Document in backend.html API section

### Modifying Glassmorphism Effect
Edit the `.glass-card` style in each HTML file's `<style>` section:
- Adjust `rgba()` values for background opacity
- Modify `backdrop-filter: blur()` for glass effect intensity
- Change border color/opacity for card edges

### Updating Color Gradient
Replace gradient classes throughout:
- Current: `from-purple-400 to-pink-600`
- Applied to: Logo, headings, buttons
- TailwindCSS classes: `bg-gradient-to-r`

## File Structure

```
agent-forge/
├── index.html          # Landing page with hero and features
├── agents.html         # Agent dashboard (list view)
├── agent-creator.html  # 4-step agent creation wizard
├── backend.html        # Backend services & API docs
├── style.css           # Minimal global styles (legacy)
├── README.md           # HF Spaces config (YAML frontmatter)
└── .gitattributes      # Git LFS config
```

## Notes

- **No localStorage/backend**: Current implementation doesn't persist data (demo only)
- **API keys in UI**: Shown as placeholders - not connected to real services
- **Agent execution**: UI mockup - no actual agent deployment logic
- **Vanta.js performance**: Globe animation may impact performance on low-end devices
- **Browser compatibility**: Requires backdrop-filter support (95%+ browsers as of 2024)
