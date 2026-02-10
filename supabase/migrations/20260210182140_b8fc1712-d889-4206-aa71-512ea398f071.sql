
-- Allow users to see profiles of people who are collaborators on the same project
CREATE POLICY "Users can view profiles of project collaborators"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM project_collaborators pc1
    JOIN project_collaborators pc2 ON pc1.project_id = pc2.project_id
    WHERE pc1.user_id = auth.uid()
      AND pc2.user_id = profiles.id
  )
);
