import { useState, useEffect } from "react";
import { Send, Clock, Code } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { hasAnyGroup } from "../../lib/permissions";
import { Navigate } from "react-router-dom";

interface TablePermissions {
  name: string;
  operations: ("SELECT" | "INSERT" | "UPDATE" | "DELETE")[];
}

interface ApiCall {
  id: string;
  method: string;
  table: string;
  operation: string;
  timestamp: Date;
  duration: number;
  request: {
    table: string;
    operation: string;
    params: any;
  };
  response: {
    data: any;
    error: any;
  };
}

const ApiExplorer = () => {
  const { user } = useAuth();

  // Vérifier si l'utilisateur est SUPERADMIN
  if (!user || !hasAnyGroup(user, ["superadmin"])) {
    toast.error("Accès non autorisé. Seuls les super-administrateurs peuvent accéder à cette page.");
    return <Navigate to="/" replace />;
  }

  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [selectedTable, setSelectedTable] = useState("aircraft");
  const [selectedOperation, setSelectedOperation] = useState("SELECT");
  const [requestBody, setRequestBody] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [availableTables, setAvailableTables] = useState<TablePermissions[]>(
    []
  );

  const getRequestBodyPlaceholder = () => {
    switch (selectedOperation) {
      case "SELECT":
        return `{
  "columns": "id, user_id, aircraft_id, start_time",
  "filter": "user_id.eq.${user?.id}"
}`;
      case "INSERT":
        return `{
  "user_id": "${user?.id}",
  "aircraft_id": "uuid-de-l-appareil",
  "start_time": "2024-03-20T10:00:00"
}`;
      case "UPDATE":
        return `{
  "filter": { "id": "uuid-du-vol" },
  "data": { "status": "completed" }
}`;
      case "DELETE":
        return `{
  "id": "uuid-du-vol"
}`;
      default:
        return "{ }";
    }
  };

  const validateRequestBody = (body: string): boolean => {
    try {
      if (body) JSON.parse(body);
      return true;
    } catch (e) {
      toast.error("JSON invalide");
      return false;
    }
  };

  const handleApiCall = async () => {
    if (requestBody && !validateRequestBody(requestBody)) return;

    setLoading(true);
    const startTime = performance.now();

    try {
      let response;
      const query = supabase.from(selectedTable);

      switch (selectedOperation) {
        case "SELECT":
          const selectQuery = requestBody ? JSON.parse(requestBody) : "*";
          response = await query.select(selectQuery.columns || "*");
          if (selectQuery.filter) {
            const [column, op, value] = selectQuery.filter.split(".");
            response = await query
              .select(selectQuery.columns || "*")
              [op](column, value);
          }
          break;

        case "INSERT":
          const insertData = JSON.parse(requestBody);
          response = await query.insert(insertData).select();
          break;

        case "UPDATE":
          const { filter, data } = JSON.parse(requestBody);
          response = await query.update(data).match(filter).select();
          break;

        case "DELETE":
          const deleteFilter = JSON.parse(requestBody);
          response = await query.delete().match(deleteFilter).select();
          break;

        default:
          throw new Error("Opération non supportée");
      }

      const endTime = performance.now();

      const newCall: ApiCall = {
        id: crypto.randomUUID(),
        method: selectedOperation,
        table: selectedTable,
        operation: selectedOperation,
        timestamp: new Date(),
        duration: Math.round(endTime - startTime),
        request: {
          table: selectedTable,
          operation: selectedOperation,
          params: requestBody ? JSON.parse(requestBody) : null,
        },
        response: {
          data: response.data,
          error: response.error,
        },
      };

      setApiCalls((prev) => [newCall, ...prev]);

      if (response.error) {
        toast.error(`Erreur: ${response.error.message}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'appel Supabase:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'appel Supabase"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSqlQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error("La requête SQL est vide");
      return;
    }

    setLoading(true);
    const startTime = performance.now();

    try {
      console.log("User ID actuel:", user?.id);

      const { data, error } = await supabase.rpc("execute_sql", {
        query: sqlQuery,
      });

      console.log("Réponse SQL brute:", data);

      const endTime = performance.now();

      const newCall: ApiCall = {
        id: crypto.randomUUID(),
        method: "SQL",
        table: "custom",
        operation: "QUERY",
        timestamp: new Date(),
        duration: Math.round(endTime - startTime),
        request: {
          table: "custom",
          operation: "SQL",
          params: {
            query: sqlQuery,
            currentUserId: user?.id,
          },
        },
        response: {
          data: Array.isArray(data) ? data : [data],
          error: error || (data && "error" in data ? data : null),
        },
      };

      setApiCalls((prev) => [newCall, ...prev]);

      if (error || (data && "error" in data)) {
        toast.error(`Erreur SQL: ${error?.message || data?.error}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'exécution SQL:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'exécution SQL"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTablePermissions = async () => {
    try {
      const { data: policiesData, error: policiesError } = await supabase.rpc(
        "get_policies_info"
      );

      if (policiesError) throw policiesError;

      const tablePermissions = new Map<string, Set<string>>();

      policiesData.forEach((policy: any) => {
        const tableName = policy.table;
        const command = policy.command;

        if (!tablePermissions.has(tableName)) {
          tablePermissions.set(tableName, new Set());
        }

        if (command === "ALL") {
          ["SELECT", "INSERT", "UPDATE", "DELETE"].forEach((op) =>
            tablePermissions.get(tableName)?.add(op)
          );
        } else {
          tablePermissions.get(tableName)?.add(command);
        }
      });

      const formattedTables: TablePermissions[] = Array.from(
        tablePermissions.entries()
      )
        .map(([name, operations]) => ({
          name,
          operations: Array.from(operations) as (
            | "SELECT"
            | "INSERT"
            | "UPDATE"
            | "DELETE"
          )[],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAvailableTables(formattedTables);

      if (!selectedTable && formattedTables.length > 0) {
        setSelectedTable(formattedTables[0].name);
        setSelectedOperation(formattedTables[0].operations[0]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des permissions:", error);
      toast.error("Impossible de récupérer les permissions des tables");
    }
  };

  useEffect(() => {
    fetchTablePermissions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Explorateur Supabase
        </h1>
        <button
          onClick={() => setShowSqlEditor(!showSqlEditor)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Code className="h-4 w-4" />
          {showSqlEditor ? "Masquer SQL" : "Afficher SQL"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {showSqlEditor ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Éditeur SQL</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Requête SQL
                  </label>
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full h-40 px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm"
                    placeholder="SELECT * FROM flights WHERE user_id = auth.uid();"
                  />
                </div>

                <button
                  onClick={handleSqlQuery}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Exécuter SQL
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">
                Tester les requêtes Supabase
              </h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200"
                  >
                    {availableTables.map((table) => (
                      <option key={table.name} value={table.name}>
                        {table.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedOperation}
                    onChange={(e) => setSelectedOperation(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200"
                  >
                    {availableTables
                      .find((t) => t.name === selectedTable)
                      ?.operations.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Paramètres de la requête
                  </label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full h-40 px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm"
                    placeholder={getRequestBodyPlaceholder()}
                  />
                </div>

                <button
                  onClick={handleApiCall}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Exécuter la requête
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Historique des appels reste le même */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              Historique des requêtes
            </h2>

            <div className="space-y-4">
              {apiCalls.map((call) => (
                <div
                  key={call.id}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">
                        {call.operation} {call.table}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      {call.duration}ms
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-2">
                        Requête
                      </h3>
                      <pre className="bg-slate-50 p-3 rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(call.request, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-2">
                        Réponse
                      </h3>
                      <pre className="bg-slate-50 p-3 rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(call.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}

              {apiCalls.length === 0 && (
                <div className="text-center py-6 text-slate-500">
                  Aucune requête effectuée
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiExplorer;
