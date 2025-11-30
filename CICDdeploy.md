# CI/CD Deployment Guide (No Docker)

This guide outlines how to set up a continuous integration and deployment pipeline for the `ai-hackathon` project on AWS without using Docker.

## Architecture Overview

*   **Frontend (React/Vite):** Deployed via **AWS Amplify**. It automatically detects changes in your Git repository and rebuilds/deploys the static site.
*   **Backend (Node.js/Express):** Deployed to an **AWS EC2** instance. Updates are automated using a **GitHub Action** that SSHs into the server, pulls changes, and restarts the process.

---

## Part 1: Frontend Deployment (AWS Amplify)

Amplify is the easiest way to host the frontend. It handles the build process, CDN distribution (CloudFront), and SSL certificates automatically.

1.  **Log in to AWS Console** and search for **"AWS Amplify"**.
2.  Click **"Create new app"** -> **"Host web app"**.
3.  Select **GitHub** as your source code provider and click **Continue**.
4.  Authorize AWS Amplify to access your GitHub account.
5.  **Repository Setup:**
    *   Select your repository: `enfernal777/ai-hackathon`
    *   Select the branch: `main` (or your preferred branch).
6.  **Monorepo Settings (Critical):**
    *   Check "My app is a monorepo".
    *   Set the **Monorepo root directory** to: `frontend`
7.  **Build Settings:**
    *   Amplify should auto-detect the settings from `frontend/package.json`.
    *   Ensure the **Build command** is `npm run build`.
    *   Ensure the **Output directory** is `dist`.
8.  Click **"Save and deploy"**.

**Result:** Amplify will provide a public URL (e.g., `https://main.d1234.amplifyapp.com`). Any change pushed to the `frontend` folder will automatically trigger a new deployment.

---

## Part 2: Backend Deployment (EC2 + GitHub Actions)

We will set up a "Pull & Restart" workflow. GitHub will SSH into your EC2 instance, pull the latest code, build it, and restart the application using PM2.

### Step 2.1: Server Setup (One-time)

1.  **Launch an EC2 Instance:**
    *   OS: **Ubuntu Server 22.04 LTS** (t2.micro or t3.small is usually sufficient).
    *   Security Group: Allow **SSH (22)** and **Custom TCP (Port 3000)** (or whatever port your backend runs on) from "Anywhere" (0.0.0.0/0).
    *   Key Pair: Download the `.pem` key file.

2.  **SSH into the Server:**
    ```bash
    ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
    ```

3.  **Install Dependencies (Node.js, Git, PM2):**
    ```bash
    # Update packages
    sudo apt update && sudo apt upgrade -y

    # Install Node.js (LTS version)
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Install Process Manager (PM2) and TypeScript
    sudo npm install -g pm2 typescript ts-node

    # Verify installation
    node -v
    npm -v
    ```

4.  **Initial Project Setup:**
    ```bash
    # Clone the repository
    git clone https://github.com/enfernal777/ai-hackathon.git

    # Go to backend directory
    cd ai-hackathon/backend

    # Install dependencies
    npm install

    # Create .env file (Paste your production variables here)
    nano .env
    # (Ctrl+X, Y, Enter to save)

    # Build the project
    npm run build

    # Start the app with PM2
    pm2 start dist/src/server.js --name "api"

    # Save PM2 list so it restarts on reboot
    pm2 save
    pm2 startup
    # (Run the command provided by the output of 'pm2 startup')
    ```

---

### Step 2.2: GitHub Secrets

To allow GitHub to log in to your server, you need to store your SSH credentials securely.

1.  Go to your GitHub Repository -> **Settings**.
2.  On the left sidebar, click **Secrets and variables** -> **Actions**.
3.  Click **"New repository secret"** and add the following:

| Name | Value |
| :--- | :--- |
| `EC2_HOST` | The Public IP address of your EC2 instance (e.g., `54.123.45.67`). |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | The **entire content** of your `.pem` key file (Open it with a text editor and copy everything from `-----BEGIN RSA PRIVATE KEY-----` to `-----END...`). |

---

### Step 2.3: The GitHub Action Workflow

Create a file in your project at `.github/workflows/deploy-backend.yml` with the following content.

```yaml
name: Deploy Backend to EC2

on:
  push:
    branches: [ "main" ]
    paths:
      - 'backend/**' # Only run if backend files change

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ${{ secrets.EC2_USER }}
        key: ${{ secrets.EC2_SSH_KEY }}
        script: |
          # Navigate to backend directory
          cd ai-hackathon/backend
          
          # Pull latest changes
          git pull origin main
          
          # Install new dependencies (if any)
          npm install
          
          # Rebuild TypeScript
          npm run build
          
          # Restart the application (Zero-downtime reload)
          pm2 reload api
```

**Result:** Whenever you push code changes to the `backend` folder on the `main` branch, GitHub Actions will automatically update your EC2 server.
