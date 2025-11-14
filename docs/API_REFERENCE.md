# Binary Coven - API Reference

Complete reference for all API endpoints in the Binary Coven Learning Management System.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Session Codes](#session-codes)
4. [Game State](#game-state)
5. [Analytics](#analytics)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Overview

### Base URL

All API endpoints are relative to your application root:
```
https://binarycoven.xxx/api
```

### Authentication

The API uses HTTP-only cookies for session management:
- **Student sessions**: `student_session_id` cookie
- **Admin sessions**: `admin_session` cookie

Cookies are set automatically upon successful login and are required for authenticated endpoints.

### Response Format

All endpoints return JSON with the following structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* endpoint-specific data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

### HTTP Status Codes

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid input or validation error
- `401 Unauthorized`: Authentication required or failed
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: Wrong HTTP method
- `500 Internal Server Error`: Server-side error

---

## Authentication

### POST /api/auth/student-login

Student registration and login.

**Authentication**: None (public)

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)",
  "sessionCode": "string (required, uppercase)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "student": {
    "id": "uuid",
    "username": "string",
    "displayName": "string",
    "sessionCodeId": "uuid"
  }
}
```

**Behavior:**
- Creates new student account if username doesn't exist for this session code
- Verifies password if student already exists
- Validates session code (exists, active, not expired, not full)
- Sets `student_session_id` cookie (30 days)
- Creates initial game save for new students

**Error Responses:**
- `400`: Invalid or expired session code
- `401`: Incorrect password
- `500`: Database error

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secure123",
    "sessionCode": "FALL2024"
  }'
```

---

### POST /api/auth/admin-login

Admin authentication.

**Authentication**: None (public)

**Request Body:**
```json
{
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Admin login successful",
  "admin": {
    "id": "uuid",
    "role": "admin"
  }
}
```

**Behavior:**
- First login initializes password from `ADMIN_PASSWORD` env var
- Subsequent logins verify against stored hash
- Sets `admin_session=true` cookie
- Uses bcrypt for password hashing

**Error Responses:**
- `401`: Incorrect password
- `500`: Database error

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin123"}' \
  -c cookies.txt
```

---

### GET /api/auth/session

Check current authentication session.

**Authentication**: Cookie (student or admin)

**Success Response (200):**
```json
{
  "authenticated": true,
  "userType": "student" | "admin",
  "user": {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "sessionCodeId": "string"
  }
}
```

**Unauthenticated Response (200):**
```json
{
  "authenticated": false,
  "userType": null,
  "user": null
}
```

**Example:**
```bash
curl https://binarycoven.xxx/api/auth/session \
  -b cookies.txt
```

---

### POST /api/auth/logout

Logout and clear session cookies.

**Authentication**: Cookie (student or admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Behavior:**
- Clears all session cookies
- Works for both student and admin sessions

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/auth/logout \
  -b cookies.txt
```

---

## Session Codes

### POST /api/session-codes/create

Create a new session code.

**Authentication**: Admin only

**Request Body:**
```json
{
  "code": "string (optional, 6-20 chars, uppercase)",
  "validityHours": "number (optional)",
  "validityDays": "number (optional)",
  "validityEnd": "string ISO date (optional)",
  "maxStudents": "number (optional, null = unlimited)"
}
```

**Validity Rules:**
- Provide one of: `validityHours`, `validityDays`, or `validityEnd`
- If none provided, defaults to 30 days
- `validityStart` is set to current time automatically

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session code created successfully",
  "sessionCode": {
    "id": "uuid",
    "code": "string",
    "validityStart": "ISO date",
    "validityEnd": "ISO date",
    "isActive": true
  }
}
```

**Error Responses:**
- `400`: Code already exists
- `401`: Admin authentication required
- `500`: Database error

**Example:**
```bash
curl -X POST https://admin.binarycoven.xxx/api/session-codes/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "code": "SPRING2025",
    "validityDays": 90,
    "maxStudents": 30
  }'
