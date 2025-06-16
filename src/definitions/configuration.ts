const Environment: Object = {
  prod: {
    ES_QUERY_URL: ["http://su12:9200/_msearch", "http://transltr.biothings.io:9200/_msearch"],
    NEO4J_QUERY_URL: "http://localhost:7474/db/neo4j/tx/commit"
  },
  su08: {
    ES_QUERY_URL: ["http://su12:9200/_msearch", "http://transltr.biothings.io:9200/_msearch"],
    NEO4J_QUERY_URL: "http://su08:7474/db/neo4j/tx/commit"
  },
};

export const TestConfiguration: Object = Environment[__ENV.ENVIRONMENT] || Environment["su08"];
