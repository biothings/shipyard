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
    const samples = graph_samples(sampling_database, sample_size);

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

function getTermsAgainstNodesAdjacencyList(graph_sample: Row) {
  return [
    { term: { _id: graph_sample.subject } },
    {
      nested: {
        path: "out_edges",
        query: {
          bool: {
            filter: [
              { term: { "out_edges.object.keyword": graph_sample.object } },
              {
                term: {
                  "out_edges.predicate.keyword": graph_sample.predicate,
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

function getTermsAgainstEdges(graph_sample: Row) {
  return [
    { term: { "subject.keyword": graph_sample.subject } },
    { term: { "object.keyword": graph_sample.object } },
    { term: { "predicate.keyword": graph_sample.predicate } },
  ];
}

export function esFixedQuery(
  samplingDatabase: Database,
  sampleSize: string,
  esIndex: IndexName,
) {
  const samples = graph_samples(samplingDatabase, sampleSize);

  const query_header = JSON.stringify({ index: esIndex });

  const term_get_function =
    esIndex === "rtx_kg2_nodes_adjacency_list"
      ? getTermsAgainstNodesAdjacencyList
      : getTermsAgainstEdges;

  const aggregatedStatements = samples.flatMap((graph_sample) => [
    query_header,
    JSON.stringify({
      _source:
        esIndex === "rtx_kg2_nodes_adjacency_list"
          ? { excludes: ["in_edges", "out_edges"] }
          : true,
      query: {
        bool: {
          filter: term_get_function(graph_sample),
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


export function ploverFixedQuery(samplingDatabase: Database, sampleSize: number) {
  let payloadStructure: object = {
    message: {
      query_graph: {
        edges: {},
        nodes: {},
      },
    },
  };

  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
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
      payloadStructure.message.query_graph.edges[edge_label] = edge;
      payloadStructure.message.query_graph.nodes[node_label_subject] = subject_node;
      payloadStructure.message.query_graph.nodes[node_label_object] = object_node;
  });

  const payload: string = JSON.stringify(payloadStructure);
  return payload;
}

export function ploverFloatingPredicateQuery(samplingDatabase: Database, sampleSize: number) {
  let payloadStructure: object = {
    message: {
      query_graph: {
        edges: {},
        nodes: {},
      }
    }
  };

  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
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
      payloadStructure.message.query_graph.edges[edge_label] = edge;
      payloadStructure.message.query_graph.nodes[node_label_subject] = subject_node;
      payloadStructure.message.query_graph.nodes[node_label_object] = object_node;
  });

  const payload: string = JSON.stringify(payloadStructure);
  return payload;
}


export function ploverFloatingObjectQuery(samplingDatabase: Database, sampleSize: number) {
  let payloadStructure: object = {
    message: {
      query_graph: {
        edges: {},
        nodes: {},
      }
    }
  };

  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
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
      payloadStructure.message.query_graph.edges[edge_label] = edge;
      payloadStructure.message.query_graph.nodes[node_label_subject] = subject_node;
      payloadStructure.message.query_graph.nodes[node_label_object] = object_node;
  });

  const payload: string = JSON.stringify(payloadStructure);
  return payload;
}


export function ploverFloatingSubjectQuery(samplingDatabase: Database, sampleSize: number) {
  let payloadStructure: object = {
    message: {
      query_graph: {
        edges: {},
        nodes: {},
      }
    }
  };

  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  samples.forEach( (graphSample, index) => {
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
      payloadStructure.message.query_graph.edges[edge_label] = edge;
      payloadStructure.message.query_graph.nodes[node_label_subject] = subject_node;
      payloadStructure.message.query_graph.nodes[node_label_object] = object_node;
  });

  const payload: string = JSON.stringify(payloadStructure);
  return payload;
}


export function dgraphFixedQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach((graph_sample, index) => {
    const subject: string = graph_sample.subject;
    const object: string = graph_sample.object;
    const predicate: string = graph_sample.predicate.replace("biolink:","");
    const query: string = `
    lookup${index}(func: eq(id, "${object}"))
    {
      id
      name
      has_edge
        @filter(eq(id, "${subject}"))
        @facets(eq(predicate, "${predicate}"))
        @facets(predicate: predicate) {
          id
          name
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
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const query: string = `
    twohoplookup${index}(func: eq(id, "${node0}"), first: 1)
    @cascade
    {
      id
      name
      category

      has_edge
        (first: 1)
        @filter(
          eq(id, "${node1}")
        )
        @facets(predicate: predicate)
        {
          id
          name
          category

          has_edge
            (first: 1)
            @filter(
              eq(id, "${node2}")
            )
            @facets(predicate: predicate)
            {
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

export function dgraphThreeHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const query: string = `
    threehoplookup${index}(func: eq(id, "${node0}")) {
      id
      name
      category

      has_edge
        (first: 1)
        @filter(eq(id, "${node1}"))
        @facets(predicate: predicate) {
        id
        name
        category

        has_edge
          (first: 1)
          @filter(eq(id, "${node2}"))
          @facets(predicate: predicate) {
            id
            name
            category

          has_edge
            (first: 1)
            @filter(eq(id, "${node3}"))
            @facets(predicate: predicate) {
              id
              name
              category
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
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const node4: string = graph_sample.n4;
    const query: string = `
    fourhoplookup${index}(func: eq(id, "${node0}")) {
      id
      name
      category

      has_edge
        (first: 1)
        @filter(eq(id, "${node1}"))
        @facets(predicate: predicate) {
        id
        name
        category

        has_edge
          (first: 1)
          @filter(eq(id, "${node2}"))
          @facets(predicate: predicate) {
            id
            name
            category

          has_edge
            (first: 1)
            @filter(eq(id, "${node3}"))
            @facets(predicate: predicate) {
              id
              name
              category

            has_edge
              (first: 1)
              @filter(eq(id, "${node4}"))
              @facets(predicate: predicate) {
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

export function dgraphFiveHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const node4: string = graph_sample.n4;
    const node5: string = graph_sample.n5;
    const query: string = `
    fivehoplookup${index}(func: eq(id, "${node0}")) {
      id
      name
      category

      has_edge
        (first: 1)
        @filter(eq(id, "${node1}"))
        @facets(predicate: predicate) {
        id
        name
        category

        has_edge
          (first: 1)
          @filter(eq(id, "${node2}"))
          @facets(predicate: predicate) {
            id
            name
            category

          has_edge
            (first: 1)
            @filter(eq(id, "${node3}"))
            @facets(predicate: predicate) {
              id
              name
              category

            has_edge
              (first: 1)
              @filter(eq(id, "${node4}"))
              @facets(predicate: predicate) {
                id
                name
                category

              has_edge
                (first: 1)
                @filter(eq(id, "${node5}"))
                @facets(predicate: predicate) {
                  id
                  name
                  category
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
    const predicate: string = graph_sample.predicate.replace("biolink:","");
    const query: string = `lookup${index}(func: eq(id, "${subject}")) {~has_edge (first:100) @facets(eq(predicate, "${predicate}")) {id name category @facets(predicate: predicate) {id name}}}`
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
    const query: string = `lookup${index}(func: eq(id, "${object}")) {id name has_edge @filter(eq(id, "${subject}")) @facets(predicate: predicate) {id name}}`
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
    // const subject: string = graph_sample.subject;
    const object: string = graph_sample.object;
    const predicate: string = graph_sample.predicate.replace("biolink:","");
    const query: string = `lookup${index}(func: eq(id, "${object}")) {id name has_edge @facets(eq(predicate, "${predicate}")) @facets(predicate: predicate) {id name}}`
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}


export function janusgraphFixedQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  let union_clauses: Array<string> = [];
  samples.forEach( graph_sample => {
    const subject: string = graph_sample.subject;
    const object: string = graph_sample.object;
    const predicate: string = graph_sample.predicate.replace("biolink:","");
    const unionClause: string = `__.V().has('id', '${subject}').outE('${predicate}').where(__.inV().has('id', '${object}'))`;
    union_clauses.push(unionClause);
  });
  const unionChain: string = union_clauses.join(", ");
  const gremlinQuery: string = `g.union(${unionChain}).project('edge_label', 'edge_properties', 'from_vertex_label', 'from_vertex_properties', 'to_vertex_label', 'to_vertex_properties').by(label()).by(valueMap()).by(outV().label()).by(outV().valueMap()).by(inV().label()).by(inV().valueMap())`
  const message: object = { "gremlin": gremlinQuery }
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
                .by(project('vertex_label','vertex_properties').by(label()).by(valueMap()))
                .by(project('vertex_label','vertex_properties').by(label()).by(valueMap()))
                .by(project('vertex_label','vertex_properties').by(label()).by(valueMap())))
            .by(select('e0', 'e1')
                .by(project('edge_label','edge_properties').by(label()).by(valueMap()))
                .by(project('edge_label','edge_properties').by(label()).by(valueMap())))
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

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const gremlinQuery =
      `g.V().has('id', '${node0}').as('${node0}')` +
      `.outE().as('e0')` +
      `.inV().has('id', '${node1}').limit(1).as('${node1}')` +
      `.outE().as('e1')` +
      `.inV().has('id', '${node2}').limit(1).as('${node2}')` +
      `.outE().as('e2')` +
      `.inV().has('id', '${node3}').limit(1).as('${node3}')` +
      `.project('nodes', 'edges')` +
      `.by(select('${node0}', '${node1}', '${node2}', '${node3}')` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('all_e0', 'all_e1', 'all_e2')` +
      `.by(select('${node0}').outE().where(inV().has('id', '${node1}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node1}').outE().where(inV().has('id', '${node2}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node2}').outE().where(inV().has('id', '${node3}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `)`;

    const message = { gremlin: gremlinQuery };
    return JSON.stringify(message);
  });
}

export function janusgraphFourHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const node4: string = graph_sample.n4;
    const gremlinQuery =
      `g.V().has('id', '${node0}').as('${node0}')` +
      `.outE().as('e0')` +
      `.inV().has('id', '${node1}').limit(1).as('${node1}')` +
      `.outE().as('e1')` +
      `.inV().has('id', '${node2}').limit(1).as('${node2}')` +
      `.outE().as('e2')` +
      `.inV().has('id', '${node3}').limit(1).as('${node3}')` +
      `.outE().as('e3')` +
      `.inV().has('id', '${node4}').limit(1).as('${node4}')` +
      `.project('nodes', 'edges')` +
      `.by(select('${node0}', '${node1}', '${node2}', '${node3}', '${node4}')` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('all_e0', 'all_e1', 'all_e2', 'all_e3')` +
      `.by(select('${node0}').outE().where(inV().has('id', '${node1}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node1}').outE().where(inV().has('id', '${node2}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node2}').outE().where(inV().has('id', '${node3}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node3}').outE().where(inV().has('id', '${node4}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `)`;

    const message = { gremlin: gremlinQuery };
    return JSON.stringify(message);
  });
}

export function janusgraphFiveHopQuery(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  let samples: Array<Object> = multihopSamples(samplingDatabase, databaseTable, sampleSize, depthSize);

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const node4: string = graph_sample.n4;
    const node5: string = graph_sample.n5;
    const gremlinQuery =
      `g.V().has('id', '${node0}').as('${node0}')` +
      `.outE().as('e0')` +
      `.inV().has('id', '${node1}').limit(1).as('${node1}')` +
      `.outE().as('e1')` +
      `.inV().has('id', '${node2}').limit(1).as('${node2}')` +
      `.outE().as('e2')` +
      `.inV().has('id', '${node3}').limit(1).as('${node3}')` +
      `.outE().as('e3')` +
      `.inV().has('id', '${node4}').limit(1).as('${node4}')` +
      `.outE().as('e4')` +
      `.inV().has('id', '${node5}').limit(1).as('${node5}')` +
      `.by(select('${node0}', '${node1}', '${node2}', '${node3}', '${node4}', '${node5}')` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('type','label','properties').by(constant('vertex')).by(label()).by(valueMap()))` +
      `.by(project('all_e0', 'all_e1', 'all_e2', 'all_e3', 'all_e4')` +
      `.by(select('${node0}').outE().where(inV().has('id', '${node1}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node1}').outE().where(inV().has('id', '${node2}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node2}').outE().where(inV().has('id', '${node3}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node3}').outE().where(inV().has('id', '${node4}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `.by(select('${node4}').outE().where(inV().has('id', '${node5}'))).project('edge_label','edge_properties').by(label()).by(valueMap()).fold())` +
      `)`;

    const message = { gremlin: gremlinQuery };
    return JSON.stringify(message);
  });
}