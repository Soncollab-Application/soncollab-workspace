#!/bin/bash

# Setup script for Soncollab Frontend Deployment
# This script sets up the necessary secrets and configurations for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="soncollab"
HARBOR_REGISTRY="rg.soncollab.com"
HARBOR_PROJECT="library"

echo -e "${GREEN}🚀 Setting up Soncollab Frontend Deployment${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists kubectl; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create namespace if it doesn't exist
echo -e "${YELLOW}🏗️  Creating namespace...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Harbor registry secret
echo -e "${YELLOW}🔐 Setting up Harbor registry secret...${NC}"
read -p "Enter Harbor username: " HARBOR_USERNAME
read -s -p "Enter Harbor password: " HARBOR_PASSWORD
echo

kubectl create secret docker-registry harbor-registry-secret \
    --docker-server=$HARBOR_REGISTRY \
    --docker-username=$HARBOR_USERNAME \
    --docker-password=$HARBOR_PASSWORD \
    --docker-email=admin@soncollab.com \
    --namespace=$NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ Harbor registry secret created${NC}"

# Apply storage configurations
echo -e "${YELLOW}💾 Applying storage configurations...${NC}"
kubectl apply -f ../k8s/k8s-storageclass.yml
kubectl apply -f ../k8s/k8s-pv.yml
kubectl apply -f ../k8s/k8s-pvc.yml

echo -e "${GREEN}✅ Storage configurations applied${NC}"

# Setup cert-manager issuer
echo -e "${YELLOW}🔒 Setting up SSL certificates...${NC}"
kubectl apply -f ../k8s/harbor/letsencrypt-issuer.yml

echo -e "${GREEN}✅ SSL certificate issuer configured${NC}"

# Create GitHub secrets information
echo -e "${YELLOW}📝 GitHub Secrets Configuration${NC}"
echo -e "${GREEN}Please add the following secrets to your GitHub repository:${NC}"
echo
echo "HARBOR_USERNAME: $HARBOR_USERNAME"
echo "HARBOR_PASSWORD: [Your Harbor Password]"
echo
echo "KUBE_CONFIG: [Your base64 encoded kubeconfig]"
echo "To get your kubeconfig in base64 format, run:"
echo "cat ~/.kube/config | base64 -w 0"
echo

# Test connection to Harbor
echo -e "${YELLOW}🧪 Testing Harbor connection...${NC}"
if docker login $HARBOR_REGISTRY -u $HARBOR_USERNAME -p $HARBOR_PASSWORD; then
    echo -e "${GREEN}✅ Harbor connection successful${NC}"
    docker logout $HARBOR_REGISTRY
else
    echo -e "${RED}❌ Harbor connection failed${NC}"
    exit 1
fi

# Deploy RBAC
echo -e "${YELLOW}👤 Setting up RBAC...${NC}"
kubectl apply -f ../k8s/k8s-developer-role.yml

# Create service account for deployments
kubectl create serviceaccount github-actions-sa --namespace=$NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Create role binding
kubectl create rolebinding github-actions-binding \
    --role=developers-role \
    --serviceaccount=$NAMESPACE:github-actions-sa \
    --namespace=$NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ RBAC configured${NC}"

# Create monitoring resources
echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
kubectl apply -f ../k8s/production/hpa.yml

echo -e "${GREEN}✅ Monitoring configured${NC}"

# Final instructions
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Add the GitHub secrets mentioned above to your repository"
echo "2. Push your code to trigger the deployment pipeline"
echo "3. Monitor the deployment with: kubectl get pods -n $NAMESPACE -w"
echo "4. Check logs with: kubectl logs -f deployment/soncollab-frontend -n $NAMESPACE"
echo
echo -e "${GREEN}Useful commands:${NC}"
echo "- View deployments: kubectl get deployments -n $NAMESPACE"
echo "- View services: kubectl get services -n $NAMESPACE"
echo "- View ingress: kubectl get ingress -n $NAMESPACE"
echo "- View HPA: kubectl get hpa -n $NAMESPACE"
echo
echo -e "${GREEN}Access your application at:${NC}"
echo "- Production: https://soncollab.com"
echo "- Staging: https://staging.soncollab.com"
