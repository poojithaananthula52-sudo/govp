# Sahayak AI

Government scheme discovery, eligibility guidance and application-preparation platform.

## Run the frontend

```bash
npm install
npm run dev
```

## Run the API

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload
```

Run `supabase/schema.sql` in the Supabase SQL editor before connecting the API. Add actual official scheme data via the protected admin API or a controlled ingestion pipeline; the database is deliberately not preloaded with invented records.
