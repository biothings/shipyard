import { TextEncoder } from "k6/x/encoding";
import { Database, Row } from "k6/x/sql";

import { graphSamples, multihopSamples} from "./sampling.ts";

export type FloatingField = "subject" | "object" | "predicate";
export type IndexName = "rtx_kg2_edges_merged" | "rtx_kg2_nodes_adjacency_list";

function prepareFloatingQueryTermsForAdjList(
  sample: Row,
  floatingField: FloatingField,
) {
  const edgeOrigin = floatingField === "subject" ? "object" : "subject";
  const edgeDestin = edgeOrigin === "subject" ? "object" : "subject";
  const edgeClass = floatingField === "subject" ? "in_edges" : "out_edges";

  const innerFilter = [];

  if (floatingField === "predicate") {
    innerFilter.push({
      term: { [`${edgeClass}.object.keyword`]: sample[edgeDestin] },
    });
  } else {
    innerFilter.push({
      term: { [`${edgeClass}.predicate.keyword`]: sample.predicate },
    });
  }

  const filter = [
    { term: { _id: sample[edgeOrigin] } },
    {
      nested: {
        path: [edgeClass],
        query: {
          bool: {
            filter: innerFilter,
          },
        },
        inner_hits: { size: 1 },
      },
    },
  ];

  return JSON.stringify({
    _source: { excludes: ["in_edges", "out_edges"] },
    query: {
      bool: {
        filter,
      },
    },
  });
}

function prepareFloatingQueryTerms(sample: Row, floatingField: FloatingField) {
  const fields = ["subject", "object", "predicate"];
  const filter = fields.reduce((arr, field) => {
    if (field == floatingField) {
      return arr;
    }

    return [
      ...arr,
      {
        term: {
          [field + `${field === "predicate" ? "" : ".id"}` + ".keyword"]:
            sample[field],
        },
      },
    ];
  }, []);

  return JSON.stringify({
    query: {
      bool: {
        filter,
      },
    },
  });
}

export const generateEsFloatingQuerier =
  (floatingField: FloatingField) =>
  (sampling_database: Database, sample_size: string, esIndex: string) => {
    const samples = graphSamples(sampling_database, sample_size);

    const queryTermPreparer =
      esIndex === "rtx_kg2_nodes_adjacency_list"
        ? prepareFloatingQueryTermsForAdjList
        : prepareFloatingQueryTerms;

    const queryHeader = JSON.stringify({ index: esIndex });
    const aggregated_statements = samples.reduce((arr, sample) => {
      return [...arr, queryHeader, queryTermPreparer(sample, floatingField)];
    }, []);

    return aggregated_statements.join("\n") + "\n";
  };

function getTermsAgainstNodesAdjacencyList(graphSample: Row) {
  return [
    { term: { _id: graphSample.subject } },
    {
      nested: {
        path: "out_edges",
        query: {
          bool: {
            filter: [
              { term: { "out_edges.object.keyword": graphSample.object } },
              {
                term: {
                  "out_edges.predicate.keyword": graphSample.predicate,
                },
              },
            ],
          },
        },
        inner_hits: { size: 1 },
      },
    },
  ];
}

function getTermsAgainstEdges(graphSample: Row) {
  return [
    { term: { "subject.keyword": graphSample.subject } },
    { term: { "object.keyword": graphSample.object } },
    { term: { "predicate.keyword": graphSample.predicate } },
  ];
}

export function esFixedQuery(
  samplingDatabase: Database,
  sampleSize: string,
  esIndex: IndexName,
) {
  const samples = graphSamples(samplingDatabase, sampleSize);

  const query_header = JSON.stringify({ index: esIndex });

  const term_get_function =
    esIndex === "rtx_kg2_nodes_adjacency_list"
      ? getTermsAgainstNodesAdjacencyList
      : getTermsAgainstEdges;

  const aggregatedStatements = samples.flatMap((graphSample) => [
    query_header,
    JSON.stringify({
      _source:
        esIndex === "rtx_kg2_nodes_adjacency_list"
          ? { excludes: ["in_edges", "out_edges"] }
          : true,
      query: {
        bool: {
          filter: term_get_function(graphSample),
        },
      },
    }),
  ]);

  return aggregatedStatements.join("\n") + "\n";
}

