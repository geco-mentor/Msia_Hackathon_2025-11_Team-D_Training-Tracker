# Employee User Flow

This document outlines the user journey for an Employee using the AI Training Effectiveness Tracker.

## 1. Authentication
### 1.1 Login
- **Action**: User navigates to the login page.
- **Input**: Enter credentials (Username/Email and Password).
- **System**: Authenticates user via AWS SSO (or local auth).
- **Output**: Redirects to the **Employee Dashboard**.

## 2. Dashboard (Home)
### 2.1 View Profile & Stats
- **Display**:
    - **Username** & **User Ranking** (Leaderboard position).
    - **Win Rate**: Percentage of successful challenges.
    - **Day Streak**: Consecutive days of activity.
    - **Skill Breakdown**: Visual chart of proficiency in different GenAI skills.
    - **Disclaimer**: "This will be proof as a reliable worker".

### 2.2 Navigation
- **Options**:
    - Start/Continue Challenges (CTF).
    - View Goals.
    - Logout.

## 3. CTF Challenges (Assessment)
### 3.1 Challenge Selection
- **Action**: User selects "Start Challenge" or chooses a specific module based on their Job Description.
- **System**: Presents an AI-generated micro-scenario (1-3 sentences).
    - *Example*: "Rewrite the following email to be more professional..."

### 3.2 Solving the Challenge
- **Input**:
    - **Text Response**: User types their answer.
    - **Multiple Choice**: User selects the best option (depending on difficulty).
- **Features**:
    - **Hint**: User can request a hint if stuck (may affect score).
    - **Adaptive Difficulty**: System adjusts difficulty (Easy, Normal, Hard) based on previous performance.

### 3.3 Submission & Feedback
- **Action**: User clicks "Submit".
- **System**:
    - AI evaluates the response using defined rubrics.
    - 3 AI Models (e.g., Titan, Claude, etc.) score the answer and provide a consensus.
- **Output**:
    - **Score**: Numerical or grade based result.
    - **Feedback**: Personalized insights on what was good and what needs improvement.
    - **Recommendation**: Suggested next steps or learning resources.

## 4. Personalized Goals
### 4.1 View Goals
- **Action**: Navigate to "Goals" section.
- **System**: AI generates personalized goals based on performance gaps.
    - *Example*: "Improve Data Analysis skills by completing 3 related challenges."
### 4.2 Track Progress
- **Action**: User views progress bars or completion status for each goal.
