# STCS single package

This package is both the STCS host plugin and the `STCS` preset bundle.

## Install

Install this package as a bundle in DSH 0.2.2 or newer:

```text
plugin_manager install_bundle
target: "<this package or tarball>"
```

Then create a new session and select the `STCS` preset.

This standalone package includes its own Web penetration client; it has no
runtime dependency on `@howmp/dsh-pentest`.

## Compatibility

STCS uses `subagents.startActivation` for planner, auditor, validator, reporter,
reviewer, librarian and critic roles. It does not require the removed
`agentTeams.spawnTeammate` API.

## UI attribution

The Web client bundle is derived from the MIT-licensed `@howmp/dsh-pentest` client, rebranded as `dsh-stcs`.
