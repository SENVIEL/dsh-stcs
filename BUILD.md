# dsh-stcs build notes

The package is self-contained: `lib/` contains the host plugin, preset runtime,
and the vendored Web client (`lib/ui-stcs.client.js`).

The original UI source asset is kept at `assets/ui-pentest.client.js` for
attribution and reproducibility. It is MIT-licensed `@howmp/dsh-pentest`
client code; the generated client has package identifiers changed to
`dsh-stcs`. There is no runtime dependency on `@howmp/dsh-pentest`.
