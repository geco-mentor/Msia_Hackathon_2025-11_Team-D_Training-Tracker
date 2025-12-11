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

## 🔐 Enterprise Security & SSO

**This application is designed for Enterprise Environments.**

We support **Single Sign-On (SSO)** integration to ensure seamless and secure access for all employees.
*   **Seamless Login:** Employees can use their existing corporate credentials with no new passwords to remember.
*   **Security Standard:** Compatible with major Identity Providers (IdP) like Okta, Azure AD, and AWS SSO.
*   **Centralized Management:** User access and role assignment (Admin vs. Employee) can be managed directly through your IT department's existing directory.

*(Note: For this hackathon demo, we are using a simplified local login system to demonstrate functionality without needing live enterprise infrastructure.)*

---

## ✅ Key Features

### 🏢 For Administrators (HR / Team Leads)
*   **Smart Content Ingestion:** Upload any training PDF or text file. We use **AWS Textract** to digitize it.
*   **Auto-Rubric Generation:** **AWS Bedrock** analyzes your content to automatically generate grading rubrics.
*   **Analytics Dashboard:** 
    *   **Skill Heatmaps**: See which departments are excelling.
    *   **Performance Trends**: Track improvement over time.
    *   **Elo Rating System**: Understand true employee strength relative to peers.

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
*   **AI & Cloud:** AWS Bedrock, AWS Textract, AWS Comprehend

---

## 🚀 Getting Started (Step-by-Step for Non-Techies)

Follow these simple instructions to get the application running on your computer.

### Step 1: Install Node.js
This software is the "engine" that runs our application.
1.  Go to [nodejs.org](https://nodejs.org/).
2.  Download the **"LTS" (Long Term Support)** version.
3.  Run the installer and click "Next" until it is finished.

### Step 2: Open the Terminal
We need to type a few simple commands to start the app.
1.  **Windows:** Press the `Windows Key`, type `PowerShell`, and press `Enter`.
2.  **Mac:** Press `Command + Space`, type `Terminal`, and press `Enter`.
3.  Navigate to this project folder. (e.g., Type `cd Downloads/ai-hackathon` and press Enter).

### Step 3: Setup (First Time Only)
Copy and paste this command into your terminal and press `Enter`:

```bash
npm install
npm run install:all
```
*(This downloads all the necessary parts for the app to work. It might take a minute.)*

### Step 4: Run the App
To start the program, copy and paste this command and press `Enter`:

```bash
npm run dev
```

**Wait for 10-20 seconds...**
A browser window will automatically open at `http://localhost:5173`. You are now ready to use the app!

---

## ️ User Manual

### logging In
*   **Admin:** Use the provided admin credentials (check `cred.txt` if available).
*   **Employee:** Click "Register" to create a new profile or log in.

### How to use as an Admin
1.  Log in as **Admin**.
2.  Go to **"Assessment Modules"** -> **"Create Assessment"**.
3.  **Upload** a training PDF. The AI will read it.
4.  Review the generated Rubrics and click **Publish**.
5.  Go to **Dashboard** to view team analytics.

### How to use as an Employee
1.  Log in as an **Employee**.
2.  Select your **Department** (e.g., Engineering, Sales).
3.  Click **"Start Challenge"** on your dashboard.
4.  **Answer the scenario** presented to you.
5.  Receive **instant feedback** and see your score!

---

## 🤝 Collaboration & Github Workflow

**IMPORTANT:**
1.  **Development:** Break things in your own branch/workspace.
2.  **Stable Releases:** Only push working code to the `Geco` repository.
3.  **Demo Ready:** If it crashes, do not request a merge for the demo version.

---

##  Available Scripts Reference

| Command | What it does |
| :--- | :--- |
| `npm run dev` | **Starts the whole app** |
| `npm run test:aws` | Checks AWS AI connection |
| `npm run test:db` | Checks Database connection |
