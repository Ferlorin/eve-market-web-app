'use client';

import { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { z } from 'zod';
import { format } from 'date-fns';
import axios from 'axios';

export default function TestDepsPage() {
  const [result, setResult] = useState('');

  const testDeps = async () => {
    try {
      // Test axios
      const response = await axios.get('https://api.github.com/zen');
      
      // Test zod
      const UserSchema = z.object({ message: z.string() });
      const validated = UserSchema.parse({ message: response.data });
      
      // Test date-fns
      const timestamp = format(new Date(), 'MMM dd, yyyy h:mm a');
      
      // Test @headlessui/react (imported above, renders below)
      
      // Test @tanstack/react-virtual (imported above)
      
      setResult(`✅ All dependencies working!\n\nAxios: ${validated.message}\nDate: ${timestamp}`);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dependency Test Page</h1>
      <button 
        onClick={testDeps}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Test Dependencies
      </button>
      
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded whitespace-pre-wrap">
          {result}
        </pre>
      )}
      
      {/* Test Headless UI Combobox */}
      <div className="mt-8">
        <h2 className="font-bold mb-2">Headless UI Test:</h2>
        <Combobox value="" onChange={() => {}}>
          <Combobox.Input className="border p-2" placeholder="Type to test..." />
        </Combobox>
      </div>
    </div>
  );
}
