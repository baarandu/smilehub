-- Create or Replace the function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_clinic_id uuid;
  invite_record record;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, gender, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'gender',
    new.email
  );

  -- 2. Check for Pending Invites
  SELECT * INTO invite_record
  FROM public.clinic_invites
  WHERE email = new.email
  AND status = 'pending'
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    -- User was invited: Add to existing clinic
    INSERT INTO public.clinic_users (user_id, clinic_id, role)
    VALUES (new.id, invite_record.clinic_id, invite_record.role);

    -- Mark invite as accepted
    UPDATE public.clinic_invites
    SET status = 'accepted'
    WHERE id = invite_record.id;
    
  ELSIF new.raw_user_meta_data->>'account_type' = 'clinic' THEN
    -- User is creating a new clinic: Create clinic and make Admin
    INSERT INTO public.clinics (name)
    VALUES (COALESCE(new.raw_user_meta_data->>'clinic_name', 'Minha Clínica'))
    RETURNING id INTO new_clinic_id;

    INSERT INTO public.clinic_users (user_id, clinic_id, role)
    VALUES (new.id, new_clinic_id, 'admin');
    
  END IF;

  RETURN new;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