```

---

### GET /api/session-codes/list

List all session codes with statistics.

**Authentication**: Admin only

**Success Response (200):**
```json
{
  "success": true,
  "sessionCodes": [
    {
      "id": "uuid",
      "code": "string",
      "validityStart": "ISO date",
      "validityEnd": "ISO date",
      "isActive": true,
      "createdAt": "ISO date",
      "studentCount": 25,
      "activeStudents24h": 15,
      "status": "active" | "expired" | "scheduled",
      "maxStudents": 30
    }
  ]
}
```

**Status Values:**
- `active`: Currently valid (between start and end dates)
- `expired`: Past end date
- `scheduled`: Before start date (future)

**Example:**
```bash
curl https://admin.binarycoven.xxx/api/session-codes/list \
  -b cookies.txt
```

---

### GET /api/session-codes/validate

Validate a session code (public endpoint for student login).

**Authentication**: None (public)

**Query Parameters:**
- `code`: Session code to validate (required)

**Success Response (200):**
```json
{
  "valid": true,
  "message": "Session code is valid",
  "sessionCode": {
    "id": "uuid",
    "code": "string",
    "validityEnd": "ISO date"
  }
}
```

**Invalid Response (200):**
```json
{
  "valid": false,
  "message": "Invalid session code",
  "reason": "not_found" | "expired" | "not_started" | "inactive" | "full"
}
```

**Example:**
```bash
curl "https://binarycoven.xxx/api/session-codes/validate?code=FALL2024"
```

---

### GET /api/session-codes/[code]/students

Get all students for a specific session code.

**Authentication**: Admin only

**Path Parameters:**
- `code`: Session code (e.g., `FALL2024`)

**Success Response (200):**
```json
{
  "success": true,
  "sessionCode": {
    "id": "uuid",
    "code": "string",
    "validityEnd": "ISO date",
    "maxStudents": 30
  },
  "students": [
    {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "joinedAt": "ISO date",
      "lastLogin": "ISO date",
      "questsCompleted": 5,
      "questsActive": 2,
      "totalTimeSpentSeconds": 3600,
      "totalCodeExecutions": 150,
      "lastSaveTime": "ISO date"
    }
  ]
}
```

**Error Responses:**
- `401`: Admin authentication required
- `404`: Session code not found

**Example:**
```bash
curl https://admin.binarycoven.xxx/api/session-codes/FALL2024/students \
  -b cookies.txt
```

---

## Game State

### POST /api/game/save

Save complete game state to cloud.

**Authentication**: Student only

**Request Body:**
```json
{
  "gameState": {
    "version": "string",
    "timestamp": "number",
    "gridSize": "number",
    "grids": [],
    "entities": [],
    "activeEntityId": "string",
    "globalResources": {},
    "codeWindows": [],
    "mainWindowId": "string",
    "questProgress": {}
  },
  "saveName": "string (optional, default: 'autosave')"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Game saved successfully",
  "savedAt": "ISO date"
}
```

**Behavior:**
- Upserts data (insert or update if exists)
- Identified by `(student_profile_id, save_name)` unique constraint
- Increments `save_version` automatically

**Error Responses:**
- `400`: Missing or invalid game state
- `401`: Student authentication required
- `500`: Database error

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/game/save \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d @gamestate.json
```

---

### GET /api/game/load

Load game state from cloud.

**Authentication**: Student only

**Query Parameters:**
- `saveName`: Save name to load (optional, default: 'autosave')

**Success Response - Save Exists (200):**
```json
{
  "success": true,
  "saveExists": true,
  "gameState": { /* complete game state */ },
  "lastSaved": "ISO date"
}
```

**Success Response - No Save (200):**
```json
{
  "success": true,
  "saveExists": false,
  "gameState": null,
  "lastSaved": null
}
```

**Error Responses:**
- `401`: Student authentication required
- `500`: Database error

**Example:**
```bash
curl "https://binarycoven.xxx/api/game/load?saveName=autosave" \
  -b cookies.txt
```

---

### POST /api/game/reset

Reset all student progress (delete all data).

**Authentication**: Student only

**Success Response (200):**
```json
{
  "success": true,
  "message": "Game reset successfully - all progress cleared"
}
```