export function neo4jFixedQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Row> = graphSamples(samplingDatabase, sampleSize)
  const queryStatements: Array<object> = [];
  for (const graphSample of samples) {
    const subject_type: string = graphSample.subject_type;
    const object_type: string = graphSample.object_type;
    const predicate: string = graphSample.predicate;
    const query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\` {\`id\`: $object}) RETURN *;`;

    const statement: object = {
      statement : query,
      parameters : {
        subject : graphSample.subject,
        object : graphSample.object,
      }
    };
    queryStatements.push(statement);
  }
  const payload: string = JSON.stringify({statements: queryStatements});
  return payload;
}


export function neo4jFloatingObjectQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<object> = graphSamples(samplingDatabase, sampleSize)
  const queryStatements: Array<object> = [];
  for (const graphSample of samples) {
    const subject_type: string = graphSample.subject_type
    const object_type: string = graphSample.object_type
    const predicate: string = graphSample.predicate
    const query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\`) RETURN *;`;

    const statement: object = {
      statement : query,
      parameters : { subject : graphSample.subject}
    }
    queryStatements.push(statement)
  }

  const payload: string = JSON.stringify({statements: queryStatements});
  return payload;
}


export function neo4jFloatingPredicateQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize)
  const queryStatements: array = [];
  for (let graphSample of samples) {
    const subject_type: string = graphSample.subject_type
    const object_type: string = graphSample.object_type
    const query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})--(\`n1\`:\`${object_type}\` {\`id\`: $object}) RETURN *;`;

    const statement: object = {
      statement : query,
      parameters : {
        subject : graphSample.subject,
        object : graphSample.object,
      }
    }
    queryStatements.push(statement)
  }

  const payload: string = JSON.stringify({statements: queryStatements});
  return payload;
}


export function neo4jFloatingSubjectQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize)
  let queryStatements: Array<object> = [];
  for (let graphSample of samples) {
    let subject_type: string = graphSample.subject_type
    let object_type: string = graphSample.object_type
    let predicate: string = graphSample.predicate
    let query: string = `MATCH (\`n0\`:\`${subject_type}\`)-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\`) RETURN *;`;

    let statement: object = {
      statement : query,
      parameters : { object : graphSample.object}
    }
    queryStatements.push(statement)
  }

  const payload: string = JSON.stringify({statements: queryStatements});
  return payload;
}


export function ploverFixedQuery(samplingDatabase: Database, sampleSize: number, ploverEndpoint: string, parameters: Object) {
  let requests: Array<object> = [];
  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
      let payload: object = {
        message: {
          query_graph: {
            edges: {},
            nodes: {},
          },
        },
      };

      const edge_label: string = `e${ index }`;
      const node_label_subject: string = `n0-${ edge_label }`;
      const node_label_object: string = `n1-${ edge_label }`;

      let edge: object = {
        subject: node_label_subject,
        object: node_label_object,
        predicates: [ graphSample.predicate ],
      };

      const subject_node: object = {
        ids: [graphSample.subject],
        categories: [graphSample.subject_type],
      };

      const object_node: object = {
        ids: [graphSample.object],
        categories: [graphSample.object_type],
      };

      payload.message.query_graph.edges[edge_label] = edge;
      payload.message.query_graph.nodes[node_label_subject] = subject_node;
      payload.message.query_graph.nodes[node_label_object] = object_node;
      requests.push(
        {
          method: 'POST',
          url: ploverEndpoint,
          body: JSON.stringify(payload),
          params: parameters
        }
      );
  });

  return requests;
}

