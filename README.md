# Team Task Manager

A full-stack web application built for managing teams and tasks, developed as an assessment for a Full Stack Development Internship.

## Table of Contents

-   [Features](#features)
-   [Technologies Used](#technologies-used)
-   [Setup Instructions](#setup-instructions)
    -   [Prerequisites](#prerequisites)
    -   [Environment Variables](#environment-variables)
    -   [Database Setup](#database-setup)
    -   [Backend Setup](#backend-setup)
    -   [Frontend Setup](#frontend-setup)
-   [Live Demo](#live-demo)
-   [API Endpoints](#api-endpoints)
-   [Security Practices](#security-practices)
-   [Version Control](#version-control)
-   [Bonus Features](#bonus-features)

## Features

This application allows users to:

* **Secure User Authentication:** Register, log in, and log out securely with session management.
* **Team Management:**
    * Create new teams.
    * View all teams they are a member of.
    * Manage team members (add/remove members by team admins).
    * Delete teams (only by team admins or the creator).
* **Task Management:**
    * Create new tasks and assign them to specific teams.
    * Assign tasks to team members (optional).
    * Set due dates for tasks (optional).
    * Update task details (title, description, status, assignee, due date).
    * Delete tasks (only by task creators or team admins), regardless of status.
* **Task Filtering:** Filter tasks by associated team or assigned member.
* **Responsive UI:** A clean and responsive user interface built with React and Tailwind CSS.

## Technologies Used

### Frontend
* **React.js:** A JavaScript library for building user interfaces.
* **Vite:** A fast build tool for modern web projects.
* **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
* **Axios:** Promise-based HTTP client for the browser and Node.js.

### Backend
* **Node.js:** JavaScript runtime.
* **Express.js:** Fast, unopinionated, minimalist web framework for Node.js.
* **PostgreSQL:** A powerful, open-source relational database system.
* **Knex.js:** A SQL query builder for Node.js.
* **Passport.js:** Authentication middleware for Node.js.
* **`express-session`:** Session middleware for Express.
* **`connect-pg-simple`:** PostgreSQL session store for `express-session`.
* **`bcryptjs`:** A library for hashing passwords.
* **`cors`:** Node.js package for providing a Connect/Express middleware that can be used to enable CORS.
* **`dotenv`:** Loads environment variables from a `.env` file.

### Other
* **Git & GitHub:** Version control.

## Setup Instructions

Follow these steps to get the project up and running on your local machine.

### Prerequisites

* **Node.js:** (LTS version recommended)
* **npm or Yarn:** (Package manager for Node.js)
* **PostgreSQL:** Database server installed and running locally. You will need a `postgres` superuser with a password (e.g., `1234`).

### Environment Variables

Create a `.env` file in the **`server` directory** of the project (`your-project-root/server/.env`). Populate it with your PostgreSQL and session secret details:


Server Port
PORT=5000

PostgreSQL Database Configuration for Local Development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1234 # <--- IMPORTANT: Use your actual PostgreSQL 'postgres' user password
DB_NAME=team_task_manager_db # <--- IMPORTANT: This is the name of the database Knex will connect to

Session Secret for Express Session (generate a long, random, strong string)
SESSION_SECRET=e8f32e4b9c1d2a3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4 # <--- IMPORTANT: Use a truly random string for production

**Note:** For deployment (e.g., to Render), you will set these environment variables directly on the hosting platform's dashboard, and Render will automatically provide `DATABASE_URL` for PostgreSQL.

### Database Setup

1.  **Ensure PostgreSQL Server is Running:**
    * Verify that your local PostgreSQL database server is active.

2.  **Create the Database (`team_task_manager_db`):**
    * Knex migrations require the database to exist before they can run.
    * Open `pgAdmin` (or your preferred PostgreSQL client).
    * Connect to your PostgreSQL server (e.g., as `postgres` user).
    * **Execute the following SQL commands in a Query Tool window (connected to the `postgres` default database):**

        ```sql
        -- Terminate all existing connections to the target database (if any)
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'team_task_manager_db'
          AND pid <> pg_backend_pid();

        -- Drop the database if it exists (for a clean slate)
        DROP DATABASE IF EXISTS team_task_manager_db;

        -- Create a new, empty database
        CREATE DATABASE team_task_manager_db;
        ```
    * **Verify Database Emptiness (Crucial):** After running the `CREATE DATABASE` command, execute `\c team_task_manager_db;` to connect to it, then `\dt;` to list tables. It should say "Did not find any relations."
    * Close your `pgAdmin` Query Tool and `pgAdmin` application fully.

3.  **Run Database Migrations:**
    * Open your terminal and navigate to the **`server` directory**:
        ```bash
        cd your-project-root/server
        ```
    * **Install Knex:** If `npx knex` doesn't work, you might need to install knex globally or locally: `npm install -g knex` or `npm install knex` (if using `npx`, it should use the local version).
    * Execute the Knex migration command to create all tables:
        ```bash
        npx knex migrate:latest
        ```
        * You should see output indicating 2 migrations ran successfully.

### Backend Setup

1.  **Install Dependencies:**
    * In your terminal, navigate to the **`server` directory** (if not already there):
        ```bash
        cd your-project-root/server
        ```
    * Install Node.js packages:
        ```bash
        npm install # or yarn install
        ```

2.  **Start the Backend Server:**
    * From the `server` directory:
        ```bash
        node server.js
        ```
        * The backend server will start on `http://localhost:5000`.

### Frontend Setup

1.  **Update API Base URL:**
    * Open `client/src/Dashboard.jsx`.
    * Find the line `const API_BASE_URL = 'http://localhost:5000';`
    * If you are testing locally, keep it as `http://localhost:5000`.
    * **For deployment to Render, you MUST change this to your deployed backend URL**, e.g.:
        ```javascript
        const API_BASE_URL = '[https://your-deployed-backend-name.onrender.com](https://your-deployed-backend-name.onrender.com)';
        ```
        *(You will get this URL from Render after deploying your backend service.)*

2.  **Install Dependencies:**
    * Open a **new terminal window** and navigate to the **`client` directory**:
        ```bash
        cd your-project-root/client
        ```
    * Install React packages:
        ```bash
        npm install # or yarn install
        ```

3.  **Start the Frontend Development Server:**
    * From the `client` directory:
        ```bash
        npm run dev # or yarn dev
        ```
    * The frontend application will typically open in your browser at `http://localhost:5173`.

## Live Demo

The application is deployed and available at:

**Frontend (Render):** [YOUR_RENDER_FRONTEND_URL_HERE]
**Backend (Render):** [YOUR_RENDER_BACKEND_URL_HERE]

*(Remember to update the `API_BASE_URL` constant in `client/src/Dashboard.jsx` to point to your deployed backend URL before deploying your frontend, and to replace these placeholders.)*

## API Endpoints

A brief overview of the primary API endpoints:

* `POST /auth/register`: Register a new user.
* `POST /auth/login`: Log in a user.
* `POST /auth/logout`: Log out a user.
* `GET /teams`: Get teams associated with the logged-in user.
* `POST /teams`: Create a new team.
* `PUT /teams/:id`: Update a team (admin/creator only).
* `DELETE /teams/:id`: Delete a team (admin/creator only).
* `POST /teams/:teamId/members`: Add a member to a team (admin only).
* `GET /teams/:teamId/members`: Get members of a specific team.
* `DELETE /teams/:teamId/members/:memberId`: Remove a member from a team (admin only).
* `GET /users`: Get all registered users (for assignment/adding members).
* `GET /tasks`: Get tasks (with optional filtering).
* `POST /tasks`: Create a new task.
* `PUT /tasks/:id`: Update a task.
* `DELETE /tasks/:id`: Delete a task.

## Security Practices

* **Authentication Middleware:** All non-authentication routes are protected, requiring a logged-in user.
* **Password Hashing:** User passwords are securely stored using `bcryptjs`.
* **Session Management:** `express-session` with `connect-pg-simple` stores sessions in the database for persistence, using HTTP-only cookies and `sameSite: 'lax'` for CSRF protection.
* **Input Validation:** Basic server-side input validation is performed to ensure required fields are present. *(Note: For a production-grade application, more comprehensive validation using libraries like Joi or express-validator would be beneficial.)*
* **Role-Based Access Control:** Certain actions (e.g., deleting teams/tasks, managing members) are restricted to team admins or the creator of the resource.

## Version Control

This project utilizes Git for version control, with changes tracked via commits on a GitHub repository. Assessors will expect a clear commit history, ideally demonstrating iterative development.

## Bonus Features

* **Role-based access control** for team and task management (e.g., only admins can add/remove members, update/delete teams/tasks).

