const Environment: Object = {
  prod: {
    ES_QUERY_URL: {
      su12: "http://su12:9200/_msearch", 
      transltr: "http://transltr.biothings.io:9200/_msearch"
    },
    NEO4J_QUERY_URL: "http://localhost:7474/db/neo4j/tx/commit",
    NODENORM_QUERY_URL: {
      ci: "https://biothings.ci.transltr.io/nodenorm/node",
      su12: "http://su12:9200/_msearch", 
      transltr: "http://transltr.biothings.io:9200/_msearch"
    }
  },
  local: {
    ES_QUERY_URL: {
      su12: "http://su12:9200/_msearch", 
      transltr: "http://transltr.biothings.io:9200/_msearch"
    },
    NEO4J_QUERY_URL: "http://su08:7474/db/neo4j/tx/commit",
    NODENORM_QUERY_URL: {
      ci: "https://biothings.ci.transltr.io/nodenorm/node",
      su12: "http://su12:9200/_msearch", 
      transltr: "http://transltr.biothings.io:9200/_msearch"
    }
  },
};

export const EnvConfiguration: Object = Environment[__ENV.ENVIRONMENT] || Environment["local"];
