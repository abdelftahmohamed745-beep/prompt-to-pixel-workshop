<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- ForgeFE is frontend-only demo: all state lives in `src/lib/store.tsx` (React context persisted to localStorage); no real auth or AI — keep demo actions clearly labelled.
- UI strings go through `src/lib/i18n.ts` (`t(key)`) with ar/en pairs; Arabic is default and `<html dir>` is set from the store — use logical Tailwind props (ms/me/ps/pe/start/end) so RTL/LTR both work.
- Protected pages wrap content in `RequireSession` (client-side demo guard, not security).
- Workspace renders either the desktop split or the mobile tabbed layout (not both) via a 1024px media query, to avoid duplicate iframes/ids.
