# Jaro-Tech School Management System — V9

Final functional testing build with the latest scheduling, results, class-teacher, parent, branding and SaaS onboarding changes.

## Main changes in V9
- Results/stream ranking is restricted to the same academic level: Grade 7A/B/C are compared with each other; Grade 7 is never ranked against Grade 8.
- Administration can add classes and choose the number of streams.
- Institution registration endpoint and registration page create an administrator account automatically.
- Platform administrator can list and manage registered institutions.
- Teacher unlock requests for locked assessments, with admin/HOD/exam-officer approve/reject workflow.
- Administrator can directly unlock a locked assessment for correction.
- Timetable generator uses 10 regular 40-minute periods with configured breaks/lunch/games settings.
- Regular teacher workload remains maximum 6 lessons/day and 24/week.
- Same teacher/class/subject can have at most a double lesson on one day.
- Remedial lessons remain outside regular workload limits.
- Teacher portal exposes an unlock-request action when a selected assessment is locked.
- Existing parent, teacher, class-teacher, attendance, grading and branding workflows remain included.

## Demo accounts
- Admin: admin@demo.school / Admin123!
- Teacher: alice.chebet@demo.school / Teacher123!
- Parent: parent001@demo.school / Parent123!
- Platform admin: platform@jaro-tech.test / JaroTechPlatform!2026

## Deployment
- Build: `npm install`
- Start: `npm start`
- Health: `/health`

## Important production note
This portable Render build still uses in-memory application data. PostgreSQL persistence and full tenant-level database isolation should be implemented before real multi-institution production use. The institution registration and platform-management APIs in V9 are the SaaS onboarding foundation; they are not a substitute for production PostgreSQL tenant isolation.
