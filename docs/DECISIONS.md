# Key decisions

1. **Stack:** React + Vite + TypeScript + Tailwind (web), FastAPI (server), PostgreSQL on Supabase (data + login + private file storage).
2. **AI provider:** Grok (xAI) free API for now, behind one small interface so we can switch provider later without touching features. The AI key lives only on the server.
3. **Money maths is plain code, never AI.** The AI only explains numbers the code calculated.
4. **Documents are optional.** Users choose whether to upload. Files are private, deletable, and never used for training.
5. **Government schemes:** researched from official sources, stored in our own database with source link and "last checked" date. The assistant answers from that data and always shows the source.
6. **One AI assistant first.** More specialised parts only when they clearly improve results.
7. **UI:** custom, non-standard layout (no usual top navigation bar). Built from the founder's templates in a later milestone.
8. **Workflow:** one branch per milestone, pushed to GitHub. Pull requests are created and merged by the founder.
9. **Security:** no secrets in code, every table owned by a user, server never logs private data.
10. **Legal:** the product is informational. A lawyer must review before any public launch.
