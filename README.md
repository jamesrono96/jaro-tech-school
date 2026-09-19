# Jaro-Tech School Management System — Render Build

This is a portable Render-ready build of the Jaro-Tech School Management System.

## Deploy
1. Create a GitHub repository named `jaro-tech-school`.
2. Upload all files from this folder.
3. Render → New → Web Service → connect the GitHub repository.
4. Build command: `npm install`
5. Start command: `npm start`
6. Health check: `/health`

## Demo accounts
Admin: `admin@demo.school` / `Admin123!`
Teacher: `alice.chebet@demo.school` / `Teacher123!`
Parent: `parent001@demo.school` / `Parent123!`

Demo environment contains 120 students, 8 teachers, 5 subjects, 15 assessments and 1,800 marks.

### Important
This first portable build uses an in-memory database so it can run immediately on Render. Data resets when the service restarts. Before real customer use, connect Render PostgreSQL and move the data layer to persistent storage. The current API structure is designed for that next step.
