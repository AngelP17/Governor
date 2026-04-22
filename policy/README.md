# Policy-as-Code

Open Policy Agent (OPA) policies that enforce security and reliability standards on Kubernetes manifests.

## Enforced Policies

| Policy | Description |
|--------|-------------|
| runAsNonRoot | Containers must run as non-root user |
| capabilities drop ALL | Containers must drop all Linux capabilities |
| resource requests | Containers must define CPU and memory requests |
| resource limits | Containers must define CPU and memory limits |
| livenessProbe | Containers must have a liveness probe |
| readinessProbe | Containers must have a readiness probe |
| no LoadBalancer Services | Services must not use type LoadBalancer |

## Run Locally

```bash
conftest test manifests/*.yaml --policy policy/
```

## Install conftest

```bash
brew install conftest
```

Or download the latest release from [GitHub Releases](https://github.com/open-policy-agent/conftest/releases).

## CI Enforcement

The `validate-repo` job in GitHub Actions installs conftest and runs these policies against all manifests. Policy violations will fail the CI pipeline.

## Notes

conftest is optional for local development. The `make validate-policy` target prints a skip message if conftest is not installed, but it is enforced in CI.
