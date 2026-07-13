const Environment: Object = {
  prod: {
    ES_QUERY_URL: {
      su12: "http://su12:9200/_msearch",
    },
    NEO4J_QUERY_URL: "http://localhost:7474/db/neo4j/tx/commit",
    NODENORM_QUERY_URL: {
      ci: "https://nodenorm-es.ci.transltr.io/get_normalized_nodes",
      renci: "https://nodenormalization-sri.renci.org/1.5/get_normalized_nodes",
      renci_ctrl: "https://nodenorm.ci.transltr.io/1.5/get_normalized_nodes"
    },
    NAMERES_QUERY_URL: {
      ci: "https://namelookup-es.ci.transltr.io/synonyms",
    },
    PLOVERDB_QUERY_URL: "https://kg2cploverdb.ci.transltr.io/query",
    DGRAPH_QUERY_URL: "http://localhost:18080/query",
    JANUSGRAPH_QUERY_URL: "http://localhost:8182",
    KUZUDB_QUERY_URL: "http://localhost:8979/query"
  },
  local: {
    ES_QUERY_URL: {
      su12: "http://su12:9200/_msearch",
    },
    NEO4J_QUERY_URL: "http://su08:7474/db/neo4j/tx/commit",
    NODENORM_QUERY_URL: {
      ci: "https://nodenorm-es.ci.transltr.io/get_normalized_nodes",
      renci: "https://nodenormalization-sri.renci.org/1.5/get_normalized_nodes",
      renci_ctrl: "https://nodenorm.ci.transltr.io/1.5/get_normalized_nodes"
    },
    NAMERES_QUERY_URL: {
      ci: "https://namelookup-es.ci.transltr.io/synonyms",
    },
    PLOVERDB_QUERY_URL: "https://kg2cploverdb.ci.transltr.io/query",
    DGRAPH_QUERY_URL: "http://su08:18080/query",
    JANUSGRAPH_QUERY_URL: "http://su08:8182",
    KUZUDB_QUERY_URL: "http://su08:8979/query"
  },
};

export const EnvConfiguration: Object = Environment[__ENV.ENVIRONMENT] || Environment["local"];
