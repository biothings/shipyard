import { graph_samples } from './sampling.ts';

export function es_fixed_query(sampling_database: Database, sample_size: int, es_index: string) {
  let samples: Array<{object}> = graph_samples(sampling_database, sample_size)

  let aggregated_statements: array = [];
  for (let graph_sample of samples) {
    aggregated_statements.push(JSON.stringify({index: es_index}));
    aggregated_statements.push(
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
  const payload: string = aggregated_statements.join("\n") + "\n";
  return payload;
}


export function neo4j_fixed_query(sampling_database: Database, sample_size: int) {
  const samples: Array<{object}> = graph_samples(sampling_database, sample_size)

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


export function neo4j_floating_object_query(sampling_database: Database, sample_size: int) {
  const samples: Array<{object}> = graph_samples(sampling_database, sample_size)
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


export function neo4j_floating_predicate_query(sampling_database: Database, sample_size: int) {
  const samples: Array<{object}> = graph_samples(sampling_database, sample_size)
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


export function neo4j_floating_subject_query(sampling_database: Database, sample_size: int) {
  const samples: Array<{object}> = graph_samples(sampling_database, sample_size)
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


export function plover_fixed_query(sampling_database: Database, sample_size: int) {
  let payload_structure: object = {
    message: {
      query_graph: {
        edges: {},
        nodes: {},
      }
    }
  };

  const samples: Array<{object}> = graph_samples(sampling_database, sample_size);
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

export function plover_batch_query(sampling_database: Database, sample_size: int) {

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

  const samples: Array<{object}> = graph_samples(sampling_database, sample_size);
  let node_ids: Array<{string}> = []
  samples.forEach( graph_sample => {
      node_ids.push(graph_sample.subject);
      node_ids.push(graph_sample.object);
  });
  payload_structure.message.query_graph.nodes.ids = node_ids


  return payload_structure;
}
