import {TextEncoder} from 'k6/x/encoding';
import {Database, Row} from "k6/x/sql";

import { graph_samples } from './sampling.ts';

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
  const samples = graph_samples(sampling_database, sample_size);

  const aggregated_statements = samples.reduce((arr, sample) => {
    return ([
        ...arr,
      JSON.stringify({index: es_index}),
       prepareSample(sample, floatingField)
    ])
  }, [])

  return aggregated_statements.join("\n") + "\n";
}


export function es_fixed_query(samplingDatabase: Database, sampleSize: int, es_index: string) {
  let samples: Array<{object}> = graph_samples(samplingDatabase, sampleSize)

  let aggregatedStatements: array = [];
  for (let graph_sample of samples) {
    aggregatedStatements.push(JSON.stringify({index: es_index}));
    aggregatedStatements.push(
      JSON.stringify(
        {
          query : {
            bool : {
              filter : [
                {term : { 'subject.keyword' : graph_sample.subject }},
                {term : { 'object.keyword' : graph_sample.object}},
                {term : { 'predicate.keyword' : graph_sample.predicate}}
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


export function neo4j_fixed_query(samplingDatabase: Database, sampleSize: int) {
  const samples: Array<{object}> = graph_samples(samplingDatabase, sampleSize)

  const query_statements: array = [];
  for (const graph_sample of samples) {
    const subject_type: string = graph_sample.subject_type;
    const object_type: string = graph_sample.object_type;
    const predicate: string = graph_sample.predicate;
    const query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\` {\`id\`: $object}) RETURN *;`;

    const statement: object = {
      statement : query,
      parameters : {
        subject : graph_sample.subject,
        object : graph_sample.object,
      }
    };
    query_statements.push(statement);
  }
  const payload: string = JSON.stringify({statements: query_statements});
  return payload;
}


export function neo4j_floating_object_query(samplingDatabase: Database, sampleSize: int) {
  const samples: Array<{object}> = graph_samples(samplingDatabase, sampleSize)
  const query_statements: array = [];
  for (const graph_sample of samples) {
    const subject_type: string = graph_sample.subject_type
    const object_type: string = graph_sample.object_type
    const predicate: string = graph_sample.predicate
    const query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\`) RETURN *;`;

    const statement: object = {
      statement : query,
      parameters : { subject : graph_sample.subject}
    }
    query_statements.push(statement)
  }

  const payload: string = JSON.stringify({statements: query_statements});
  return payload;
}


export function neo4j_floating_predicate_query(samplingDatabase: Database, sampleSize: int) {
  const samples: Array<{object}> = graph_samples(samplingDatabase, sampleSize)
  const query_statements: array = [];
  for (let graph_sample of samples) {
    const subject_type: string = graph_sample.subject_type
    const object_type: string = graph_sample.object_type
    const query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})--(\`n1\`:\`${object_type}\` {\`id\`: $object}) RETURN *;`;

    const statement: object = {
      statement : query,
      parameters : {
        subject : graph_sample.subject,
        object : graph_sample.object,
      }
    }
    query_statements.push(statement)
  }

  const payload: string = JSON.stringify({statements: query_statements});
  return payload;
}


export function neo4j_floating_subject_query(samplingDatabase: Database, sampleSize: int) {
  const samples: Array<{object}> = graph_samples(samplingDatabase, sampleSize)
  let query_statements: array = [];
  for (let graph_sample of samples) {
    let subject_type: string = graph_sample.subject_type
    let object_type: string = graph_sample.object_type
    let predicate: string = graph_sample.predicate
    let query: string = `MATCH (\`n0\`:\`${subject_type}\`)-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\`) RETURN *;`;

    let statement: object = {
      statement : query,
      parameters : { object : graph_sample.object}
    }
    query_statements.push(statement)
  }

  const payload: string = JSON.stringify({statements: query_statements});
  return payload;
}


export function plover_fixed_query(samplingDatabase: Database, sampleSize: int) {
  let payload_structure: object = {
    message: {
      query_graph: {
        edges: {},
        nodes: {},
      }
    }
  };

  const samples: Array<{object}> = graph_samples(samplingDatabase, sampleSize);
  samples.forEach( (graph_sample, index) => {
      const edge_label: string = `e${ index }`;
      const node_label_subject: string = `n0-${ edge_label }`;
      const node_label_object: string = `n1-${ edge_label }`;

      let edge: object = {
        subject: node_label_subject,
        object: node_label_object,
        predicates: [ graph_sample.predicate ],
      };

      const subject_node: object = {
        ids: [graph_sample.subject],
        categories: [graph_sample.subject_type],
      };

      const object_node: object = {
        ids: [graph_sample.object],
        categories: [graph_sample.object_type],
      };
      payload_structure.message.query_graph.edges[edge_label] = edge;
      payload_structure.message.query_graph.nodes[node_label_subject] = subject_node;
      payload_structure.message.query_graph.nodes[node_label_object] = object_node;
  });

  return payload_structure;
}

export function plover_batch_query(samplingDatabase: Database, sampleSize: int) {

  let payload_structure: object = {
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

  const samples: Array<{object}> = graph_samples(samplingDatabase, sampleSize);
  let node_ids: Array<{string}> = []
  samples.forEach( graph_sample => {
      node_ids.push(graph_sample.subject);
      node_ids.push(graph_sample.object);
  });
  payload_structure.message.query_graph.nodes.ids = node_ids


  return payload_structure;
}


export function dgraphFixedQuery(samplingDatabase: Database, sampleSize: int, es_index: string) {
  let samples: Array<Object> = graph_samples(samplingDatabase, sampleSize)

  let statements: Array<string> = [];
  samples.forEach( (graph_sample, index) => {
    const subject: string = graph_sample.subject;
    const subject_type: string = graph_sample.subject_type;
    const object: string = graph_sample.object;
    const object_type: string = graph_sample.object_type;
    const predicate: string = graph_sample.predicate;
    const query: string = `lookup${index}(func : eq(id, "{${object}}"), first: 1) {{id name category {${object_type}}(first: 10) @filter(eq(id, "{${subject}}")){{id name category}}}}`;
    statements.push(query);
  });
  const payload: string = "{" + statements.join("") + "}";

  const encoder: TextEncoder = new TextEncoder();
  const encodedPayload: Uint8Array = encoder.encode(payload);
  return encodedPayload;
}
