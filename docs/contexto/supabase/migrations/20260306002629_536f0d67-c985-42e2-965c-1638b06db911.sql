-- Allow users to update their own push notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.push_notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)

-- Allow users to delete their own push notifications
CREATE POLICY "Users can delete their own notifications"
ON public.push_notifications
FOR DELETE
USING (auth.uid() = user_id)