export function ploverFloatingPredicateQuery(samplingDatabase: Database, sampleSize: number, ploverEndpoint: string, parameters: Object) {
  let requests: Array<object> = [];
  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
      let payload: object = {
        message: {
          query_graph: {
            edges: {},
            nodes: {},
          }
        }
      };
      const edge_label: string = `e${ index }`;
      const node_label_subject: string = `n0-${ edge_label }`;
      const node_label_object: string = `n1-${ edge_label }`;

      let edge: object = {
        subject: node_label_subject,
        object: node_label_object,
      };

      const subject_node: object = {
        ids: [graphSample.subject],
        categories: [graphSample.subject_type],
      };

      const object_node: object = {
        ids: [graphSample.object],
        categories: [graphSample.object_type],
      };
      payload.message.query_graph.edges[edge_label] = edge;
      payload.message.query_graph.nodes[node_label_subject] = subject_node;
      payload.message.query_graph.nodes[node_label_object] = object_node;
      requests.push(
        {
          method: 'POST',
          url: ploverEndpoint,
          body: JSON.stringify(payload),
          params: parameters
        }
      );
  });
  return requests;
}


export function ploverFloatingObjectQuery(samplingDatabase: Database, sampleSize: number, ploverEndpoint: string, parameters: Object) {
  let requests: Array<object> = [];
  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
      let payload: object = {
        message: {
          query_graph: {
            edges: {},
            nodes: {},
          }
        }
      };
      const edge_label: string = `e${ index }`;
      const node_label_subject: string = `n0-${ edge_label }`;
      const node_label_object: string = `n1-${ edge_label }`;

      let edge: object = {
        subject: node_label_subject,
        object: node_label_object,
        predicates: [ graphSample.predicate ],
      };

      const subject_node: object = {
        ids: [graphSample.subject],
        categories: [graphSample.subject_type],
      };

      const object_node: object = {
        categories: [graphSample.object_type],
      };
      payload.message.query_graph.edges[edge_label] = edge;
      payload.message.query_graph.nodes[node_label_subject] = subject_node;
      payload.message.query_graph.nodes[node_label_object] = object_node;
      requests.push(
        {
          method: 'POST',
          url: ploverEndpoint,
          body: JSON.stringify(payload),
          params: parameters
        }
      );
  });
  return requests;
}


export function ploverFloatingSubjectQuery(samplingDatabase: Database, sampleSize: number, ploverEndpoint: string, parameters: Object) {
  let requests: Array<object> = [];
  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
      let payload: object = {
        message: {
          query_graph: {
            edges: {},
            nodes: {},
          }
        }
      };
      const edge_label: string = `e${ index }`;
      const node_label_subject: string = `n0-${ edge_label }`;
      const node_label_object: string = `n1-${ edge_label }`;

      let edge: object = {
        subject: node_label_subject,
        object: node_label_object,
        predicates: [ graphSample.predicate ],
      };

      const subject_node: object = {
        categories: [graphSample.subject_type],
      };

      const object_node: object = {
        ids: [graphSample.object],
        categories: [graphSample.object_type],
      };
      payload.message.query_graph.edges[edge_label] = edge;
      payload.message.query_graph.nodes[node_label_subject] = subject_node;
      payload.message.query_graph.nodes[node_label_object] = object_node;
      requests.push(
        {
          method: 'POST',
          url: ploverEndpoint,
          body: JSON.stringify(payload),
          params: parameters
        }
      );
  });
  return requests;
}


export function dgraphFixedQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach((graphSample, index) => {
    const subject: string = graphSample.subject;
    const object: string = graphSample.object;
    const predicate: string = graphSample.predicate.replace("biolink:","");
    const query: string = `
    node${index}
    (func: eq(id, "${object}"))
    @cascade {
      id
      name
      category
      in_edges: ~source @filter(eq(predicate, "${predicate}")) {
        predicate
        primary_knowledge_source
        node: target @filter(eq(id, "${subject}")) {
          id
          name
          category
        }
      }
    }`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}

export function dgraphTwoHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graphSample, index) => {
    const node0: string = graphSample.n0;
    const node1: string = graphSample.n1;
    const node2: string = graphSample.n2;
    const query: string = `
    twohoplookup${index}
    (func: eq(id, "${node0}"))
    @cascade {
      id
      name
      category

      in_edges: ~source {
        predicate
        primary_knowledge_source
        target @filter(eq(id, "${node1}")) {
          id
          name
          category

          in_edges: ~source {
            predicate
            primary_knowledge_source
            target @filter(eq(id, "${node2}")) {
              id
              name
              category
            }
          }
        }
      }
    }`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}

