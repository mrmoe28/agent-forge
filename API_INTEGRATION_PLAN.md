# AgentForge API Integration Plan

## Overview

This document outlines the integration plan to connect the static frontend pages to the backend APIs documented in `doc_features.md`. The goal is to replace all hardcoded/mock data with live API calls.

---

## 1. agents.html - Agent Dashboard Integration

### Current State (Problems)
- **Line 85-245**: Static hardcoded agent cards with fake data
  - Hardcoded agent names: "Code Reviewer", "Doc Organizer", "Q&A Bot", etc.
  - Fake statuses: "Active", "Inactive", "Pending"
  - Fake timestamps: "2 hours ago", "15 min ago", "3 days ago"
  - Static integration badges: "GitHub", "OpenAI", etc.
  - "View Logs" buttons don't connect to anything

### Target Backend API
```http
GET /api/v1/agents
Response: {
  "agents": [
    {
      "id": "string",
      "name": "string",
      "type": "code-assistant" | "document-manager" | "qa-bot",
      "status": "active" | "inactive" | "pending",
      "capabilities": ["github", "openai", ...],
      "lastRun": "ISO 8601 timestamp",
      "metrics": {
        "totalRuns": number,
        "successRate": number,
        "avgExecutionTime": number
      }
    }
  ]
}
```

### Implementation Plan

#### Phase 1: Add Data Fetching
1. **Create API client module** (`/js/api-client.js`)
   ```javascript
   class AgentForgeAPI {
     constructor(baseUrl = '/api/v1') {
       this.baseUrl = baseUrl;
     }

     async getAgents() {
       const response = await fetch(`${this.baseUrl}/agents`);
       if (!response.ok) throw new Error('Failed to fetch agents');
       return await response.json();
     }

     async getAgentLogs(agentId) {
       const response = await fetch(`${this.baseUrl}/agents/${agentId}/logs`);
       if (!response.ok) throw new Error('Failed to fetch logs');
       return await response.json();
     }

     async deleteAgent(agentId) {
       const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
         method: 'DELETE'
       });
       if (!response.ok) throw new Error('Failed to delete agent');
       return await response.json();
     }
   }
   ```

2. **Add loading states**
   - Show skeleton loaders while fetching
   - Handle empty states (no agents created yet)
   - Error states for failed API calls

3. **Dynamic card rendering**
   ```javascript
   function renderAgentCard(agent) {
     const statusClass = `status-${agent.status}`;
     const lastRun = formatTimestamp(agent.lastRun);
     const capabilities = agent.capabilities.map(cap =>
       `<span class="text-xs px-2 py-1 bg-gray-800 rounded-full">${cap}</span>`
     ).join('');

     return `
       <div class="glass-card agent-card p-6 rounded-xl transition-all duration-300">
         <div class="flex justify-between items-start mb-4">
           <div>
             <h3 class="font-bold text-lg">${agent.name}</h3>
             <span class="text-xs px-2 py-1 rounded-full ${statusClass}">${agent.status}</span>
           </div>
           <div class="flex space-x-2">
             <button onclick="editAgent('${agent.id}')" class="text-gray-400 hover:text-purple-400">
               <i data-feather="edit-2" class="w-4 h-4"></i>
             </button>
             <button onclick="deleteAgent('${agent.id}')" class="text-gray-400 hover:text-red-400">
               <i data-feather="trash-2" class="w-4 h-4"></i>
             </button>
           </div>
         </div>
         <div class="flex flex-wrap gap-2 mb-4">${capabilities}</div>
         <div class="flex justify-between items-center text-sm">
           <span class="text-gray-400">Last run: ${lastRun}</span>
           <button onclick="viewLogs('${agent.id}')" class="text-purple-400 hover:text-purple-300 flex items-center">
             <i data-feather="activity" class="w-4 h-4 mr-1"></i> View Logs
           </button>
         </div>
       </div>
     `;
   }
   ```

#### Phase 2: Add Filtering & Search
1. **Filter dropdown functionality** (line 70-77)
   - Filter by status: All, Active, Inactive, Pending
   - Filter by type: Code Assistant, Document Manager, Q&A Bot

2. **Search functionality**
   - Add search input to filter agents by name
   - Client-side filtering of fetched data

#### Phase 3: Add Real-time Updates
1. **WebSocket connection** for live agent status updates
2. **Polling fallback** if WebSocket unavailable (every 30 seconds)
3. **Toast notifications** for agent status changes

---

## 2. agent-creator.html - Wizard Integration

### Current State (Problems)
- **Line 331-370**: Hardcoded review summary
  - Shows "Code Review Bot" regardless of user input
  - Static API list: "OpenAI, GitHub, Slack"
  - No form state management across steps
  - Deploy button (line 412) does nothing