**Behavior:**
- Deletes from `game_saves`
- Deletes from `quest_progress`
- Deletes from `objective_progress`
- Deletes from `code_executions`
- Deletes from `learning_events`
- Irreversible operation

**Error Responses:**
- `401`: Student authentication required
- `500`: Database error

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/game/reset \
  -b cookies.txt
```

---

## Analytics

### POST /api/analytics/quest-progress

Update quest progress.

**Authentication**: Student only

**Request Body:**
```json
{
  "questId": "string (required)",
  "questTitle": "string (required)",
  "state": "locked" | "available" | "active" | "completed" | "failed",
  "currentPhaseIndex": "number (optional)",
  "startedAt": "ISO date (optional)",
  "completedAt": "ISO date (optional)",
  "timeSpentSeconds": "number (optional)",
  "attempts": "number (optional)",
  "score": "number (optional)",
  "phaseProgress": "object (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quest progress updated successfully"
}
```

**Behavior:**
- Upserts data (insert or update if exists)
- Identified by `(student_profile_id, quest_id)`
- Used for tracking quest starts, completions, and updates

**Error Responses:**
- `400`: Missing required fields
- `401`: Student authentication required
- `500`: Database error

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/analytics/quest-progress \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "questId": "movement-basics",
    "questTitle": "Movement Basics",
    "state": "completed",
    "completedAt": "2024-01-15T10:30:00Z",
    "timeSpentSeconds": 300,
    "attempts": 2,
    "score": 100
  }'
```

---

### POST /api/analytics/objective-progress

Track objective completion.

**Authentication**: Student only

**Request Body:**
```json
{
  "questId": "string (required)",
  "phaseId": "string (required)",
  "objectiveIndex": "number (required)",
  "objectiveDescription": "string (required)",
  "completedAt": "ISO date (optional, default: now)",
  "attempts": "number (optional, default: 1)",
  "timeSpentSeconds": "number (optional, default: 0)",
  "hintsUsed": "number (optional, default: 0)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Objective progress updated successfully"
}
```

**Behavior:**
- Upserts data (insert or update if exists)
- Identified by `(student_profile_id, quest_id, phase_id, objective_index)`

**Error Responses:**
- `400`: Missing required fields
- `401`: Student authentication required
- `500`: Database error

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/analytics/objective-progress \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "questId": "movement-basics",
    "phaseId": "phase-1",
    "objectiveIndex": 0,
    "objectiveDescription": "Move the character forward",
    "completedAt": "2024-01-15T10:25:00Z",
    "attempts": 3,
    "timeSpentSeconds": 120,
    "hintsUsed": 1
  }'
```

---

### POST /api/analytics/code-execution

Log code execution event.

**Authentication**: Student only

**Request Body:**
```json
{
  "questId": "string (optional)",
  "phaseId": "string (optional)",
  "codeWindowId": "string (required)",
  "codeContent": "string (required)",
  "executionResult": {
    "success": "boolean (required)",
    "errors": "array (optional)",
    "output": "string (optional)",
    "executionTime": "number (optional)"
  },
  "entityId": "string (optional)",
  "executionDurationMs": "number (optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Code execution logged successfully"
}
```

**Behavior:**
- Inserts new record (not upsert)
- Tracks all code runs (successful and failed)
- Used for analytics and progress tracking

**Error Responses:**
- `400`: Missing required fields
- `401`: Student authentication required
- `500`: Database error

**Example:**
```bash
curl -X POST https://binarycoven.xxx/api/analytics/code-execution \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "questId": "movement-basics",
    "phaseId": "phase-1",
    "codeWindowId": "main",
    "codeContent": "move(\"forward\", 5);",
    "executionResult": {
      "success": true,
      "output": "Moved forward 5 steps",
      "executionTime": 42
    },
    "entityId": "player-1",
    "executionDurationMs": 45
  }'
