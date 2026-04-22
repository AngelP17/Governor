# AWS Deployment Plan

Mapping the local k3d lab to production-grade EKS deployment

## Overview

This project runs locally on k3d for development and testing. This document describes how each component maps to AWS/EKS equivalents for production deployment. The local k3d cluster, Prometheus/Grafana stack, ArgoCD, and chaos engineering scripts all have direct counterparts in AWS.

## Cluster Provisioning

| Local | AWS |
|-------|-----|
| k3d cluster | EKS cluster |
| Docker container nodes | EC2 managed node groups |
| Manual creation | Terraform with `terraform-aws-modules/eks/aws` |

The project already uses Terraform to provision k3d. Extend the Terraform configuration to provision EKS using the `terraform-aws-modules/eks/aws` module. Key considerations:

- Use managed node groups with Amazon Linux 2 or Bottlerocket AMIs
- Configure cluster autoscaler or Karpenter for dynamic scaling
- Separate node groups for system workloads (observability, ArgoCD) and application workloads
- Enable control plane logging to CloudWatch

## Networking

| Local | AWS |
|-------|-----|
| k3d LoadBalancer (port mapping) | AWS ALB/NLB via AWS Load Balancer Controller |
| HTTP on mapped port | HTTPS via AWS Certificate Manager |

In k3d, services are exposed via LoadBalancer with host port mapping. On EKS:

- Install the AWS Load Balancer Controller to provision ALBs and NLBs from Kubernetes Ingress resources
- Use AWS Certificate Manager (ACM) for TLS certificates
- Define Ingress resources with appropriate annotations for ALB
- Configure VPC CNI for native AWS networking

## Observability

| Local | AWS |
|------|-----|
| Prometheus (helm) | Amazon Managed Prometheus or self-hosted |
| Grafana (helm) | Amazon Managed Grafana or self-hosted |
| Local dashboards | Managed dashboards |

Two paths:

1. **Managed** -- Use Amazon Managed Prometheus (AMP) and Amazon Managed Grafana (AMG). No infrastructure to manage, native AWS integration, pay per ingest/query.
2. **Self-hosted** -- Deploy the same Prometheus/Grafana helm charts on EKS. Same configuration as local, full control.

In both cases, enable CloudWatch Container Insights as a complementary data source for cluster-level metrics.

## GitOps

| Local | AWS |
|-------|-----|
| ArgoCD (helm) | ArgoCD (helm) |

ArgoCD runs identically on EKS. Recommendations:

- Deploy ArgoCD in its own namespace (`argocd`)
- Configure RBAC with SSO integration (AWS IAM Identity Center or SAML)
- Use ArgoCD ApplicationSets for multi-environment deployment
- Enable notifications via Slack or email for sync events

## Container Registry

| Local | AWS |
|-------|-----|
| Docker Hub / local build | Amazon ECR |

Update the CI/CD pipeline to build and push images to Amazon ECR:

- Create an ECR repository for each application image
- Configure image scanning on push
- Use IAM roles for Service Accounts (IRSA) to grant EKS pods pull access
- Update helm values to reference ECR image URIs

## Secrets Management

| Local | AWS |
|-------|-----|
| Kubernetes Secrets (base64) | AWS Secrets Manager via External Secrets Operator |

Kubernetes Secrets are only base64-encoded. For production:

- Install the External Secrets Operator on EKS
- Store secrets in AWS Secrets Manager
- Define ExternalSecret resources that sync from Secrets Manager to Kubernetes Secrets
- Use IRSA to grant the operator access to Secrets Manager

## Chaos Engineering

| Local | AWS |
|-------|-----|
| chaos_monkey.sh and kubectl-based failure injection | Same workflow + AWS Fault Injection Simulator |

The existing chaos scripts work on EKS without modification since they use kubectl. For deeper failure injection:

- Use AWS Fault Injection Simulator (FIS) for node-level failures (instance stop, CPU stress)
- Combine kubectl-based pod chaos with FIS-based infrastructure chaos
- Ensure chaos experiments have well-defined blast radius via namespace labels

## Incident Workflow

| Local | AWS |
|------|-----|
| Prometheus alerts | Prometheus alerts via Amazon Managed Prometheus |
| Local incident directory | S3 for long-term artifact storage |

The closed-loop incident workflow (detect, snapshot, runbook, recover, validate, audit) remains the same. AWS-specific enhancements:

- Integrate alerting with AWS SNS for multi-channel notifications (email, Slack, PagerDuty)
- Use EventBridge for event-driven automation of snapshot and report generation
- Archive incident artifacts to S3 for long-term retention and cross-team access
- Use CloudWatch Logs for centralized log storage instead of local files

## Cost Estimates

Rough monthly cost for a small production EKS cluster:

| Component | Specification | Monthly Cost |
|-----------|--------------|--------------|
| EKS control plane | 1 cluster | $73 |
| Worker nodes | 3x m5.large (on-demand) | $168 |
| NAT Gateway | 1x | $32 |
| Load Balancer | 1x ALB | $16 |
| CloudWatch | Logs + metrics | $10-30 |
| ECR | Image storage | $1-5 |
| S3 | Incident artifacts | <$1 |
| **Total** | | **~$300-330/mo** |

Costs can be reduced by using Spot Instances for non-critical workloads, reserved instances for steady-state nodes, and Graviton instances (m6g.large) for better price-performance.