- **Line 180**: API checkboxes don't map to backend DTOs
- No validation errors displayed from backend

### Target Backend API
```http
POST /api/v1/agents
Request: {
  "name": "string",
  "type": "code-assistant" | "document-manager" | "qa-bot",
  "purpose": "string",
  "capabilities": ["openai", "github", ...],
  "credentials": {
    "openai": "sk-...",
    "github": "ghp_..."
  },
  "permissions": {
    "readFiles": boolean,
    "modifyFiles": boolean,
    "createFiles": boolean,
    "executeCode": boolean,
    "sendMessages": boolean
  },
  "config": {
    "memory": {
      "enabled": boolean,
      "chunkSize": 1000,
      "retrievalCount": 5,
      "embeddingModel": "text-embedding-3-small"
    },
    "reasoning": {
      "enabled": boolean,
      "decisionThreshold": 0.75,
      "maxIterations": 3,
      "fallbackAction": "request_human_help"
    },
    "webSearch": {
      "enabled": boolean,
      "maxResults": 3,
      "minRelevance": 0.7,
      "timeout": 10000
    }
  },
  "triggers": {
    "pullRequest": boolean,
    "schedule": "cron-expression"
  },
  "environment": "production" | "staging",
  "monitoring": boolean
}

Response (Success): {
  "id": "string",
  "status": "pending",
  "message": "Agent created successfully"
}

Response (Error): {
  "error": "string",
  "validationErrors": {
    "field": ["error message"]
  }
}
```

### Implementation Plan

#### Phase 1: State Management
1. **Create form state object**
   ```javascript
   class AgentWizardState {
     constructor() {
       this.data = {
         name: '',
         type: null,
         purpose: '',
         capabilities: [],
         credentials: {},
         permissions: {
           readFiles: false,
           modifyFiles: false,
           createFiles: false,
           executeCode: false,
           sendMessages: false
         },
         config: {
           memory: { enabled: false },
           reasoning: { enabled: false },
           webSearch: { enabled: false }
         },
         triggers: {},
         environment: 'staging',
         monitoring: true
       };
     }

     updateField(path, value) {
       // Deep update using path like 'permissions.readFiles'
     }

     getDTO() {
       // Transform to backend API format
     }

     validate(step) {
       // Step-specific validation
     }
   }
   ```

2. **Persist state across steps**
   - Save to localStorage for draft recovery
   - Update state on every input change
   - Load state when navigating back

#### Phase 2: Dynamic Review Summary (Step 4)
1. **Replace hardcoded summary** (line 336-370)
   ```javascript
   function renderReviewSummary(state) {
     document.querySelector('#review-basic-info').innerHTML = `
       <p class="mb-1"><span class="text-gray-400">Name:</span> ${state.data.name}</p>
       <p class="mb-1"><span class="text-gray-400">Type:</span> ${state.data.type}</p>
       <p><span class="text-gray-400">Purpose:</span> ${state.data.purpose}</p>
     `;

     document.querySelector('#review-apis').innerHTML =
       state.data.capabilities.map(cap =>
         `<span class="px-2 py-1 bg-gray-800 rounded-full text-xs">${cap}</span>`
       ).join('');

     // Similar for permissions, triggers, etc.
   }
   ```

2. **Validation feedback**
   - Show validation errors inline
   - Prevent progression if step incomplete
   - Highlight missing required fields

#### Phase 3: Deploy Functionality
1. **Wire Deploy button** (line 412)
   ```javascript
   async function deployAgent() {
     const state = wizardState.getDTO();

     // Show loading state
     showDeploymentProgress();

     try {
       const response = await api.createAgent(state);

       // Success: redirect to agents page with success message
       localStorage.setItem('agentCreated', JSON.stringify({
         id: response.id,
         name: state.name
       }));
       window.location.href = 'agents.html?created=true';

     } catch (error) {
       // Handle validation errors
       if (error.validationErrors) {
         displayValidationErrors(error.validationErrors);
       } else {
         showErrorToast(error.message);
       }
     }
   }
   ```

2. **Backend validation error display**
   - Map field errors to form inputs
   - Scroll to first error
   - Allow user to fix and retry

