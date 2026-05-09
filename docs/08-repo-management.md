# 08 — Repo Management

## Principles

- The app never clones, fetches, or modifies repos on the user's behalf.
- The user adds repos by pointing the app at folders they already have cloned locally.
- Branch management (pull, push, merge) remains entirely in the user's own git client.
- The app reads whatever is currently checked out in each repo at the time of each message.

---

## Adding a Repository

The user clicks **Add Repository** (in the new project flow or Manage Repos screen). A native OS folder picker opens. The user selects a local folder.

The Tauri shell validates the selection:

```rust
fn validate_repo(path: &Path) -> Result<RepoInfo, Error> {
    // Check .git folder exists
    if !path.join(".git").exists() {
        return Err(Error::NotAGitRepo);
    }
    let repo = Repository::open(path)?;
    let head = repo.head()?;
    let branch = head.shorthand().unwrap_or("HEAD").to_string();
    let name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    Ok(RepoInfo { name, local_path: path.to_owned(), current_branch: branch })
}
```

If valid, the repo is added to the project in `app.db` with its local path and detected name. If invalid (no `.git` folder found), an inline error is shown: "This folder does not appear to be a git repository."

Drag-and-drop is also supported — the user can drag a folder from Finder or Windows Explorer directly onto the repo list panel.

---

## Reading Current Branch

At two points the app reads the current branch of each repo:

1. **On app start / project open** — to populate the branch dropdowns with the currently checked-out state
2. **On each message send** — to ensure the branchMap passed to the Squad coordinator reflects the actual current state, even if the user pulled or switched branches in their git client between messages

```rust
fn get_current_branch(local_path: &Path) -> Result<String, Error> {
    let repo = Repository::open(local_path)?;
    let head = repo.head()?;
    Ok(head.shorthand().unwrap_or("HEAD").to_string())
}
```

This means the app is always in sync with the user's git client without any polling or file watching.

---

## Branch Listing

Available branches for the dropdown are read from the local clone's refs:

```rust
fn list_branches(local_path: &Path) -> Result<Vec<String>, Error> {
    let repo = Repository::open(local_path)?;
    let mut branches = vec![];

    // Local branches
    for branch in repo.branches(Some(BranchType::Local))? {
        let (b, _) = branch?;
        if let Some(name) = b.name()? {
            branches.push(name.to_string());
        }
    }

    // Remote-tracking branches (strip "origin/" prefix)
    for branch in repo.branches(Some(BranchType::Remote))? {
        let (b, _) = branch?;
        if let Some(name) = b.name()? {
            let short = name.trim_start_matches("origin/");
            if !branches.contains(&short.to_string()) {
                branches.push(short.to_string());
            }
        }
    }
    Ok(branches)
}
```

No network call is made. The list reflects whatever branches are known to the local clone. If the user has recently fetched new remote branches in their git client, they will appear automatically on the next dropdown open.

---

## Worktrees (per Chat Window)

When all repos in a chat window are on their default branch, no worktrees are created — the session reads directly from the user's existing local clone. This is the zero-overhead default path.

When the user switches a repo to a different branch within a chat window (via dropdown or prompt), the app creates a `git worktree` for that repo scoped to the session:

```rust
fn create_worktree(
    repo_local_path: &Path,
    session_id: &str,
    repo_id: &str,
    branch: &str,
    worktree_base: &Path,
) -> Result<PathBuf, Error> {
    let repo = Repository::open(repo_local_path)?;
    let worktree_path = worktree_base.join(session_id).join(repo_id);
    repo.worktree(
        &format!("{}-{}", session_id, repo_id),
        &worktree_path,
        None,
    )?;
    // Checkout the target branch in the worktree
    let wt_repo = Repository::open(&worktree_path)?;
    let branch_ref = wt_repo.find_branch(branch, BranchType::Local)?;
    wt_repo.set_head(branch_ref.get().name().unwrap())?;
    wt_repo.checkout_head(Some(CheckoutBuilder::new().force()))?;
    Ok(worktree_path)
}
```

Worktrees are stored inside the app data directory, not inside the user's repo folder:

```
~/Library/Application Support/Agent42/projects/{project-id}/worktrees/
  {session-id}/
    {repo-id}/    ← worktree on the session's active branch
```

The user's original repo folder is never touched when a worktree is created.

**Worktree cleanup:** When a chat window is closed, all worktrees for that session are pruned automatically.

---

## Branch Switch via Prompt

When the user types a natural language branch switch command in chat (e.g. "switch backend to feature/auth"), the Squad coordinator detects this as a workspace command rather than a knowledge query. It sends a structured response back to the Tauri shell, which performs the same worktree/checkout operation as the dropdown flow, then confirms in chat.

---

## Removing a Repository

When the user clicks **Remove** on a repo in Manage Repos:

1. Confirmation dialog: "Remove [repo name] from this project? Your local folder will not be deleted."
2. All worktrees for this repo are pruned across all sessions
3. The repo record is removed from `app.db`
4. The repo disappears from branch selectors in all open chat windows for this project

The user's local repo folder is never deleted.

---

## v2 Considerations (out of scope for v1)

The following repo management features are deferred to v2:

- **Remote sync:** app-triggered `git fetch` and `git pull` on the user's behalf, with a Sync button in the UI
- **Webhook-based updates:** register push webhooks on GitHub/GitLab to detect new commits and notify active sessions
- **Browse and add repos from GitHub/GitLab:** search remote repos and let the app clone them into its own managed directory
- **App-managed clones:** separate clone storage per project, independent of the user's working copies
