# Jaro-Tech School Management System — Render Build v2

This is a portable Node/Express build for Render.

## Deploy
- Repository root must contain `package.json`, `server.js`, `render.yaml`, and `public/`.
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- Free Render instance is sufficient for testing.

## Demo accounts
- Admin: `admin@demo.school` / `Admin123!`
- Teacher: `alice.chebet@demo.school` / `Teacher123!`
- Other demo teachers: `Teacher123!`
- Parent: `parent001@demo.school` / `Parent123!`

## Working modules
- Role-based login
- Dashboard
- Teacher mark entry
- Assessment creation and status
- Result approval and locking
- Results overview and student detail
- Printable report forms / Save as PDF
- Parent portal with child isolation
- Attendance
- Timetable
- Administration
- Student creation
- Teacher assignment/status view
- CSV student import/export

## Important
This portable build stores data in memory. It is intended to get the application working independently on Render. Data resets when the service restarts or redeploys. Before using with a real school, add PostgreSQL persistence and production email/password-reset, audit logs, tenant isolation, backups, and stronger operational security.

## Updating an existing GitHub/Render deployment
Replace the repository contents with this package, commit, and push. Render will auto-deploy from GitHub if auto-deploy is enabled. Do not upload the ZIP file itself; upload its contents.