#### Phase 4: API Selection Mapping (Step 2)
1. **Map checkboxes to capabilities array**
   ```javascript
   const apiMapping = {
     'openai': 'openai',
     'github': 'github',
     'dropbox': 'dropbox',
     'slack': 'slack',
     'aws-s3': 'aws',
     'postgresql': 'postgresql',
     'web-search': 'web_search',
     'vector-db': 'vector_database'
   };

   // Listen to checkbox changes
   document.querySelectorAll('.api-badge input[type="checkbox"]').forEach(checkbox => {
     checkbox.addEventListener('change', (e) => {
       const capability = apiMapping[e.target.dataset.api];
       if (e.target.checked) {
         state.data.capabilities.push(capability);
       } else {
         state.data.capabilities = state.data.capabilities.filter(c => c !== capability);
       }
     });
   });
   ```

2. **Conditional credential inputs** (Step 3)
   - Only show API key fields for selected capabilities
   - Hide unused credential inputs
   - Validate required credentials based on selected APIs

---

## 3. backend.html - Service Status Integration

### Current State (Problems)
- **Line 52-140**: All services show "Running" with green status
- **Line 148-155**: Fake log entries with hardcoded timestamps
- No real health checks or monitoring data

### Target Backend API
```http
GET /api/v1/health
Response: {
  "services": {
    "orchestrator": {
      "status": "running" | "degraded" | "down",
      "uptime": number,
      "lastCheck": "ISO 8601"
    },
    "memory_db": { ... },
    "api_gateway": { ... },
    "task_queue": {
      "status": "running",
      "metrics": {
        "queueSize": number,
        "processingRate": number,
        "saturation": number // 0-1
      }
    },
    ...
  }
}

GET /api/v1/logs?service=<service>&limit=100
Response: {
  "logs": [
    {
      "timestamp": "ISO 8601",
      "level": "info" | "debug" | "warn" | "error",
      "service": "string",
      "message": "string"
    }
  ]
}
```

### Implementation Plan

#### Phase 1: Live Service Status
1. **Fetch health data**
   ```javascript
   async function updateServiceStatus() {
     const health = await api.getHealth();

     Object.entries(health.services).forEach(([serviceName, data]) => {
       const card = document.querySelector(`[data-service="${serviceName}"]`);
       const statusDot = card.querySelector('.status-indicator');
       const statusText = card.querySelector('.status-text');

       // Update status color
       statusDot.className = `w-2 h-2 rounded-full ${getStatusColor(data.status)}`;
       statusText.textContent = data.status;

       // Add metrics if available
       if (data.metrics) {
         renderMetrics(card, data.metrics);
       }
     });
   }
   ```

2. **Status indicators**
   - Green: Running normally
   - Yellow: Degraded performance
   - Red: Down or unreachable
   - Gray: Unknown/checking

3. **Auto-refresh**
   - Poll health endpoint every 10 seconds
   - Show "Last updated" timestamp
   - WebSocket updates for instant notifications

#### Phase 2: Live Log Streaming
1. **Replace fake logs** (line 148-155)
   ```javascript
   async function streamLogs(serviceFilter = null) {
     const logs = await api.getLogs({ service: serviceFilter, limit: 50 });

     const logContainer = document.querySelector('#log-output');
     logContainer.innerHTML = logs.logs.map(log => {
       const levelColor = {
         'info': 'text-green-400',
         'debug': 'text-blue-400',
         'warn': 'text-yellow-400',
         'error': 'text-red-400'
       }[log.level];

       return `<span class="${levelColor}">[${log.level.toUpperCase()}]</span> ${log.timestamp} ${log.service}: ${log.message}`;
     }).join('\n');
   }
   ```

2. **Log filtering**
   - Filter by service (dropdown)
   - Filter by log level
   - Search logs by keyword
   - Export logs to file

3. **Real-time updates**
   - WebSocket for live log streaming
   - Auto-scroll to bottom for new logs
   - Pause/resume stream toggle

#### Phase 3: Service Metrics Dashboard
1. **Add metrics panels**
   - Task queue saturation graph
   - API gateway request rate
   - Memory database size/usage
   - Average response times

2. **Historical data**
   - Chart.js integration for time-series data
   - Last 1h, 24h, 7d views
   - Export metrics to CSV

---

## 4. DTO Design & Type Safety

### Frontend DTOs (TypeScript definitions)

Create `/types/agent-dtos.ts`:

