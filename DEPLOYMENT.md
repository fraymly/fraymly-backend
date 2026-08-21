# fraymlyAI Production Deployment & CI/CD Guide (GCP)

This document provides a comprehensive, step-by-step guide to deploying your Node.js API Backend and Python AI Service to **Google Cloud Run** with robust, scalable, and cost-efficient configuration.

## System Architecture

```
                 +-----------------------+
                 |  Hostinger (Frontend) |
                 +-----------+-----------+
                             | (HTTPS Requests)
                             v
               +-------------+-------------+
               |  GCP Cloud Run (Node.js)  | <------+
               |   fraymly-api-backend  |        |
               +-------------+-------------+        | (State Updates
                             |                      |  & Export Records)
                             | (Trigger Workflow)   |
                             v                      |
               +-------------+-------------+        |
               |  GCP Cloud Run (Python)   | -------+
               |   fraymly-ai-service   |
               +---------------------------+
```

* **Frontend**: Hosted on Hostinger. It connects to the Node.js API via HTTPS.
* **Node.js API Backend**: Runs on GCP Cloud Run. Handles routing, MongoDB connection, GCS file operations, and manages workflow states.
* **Python AI Service**: Runs on GCP Cloud Run. It is configured with high CPU and RAM allocations to execute compute-heavy Whisper, Pyannote, and FFmpeg operations.
* **No Cold Starts**: Both services are configured with `--min-instances 1`. Google keeps at least one instance warm 24/7, completely eliminating first-request startup lag!

---

## 1. Local Configuration & Files Created

We have already created and configured all required containerization and CI/CD files:
1. **`Dockerfile` (Root)**: Optimized Node.js 20 slim container containing `ffmpeg` and production dependency caching.
2. **`ai-service/Dockerfile`**: Optimized Python 3.11 slim container containing `ffmpeg`, OpenCV libraries, and system dependencies.
3. **`.github/workflows/deploy-backend.yml`**: Full-fledged production CI/CD pipeline using Google Workload Identity Federation (keyless, secure authentication) and GitHub Actions runner caches for super-fast build times.
4. **`ai-service/app.py`**: Modified to dynamically read from the `PORT` environment variable supplied by Google Cloud Run.

---

## 2. GCP Console Setup: Step-by-Step

Follow these steps on your Google Cloud Console to enable keyless CI/CD execution and prepare the environment.

### Step A: Initialize the GCP Environment & Artifact Registry
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Select your project (or create a new one). Note down your **Project ID**.
3. Open the Cloud Shell (terminal icon in top-right) and run the following to enable the required APIs:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     artifactregistry.googleapis.com \
     iam.googleapis.com
   ```
4. Create a Docker repository in **Artifact Registry** named `fraymly-repo` in the `us-central1` region:
   ```bash
   gcloud artifacts repositories create fraymly-repo \
     --repository-format=docker \
     --location=us-central1 \
     --description="fraymly AI Container Images"
   ```

### Step B: Setup Google Cloud Storage (GCS)
1. Go to **Cloud Storage** > **Buckets**.
2. If not already created, create a private bucket named `fraymly_bucket` in `us-central1` (Standard storage class).
3. Under the **Permissions** tab of your bucket, click **Grant Access**.
4. Add the **Default Compute Service Account** (it looks like `[PROJECT_NUMBER]-compute@developer.gserviceaccount.com`) and grant it the role **Storage Object Admin** so Cloud Run can upload exports and download videos.

### Step C: Configure Workload Identity Federation (WIF)
We use Workload Identity Federation to securely connect GitHub to Google Cloud without storing long-lived, dangerous service account JSON keys.

1. Create a Workload Identity Pool:
   ```bash
   gcloud iam workload-identity-pools create "github-pool" \
     --project="${GCP_PROJECT_ID}" \
     --location="global" \
     --display-name="GitHub Pool"
   ```
2. Create an Identity Provider within the Pool:
   ```bash
   gcloud iam workload-identity-pools providers create-oidc "github-provider" \
     --project="${GCP_PROJECT_ID}" \
     --location="global" \
     --workload-identity-pool="github-pool" \
     --display-name="GitHub Provider" \
     --attribute-mapping="google.subject=assertion.subject,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
     --issuer-uri="https://token.actions.githubusercontent.com"
   ```
3. Create a dedicated Service Account for deployments:
   ```bash
   gcloud iam service-accounts create "github-deployer" \
     --project="${GCP_PROJECT_ID}" \
     --display-name="GitHub Deployer Service Account"
   ```
4. Grant the Service Account necessary permissions:
   ```bash
   gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
     --member="serviceAccount:github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
     --member="serviceAccount:github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
     --member="serviceAccount:github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"

   gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
     --member="serviceAccount:github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```
5. Allow GitHub to impersonate this Service Account:
   ```bash
   gcloud iam service-accounts add-iam-policy-binding \
     "github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
     --project="${GCP_PROJECT_ID}" \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/YOUR_GITHUB_REPO_NAME"
   ```
   *(Note: Replace `YOUR_GITHUB_USERNAME/YOUR_GITHUB_REPO_NAME` with your actual repository path, e.g. `myorg/fraymly-backend`)*.

6. Get the Workload Identity Provider string:
   ```bash
   gcloud iam workload-identity-pools providers describe "github-provider" \
     --project="${GCP_PROJECT_ID}" \
     --location="global" \
     --workload-identity-pool="github-pool" \
     --format="value(name)"
   ```
   Save this output value (it looks like `projects/[PROJECT_NUMBER]/locations/global/workloadIdentityPools/github-pool/providers/github-provider`).

---

## 3. GitHub Secrets Configuration

Go to your GitHub repository (**Settings** > **Secrets and variables** > **Actions** > **New repository secret**) and add the following secrets:

| Secret Name | Value Example / Description |
| :--- | :--- |
| `GCP_PROJECT_ID` | `your-gcp-project-id` |
| `GCP_WIF_PROVIDER` | *The Workload Identity Provider string from Step C-6* |
| `GCP_WIF_SERVICE_ACCOUNT` | `github-deployer@your-gcp-project-id.iam.gserviceaccount.com` |
| `OPENAI_API_KEY` | `sk-proj-xxxx...` |
| `MONGODB_URI` | `mongodb+srv://...` |
| `MONGODB_DB_NAME` | `fraymlyDB` |
| `JWT_SECRET` | `your-jwt-production-secret` |
| `INTERNAL_API_SECRET` | `fraymly-internal-secret` |
| `GCS_BUCKET_NAME` | `fraymly_bucket` |

---

## 4. Triggering the Deployment

Once your secrets are added, push the code to your `main` branch:
```bash
git add .
git commit -m "feat: Add production GCP Cloud Run Dockerfiles and CI/CD pipeline"
git push origin main
```

Your GitHub Actions will spin up, securely authenticate with GCP, compile the Docker images with caching, upload them to Artifact Registry, and deploy them to Cloud Run.

---

## 5. Hostinger (Frontend) Configuration

Now that your API backend is deployed, log in to Hostinger:
1. In your frontend repository, update the API Base URL to point to your new **Node.js Cloud Run Service URL** (e.g. `https://fraymly-api-backend-xxx.run.app/api`).
2. Build and export the static React application (`npm run build`).
3. Upload the resulting static files inside the `dist` folder to Hostinger's Public HTML directory.