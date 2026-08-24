# CardWise MVP

חבילת React + Vite + Supabase מוכנה לפרסום. המחירים וההטבות באפליקציה הם נתוני הדגמה.

## 1. שדרוג מסד הנתונים
1. היכנס לפרויקט CardWise ב-Supabase.
2. לחץ SQL Editor ואז New query.
3. פתח במחשב את `supabase/setup.sql`.
4. העתק את כל תוכנו, הדבק ב-SQL Editor ולחץ Run.
5. התוצאה הרצויה: `Success. No rows returned`.

## 2. העלאה ל-GitHub ללא התקנה
1. חלץ את קובץ ה-ZIP במחשב.
2. פתח את המאגר `cardwise` ב-GitHub.
3. לחץ Add file ואז Upload files.
4. גרור את כל הקבצים והתיקיות שבתוך `cardwise-mvp`, לא את תיקיית-האב עצמה.
5. אל תעלה קובץ `.env` או מפתח secret/service_role.
6. לחץ Commit changes.

## 3. פרסום ב-Vercel
1. היכנס ל-Vercel באמצעות GitHub.
2. בחר Add New ואז Project.
3. בחר את המאגר `cardwise` ולחץ Import.
4. Framework Preset אמור להיות Vite.
5. תחת Environment Variables הוסף:
   - `VITE_SUPABASE_URL` עם כתובת פרויקט Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` עם ה-Publishable key.
6. לחץ Deploy.

## 4. הגדרת כתובת האתר ב-Supabase
לאחר ש-Vercel נותן כתובת לאתר:
1. Supabase > Authentication > URL Configuration.
2. בשדה Site URL הזן את כתובת Vercel המלאה.
3. תחת Redirect URLs הוסף את אותה כתובת, ובמידת הצורך גם כתובת עם `/**` בסוף בהתאם לממשק Supabase.

## 5. בדיקה
1. פתח את כתובת האתר.
2. לחץ הרשמה והזן אימייל וסיסמה של 6 תווים לפחות.
3. אם Email confirmation פעיל, אשר את ההודעה שנשלחה למייל.
4. התחבר, פתח "הכרטיסים שלי" והוסף כרטיס.
5. חזור לחיפוש ובדוק AirPods, OO101 או PS5.

## אבטחה
- ה-Publishable key מיועד לדפדפן, אבל ההגנה האמיתית מבוססת על RLS שמוגדר בקובץ SQL.
- לעולם אין להעלות או לשתף `service_role`, secret key, סיסמת מסד הנתונים או CVV.
- האתר שומר רק את סוג הכרטיס, לא מספר כרטיס.
