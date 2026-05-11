---
"@evm-effect/evm": minor
---

Refactor `State` so trie access, storage, and transaction snapshots are instance methods (`beginTransaction`, `commitTransaction`, `rollbackTransaction`, `stateRoot`, storage helpers, and related APIs). Add `State.make` / `State.empty` with optional `readAccount` / `readStorage` overrides for forked or remote-backed state. Trie root computation is now effectful with a `TrieError` channel. Standalone state helpers delegate to the class; the default `State` export no longer includes transaction lifecycle helpers—use the `State` instance on `BlockEnvironment` instead.
