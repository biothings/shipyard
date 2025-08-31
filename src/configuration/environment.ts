const Environment: Object = {
  prod: {
    NEO4J_QUERY_URL: "http://localhost:7474/db/neo4j/tx/commit",
    NODENORM_QUERY_URL: {
      ci: "https://biothings.ci.transltr.io/nodenorm/get_normalized_nodes",
      renci: "https://nodenorm.ci.transltr.io/1.5/get_normalized_nodes",
    },
    PLOVERDB_QUERY_URL: "https://kg2cploverdb.ci.transltr.io/query",
    DGRAPH_QUERY_URL: "http://localhost:18080/query",
    JANUSGRAPH_QUERY_URL: "http://localhost:8182"
  },
  local: {
    NEO4J_QUERY_URL: "http://su08:7474/db/neo4j/tx/commit",
    NODENORM_QUERY_URL: {
      ci: "https://biothings.ci.transltr.io/nodenorm/get_normalized_nodes",
      renci: "https://nodenorm.ci.transltr.io/1.5/get_normalized_nodes",
    },
    PLOVERDB_QUERY_URL: "https://kg2cploverdb.ci.transltr.io/query",
    DGRAPH_QUERY_URL: "http://su08:18080/query",
    JANUSGRAPH_QUERY_URL: "http://su08:8182"
  },
};

export const EnvConfiguration: Object = Environment[__ENV.ENVIRONMENT] || Environment["local"];
