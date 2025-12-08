# 🚀 AI Training Effectiveness Tracker

> **Measure, Analyze, and Improve GenAI Proficiency with AI-Powered Assessments.**

## 📖 Executive Summary

In the age of Generative AI, traditional training metrics (completion rates) are insufficient. **AI Training Effectiveness Tracker** solves the "Skill Gap" problem by using **AI to evaluate AI proficiency**. 

We turn static training materials (PDFs, docs) into dynamic, interactive scenarios where employees demonstrate their skills in real-time. Our system assesses their answers using advanced Large Language Models (LLMs) to provide instant, personalized feedback and rigorous scoring.

**Why this project?**
*   **Proof of Competence:** Goes beyond "I watched the video" to "I can do the job".
*   **Automated Evaluation:** Scales personal feedback to thousands of employees instantly.
*   **Data-Driven:** Rubrics and Analytics provide actionable insights for HR and Team Leads.

---

## ✅ Key Features

### 🏢 For Administrators (HR / Team Leads)
*   **Smart Content Ingestion:** Upload any training PDF or text file. We use **AWS Textract** to digitize it.
*   **Auto-Rubric Generation:** **AWS Bedrock** analyzes your content to automatically generate grading rubrics (Generic, Departmental, and Module-specific).
*   **Analytics Dashboard:** 
    *   **Skill Heatmaps**: See which departments are excelling.
    *   **Performance Trends**: Track improvement over time.
    *   **Elo Rating System**: Understand true employee strength relative to peers.
    *   **Leaderboards**: Identify top talent.

### 🧑‍💻 For Employees
*   **Interactive Challenges:** Solve real-world micro-scenarios based on your actual job description.
*   **Instant AI Feedback:** Get immediate critique on your answers—not just a score, but *how* to improve.
*   **Adaptive Difficulty:** The system learns with you, offering harder challenges as your Elo rating improves.
*   **Profile Tracking:** Visualize your win rate, streaks, and skill growth.

---

## 🛠️ Tech Stack

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts (Analytics)
*   **Backend:** Node.js, Express, TypeScript
*   **Database:** Supabase (PostgreSQL)
*   **AI & Cloud:** 
    *   **AWS Bedrock** (LLM for Rubric Generation & Grading)
    *   **AWS Textract** (PDF/Document Parsing)
    *   **AWS Comprehend** (Text Analysis)

---

## 🚀 Getting Started (Zero-Config)

Follow these instructions to get the application running on your local machine.

### 1. Prerequisites
Before you start, ensure you have **Node.js** installed.
*   [Download Node.js (LTS Version)](https://nodejs.org/) - Install the standard version.

### 2. Setup (First Time Only)
Open your terminal (Command Prompt or PowerShell) in the project folder and run:

```bash
npm install
npm run install:all
```
*(This installs all the "batteries" needed for the app to work.)*

### 3. Running the App
To start everything (Backend, Frontend, Database checks), simply run:

```bash
npm run dev
```

**What happens next?**
1.  The system checks your AWS connection.
2.  It connects to the Database.
3.  It launches the Backend API (Port 3001).
4.  It launches the Frontend Interface.
5.  **A browser window automatically opens** at `http://localhost:5173`.

---

## �️ Usage Guide

### Logging In
*   **Admin Access:**
    *   *(Note: Change this password immediately after first login!)*
*   **Employee Access:**
    *   Register a new account or log in with existing credentials.

### 🅰️ Admin Workflow (Creating Assessments)
1.  **Login** as Admin.
2.  Navigate to **"Assessment Modules"**.
3.  Click **"Create Assessment"**.
4.  **Upload** your training material (PDF/Text). 
    *   *The system will essentially "read" the book for you.*
5.  Review the **AI-Generated Rubrics**. You can edit them if needed.
6.  **Publish**. The assessment is now live for employees!

### 🅱️ Employee Workflow (Taking Tests)
1.  **Register/Login** as an Employee.
2.  Select your **Department** (Engineering, HR, Sales, etc.).
3.  On the Dashboard, click **"Start Challenge"**.
4.  You will be presented with a customized scenario based on your role.
5.  **Type your answer**. Be professional and thorough!
6.  Click **Submit** and wait for the **AI Analysis**.
7.  Review your **Score** and **Feedback**.

---

## 🤝 Collaboration & Github Workflow

**IMPORTANT:** Follow these rules to ensure a smooth hackathon/client presentation.

1.  **Development Workspace:**
    *   Do **ALL** Alpha/Beta/Main development work on your **assigned Github account**.
    *   This is your sandbox. Break things here, fix things here.

2.  **Stable Releases:**
    *   Commit and push **ONLY** your **stable, deployable, working version** to the `Geco` repository.
    *   **Rule of Thumb:** If it crashes during a demo, it shouldn't be on the Geco repo.

3.  **Collaborator Access:**
    *   Access remains open for necessary tweaks/refinements.
    *   **Post-Hackathon:** Continue to polish for client presentations ("at the drop of a hat").

---

## � Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | **Start Everything** (Recommended) |
| `npm run dev:backend` | Start only Backend server |
| `npm run dev:frontend` | Start only Frontend server |
| `npm run test:aws` | Test connection to Amazon Bedrock |
| `npm run test:db` | Test connection to Supabase |

---

## 📄 License & Credits
MIT License.
Built for the AI Hackathon.
