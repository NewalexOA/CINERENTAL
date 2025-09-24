# TASK EXECUTION INSTRUCTIONS FOR SPECIALIST AGENTS

## CRITICAL: Every specialist agent MUST follow these instructions

### 1. RESULT FILE FORMAT

Save your task result as JSON in this exact location:

```text
/Users/anaskin/Github/CINERENTAL/frontend_description/results/completed/TASK-XXX-result.json
```

### 2. JSON RESULT SCHEMA

```json
{
  "taskId": "TASK-XXX",
  "taskType": "architecture|page|section|component|api",
  "completedAt": "2025-09-13 10:30:00",
  "executedBy": "agent-name",
  "specification": {
    "name": "Component/Feature Name",
    "purpose": "What it does (functionality, NOT design)",
    "functionality": {
      "behavior": "Detailed behavior description",
      "apiIntegration": "API calls and parameters",
      "states": ["loading", "error", "success"],
      "validation": "Input validation rules",
      "userInteractions": "Click, input, navigation actions"
    },
    "implementation": {
      "props": ["required props"],
      "events": ["events emitted"],
      "dependencies": ["other components/APIs"],
      "acceptance_criteria": ["testable criteria"]
    },
    "playwrightResearch": {
      "url": "http://localhost:8000/specific-page",
      "interactions": ["actions performed"],
      "screenshots": ["screenshot filenames"],
      "apiCalls": ["observed API calls"],
      "findings": ["key discoveries"]
    }
  },
  "qualityMetrics": {
    "tokenCount": 12500,
    "functionalityFocus": true,
    "playwrightResearch": true,
    "implementationReady": true
  }
}
```

### 3. PLAYWRIGHT RESEARCH MANDATORY

- Open `http://localhost:8000` and navigate to component/page
- Test all interactions (click, input, navigation)
- Monitor Network tab for API calls
- Take screenshots of different states
- Document real behavior, not assumptions

### 4. FOCUS ON FUNCTIONALITY

❌ Do NOT describe: colors, fonts, layout, positioning, styling
✅ DO describe: what it does, how it behaves, API calls, validation, states

### 5. TOKEN REQUIREMENT

Each task result must be 10,000-15,000 tokens (comprehensive detail)

### 6. STATUS TRACKING

Coordinator will handle status updates - you focus on quality execution.
