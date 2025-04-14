import { supabase } from './supabase';

export interface ChatMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at?: string;
}

export const createChatSession = async () => {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({})
    .select()
    .single();

  if (error) throw error;
  return data.id;
};

export const saveChatMessage = async (message: ChatMessage) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getChatHistory = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const uploadImage = async (file: File, sessionId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${sessionId}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('chat-images')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-images')
    .getPublicUrl(fileName);

  return publicUrl;
}; 