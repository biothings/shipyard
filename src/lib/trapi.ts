import sql from "k6/x/sql";

import { graph_samples } from './sampling.ts';


export function trapi_fixed_query(sampling_database: Database, sample_size: int) {
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
  

  const payload: string = JSON.stringify(payload_structure);
  return payload;
}
