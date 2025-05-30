import sql from "k6/x/sql";


function graph_samples(sampling_database: Database, sample_size: int) {
  const sample_query: string = "SELECT * FROM graph_samples WHERE rowid IN (SELECT rowid FROM graph_samples ORDER BY random() LIMIT $1)";
  const samples: Array<{object}> = sampling_database.query(sample_query, sample_size);
  return samples;
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



export function neo4j_floating_object_query(sampling_database: Database, sample_size: int) {
  const samples: Array<{object}> = graph_samples(sampling_database, sample_size)
  const query_statements: array = [];
  for (const graph_sample of samples) {
    const subject_type: string = graph_sample.subject_type
    const object_type: string = graph_sample.object_type
    const predicate: string = graph_sample.predicate
    const query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\`) RETURN *;`;

    const statement: object = {
      statement : query
      parameters : { subject : graph_sample.subject}
    }
    query_statements.push(statement)
  }

  const payload: string = JSON.stringify({statements: query_statements});
  return payload;


export function neo4j_floating_predicate_query(sampling_database: Database, sample_size: int) {
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


export function neo4j_floating_subject_query(sampling_database: Database, sample_size: int) {
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