export function dgraphThreeHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graphSample, index) => {
    const node0: string = graphSample.n0;
    const node1: string = graphSample.n1;
    const node2: string = graphSample.n2;
    const node3: string = graphSample.n3;
    const query: string = `
    threehoplookup${index}
    (func: eq(id, "${node0}"))
    @cascade {
      id
      name
      category

      # First hop: from node0 to node1
      in_edges: ~source {
        predicate
        primary_knowledge_source
        target @filter(eq(id, "${node1}")) {
          id
          name
          category

          # Second hop: from node1 to node2
          in_edges: ~source {
            predicate
            primary_knowledge_source
            target @filter(eq(id, "${node2}")) {
              id
              name
              category

              # Third hop: from node2 to node3
              in_edges: ~source {
                predicate
                primary_knowledge_source
                target @filter(eq(id, "${node3}")) {
                  id
                  name
                  category
                }
              }
            }
          }
        }
      }
    }`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}

export function dgraphFourHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graphSample, index) => {
    const node0: string = graphSample.n0;
    const node1: string = graphSample.n1;
    const node2: string = graphSample.n2;
    const node3: string = graphSample.n3;
    const node4: string = graphSample.n4;
    const query: string = `
    fourhoplookup${index}
    (func: eq(id, "${node0}"))
    @cascade {
      id
      name
      category

      in_edges: ~source {
        predicate
        primary_knowledge_source
        target @filter(eq(id, "${node1}")) {
          id
          name
          category

          in_edges: ~source {
            predicate
            primary_knowledge_source
            target @filter(eq(id, "${node2}")) {
              id
              name
              category

              in_edges: ~source {
                predicate
                primary_knowledge_source
                target @filter(eq(id, "${node3}")) {
                  id
                  name
                  category

                  in_edges: ~source {
                    predicate
                    primary_knowledge_source
                    target @filter(eq(id, "${node4}")) {
                      id
                      name
                      category
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}

export function dgraphFiveHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graphSample, index) => {
    const node0: string = graphSample.n0;
    const node1: string = graphSample.n1;
    const node2: string = graphSample.n2;
    const node3: string = graphSample.n3;
    const node4: string = graphSample.n4;
    const node5: string = graphSample.n5;
    const query: string = `
    fivehoplookup${index}
    (func: eq(id, "${node0}"))
    @cascade {
      id
      name
      category

      in_edges: ~source {
        predicate
        primary_knowledge_source
        target @filter(eq(id, "${node1}")) {
          id
          name
          category

          in_edges: ~source {
            predicate
            primary_knowledge_source
            target @filter(eq(id, "${node2}")) {
              id
              name
              category

              in_edges: ~source {
                predicate
                primary_knowledge_source
                target @filter(eq(id, "${node3}")) {
                  id
                  name
                  category

                  in_edges: ~source {
                    predicate
                    primary_knowledge_source
                    target @filter(eq(id, "${node4}")) {
                      id
                      name
                      category

                      in_edges: ~source {
                        predicate
                        primary_knowledge_source
                        target @filter(eq(id, "${node5}")) {
                          id
                          name
                          category
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}


export function dgraphFloatingObjectQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)
  const statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const subject: string = graph_sample.subject;
    const object_type: string = graph_sample.object_type;
    const predicate: string = graph_sample.predicate.replace("biolink:","");
    const query: string = `
    node${index}
    (func: eq(category, "${object_type}"))
    @cascade {
      id
      name
      category
      in_edges: ~source @filter(eq(predicate, "${predicate}")) {
        predicate
        primary_knowledge_source
        node: target @filter(eq(id, "${subject}")) {
          id
          name
          category
        }
      }
    }`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}


export function dgraphFloatingSubjectQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)
  const statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const object: string = graph_sample.object;
    const subject_type: string = graph_sample.subject_type;
    const predicate: string = graph_sample.predicate.replace("biolink:","");
    const query: string = `
    node${index}
    (func: eq(id, "${object}"))
    @cascade {
      id
      name
      category
      in_edges: ~source @filter(eq(predicate, "${predicate}")) {
          predicate
          primary_knowledge_source
          node: target @filter(eq(category, "${subject_type}")) {
            id
            name
            category
        }
      }
    }`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}


export function dgraphFloatingPredicateQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)
  const statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const subject: string = graph_sample.subject;
    const object: string = graph_sample.object;
    const query: string = `
    node${index}
    (func: eq(id, "${object}"))
    @cascade {
      id
      name
      category
      in_edges: ~source {
        predicate
        primary_knowledge_source
        node: target @filter(eq(id, "${subject}")) {
          id
          name
          category
        }
      }
    }`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}


export function janusgraphFixedQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  const gremlinScript = `
def out = []
for (sample in samples) {
  out.addAll(
    g.V().has('id', sample.subject).as(sample.subject)
        .outE(sample.predicate.replace('biolink:', '')).as('edge')
        .inV().has('id', sample.object).limit(1).as(sample.object)
        .project('subject', 'edges', 'object')
        .by(select(sample.subject).by(valueMap('id', 'name', 'category')))
        .by(select(sample.subject).outE(sample.predicate.replace('biolink:', '')).where(inV().has('id', sample.object)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
        .by(select(sample.object).by(valueMap('id', 'name', 'category')))
  )
}
return out
`;
  const message = {
    gremlin: gremlinScript,
    bindings: {
      samples: samples
    }
  };
  return JSON.stringify(message);
}

export function janusgraphFloatingObjectQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  const gremlinScript = `
def out = []

for (sample in samples) {
    out.addAll(
        g.V().has('id', sample.subject).limit(1).as('subject')
        .project('subject', 'pairs')
        .by(valueMap('id', 'name', 'category'))
        .by(
            __.outE(sample.predicate.replace('biolink:', '')).as('edge')
            .inV().hasLabel(sample.object_type.replace('biolink:', '')).as('object')
            .project('edge', 'object')
                .by(select('edge').project('edge_label', 'primary_knowledge_source')
                    .by(label())
                    .by(values('primary_knowledge_source')))
                .by(valueMap('id', 'name', 'category')).fold()
        )
        .toList()
    )
}

return out
`;

  const message = {
    gremlin: gremlinScript,
    bindings: {
      samples: samples
    }
  };
  return JSON.stringify(message);

}

export function janusgraphFloatingPredicateQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  const gremlinScript = `
def out = []

for (sample in samples) {
    out.addAll(
        g.V().has('id', sample.subject).as('subject')
        .outE().as('edge')
        .inV().has('id', sample.object).limit(1).as('object')
        .project('nodes', 'edges')
            .by(select('subject', 'object')
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category')))
        .by(project('edges')
            .by(select('subject').outE().where(inV().has('id', sample.object)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold()))
    )
}

return out
`;

  const message = {
    gremlin: gremlinScript,
    bindings: {
      samples: samples
    }
  };
  return JSON.stringify(message);

}

export function janusgraphFloatingSubjectQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  samples = samples.map((sample: any) => ({
    ...sample,
    subject: typeof sample.subject === "string"
      ? sample.subject.replace(/^biolink:/, "")
      : sample.subject
  }));

  const gremlinScript = `
def out = []

for (sample in samples) {
    out.addAll(
        g.V().has('id', sample.object).limit(1).as('object')
        .project('object', 'pairs')
        .by(valueMap('id', 'name', 'category'))
        .by(
            __.inE(sample.predicate.replace('biolink:', '')).as('edge')
            .outV().hasLabel(sample.subject_type.replace('biolink:', '')).as('subject')
            .project('edge', 'subject')
            .by(select('edge').project('edge_label', 'primary_knowledge_source')
                .by(label())
                .by(values('primary_knowledge_source')))
            .by(valueMap('id', 'name', 'category')).fold()
        )
    )
}

return out
`;

  const message = {
    gremlin: gremlinScript,
    bindings: {
      samples: samples
    }
  };
  return JSON.stringify(message);

}



export function janusgraphTwoHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const gremlinScript = `
def out = []
for (n in nodes) {
    out.addAll(
        g.V().has('id', n.n0).as(n.n0)
            .outE().as('e0').inV().has('id', n.n1).limit(1).as(n.n1)
            .outE().as('e1').inV().has('id', n.n2).limit(1).as(n.n2)
            .project('nodes', 'edges')
            .by(select(n.n0, n.n1, n.n2)
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category')))
            .by(project('all_e0', 'all_e1')
                .by(select(n.n0).outE().where(inV().has('id', n.n1)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n1).outE().where(inV().has('id', n.n2)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold()))
    )
}
return out
`;

  const message = {
    gremlin: gremlinScript,
    bindings: {
      nodes: samples
    }
  };
  return JSON.stringify(message);

}

