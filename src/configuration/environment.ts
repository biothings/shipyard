const Environment: Object = {
  prod: {
    ES_QUERY_URL: {
      su12: "http://su12:9200/_msearch", 
      transltr: "http://transltr.biothings.io:9200/_msearch"
    },
    NEO4J_QUERY_URL: "http://localhost:7474/db/neo4j/tx/commit"
  },
  local: {
    ES_QUERY_URL: {
      su12: "http://su12:9200/_msearch", 
      transltr: "http://transltr.biothings.io:9200/_msearch"
    },
    NEO4J_QUERY_URL: "http://su08:7474/db/neo4j/tx/commit"
  },
};

export const EnvConfiguration: Object = Environment[__ENV.ENVIRONMENT] || Environment["local"];
