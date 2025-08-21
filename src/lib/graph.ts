import {graphSamples} from './sampling.ts';
import {TextEncoder} from 'k6/x/encoding';
import {Database, Row} from "k6/x/sql";

export type FloatingField = 'subject' | 'object' | 'predicate';

function prepareSample (sample: Row, floatingField: FloatingField) {
  const fields = ['subject', 'object', 'predicate']
  const filter = fields.reduce((arr, field) => {
    if (field == floatingField) {
      return arr
    }

    return [
        ...arr,
      {
        term: {
          [field + `${field === 'predicate' ? '' : '.id'}` +'.keyword']: sample[field]
        }
      }
    ]
  }, [])


  return JSON.stringify(
        {
          query : {
            bool : {
              filter
            }
          }
        }
      )
}



export const generateEsFloatingQuerier = (floatingField: FloatingField) => (sampling_database: Database, sample_size: string, es_index: string) => {
  const samples = graphSamples(sampling_database, sample_size);

  const aggregated_statements = samples.reduce((arr, sample) => {
    return ([
        ...arr,
      JSON.stringify({index: es_index}),
       prepareSample(sample, floatingField)
    ])
  }, [])

  return aggregated_statements.join("\n") + "\n";
}


export function esFixedQuery(samplingDatabase: Database, sampleSize: number, esIndex: string) {
  let samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize)

  let aggregatedStatements: Array<string> = [];
  for (let graphSample of samples) {
    aggregatedStatements.push(JSON.stringify({index: esIndex}));
    aggregatedStatements.push(
      JSON.stringify(
        {
          query : {
            bool : {
              filter : [
                {term : { 'subject.keyword' : graphSample.subject }},
                {term : { 'object.keyword' : graphSample.object}},
                {term : { 'predicate.keyword' : graphSample.predicate}}
              ]
            }
          }
        }
      )
    );
  }
  const payload: string = aggregatedStatements.join("\n") + "\n";
  return payload;
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
        ids: [graphSample.object],
        categories: [graphSample.object_type],
      };
      payloadStructure.message.query_graph.edges[edge_label] = edge;
      payloadStructure.message.query_graph.nodes[node_label_subject] = subject_node;
      payloadStructure.message.query_graph.nodes[node_label_object] = object_node;
  });

  return payloadStructure;
}

export function ploverBatchQuery(samplingDatabase: Database, sampleSize: number) {
  let payloadStructure: object = {
    message: {
      query_graph: {
        edges: {
          e0: { subject: "n0", object: "n1" }
        },
        nodes: {
          n0: { ids: [] },
          n1: { categories: ["biolink.NamedThing"]}
        },
      }
    }
  };

  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize);
  let node_ids: Array<{string}> = []
  samples.forEach( graphSample => {
      node_ids.push(graphSample.subject);
      node_ids.push(graphSample.object);
  });
  payloadStructure.message.query_graph.nodes.ids = node_ids


  return payloadStructure;
}


export function dgraphFixedQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graphSamples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
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

export function dgraphTwoHopQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graph_samples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const query: string = `
    twohoplookup${index}(func: eq(id, "${node0}")) 
    @cascade{
      id 
      name 
      category 

      has_edge 
        (first: 1)
        @filter(eq(id, "${node1}") 
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

export function dgraphThreeHopQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graph_samples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const query: string = `
    twohoplookup${index}(func: eq(id, "${node0}")) 
    @cascade{
      id 
      name 
      category 

      has_edge 
        (first: 1)
        @filter(eq(id, "${node1}") 
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

export function dgraphFourHopQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graph_samples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const node4: string = graph_sample.n4;
    const query: string = `
    twohoplookup${index}(func: eq(id, "${node0}")) 
    @cascade{
      id 
      name 
      category 

      has_edge 
        (first: 1)
        @filter(eq(id, "${node1}") 
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

export function dgraphFiveHopQuery(samplingDatabase: Database, sampleSize: number) {
  let samples: Array<Object> = graph_samples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const node0: string = graph_sample.n0;
    const node1: string = graph_sample.n1;
    const node2: string = graph_sample.n2;
    const node3: string = graph_sample.n3;
    const node4: string = graph_sample.n4;
    const node5: string = graph_sample.n5;
    const query: string = `
    twohoplookup${index}(func: eq(id, "${node0}")) 
    @cascade{
      id 
      name 
      category 

      has_edge 
        (first: 1)
        @filter(eq(id, "${node1}") 
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

