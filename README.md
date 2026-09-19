# Jaro-Tech School Management System — Render Build v3

Portable Node/Express school management system for Render.

## Included in v3
- Admin, teacher and parent login
- Automatic teacher username + temporary password generation
- Teacher can log in with username or email
- Teacher mark entry with live percentage and subject rank for the assigned class
- Teacher can edit marks until the assessment is locked
- Admin/HOD/exam officer approval and locking workflow
- Parent portal limited to student results; timetable hidden from parents
- Institution logo upload and branded student reports/printouts
- Student, teacher, assessment, attendance, timetable and import/export modules

## Demo accounts
- Admin: admin@demo.school / Admin123!
- Teacher: alice.chebet@demo.school / Teacher123!
- Parent: parent001@demo.school / Parent123!

## Render
- Build: `npm install`
- Start: `npm start`
- Health: `/health`

## Important
This portable build currently keeps data in memory. It is intended for functional deployment/testing. For real school use, connect PostgreSQL so teacher accounts, marks, students, attendance, branding and other records persist across restarts/redeploys.
