---
layout: default
title: UI Components
nav_order: 11
---

# UI Components
{: .no_toc }

Chat interface, message rendering, and approval prompts.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The frontend is a Next.js 14 application using React 18 and Tailwind CSS. It provides a dark-themed conversational interface with color-coded message types, inline approval prompts, and suggested quick-start actions.

---

## Chat Component

**File:** `src/components/Chat.tsx`

The main chat component manages conversation state, handles user input, and renders the message history.

### Features

| Feature | Description |
|:--------|:------------|
| **Message history** | Scrollable list of user and assistant messages |
| **Input field** | Text input with send button |
| **Suggested prompts** | Quick-start buttons for common actions |
| **Loading indicator** | Shows "Thinking..." during API calls |
| **Approval integration** | Renders ApprovalPrompt when `requires_approval` is true |
| **Auto-scroll** | Scrolls to latest message on update |

### Suggested Prompts

The interface displays clickable prompt buttons to help users get started:

- "Buy me a latte"
- "Book a $50 ride to JFK"
- "Pay invoice for $100"
- "What's my balance?"
- "Allow rides under $60 for 1 hour"

### API Integration

The component sends POST requests to `/api/chat` with:

```typescript
{
  message: string,
  user_id: "usr_1",
  approval_response?: "approve" | "deny",
  pending_purchase_id?: string
}
```

---

## MessageBubble Component

**File:** `src/components/MessageBubble.tsx`

Renders individual messages with type-based styling and Markdown-like formatting.

### Color Coding

| Message Type | Background Color | Border |
|:-------------|:----------------|:-------|
| `intent` | Blue tint | Blue left border |
| `quote` | Green tint | Green left border |
| `policy` | Yellow tint | Yellow left border |
| `approval_request` | Orange tint | Orange left border + highlight |
| `payment` | Purple tint | Purple left border |
| `receipt` | Emerald tint | Emerald left border + highlight |
| `error` | Red tint | Red left border + highlight |
| `text` (user) | Zinc-700 | None |
| `text` (assistant) | Zinc-800 | None |

### Text Formatting

The MessageBubble parses and renders:

| Syntax | Rendered As |
|:-------|:-----------|
| `**bold**` | **Bold text** |
| `` `code` `` | Inline code |
| `\| col1 \| col2 \|` | HTML table |
| `- item` | Bulleted list |
| Timestamps | Formatted date/time |

---

## ApprovalPrompt Component

**File:** `src/components/ApprovalPrompt.tsx`

Renders approve/deny buttons when a payment requires user confirmation.

### Props

```typescript
{
  purchaseId: string;                    // Purchase awaiting approval
  onApprove: (id: string) => void;       // Approve callback
  onDeny: (id: string) => void;          // Deny callback
}
```

### States

| State | Display |
|:------|:--------|
| Idle | Green "Approve" and Red "Deny" buttons |
| Loading | Disabled buttons with loading indicator |
| Resolved | Buttons hidden (approval/denial processed) |

---

## Styling

### Theme

The application uses a dark theme with Tailwind CSS:

| Element | Style |
|:--------|:------|
| Background | `zinc-950` |
| Container | `max-w-3xl` centered |
| Message area | Scrollable with padding |
| Input area | Fixed bottom, `zinc-900` background |
| Send button | Blue (`blue-600`) |

### Responsive Design

The layout is responsive with:
- Centered container with max-width constraint
- Full-height viewport usage
- Mobile-friendly touch targets on buttons
- Scrollable message area

---

## Page Structure

### Root Layout (`layout.tsx`)

```typescript
export const metadata = {
  title: "Agentic Commerce + Stablecoin Checkout",
  description: "AI-powered commerce agent...",
};
```

- Applies global CSS and custom fonts
- Sets dark background (`bg-zinc-950`)

### Home Page (`page.tsx`)

- Renders the header with title and chain status indicator
- Mounts the `Chat` component
- Displays "Base" chain status badge in the header
