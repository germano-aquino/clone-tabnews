import useSWR from "swr";

async function fetchAPI(key) {
  const response = await fetch(key);
  const responseBody = response.json();
  return responseBody;
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
      <DatabaseStatus />
    </>
  );
}

function UpdatedAt() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });

  let updatedAtText = "Carregando...";
  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }
  return (
    <p>
      Última atualização: <b>{updatedAtText}</b>
    </p>
  );
}

function DatabaseStatus() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });

  let databaseVersion = "Carregando...";
  let maxConnections = "Carregando...";
  let openedConnections = "Carregando...";
  if (!isLoading && data) {
    databaseVersion = data.dependencies.database.version;
    maxConnections = data.dependencies.database.max_connections;
    openedConnections = data.dependencies.database.opened_connections;
  }
  return (
    <div>
      <h2>Informações do Banco de Dados</h2>
      <p>
        Versão: <b>{databaseVersion}</b>
      </p>
      <p>
        Número Máximo de Conexões: <b>{maxConnections}</b>
      </p>
      <p>
        Número de Conexões Abertas: <b>{openedConnections}</b>
      </p>
    </div>
  );
}
