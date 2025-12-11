# Admin User Flow

This document outlines the user journey for an Admin (HR / Learning Team) using the AI Training Effectiveness Tracker.

## 1. Authentication
### 1.1 Login
- **Action**: User navigates to the login page.
- **Input**: Enter Admin credentials.
- **System**: Authenticates and verifies Admin privileges.
- **Output**: Redirects to the **Admin Dashboard**.

## 2. Admin Dashboard (Overview)
### 2.1 Training Effectiveness Tracking
- **Display**:
    - **Pre vs Post Training**: Comparative metrics showing skill improvement.
    - **Overall Engagement**: Number of active employees, challenges completed.
    - **Skill Heatmap**: Visual representation of skill strengths and weaknesses across the organization or specific groups.

### 2.2 Navigation
- **Options**:
    - Review Employees.
    - Assessment Modules (Create/Manage).
    - Settings / User Management.

## 3. Review Employee
### 3.1 Employee List
- **Action**: Admin selects "Review Employee".
- **System**: Displays a list of employees with summary stats (Rank, Win Rate).
- **Filter/Search**: Admin can search by name, department, or skill level.

### 3.2 Individual Review
- **Action**: Click on a specific employee.
- **Display**:
    - Employee Profile & Stats.
    - **Challenge History**: List of completed challenges.
    - **Detailed Review**: Admin can view specific questions, the employee's answer, and the AI's evaluation/score.
    - **Manual Override (Optional)**: Admin may have the ability to adjust scores or add manual feedback.

## 4. Assessment Module Management
### 4.1 Create New Assessment
- **Action**: Select "Create Assessment Module".
- **Input**:
    - **Upload Material**: Admin uploads training content (e.g., PDF, Text file).
    - **Define Parameters**: Set target skills, difficulty levels.

### 4.2 AI Rubric Generation
- **System**: Analyzes the uploaded content and generates evaluation rubrics.
- **Review**: Admin reviews the generated rubrics.
    - **Action**: Approve, Edit, or Regenerate rubrics to ensure they align with training goals.

### 4.3 Publish
- **Action**: Admin publishes the module.
- **System**: The new challenges become available to relevant employees based on their job description or assignment.

## 5. Advanced Features (Stretch)
- **Team Insights**: View aggregated data for specific departments.
- **Trend Analysis**: View skill growth over time.
- **Competency Prediction**: Identify at-risk employees who need intervention.
