// Supabase connection. The anon key is meant to be public: the database
// itself only lets the emails in public.allowed_users read or write data.
window.APP_CONFIG = {
  supabaseUrl: "https://walnpkhqizshyryynfup.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbG5wa2hxaXpzaHlyeXluZnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NjIwNDgsImV4cCI6MjEwODAzODA0OH0.qyNOusKptZh--Pib_BEJT-SUOPHinO9KGA3onbAmT2A",
  // Used only for a friendlier error on the sign-in screen.
  allowedEmails: ["joe@capriogroup.com", "dtracey809@gmail.com"],
};
