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
