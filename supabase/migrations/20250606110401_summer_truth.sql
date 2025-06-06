/*
  # Create trigger to automatically create user profile

  1. New Functions
    - `handle_new_user()` - Automatically creates a user profile when a new user signs up
  
  2. New Triggers
    - Trigger on `auth.users` insert to create corresponding `public.users` record
  
  3. Security
    - Function runs with security definer privileges
    - Ensures every authenticated user has a profile
*/

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();