# Soncollab Frontend Deployment Guide

This guide covers the complete deployment process for the Soncollab Angular frontend application to Kubernetes using GitHub Actions and Harbor registry.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions │───▶│  Harbor Registry│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Kubernetes    │◀───│   Docker Image  │    │   Nginx + App   │
│     Cluster     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Kubernetes cluster with ingress controller
- Harbor registry (rg.soncollab.com)
- cert-manager for SSL certificates
- kubectl configured with cluster access
- Docker installed locally

## 🚀 Quick Start

1. **Run the setup script:**
   ```bash
   chmod +x scripts/setup-deployment.sh
   ./scripts/setup-deployment.sh
   ```

2. **Configure GitHub Secrets:**
  - `HARBOR_USERNAME`: Your Harbor registry username
  - `HARBOR_PASSWORD`: Your Harbor registry password
  - `KUBE_CONFIG`: Base64 encoded kubeconfig file

3. **Push to trigger deployment:**
   ```bash
   git push origin main      # Deploy to production
   git push origin develop   # Deploy to staging
   ```

## 🔧 Manual Setup

### 1. Create Namespace and RBAC

```bash
# Create namespace
kubectl apply -f k8s/k8s.namespace.yml

# Apply RBAC
kubectl apply -f k8s/k8s-developer-role.yml
```

### 2. Setup Storage

```bash
# Apply storage classes and persistent volumes
kubectl apply -f k8s/k8s-storageclass.yml
kubectl apply -f k8s/k8s-pv.yml
kubectl apply -f k8s/k8s-pvc.yml
```

### 3. Configure Harbor Registry Secret

```bash
kubectl create secret docker-registry harbor-registry-secret \
  --docker-server=rg.soncollab.com \
  --docker-username=<your-username> \
  --docker-password=<your-password> \
  --docker-email=admin@soncollab.com \
  --namespace=soncollab
```

### 4. Setup SSL Certificates

```bash
# Apply cert-manager issuer
kubectl apply -f k8s/harbor/letsencrypt-issuer.yml
```

### 5. Deploy Application

```bash
# Production deployment
kubectl apply -f k8s/production/

# Staging deployment  
kubectl apply -f k8s/staging/
```

## 🏃‍♂️ Running the Application

### Production Environment

- **URL**: https://soncollab.com
- **Replicas**: 3 (auto-scaled 3-10)
- **Resources**: 128Mi-512Mi RAM, 100m-500m CPU

### Staging Environment

- **URL**: https://staging.soncollab.com
- **Replicas**: 2
- **Resources**: 64Mi-256Mi RAM, 50m-250m CPU

## 🔍 Monitoring and Maintenance

### Using the Maintenance Script

```bash
# Check application status
./scripts/maintenance.sh status -e production

# View logs
./scripts/maintenance.sh logs -e staging -f

# Restart application
./scripts/maintenance.sh restart -e production

# Scale application
./scripts/maintenance.sh scale -e production -r 5

# Health check
./scripts/maintenance.sh health -e production

# Debug session
./scripts/maintenance.sh debug -e staging

# Cleanup old resources
./scripts/maintenance.sh cleanup
```

### Manual Monitoring Commands

```bash
# Check pods
kubectl get pods -n soncollab -l app=soncollab-frontend

# Check services
kubectl get services -n soncollab

# Check ingress
kubectl get ingress -n soncollab

# View logs
kubectl logs -f deployment/soncollab-frontend -n soncollab

# Check HPA (production only)
kubectl get hpa -n soncollab
```

## 🚨 Troubleshooting

### Common Issues

1. **Image Pull Errors**
   ```bash
   # Check registry secret
   kubectl get secret harbor-registry-secret -n soncollab -o yaml
   
   # Test registry access
   docker login rg.soncollab.com
   ```

2. **Pod Startup Failures**
   ```bash
   # Check pod events
   kubectl describe pod <pod-name> -n soncollab
   
   # Check logs
   kubectl logs <pod-name> -n soncollab
   ```

3. **Ingress Issues**
   ```bash
   # Check ingress status
   kubectl describe ingress -n soncollab
   
   # Check cert-manager certificates
   kubectl get certificates -n soncollab
   ```

4. **Resource Constraints**
   ```bash
   # Check node resources
   kubectl top nodes
   
   # Check pod resources
   kubectl top pods -n soncollab
   ```

### Debug Commands

```bash
# Get detailed pod information
kubectl get pods -n soncollab -o wide

# Check events in namespace
kubectl get events -n soncollab --sort-by='.firstTimestamp'

# Check resource quotas
kubectl describe resourcequota -n soncollab

# Network connectivity test
kubectl run test-pod --image=busybox -it --rm -- wget -qO- http://soncollab-frontend-service.soncollab.svc.cluster.local
```

## 🔐 Security Considerations

- All containers run as non-root users
- Read-only root filesystem
- Network policies restrict traffic
- Pod security policies enforced
- HTTPS/TLS termination at ingress
- Container image scanning with Trivy

## 📊 Performance Optimization

- **Horizontal Pod Autoscaling**: Automatically scales 3-10 replicas based on CPU/memory
- **Resource Limits**: Prevents resource exhaustion
- **Readiness/Liveness Probes**: Ensures healthy pods receive traffic
- **Pod Anti-Affinity**: Distributes pods across nodes
- **Nginx Optimizations**: Gzip compression, caching headers

## 🔄 CI/CD Pipeline

The deployment pipeline includes:

1. **Build & Test**: Runs tests and builds the application
2. **Docker Build**: Creates optimized Docker image
3. **Security Scan**: Scans image for vulnerabilities
4. **Deploy Staging**: Deploys to staging environment (develop branch)
5. **Deploy Production**: Deploys to production (main branch)
6. **Health Checks**: Verifies deployment success

### Branch Strategy

- `main` → Production deployment
- `develop` → Staging deployment
- Feature branches → No automatic deployment

## 📝 Configuration Management

### Environment Variables

Applications use ConfigMaps for environment-specific configuration:

```bash
# View production config
kubectl get configmap soncollab-frontend-config -n soncollab -o yaml

# View staging config  
kubectl get configmap soncollab-frontend-config-staging -n soncollab -o yaml
```

### Secrets Management

Sensitive data is stored in Kubernetes secrets:

```bash
# View secrets (values are base64 encoded)
kubectl get secrets -n soncollab
```

## 🆘 Emergency Procedures

### Rollback Deployment

```bash
# Quick rollback using maintenance script
./scripts/maintenance.sh rollback -e production

# Manual rollback
kubectl rollout undo deployment/soncollab-frontend -n soncollab

# Rollback to specific revision
kubectl rollout undo deployment/soncollab-frontend --to-revision=2 -n soncollab
```

### Scale Down for Maintenance

```bash
# Scale to zero (maintenance mode)
./scripts/maintenance.sh scale -e production -r 0

# Scale back up
./scripts/maintenance.sh scale -e production -r 3
```

### Emergency Contacts

- **Infrastructure Team**: infrastructure@soncollab.com
- **DevOps Lead**: devops@soncollab.com
- **On-Call**: +1-xxx-xxx-xxxx

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Harbor Registry Guide](https://goharbor.io/docs/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
