# Design System Specification: The Nocturnal Command

## 1. Overview & Creative North Star
**Creative North Star: The Digital Architect**
This design system moves beyond the utility of a standard terminal and enters the realm of a high-end IDE. It is built on the philosophy of "The Digital Architect"—a space that feels structural, intentional, and quiet. We eschew the chaotic density of traditional terminals for an editorial layout that uses high-contrast typography and deep, tonal layering. 

The system breaks the "template" look through **intentional asymmetry**. Sidebars are not just panels; they are glass-morphic anchors. The UI uses extreme typography scales (massive headlines vs. tiny, precise labels) to create a hierarchy that feels curated. This is a developer tool designed for focus, where the interface recedes to let the code shine, only emerging with vibrant accents when interaction is required.

---

## 2. Colors: Tonal Depth & Signature Accents
We use a palette of deep charcoals and "Electronic" purples/blues. The goal is depth without clutter.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off major areas (sidebar vs. main content). Boundaries must be defined solely through background color shifts. For example, the main terminal area uses `surface_container_lowest` (#000000), while the surrounding shell uses `surface` (#0c0e12).

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following hierarchy for nesting:
- **Base Layer:** `surface` (#0c0e12) for the application window background.
- **Section Layer:** `surface_container_low` (#111318) for grouping secondary modules.
- **Interactive Layer:** `surface_container_high` (#1d2025) for hover states and active cards.
- **Focus Layer:** `surface_container_highest` (#23262c) for elements that need to pop against the background.

### The "Glass & Gradient" Rule
Floating elements (Modals, Command Palettes, Floating Sidebars) must use Glassmorphism.
- **Token:** `surface_variant` (#23262c) at 60% opacity + 20px backdrop blur.
- **Signature Texture:** Primary buttons and hero states should utilize a subtle linear gradient: `primary` (#b79fff) to `primary_container` (#ab8ffe) at a 135-degree angle. This provides a "soul" to the action that flat hex codes cannot achieve.

---

## 3. Typography: The Editorial Monospace
The typography system pairs the technical precision of Monospace with the high-end character of Space Grotesk.

*   **Display & Headline (Space Grotesk):** Used for "Zen Mode" headers or large status indicators. High-contrast sizing (e.g., `display-lg` at 3.5rem) creates an authoritative, editorial feel.
*   **Titles & Body (Inter):** The workhorse for the UI. `title-sm` (1rem) provides clarity for menu items, while `body-md` (0.875rem) handles the bulk of metadata.
*   **The Terminal Core:** All actual command-line input/output must utilize a clear, high-legibility monospace font (e.g., JetBrains Mono or Fira Code) mapped to the `body` tokens to ensure technical accuracy.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to define structure; we use light and opacity.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section. The human eye perceives the contrast as a change in depth without the need for heavy-handed drop shadows.
*   **Ambient Shadows:** For floating Command Palettes (Cmd+K), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow color should never be pure gray; it should be a tint of the `background` color.
*   **The "Ghost Border":** If containment is required (e.g., in high-density data tables), use a "Ghost Border": `outline_variant` (#46484d) at 15% opacity. **Never use 100% opaque borders.**
*   **Active States:** Indicate the active terminal tab or focused input using a "Glow" rather than a border. Apply a subtle 4px outer glow using the `secondary` (#2db7f2) color at 30% opacity.

---

## 5. Components: Refined Utility

### Buttons & Chips
- **Primary Button:** Gradient fill (`primary` to `primary_container`), `md` (0.75rem) rounded corners. Text is `on_primary_container`.
- **Ghost Action (Chips):** No background, `outline_variant` at 20% opacity. On hover, transition to `surface_container_highest`.
- **Status Chips:** Use `secondary` (Blue) for active sessions and `tertiary` (Pink) for AI-assisted states.

### Terminal Inputs (The "Command Line")
- **Background:** `surface_container_lowest`.
- **Cursor:** `secondary` (#2db7f2) with a 2px width and a soft outer glow.
- **Prompt:** Use `primary` (#b79fff) for the directory path and `tertiary` (#ff86c3) for the Git branch.

### Cards & Lists (The Sidebar)
- **Forbid Dividers:** Do not use lines between list items. Use 8px of vertical whitespace and a subtle background shift (`surface_container_low`) on hover to define the interactive area.
- **Glassmorphic Sidebar:** The left navigation should use a semi-transparent `surface_container` with a `backdrop-filter: blur(12px)`.

### Command Palette (Specialty Component)
A floating modal centered in the viewport. It should use the `xl` (1.5rem) roundedness and a `surface_bright` (#292c32) glass background. Inputs inside the palette should have no border, only a `surface_container_highest` background.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `secondary_dim` (#05a9e3) for syntax highlighting of variables to ensure readability against the dark background.
*   **Do** apply `md` (0.75rem) or `lg` (1rem) corner radius to all containers to soften the "brutalism" of the terminal.
*   **Do** use asymmetrical padding (e.g., more padding on the left of a header than the right) to create a modern, editorial rhythm.

### Don'ts
*   **Don't** use 100% white for text. Use `on_surface` (#f6f6fc) for high emphasis and `on_surface_variant` (#aaabb0) for secondary metadata.
*   **Don't** use standard "Windows" or "Mac" system shadows. They are too sharp. Stick to the Ambient Shadow rule.
*   **Don't** crowd the interface. If a module feels tight, increase the `surface` spacing rather than adding a border. This system lives and breathes on "empty" space.