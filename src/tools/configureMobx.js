import {configure} from "mobx";

// MobX 6 defaults to `enforceActions: 'observed'`, which throws when observable
// state is mutated outside an action. The codebase relies on mobx-state-tree
// (which manages its own actions) plus a few permissive patterns from the
// MobX 5 era, so we keep the previous, non-enforcing behavior. Imported first
// from every entry point (bg, Index, Options) before any store is created.
configure({
  enforceActions: 'never',
  useProxies: 'always',
});
