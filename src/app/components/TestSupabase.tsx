'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/supabase';
import { createChatSession } from '@/lib/supabase/chatUtils';

export default function TestSupabase() {
  const [status, setStatus] = useState<string>('Testing connection...');
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test basic connection
        const { data, error } = await supabase.from('chat_sessions').select('*').limit(1);
        
        if (error) {
          setStatus(`Error: ${error.message}`);
          return;
        }

        // Test creating a new session
        const newSessionId = await createChatSession();
        setSessionId(newSessionId);
        setStatus('✅ Connection successful!');
      } catch (error) {
        setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Supabase Connection Test</h2>
      <p className="mb-2">Status: {status}</p>
      {sessionId && (
        <p className="text-sm text-gray-600">
          Created session ID: {sessionId}
        </p>
      )}
    </div>
  );
} 