```

---

### GET /api/analytics/student/[id]

Get detailed analytics for a specific student.

**Authentication**: Admin only

**Path Parameters:**
- `id`: Student profile ID (UUID)

**Success Response (200):**
```json
{
  "success": true,
  "analytics": {
    "profile": {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "sessionCode": "string",
      "joinedAt": "ISO date",
      "lastLogin": "ISO date"
    },
    "summary": {
      "questsCompleted": 5,
      "questsActive": 2,
      "totalTimeSpentSeconds": 3600,
      "totalCodeExecutions": 150,
      "lastSaveTime": "ISO date"
    },
    "questProgress": [
      {
        "questId": "string",
        "questTitle": "string",
        "state": "string",
        "currentPhaseIndex": 0,
        "startedAt": "ISO date",
        "completedAt": "ISO date",
        "timeSpentSeconds": 300,
        "attempts": 2,
        "score": 100,
        "phaseProgress": {}
      }
    ],
    "objectiveProgress": [
      {
        "questId": "string",
        "phaseId": "string",
        "objectiveIndex": 0,
        "objectiveDescription": "string",
        "completedAt": "ISO date",
        "attempts": 1,
        "timeSpentSeconds": 60,
        "hintsUsed": 0
      }
    ],
    "recentCodeExecutions": [
      {
        "id": "uuid",
        "questId": "string",
        "phaseId": "string",
        "codeWindowId": "string",
        "codeContent": "string",
        "executionResult": {},
        "executedAt": "ISO date",
        "executionDurationMs": 45
      }
    ],
    "gameState": {
      "lastSaved": "ISO date",
      "gameState": {}
    }
  }
}
```

**Error Responses:**
- `401`: Admin authentication required
- `404`: Student not found
- `500`: Database error

**Example:**
```bash
curl https://admin.binarycoven.xxx/api/analytics/student/550e8400-e29b-41d4-a716-446655440000 \
  -b cookies.txt
```

---

## Error Handling

### Common Error Patterns

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Username, password, and session code are required"
}
```

**Authentication Error (401):**
```json
{
  "success": false,
  "message": "Unauthorized - Student session required"
}
```

**Not Found Error (404):**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "message": "An error occurred while processing your request"
}
```

### Error Handling Best Practices

1. **Always check `success` field** in response
2. **Display `message` field** to users
3. **Log `error` field** for debugging (dev only)
4. **Handle network errors** (offline, timeout)
5. **Implement retry logic** for transient failures
6. **Validate input** before sending requests

---

## Rate Limiting

### Current Limits

No rate limiting is currently implemented. Future versions may include:
- Per-IP rate limits for public endpoints
- Per-user rate limits for authenticated endpoints
- Burst limits for analytics batching

### Best Practices

1. **Batch requests** when possible
2. **Use analytics service** for automatic batching
3. **Don't poll** - use event-driven updates
4. **Cache responses** when appropriate
5. **Handle 429 errors** if rate limiting is added

---

## Integration Examples

### JavaScript/TypeScript

```typescript
// Student login
const loginStudent = async (username: string, password: string, sessionCode: string) => {
  const response = await fetch('/api/auth/student-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include cookies
    body: JSON.stringify({ username, password, sessionCode }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.student;
};

// Save game
const saveGame = async (gameState: any) => {
  const response = await fetch('/api/game/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ gameState, saveName: 'autosave' }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.savedAt;
};
```

### Python

```python
import requests

# Admin login
def admin_login(password):
    response = requests.post(
        'https://admin.binarycoven.xxx/api/auth/admin-login',
        json={'password': password},
    )
    response.raise_for_status()
    return response.json()

# Get all session codes
def get_session_codes(cookies):
    response = requests.get(
        'https://admin.binarycoven.xxx/api/session-codes/list',
        cookies=cookies,
    )
    response.raise_for_status()
    return response.json()['sessionCodes']
```

---

## Changelog

### Version 1.0 (Current)
- Initial API implementation
- All core endpoints
- Authentication system
- Game state management
- Analytics tracking

### Future Versions
- Rate limiting
- Webhooks for events
- Bulk operations
- Export endpoints
- Real-time updates via WebSocket

---

## Support

For API issues or questions:
- Check `docs/TROUBLESHOOTING.md`
- Review `docs/ADMIN_GUIDE.md`
- Contact system administrator

**Version**: 1.0
**Last Updated**: Phase 10 - Polish & Testing
