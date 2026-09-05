```markdown
# fast-grava-es-v2 Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `fast-grava-es-v2` TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns. This guide will help you contribute code that aligns with the project's established standards.

## Coding Conventions

### File Naming
- **Pattern:** PascalCase
- **Example:**  
  ```plaintext
  UserService.ts
  EventStoreHandler.ts
  ```

### Import Style
- **Pattern:** Alias-based imports
- **Example:**
  ```typescript
  import { UserService } from 'services/UserService';
  import { EventStoreHandler } from 'handlers/EventStoreHandler';
  ```

### Export Style
- **Pattern:** Mixed (both named and default exports are used)
- **Example:**
  ```typescript
  // Named export
  export function createUser() { ... }

  // Default export
  export default class EventStoreHandler { ... }
  ```

### Commit Messages
- **Pattern:** Conventional commits with `fix` prefix
- **Example:**
  ```
  fix: correct event stream initialization bug in EventStoreHandler
  ```

## Workflows

### Adding a New Feature
**Trigger:** When you need to add new functionality to the codebase  
**Command:** `/add-feature`

1. Create a new file using PascalCase (e.g., `NewFeature.ts`).
2. Use alias imports for dependencies.
3. Export your feature using named or default exports as appropriate.
4. Write corresponding tests in a file named `NewFeature.test.ts`.
5. Commit your changes using a conventional commit message (e.g., `fix: add support for new feature`).

### Fixing a Bug
**Trigger:** When you need to resolve a bug  
**Command:** `/fix-bug`

1. Identify the bug and locate the relevant file.
2. Apply your fix, maintaining the code style conventions.
3. Update or add tests in the relevant `*.test.ts` file.
4. Commit your changes using the `fix` prefix (e.g., `fix: resolve issue with event handling`).

### Writing Tests
**Trigger:** When you add or modify features  
**Command:** `/write-test`

1. Create or update a test file matching the pattern `*.test.ts`.
2. Write tests covering the new or changed functionality.
3. Run your tests using the project's test runner (framework unknown; check project scripts).

## Testing Patterns

- **Test File Pattern:** `*.test.ts`
- **Framework:** Unknown (check project dependencies or scripts for details)
- **Example:**
  ```typescript
  import { createUser } from 'services/UserService';

  describe('createUser', () => {
    it('should create a new user', () => {
      const user = createUser('Alice');
      expect(user.name).toBe('Alice');
    });
  });
  ```

## Commands
| Command       | Purpose                                         |
|---------------|-------------------------------------------------|
| /add-feature  | Guide for adding a new feature                  |
| /fix-bug      | Steps for fixing a bug                          |
| /write-test   | Instructions for writing and organizing tests   |
```
