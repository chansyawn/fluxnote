# Fluxnotes

Fluxnotes is a lightweight context buffer centered on Markdown **Blocks** that can be captured, edited, organized, and reopened from inside or outside the app.

## Language

**Workspace**:
The primary place where a user browses, filters, edits, and manages **Blocks**.
_Avoid_: Home, dashboard, note list

**User Preferences**:
User-controlled app-level choices that affect how Fluxnotes behaves and presents the **Workspace**.
_Avoid_: Settings, config, runtime state

**Block**:
A standalone Markdown unit with content, archive state, keep state, pin state, tags, and optional **Block Assets**.
_Avoid_: Note, document, item

**Block Asset**:
A local resource that belongs to exactly one **Block** and can be referenced from that **Block**'s Markdown content.
_Avoid_: Attachment, global asset, media file

**Block Editor**:
The editing surface for a single **Block**.
_Avoid_: Editor controller, persisted editor, text box

**Block Editor Shortcuts**:
**User Preferences** choices that control keyboard shortcuts for actions inside the **Block Editor**.
_Avoid_: Editor shortcuts, toolbar shortcuts

**Active Block**:
A **Block** that is visible in the normal working set.
_Avoid_: Current block, live block

**Archived Block**:
A **Block** that has been removed from the normal working set without being deleted.
_Avoid_: Hidden block, completed block

**Kept Block**:
An **Active Block** that the user has protected from **Auto Archive**.
_Avoid_: Pinned block, favorite block

**Pinned Block**:
An **Active Block** fixed to the top area of the **Workspace**.
_Avoid_: Kept block, favorite block

**Block Order**:
The user-controlled order of **Active Blocks** in the **Workspace**.
_Avoid_: Sort key, rank, position

**Auto Archive**:
The policy that moves eligible inactive **Blocks** into the archive.
_Avoid_: Cleanup, expiry, pruning

**Pending Auto Archive**:
The state of an eligible **Active Block** that will be archived by **Auto Archive** once archiving is allowed to run.
_Avoid_: Will archive, stale block, pending archive

**Tag**:
A user-defined label used to group and filter **Blocks**.
_Avoid_: Label, category

**Tag Filter**:
A **Workspace** view constrained to **Blocks** assigned to selected **Tags**.
_Avoid_: Search, category view

**Input Handoff**:
A workflow that passes content or focus between an external tool and Fluxnotes so the user can create, open, edit, submit, or cancel a **Block**.
_Avoid_: Entrypoint, backend command, launch path

**External Edit**:
An **Input Handoff** workflow where a **Block** is edited through an external file and then submitted or cancelled.
_Avoid_: Import, sync, handoff

**External Edit Session**:
An in-progress **External Edit** tied to exactly one **Block**.
_Avoid_: External job, edit task

**External Edit Trigger**:
The source and file context that started an **External Edit**.
_Avoid_: Origin metadata, launch data

**Block Navigation**:
The **Workspace** workflow that locates a **Block**, prepares the right **Workspace** view, scrolls the **Block** into view, and focuses its **Block Editor**.
_Avoid_: Scroll controller, focus controller, route navigation

## Relationships

- A **Workspace** contains zero or more **Blocks**.
- A **Block** is either an **Active Block** or an **Archived Block**.
- A **Block** can have zero or more **Tags**.
- A **Block** can have zero or more **Block Assets**.
- A **Block Asset** belongs to exactly one **Block**.
- A **Block Order** arranges **Active Blocks** in the **Workspace**.
- A **Pinned Block** appears before unpinned **Active Blocks** in the **Block Order**.
- A **Pinned Block** is protected from **Auto Archive** without becoming a **Kept Block**.
- A **Kept Block** is protected from **Auto Archive** without becoming a **Pinned Block**.
- A **Pending Auto Archive** state only applies to **Active Blocks**.
- A **Tag Filter** selects zero or more **Tags** and narrows the **Workspace** to matching **Blocks**.
- **Input Handoff** can create, open, or edit one **Block** at a time.
- **External Edit** is a kind of **Input Handoff**.
- An **External Edit Session** belongs to exactly one **Block** and temporarily protects that **Block** from archive, delete, and keep-state changes.
- An **External Edit Trigger** starts exactly one **External Edit Session**.
- **Block Navigation** operates inside the **Workspace** and targets one **Block** at a time.
- **Block Editor Shortcuts** belong to **User Preferences**.

## Example Dialogue

> **Dev:** "When a user creates a **Block** while a **Tag Filter** is active, should the new **Block** inherit the selected **Tags**?"
> **Domain expert:** "Yes — the **Workspace** should keep the user in that filtered context, so the new **Block** should appear there immediately."

> **Dev:** "If an **External Edit Session** exists for a **Block**, can the user delete that **Block** directly?"
> **Domain expert:** "No — the **External Edit** should be submitted or cancelled first so the **Block** has a clear final state."

> **Dev:** "If a **Pinned Block** is inactive long enough for **Auto Archive**, should it become a **Pending Auto Archive**?"
> **Domain expert:** "No — a **Pinned Block** is protected from **Auto Archive** without becoming a **Kept Block**."

## Flagged Ambiguities

- "Note" can be confused with **Block**; resolved: use **Block** for Fluxnotes content units.
- "Editor" can mean the app-level editing feature or the **Block Editor**; resolved: use **Block Editor** for the user-facing editing surface of one **Block**.
- "Editor Shortcuts" can mean shortcuts for multiple editing-related workflows; resolved: use **Block Editor Shortcuts** for shortcuts that act inside the **Block Editor**.
- "Keep" can be confused with saving content; resolved: **Kept Block** only means protected from **Auto Archive**.
- "Pinned" can be confused with **Kept Block**; resolved: **Pinned Block** only means fixed to the top area of the **Workspace**.
- "Settings" and "config" can mean implementation details or user choices; resolved: use **User Preferences** for user-controlled app-level choices.
- "Asset" can mean application packaging files or **Block Assets**; resolved: use **Block Asset** only for local resources belonging to a **Block**.
- "Handoff" can describe many app launches; resolved: use **Input Handoff** for external-tool workflows that pass Block content or focus through Fluxnotes.
