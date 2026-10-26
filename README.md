# Prompt To Pixel Workshop

ForgeFE — Complete Frontend UI Implementation



Mission



Build the complete frontend interface for ForgeFE, an AI website-building platform where users describe a website, inspect a live preview, review code changes, and manage projects.



This task is frontend UI implementation only. Do not build the AI agent backend, connect real AI APIs, or implement production authentication yet.



1. Inspect Before Editing



- Inspect the existing repository, framework, dependencies, routing, components, and current design before changing anything.

- Preserve working functionality and the existing architecture wherever practical.

- If the repository is empty, use Next.js, TypeScript, and Tailwind CSS.

- Implement the actual application, not a static mockup or a screenshot.

- Do not replace the entire project unnecessarily.



2. Design Direction



Create a distinctive, typography-led interface inspired by the usability and workflows of AI website builders such as Lovable, Bolt, and v0, without copying their layouts.



Use this design system:



- Canvas: "#F7F6F2"

- Primary ink: "#171717"

- Accent: "#D7FF64", used sparingly for important actions and active states.

- Secondary text: "#777771"

- Borders: "#E5E4DE"

- Use restrained shadows, thin borders, deliberate spacing, strong hierarchy, and consistent alignment.

- Use suitable Arabic and Latin fonts with consistent sizing and line height.

- Use a consistent icon library rather than emoji icons.

- Avoid generic AI dashboards, purple/blue gradients, neon glow, glassmorphism, decorative blobs, excessive rounded cards, oversized headings, and unnecessary animations.

- Research actual relevant interface references before designing, when browsing is available. Use references to understand layouts and interaction patterns, not to copy them.

- If the environment supports UI/UX Pro Max, install and use it as a design-system and interface-pattern reference. Its repository is https://github.com/nextlevelbuilder/ui-ux-pro-max-skill . Verify tool compatibility before installation; do not claim it was used if it could not be installed.



3. Build These Screens



A. Authentication



Create a complete login screen with:



- ForgeFE brand identity.

- Email and password fields.

- Password visibility toggle.

- Form validation and clear error messages.

- Remember-me option and password-reset screen.

- A registration screen and confirmation states.

- A Google sign-in button only if its integration is available; otherwise show it as an unavailable demo integration rather than pretending it works.



Since production authentication is outside this task, use a clearly documented demo flow for navigation.



B. Home Dashboard



After the demo login, display:



- A concise welcome area.

- A prominent “Create New Project” action.

- A large prompt input asking what the user wants to build.

- Recent projects with names, update dates, and actual statuses available from the current data.

- Search and project sorting.

- Project actions such as opening, renaming, duplicating, and deleting, with appropriate confirmation dialogs.

- Useful empty, loading, and error states.



Do not invent usage statistics, AI performance metrics, customer testimonials, or fake production activity.



C. New Project Flow



When the user creates a project:



- Collect a project name and website description.

- Provide optional starting preferences, such as website type and visual direction.

- Validate required fields.

- Show the resulting project and its prompt in the workspace.

- Clearly distinguish demo-generated data from data produced by a real AI service.



D. Main AI Builder Workspace



This is the core of ForgeFE and deserves the most design attention.



Desktop layout:



- A compact navigation area for the brand, projects, and workspace tools.

- A conversation panel for entering requests and viewing the assistant's responses.

- A substantial website preview area.

- A preview toolbar with desktop, tablet, and mobile viewport options.

- Project tabs for Preview, Code, Changes, and Logs.

- A task-status area showing planning, editing, testing, completion, and errors as applicable.

- A way to inspect changed files and revert a demo change where possible.



The prompt composer must support multiline text, a clear submit action, disabled/loading states, and a stop action when a demo task is running.



Do not make the chat panel so wide that it overwhelms the website preview. Make the preview the primary visual result.



E. Code and Changes



Create a usable code-inspection interface with:



- A file explorer.

- Syntax-highlighted code where supported.

- Clear indication of modified files.

- A readable changes/diff view.

- Copy-code functionality.

- Proper empty states when no project files exist.



If a full code editor dependency is unavailable, implement a simpler working code viewer rather than displaying decorative fake code.



F. Settings



Create settings screens for:



- Account profile.

- Appearance and theme.

- Language and direction.

- Workspace preferences.

- AI provider configuration interface, clearly marked as not connected.

- Usage information only when backed by real data; otherwise show a transparent demo state.



Never expose secret API keys in client-side code.



4. Mobile-First Responsive Behavior



The application must work on narrow Android screens as well as tablets and desktop browsers.



On mobile:



- Do not compress the entire desktop layout into a narrow screen.

- Reorganize the workspace into accessible views for Chat, Preview, Files, and Changes.

- Keep the prompt composer easy to reach and operate.

- Make dialogs, menus, file navigation, and forms usable by touch.

- Prevent unintended horizontal overflow.

- Respect the software keyboard and available viewport height.

- Use suitable touch-target sizes and preserve access to important actions.



Support Arabic and English:



- Arabic is the default language, with correct RTL layout, text alignment, icons, menus, and navigation.

- English must use a genuine LTR layout.

- Switching languages must update layout direction consistently, not just translate labels.



5. Interaction Requirements



Every visible control must have a defined behavior.



Implement working frontend interactions for navigation, forms, menus, project creation, search, sorting, renaming, confirmation dialogs, tabs, viewport switching, theme selection, and demo workspace actions.



Use realistic local demo data where necessary, but label demo functionality clearly. Do not simulate successful AI generation, deployment, authentication, or saving to a server as if real integrations exist.



Persist appropriate demo preferences locally when safe and supported. Keep application state consistent during navigation.



Include keyboard navigation, visible focus indicators, appropriate labels, reduced-motion support, and accessible contrast.



6. Implementation Quality



- Use reusable, typed components and consistent design tokens.

- Keep components focused and avoid unnecessary abstractions.

- Handle loading, empty, success, and failure states.

- Do not leave dead buttons, broken links, placeholder pages, or console errors.

- Do not rewrite unrelated application functionality.

- Keep secrets out of frontend code.

- Do not mark a feature complete if it is only a visual placeholder.



7. Verification and Acceptance Criteria



After implementation:



1. Run the available build and TypeScript checks.

2. Fix errors introduced by the changes.

3. Test every implemented navigation path and interactive control.

4. Verify the login-to-dashboard-to-project-to-workspace flow.

5. Test Arabic RTL and English LTR.

6. Inspect the application at narrow mobile, tablet, and desktop widths.

7. Check for horizontal overflow, clipped content, overlapping elements, unusable dialogs, and inaccessible controls.

8. Run browser-based tests when available and capture screenshots of the main screens at representative sizes.

9. Preserve existing functionality and report any regressions found.

10. Provide a concise completion report identifying implemented screens, actual test results, known limitations, and integrations that remain unconnected.



Do not stop after producing a plan or redesigning one screen. Implement the complete frontend scope above, verify it, and report honestly what works.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e6450eab-6877-4c15-98c5-dd728b6db6e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
