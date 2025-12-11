# Tech Stack

This document outlines the technology stack used in the **AI Training Effectiveness Tracker** project.

## Frontend

The frontend is built with a modern React stack, focusing on performance and developer experience.

-   **Framework**: [React](https://react.dev/) (v18) - A JavaScript library for building user interfaces.
-   **Build Tool**: [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling.
-   **Language**: [TypeScript](https://www.typescriptlang.org/) - A strongly typed programming language that builds on JavaScript.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapidly building custom designs.
-   **Routing**: [React Router](https://reactrouter.com/) (v6) - Declarative routing for React web applications.
-   **HTTP Client**: [Axios](https://axios-http.com/) - Promise based HTTP client for the browser and node.js.
-   **Icons**: [Lucide React](https://lucide.dev/) - Beautiful & consistent icon toolkit.
-   **Visualization**: [Recharts](https://recharts.org/) - A composable charting library built on React components.

## Backend

The backend is a robust REST API built with Node.js and Express.

-   **Runtime**: [Node.js](https://nodejs.org/) - JavaScript runtime built on Chrome's V8 JavaScript engine.
-   **Framework**: [Express](https://expressjs.com/) - Fast, unopinionated, minimalist web framework for Node.js.
-   **Language**: [TypeScript](https://www.typescriptlang.org/) - Ensures type safety across the full stack.
-   **Database Client**:
    -   `pg`: Non-blocking PostgreSQL client for Node.js.
    -   `@supabase/supabase-js`: Client for Supabase (if used for Auth/DB).
-   **Authentication**:
    -   `jsonwebtoken`: For generating and verifying JWTs.
    -   `bcrypt`: For hashing passwords.
-   **AI Integration**:
    -   `@aws-sdk/client-bedrock-runtime`: AWS SDK for JavaScript Bedrock Runtime Client for invoking AI models.

## Database

-   **Database System**: PostgreSQL (implied by `pg` driver).
-   **Hosting**: Likely Supabase or a standard PostgreSQL instance.

## AI & Machine Learning

-   **Platform**: AWS Bedrock.
-   **Models**:
    -   Amazon Titan
    -   Qwen

## DevOps & Tooling

-   **Package Manager**: npm
-   **Process Management**: `concurrently` (for running frontend and backend simultaneously in dev).
-   **Environment Management**: `dotenv` for loading environment variables.
