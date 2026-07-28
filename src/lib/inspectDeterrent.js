// Deterrent only, not real protection -- DevTools can always be reached another
// way (undocked window, browser menu, a different browser). Real access control
// is enforced server-side via Supabase RLS; this just discourages casual right-click
// "view source" / F12 poking by non-technical users.
export function installInspectDeterrent() {
  const blockContextMenu = (event) => event.preventDefault();

  const blockDevToolsShortcuts = (event) => {
    const key = event.key;
    const blocked =
      key === 'F12' ||
      (event.ctrlKey && event.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(key)) ||
      (event.ctrlKey && ['U', 'u'].includes(key));
    if (blocked) event.preventDefault();
  };

  document.addEventListener('contextmenu', blockContextMenu);
  document.addEventListener('keydown', blockDevToolsShortcuts);

  return () => {
    document.removeEventListener('contextmenu', blockContextMenu);
    document.removeEventListener('keydown', blockDevToolsShortcuts);
  };
}
