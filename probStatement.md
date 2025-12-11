# AI Training Effectiveness Tracker (GenAI Skill Progression)

## 1. Project Overview

A global energy technology company is investing heavily in building GenAI capabilities across its workforce. While employees are completing GenAI training modules, the company lacks a reliable way to measure whether the learning actually translates into applied skills. This project aims to build an AI-powered post-training assessment system that generates micro-scenarios, evaluates employee responses, and tracks skill progression over time. The solution should enable HR and Learning teams to shift from attendance-based training metrics to impact-based skill measurement.

## 2. Problem Statement

The company faces challenges in assessing the true effectiveness of GenAI training programs. Despite high training participation, there is no tangible framework to measure whether employees have applied or internalized the skills.

Key challenges include:

- **No standardized way to measure post-training impact** — Learning effectiveness varies widely across teams.
- **Self-development plans are vague and subjective** — Employees list goals but lack measurable actions.
- **Training completed ≠ Skill applied** — Completion rates do not reflect capability.
- **HR and Learning teams cannot quantify competency improvement** — No aggregated or individual insights.
- **No automation for post-training evaluation** — Reviews are slow and inconsistent.

These gaps hinder leadership's ability to decide where to invest, who needs support, and which trainings deliver the most value.

---

## 3. Key Objectives

- Generate scenario-based assessments tailored to GenAI (Basic) skill sets.
- Evaluate employee responses using rubrics aligned with good GenAI practice.
- Provide personalized feedback and recommended next steps.
- Track pre- and post-training progression using a structured dashboard.
- Enable HR/Learning teams to quickly identify skill gaps and training ROI.

## 4. Target Users

- **Employees** — completing GenAI (Basic) training and applying skills.
- **HR & Learning Teams** — monitoring skill adoption, identifying gaps, and planning reinforcement.
- **Team Leads & Managers** — optional insights into team-level competency levels.

## 5. Desired Key Features

### Core Features (Required for Hackathon Scope)

- **AI-generated micro-scenarios** (1–3 sentences) aligned to specific Basic GenAI skills, such as:
  - Prompt structuring
  - Summarization
  - Rewriting
  - Extracting information
- **Employee response module supporting:**
  - Text responses
  - Multiple-choice answers
- **AI evaluation engine** using clear rubrics (e.g., relevance, accuracy, reasoning clarity, safety considerations).
- **Personalized feedback** based on response quality.
- **Progress tracking dashboard, showing:**
  - Pre-training vs post-training score
  - Skill category breakdown
  - Recommended next steps

---

### Optional Features (Nice-to-have)

- Ability to generate adaptive difficulty scenarios based on performance.
- Skill heatmap for each employee.
- Goal-setting tracker mapped to evaluated skills.

### Stretch Features (Advanced)

- **Team or department-level insights** (aggregated heatmaps, average progression).
- **Trend analysis** (skill growth over time).
- **Competency prediction model** (identify who may need reinforcement before issues arise).

## 6. Business Impact

- Skills gain becomes measurable through scenario-based assessment.
- Leadership sees adoption curve post-GenAI training rollouts.
- Faster identification of skill gaps, enabling targeted reinforcement.
- HR/Learning teams can prioritise employee development using objective scoring.
- Shift to impact-driven training investments rather than attendance reporting.
- Stronger pipeline of GenAI-ready talent across the organization.

## 7. Data Availability

The hackathon will use fully synthetic, privacy-by-design datasets, including:

- Sample employee training completion records (anonymised).
- Sample pre-training self-assessment scores.
- Synthetic skill tags and competency categories for GenAI basics.
- Example scenario templates (e.g., prompt-writing problems).
- Sample responses with evaluator notes, to help teams train/test evaluation logic.

Teams may also generate their own synthetic data to expand scenario coverage.

---

## 8. Technical Scope and AI Domains

### Potential AI components:

- **Generative AI (Scenario Generation)**
  - Create contextual, job-relevant GenAI practice scenarios.
- **NLP Evaluation & Scoring**
  - Score responses using rubric-based analysis.
  - Evaluate reasoning and clarity.
- **Recommendation Systems**
  - Suggest next-step learning materials.
- **Analytics & Visualization**
  - Track skill progression over time.


## 9. Questions & Answers

**Q1. How many GenAI skill categories should the solution focus on?**  
A1. For the hackathon, focus on **GenAI (Basic) with 4–6 sub-skills** (e.g., summarisation, prompt rewriting).

**Q2. How complex should the scenarios be?**  
A2. Scenarios should be **short (1–3 sentences)** and job-relevant. No long case studies required.

**Q3. Is team-level analysis required?**  
A3. Not for core requirements — keep this as a **stretch feature**.

**Q4. What format should employee responses be in?**  
A4. Text input or multiple-choice. Hackathon teams can choose whichever is more feasible.

**Q5. Should the evaluation be fully automated?**  
A5. Yes — the goal is to shift from manual reviews to automated skill assessment. It should then feed into a dashboard for management to view.

---



📁 **Key Resources:**
- [WORKING_MODELS.md](WORKING_MODELS.md) - List of accessible AI models
- [FEATURES.md](FEATURES.md) - Detailed feature specifications
- [connectivity-tests/](connectivity-tests/) - All connectivity tests


The problem statement only said to focus on GenAI, but we will do is we focus on the training assessment of employees. rather than one skills.