import React, { useState, useEffect } from 'react';
import { Tabs, Tab } from '@mui/material';
import { supabase } from '../../lib/supabase';
import Editor from '@monaco-editor/react';

export default function AdminTest() {
  const [activeTab, setActiveTab] = useState(0);
  const [tablesSchema, setTablesSchema] = useState('');
  const [policiesSchema, setPoliciesSchema] = useState('');
  const [functionsSchema, setFunctionsSchema] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        // Récupérer le schéma des tables
        const { data: tables, error: tablesError } = await supabase
          .rpc('get_tables_schema');
        if (tablesError) throw tablesError;
        setTablesSchema(JSON.stringify(tables, null, 2));

        // Récupérer les policies
        const { data: policies, error: policiesError } = await supabase
          .rpc('get_policies_schema');
        if (policiesError) throw policiesError;
        setPoliciesSchema(JSON.stringify(policies, null, 2));

        // Récupérer les fonctions
        const { data: functions, error: functionsError } = await supabase
          .rpc('get_functions_schema');
        if (functionsError) throw functionsError;
        setFunctionsSchema(JSON.stringify(functions, null, 2));

      } catch (error) {
        console.error('Erreur lors de la récupération des schémas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchemas();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onChange={handleTabChange} className="border-b border-gray-200">
        <Tab label="Tables" />
        <Tab label="Policies" />
        <Tab label="Fonctions" />
      </Tabs>

      <div className="h-[600px] border rounded-lg overflow-hidden">
        {activeTab === 0 && (
          <Editor
            height="100%"
            defaultLanguage="json"
            value={tablesSchema}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
            }}
          />
        )}

        {activeTab === 1 && (
          <Editor
            height="100%"
            defaultLanguage="json"
            value={policiesSchema}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
            }}
          />
        )}

        {activeTab === 2 && (
          <Editor
            height="100%"
            defaultLanguage="json"
            value={functionsSchema}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
