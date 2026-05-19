# Fluxnotes

Fluxnotes is a lightweight note-taking context centered on small Markdown blocks that can be captured, edited, organized, and reopened from inside or outside the app.

## Language

**Workspace**:
The primary place where a user browses, filters, edits, and manages their note blocks.
_Avoid_: Home, dashboard, note list

**User Preferences**:
User-controlled app-level choices that affect how Fluxnotes behaves and presents the **Workspace**.
_Avoid_: Settings, config, runtime state

**Block**:
A standalone note unit with Markdown content, archive state, keep state, and tags.
_Avoid_: Note, document, item

**Block Editor**:
The editing surface for a single **Block**.
_Avoid_: Editor controller, persisted editor, text box

**Active Block**:
A **Block** that is visible in the normal working set.
_Avoid_: Current block, live block

**Archived Block**:
A **Block** that has been removed from the normal working set without being deleted.
_Avoid_: Hidden block, completed block

**Kept Block**:
An **Active Block** that the user has protected from automatic archiving.
_Avoid_: Pinned block, favorite block

**Auto Archive**:
The policy that moves eligible inactive **Blocks** into the archive.
_Avoid_: Cleanup, expiry, pruning

**Tag**:
A user-defined label used to group and filter **Blocks**.
_Avoid_: Label, category

**Tag Filter**:
A **Workspace** view constrained to **Blocks** assigned to selected **Tags**.
_Avoid_: Search, category view

**External Edit**:
A workflow where a **Block** is edited through an external file and then submitted or cancelled.
_Avoid_: Import, sync, handoff

**External Edit Session**:
An in-progress **External Edit** tied to exactly one **Block**.
_Avoid_: External job, edit task

**External Edit Trigger**:
The source and file context that started an **External Edit**.
_Avoid_: Origin metadata, launch data

**Block Navigation**:
The Workspace workflow that locates a **Block**, prepares the right **Workspace** view, scrolls the **Block** into view, and focuses its **Block Editor**.
_Avoid_: Scroll controller, focus controller, route navigation

## Relationships

- A **Workspace** contains zero or more **Blocks**.
- A **Block** is either an **Active Block** or an **Archived Block**.
- A **Block** can have zero or more **Tags**.
- A **Tag Filter** selects zero or more **Tags** and narrows the **Workspace** to matching **Blocks**.
- A **Kept Block** is an **Active Block** excluded from **Auto Archive**.
- An **External Edit Session** belongs to exactly one **Block**.
- An **External Edit Trigger** starts exactly one **External Edit Session**.
- **Block Navigation** operates inside the **Workspace** and targets one **Block** at a time.
- **User Preferences** can affect **Workspace** presentation and app-level behavior.

## Example Dialogue

> **Dev:** "When a user creates a **Block** while a **Tag Filter** is active, should the new **Block** inherit the selected **Tags**?"
> **Domain expert:** "Yes — the **Workspace** should keep the user in that filtered context, so the new **Block** should appear there immediately."

> **Dev:** "If an **External Edit Session** exists for a **Block**, can the user delete that **Block** directly?"
> **Domain expert:** "No — the **External Edit** should be submitted or cancelled first so the **Block** has a clear final state."

## Flagged Ambiguities

- "Editor" can mean the app-level editing feature or the **Block Editor**; resolved: use **Block Editor** for the user-facing editing surface of one **Block**.
- "Keep" can be confused with saving content; resolved: **Kept Block** only means protected from **Auto Archive**.
- "Settings" and "config" can mean implementation details or user choices; resolved: use **User Preferences** for user-controlled app-level choices.
