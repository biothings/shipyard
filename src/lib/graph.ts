import { graphSamples } from './sampling.ts';
import { Database } from "k6/x/sql";

export function es_fixed_query(samplingDatabase: Database, sampleSize: number, esIndex: string) {
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


export function neo4j_fixed_query(samplingDatabase: Database, sampleSize: number) {
  const samples: Array<{object}> = graphSamples(samplingDatabase, sampleSize)

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


export function neo4j_floating_object_query(samplingDatabase: Database, sampleSize: number) {
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


export function neo4j_floating_predicate_query(samplingDatabase: Database, sampleSize: number) {
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


export function neo4j_floating_subject_query(samplingDatabase: Database, sampleSize: number) {
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


export function plover_fixed_query(samplingDatabase: Database, sampleSize: number) {
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
