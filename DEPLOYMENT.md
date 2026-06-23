# Deployment Architecture

The Echo Messaging application is deployed across two distinct environments: Production and Staging. Both environments utilize Docker and are deployed on AWS EC2 instances via GitHub Actions CI/CD.

## Environments

### Production
- **Frontend URL:** http://35.154.154.82:5173/
- **Branch:** `main`
- **OS:** Amazon Linux 2023
- **Ports:** Frontend (5173), Backend (8080)

### Staging
- **Frontend URL:** http://13.201.223.130:5174/
- **Branch:** `staging`
- **OS:** Ubuntu
- **Ports:** Frontend (5174), Backend (8081)

## CI/CD Workflow
The deployment is automated using GitHub Actions. Pushes to the respective branches trigger a build and push to Docker Hub, followed by SSH deployment to the appropriate EC2 instance.