export function janusgraphThreeHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const gremlinScript = `
def out = []
for (n in nodes) {
    out.addAll(
        g.V().has('id', n.n0).as(n.n0)
            .outE().as('e0').inV().has('id', n.n1).limit(1).as(n.n1)
            .outE().as('e1').inV().has('id', n.n2).limit(1).as(n.n2)
            .outE().as('e2').inV().has('id', n.n3).limit(1).as(n.n3)
            .project('nodes', 'edges')
            .by(select(n.n0, n.n1, n.n2, n.n3)
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category')))
            .by(project('all_e0', 'all_e1', 'all_e2')
                .by(select(n.n0).outE().where(inV().has('id', n.n1)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n1).outE().where(inV().has('id', n.n2)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n2).outE().where(inV().has('id', n.n3)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold()))
    )
}
return out
`;

  const message = {
    gremlin: gremlinScript,
    bindings: {
      nodes: samples
    }
  };
  return JSON.stringify(message);
}

export function janusgraphFourHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const gremlinScript = `
def out = []
for (n in nodes) {
    out.addAll(
        g.V().has('id', n.n0).as(n.n0)
            .outE().as('e0').inV().has('id', n.n1).limit(1).as(n.n1)
            .outE().as('e1').inV().has('id', n.n2).limit(1).as(n.n2)
            .outE().as('e2').inV().has('id', n.n3).limit(1).as(n.n3)
            .outE().as('e3').inV().has('id', n.n4).limit(1).as(n.n4)
            .project('nodes', 'edges')
            .by(select(n.n0, n.n1, n.n2, n.n3, n.n4)
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category')))
            .by(project('all_e0', 'all_e1', 'all_e2', 'all_e3')
                .by(select(n.n0).outE().where(inV().has('id', n.n1)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n1).outE().where(inV().has('id', n.n2)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n2).outE().where(inV().has('id', n.n3)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n3).outE().where(inV().has('id', n.n4)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold()))
    )
}
return out
`;

  const message = {
    gremlin: gremlinScript,
    bindings: {
      nodes: samples
    }
  };
  return JSON.stringify(message);
}

