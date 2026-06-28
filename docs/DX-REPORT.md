# Developer Experience (DX) Friction Log: Obscura

This log captures constructive feedback on integrating Noir zero-knowledge circuits with the Stellar Soroban smart contract environment.

---

## 1. Soroban SDK & Rust Compilation Complexity

- **Friction**: Compilation of the Soroban SDK Rust crates is heavy. Bringing in dependencies like `stellar-xdr` and `ark-ec` for testing requires compiling over 170 packages.
- **Impact**: Initial compilation takes ~3-4 minutes on standard developer hardware.
- **Recommendation**: A lighter testing wrapper or pre-compiled environment templates for unit testing would improve compilation loops.

## 2. Noir (UltraHonk) & Browser Proving via `bb.js`

- **Friction**: Noir's newer UltraHonk proving system is highly expressive and gas-efficient on-chain. However, documentation for integrating the Javascript prover `bb.js` with client-side Next.js bundlers is sparse. Importing WASM binaries in client-side modules throws Webpack/Turbopack import errors without custom config overrides.
- **Impact**: Developers must manually configure polyfills or run proving steps in web-workers to bypass bundler path issues.
- **Recommendation**: Provide official, pre-configured Next.js/Vite sample templates with standard ZK client integrations.

## 3. Native MSM Host Functions (Protocol 26)

- **Friction**: Stellar's Protocol 26 native `bn254_msm` elliptic curve pairing checks are extremely fast and cheap, which is a major capability unlock. However, simulating these host functions in local sandbox/mock testing without deploying to testnet requires setting up extensive mock environments.
- **Impact**: Hard to assert gas efficiency metrics purely locally before pushing to testnet.
- **Recommendation**: Expose instruction count indicators in `soroban-sdk` test utilities for native cryptographic helper checks.

## 4. Horizon RPC Event Syncer Latency

- **Friction**: Fetching past ledger events to build the client-side nullifier cache requires polling Horizon RPC nodes. During network congestion, query responses can exhibit latency spikes.
- **Impact**: UI loading states during wallet connection are delayed.
- **Recommendation**: A native event caching indexing service (e.g. Mercury API or similar indexing solutions) is essential for real-world deployments.