```typescript
// Step 1: Define Agent
export interface AgentBasicInfo {
  name: string;
  type: 'code-assistant' | 'document-manager' | 'qa-bot';
  purpose: string;
}

// Step 2: Connect APIs
export type Capability =
  | 'openai'
  | 'github'
  | 'dropbox'
  | 'slack'
  | 'aws'
  | 'postgresql'
  | 'web_search'
  | 'vector_database';

// Step 3: Set Permissions
export interface AgentCredentials {
  openai?: string;
  github?: string;
  dropbox?: string;
  slack?: string;
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  postgresql?: {
    host: string;
    database: string;
    user: string;
    password: string;
  };
}

export interface AgentPermissions {
  readFiles: boolean;
  modifyFiles: boolean;
  createFiles: boolean;
  executeCode: boolean;
  sendMessages: boolean;
}

// Configuration
export interface MemoryConfig {
  enabled: boolean;
  chunkSize?: number;
  retrievalCount?: number;
  embeddingModel?: string;
}

export interface ReasoningConfig {
  enabled: boolean;
  decisionThreshold?: number;
  maxIterations?: number;
  fallbackAction?: 'request_human_help' | 'abort' | 'retry';
}

export interface WebSearchConfig {
  enabled: boolean;
  maxResults?: number;
  minRelevance?: number;
  timeout?: number;
}

export interface AgentConfig {
  memory: MemoryConfig;
  reasoning: ReasoningConfig;
  webSearch: WebSearchConfig;
}

// Full Agent Creation Request
export interface CreateAgentRequest {
  name: string;
  type: 'code-assistant' | 'document-manager' | 'qa-bot';
  purpose: string;
  capabilities: Capability[];
  credentials: AgentCredentials;
  permissions: AgentPermissions;
  config: AgentConfig;
  triggers?: {
    pullRequest?: boolean;
    schedule?: string; // cron expression
  };
  environment: 'production' | 'staging';
  monitoring: boolean;
}

// Agent Response
export interface Agent {
  id: string;
  name: string;
  type: 'code-assistant' | 'document-manager' | 'qa-bot';
  status: 'active' | 'inactive' | 'pending';
  capabilities: Capability[];
  lastRun: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
  metrics?: {
    totalRuns: number;
    successRate: number;
    avgExecutionTime: number;
  };
}

// Validation Error Response
export interface ValidationError {
  field: string;
  errors: string[];
}

export interface APIError {
  error: string;
  validationErrors?: ValidationError[];
}
```

---

## 5. Implementation Sequence

### Phase 1: Foundation (Week 1)
1. ✅ Fix marketing copy (index.html) - DONE
2. Create API client module (`/js/api-client.js`)
3. Add TypeScript types (`/types/agent-dtos.ts`)
4. Set up build process (if using TypeScript)

### Phase 2: Agent Dashboard (Week 2)
1. Implement `agents.html` API integration
2. Add loading/error states
3. Wire up delete functionality
4. Add filtering and search
5. Create logs modal/page

### Phase 3: Agent Creator (Week 2-3)
1. Implement wizard state management
2. Connect form inputs to state
3. Dynamic review summary
4. Deploy button integration
5. Validation error handling
6. Draft save/restore from localStorage

### Phase 4: Backend Status (Week 3)
1. Integrate health check API
2. Live service status indicators
3. Real log streaming
4. Add metrics dashboard
5. WebSocket integration for real-time updates

### Phase 5: Polish & Testing (Week 4)
1. Error handling and user feedback
2. Loading states and skeletons
3. Toast notifications
4. Accessibility improvements
5. Mobile responsiveness
6. Integration testing
7. Documentation updates

---

## 6. API Client Configuration

### Environment-based API URLs

Create `/js/config.js`:
```javascript
const ENV = {
  development: 'http://localhost:3000',
  staging: 'https://staging-api.agentforge.io',
  production: 'https://api.agentforge.io'
};

export const API_BASE_URL = ENV[process.env.NODE_ENV || 'development'];
```

### Error Handling Strategy
- Network errors: Show retry button
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show permission error
- 400 Bad Request: Display validation errors
- 500 Server Error: Show generic error with support contact
- Timeout: Show timeout message with retry option

---

## 7. Testing Plan

### Unit Tests
- State management logic
- DTO transformations
- Validation functions
- Timestamp formatting

### Integration Tests
- API client methods
- Form submission flows
- Error handling scenarios
- State persistence

### E2E Tests
- Complete wizard flow
- Agent CRUD operations
- Filter and search
- Real-time updates

---

## Next Steps

1. **Backend Development**: Ensure all documented APIs exist and match schemas
2. **Frontend Migration**: Implement according to phases above
3. **Testing**: Continuous testing during each phase
4. **Documentation**: Update CLAUDE.md with new architecture
5. **Deployment**: Staged rollout (staging → production)

---

## Dependencies to Install

```bash
# If using TypeScript
npm install --save-dev typescript @types/node

# If using build tools
npm install --save-dev webpack webpack-cli babel-loader

# Testing
npm install --save-dev jest @testing-library/dom

# Optional: State management
npm install zustand # or redux-toolkit
```

---

**Status**: Plan ready for implementation
**Priority**: High - Blocks production deployment
**Estimated Effort**: 3-4 weeks for full implementation