export function janusgraphFiveHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const gremlinScript = `
def out = []
for (n in nodes) {
    out.addAll(
        g.V().has('id', n.n0).as(n.n0)
            .outE().as('e0').inV().has('id', n.n1).limit(1).as(n.n1)
            .outE().as('e1').inV().has('id', n.n2).limit(1).as(n.n2)
            .outE().as('e2').inV().has('id', n.n3).limit(1).as(n.n3)
            .outE().as('e3').inV().has('id', n.n4).limit(1).as(n.n4)
            .outE().as('e4').inV().has('id', n.n5).limit(1).as(n.n5)
            .project('nodes', 'edges')
            .by(select(n.n0, n.n1, n.n2, n.n3, n.n4, n.n5)
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category'))
                .by(valueMap('id', 'name', 'category')))
            .by(project('all_e0', 'all_e1', 'all_e2', 'all_e3', 'all_e4')
                .by(select(n.n0).outE().where(inV().has('id', n.n1)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n1).outE().where(inV().has('id', n.n2)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n2).outE().where(inV().has('id', n.n3)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n3).outE().where(inV().has('id', n.n4)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold())
                .by(select(n.n4).outE().where(inV().has('id', n.n5)).project('edge_label', 'primary_knowledge_source').by(label()).by(values('primary_knowledge_source')).fold()))
    )
}
return out
`;

  const message = {
    gremlin: gremlinScript,
    bindings: {
      nodes: samples
    }
  };
  return JSON.stringify(message);
}

export function kuzudbFixedQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Row> = graphSamples(samplingDatabase, sampleSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const subject = graphSample.subject;
    const subject_type = graphSample.subject_type;
    const object = graphSample.object;
    const object_type = graphSample.object_type;
    const predicate = graphSample.predicate;
    const query: string = `MATCH (\`n0\`:Node {\`id\`: "${subject}", \`category\`: "${subject_type}"})
    - [\`e01\`:Edge {\`predicate\`: "${predicate}"}]
    - (\`n1\`:Node {\`id\`: "${object}", \`category\`: "${object_type}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           e01.predicate, e01.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}


export function kuzudbFloatingObjectQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Row> = graphSamples(samplingDatabase, sampleSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const subject = graphSample.subject;
    const subject_type = graphSample.subject_type;
    const object = graphSample.object;
    const object_type = graphSample.object_type;
    const predicate = graphSample.predicate;
    const query: string = `
    MATCH (\`n0\`:Node {\`id\`: "${subject}", \`category\`: "${subject_type}"})
    - [\`e01\`:Edge {\`predicate\`: "${predicate}"}]
    - (\`n1\`:Node {\`category\`: "${object_type}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           e01.predicate, e01.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}

export function kuzudbFloatingPredicateQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Row> = graphSamples(samplingDatabase, sampleSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const subject = graphSample.subject;
    const subject_type = graphSample.subject_type;
    const object = graphSample.object;
    const object_type = graphSample.object_type;
    const predicate = graphSample.predicate;
    const query: string = `
    MATCH (\`n0\`:Node {\`id\`: "${subject}", \`category\`: "${subject_type}"})
    - [\`e01\`:Edge {}]
    - (\`n1\`:Node {\`id\`: "${object}", \`category\`: "${object_type}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           e01.predicate, e01.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}

export function kuzudbFloatingSubjectQuery(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<Row> = graphSamples(samplingDatabase, sampleSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const subject = graphSample.subject;
    const subject_type = graphSample.subject_type;
    const object = graphSample.object;
    const object_type = graphSample.object_type;
    const predicate = graphSample.predicate;
    const query: string = `
    MATCH (\`n0\`:Node {\`category\`: "${subject_type}"})
    - [\`e01\`:Edge {\`predicate\`: "${predicate}"}]
    - (\`n1\`:Node {\`id\`: "${object}", \`category\`: "${object_type}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           e01.predicate, e01.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}

export function kuzudbTwoHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number, ) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const node0 = graphSample.n0;
    const node1 = graphSample.n1;
    const node2 = graphSample.n2;
    const query: string = `
    MATCH
      (\`n0\`:Node {\`id\`: "${node0}"}) - [\`e01\`:Edge {}] - (\`n1\`:Node {\`id\`: "${node1}"}),
      (\`n1\`:Node {\`id\`: "${node1}"}) - [\`e02\`:Edge {}] - (\`n2\`:Node {\`id\`: "${node2}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           n2.id, n2.name, n2.category,
           e01.predicate, e01.primary_knowledge_source,
           e02.predicate, e02.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}

export function kuzudbThreeHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const node0 = graphSample.n0;
    const node1 = graphSample.n1;
    const node2 = graphSample.n2;
    const node3 = graphSample.n3;
    const query: string = `
    MATCH
      (\`n0\`:Node {\`id\`: "${node0}"}) - [\`e01\`:Edge {}] - (\`n1\`:Node {\`id\`: "${node1}"}),
      (\`n1\`:Node {\`id\`: "${node1}"}) - [\`e02\`:Edge {}] - (\`n2\`:Node {\`id\`: "${node2}"}),
      (\`n2\`:Node {\`id\`: "${node2}"}) - [\`e03\`:Edge {}] - (\`n3\`:Node {\`id\`: "${node3}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           n2.id, n2.name, n2.category,
           n3.id, n3.name, n3.category,
           e01.predicate, e01.primary_knowledge_source,
           e02.predicate, e02.primary_knowledge_source,
           e03.predicate, e03.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}

export function kuzudbFourHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number,) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const node0 = graphSample.n0;
    const node1 = graphSample.n1;
    const node2 = graphSample.n2;
    const node3 = graphSample.n3;
    const node4 = graphSample.n4;
    const query: string = `
    MATCH
      (\`n0\`:Node {\`id\`: "${node0}"}) - [\`e01\`:Edge {}] - (\`n1\`:Node {\`id\`: "${node1}"}),
      (\`n1\`:Node {\`id\`: "${node1}"}) - [\`e02\`:Edge {}] - (\`n2\`:Node {\`id\`: "${node2}"}),
      (\`n2\`:Node {\`id\`: "${node2}"}) - [\`e03\`:Edge {}] - (\`n3\`:Node {\`id\`: "${node3}"}),
      (\`n3\`:Node {\`id\`: "${node3}"}) - [\`e04\`:Edge {}] - (\`n4\`:Node {\`id\`: "${node4}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           n2.id, n2.name, n2.category,
           n3.id, n3.name, n3.category,
           n4.id, n4.name, n4.category,
           e01.predicate, e01.primary_knowledge_source,
           e02.predicate, e02.primary_knowledge_source,
           e03.predicate, e03.primary_knowledge_source,
           e04.predicate, e04.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}

export function kuzudbFiveHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number,) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  const queryStatements: Array<string> = [];
  for (const graphSample of samples) {
    const node0 = graphSample.n0;
    const node1 = graphSample.n1;
    const node2 = graphSample.n2;
    const node3 = graphSample.n3;
    const node4 = graphSample.n4;
    const node5 = graphSample.n5;
    const query: string = `
    MATCH
      (\`n0\`:Node {\`id\`: "${node0}"}) - [\`e01\`:Edge {}] - (\`n1\`:Node {\`id\`: "${node1}"}),
      (\`n1\`:Node {\`id\`: "${node1}"}) - [\`e02\`:Edge {}] - (\`n2\`:Node {\`id\`: "${node2}"}),
      (\`n2\`:Node {\`id\`: "${node2}"}) - [\`e03\`:Edge {}] - (\`n3\`:Node {\`id\`: "${node3}"}),
      (\`n3\`:Node {\`id\`: "${node3}"}) - [\`e04\`:Edge {}] - (\`n4\`:Node {\`id\`: "${node4}"}),
      (\`n4\`:Node {\`id\`: "${node4}"}) - [\`e05\`:Edge {}] - (\`n5\`:Node {\`id\`: "${node5}"})
    RETURN n0.id, n0.name, n0.category,
           n1.id, n1.name, n1.category,
           n2.id, n2.name, n2.category,
           n3.id, n3.name, n3.category,
           n4.id, n4.name, n4.category,
           n5.id, n5.name, n5.category,
           e01.predicate, e01.primary_knowledge_source,
           e02.predicate, e02.primary_knowledge_source,
           e03.predicate, e03.primary_knowledge_source,
           e04.predicate, e04.primary_knowledge_source,
           e05.predicate, e05.primary_knowledge_source;`
    queryStatements.push(query);
  }
  const payload = JSON.stringify(queryStatements);
  return payload;
}
