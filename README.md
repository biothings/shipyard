### Shipyard

Repository for load testing various services related to the NCATSTranslator program


At the moment primarily focused on the following services

* nodenorm [renci](https://nodenormalization-sri.renci.org/docs)
* nodenorm [scripps](https://pending.biothings.io/nodenorm)



#### Automated Load Testing

First we have to setup the docker container running the predator testing framework.
We have this defined in the `docker-compose.yml`. Simply run `docker compose up` to bring the
testing framework up


#### Test Cases

##### Dataset: RTX-KG2

For the RTX-KG2 dataset we have 4 "flavors" of tests that we want to test. For each case we want to
have a set of around 1 million entries consisting of sampled values for `subject`, `object`, and `predicate` 
from our dataset. Each query will use batch sizes between [500, 1000]

1. Constant identifiers for `subject`, `object`, and `predicate`.

| subject          | object           | predicate        |
| ---------------- | ---------------- | ---------------- |
| constant         | constant         | type constrained |


2. Constant identifiers for 2 of the 3 identifiers in the triplet. 


| subject          | object           | predicate        |
| ---------------- | ---------------- | ---------------- |
| constant         | constant         | type constrained |
| constant         | type constrained | constant         |
| type constrained | constant         | constant         |


3. Constant identifiers for 1 of the 3 identifiers in the triplet.

| subject          | object           | predicate        |
| ---------------- | ---------------- | ---------------- |
| type constrained | type constrained | constant         |
| type constrained | constant         | type constrained |
| constant         | type constrained | type constrained |

4. Constant identifiers for `subject`, `object`, and `predicate`.

| subject          | object           | predicate        |
| ---------------- | ---------------- | ---------------- |
| type constrained | type constrained | type constrained |




###### elasticsearch 

The RTX-KG2 data is stored on at `su12:9200`

```
green open rtx_kg2_nodes pH7Zf03uRy2uHUbfZdxj-w  5 0    6698073        0   2.4gb   2.4gb   2.4gb
green open rtx_kg2_edges R0DUqL_lQH6oszTFnjN7zA  5 0   26948303        0   9.3gb   9.3gb   9.3gb
```


Case 1.
```JSON
{
    "query": {
        "bool" : {
            "filter": {
                "term" : { "subject.keyword" : "{{subject}}"},
                "term" : { "object.keyword" : "{{object}}"},
                "term" : { "predicate.keyword" : "{{predicate}}"}
                }
            }
        }
    }
}
```

###### neo4j

Nodes are referred to in cypher via ()
Properties are referred to in cypher via {}
Nodes in a graph may be connected via a relationship  (indicated via -->)
    - must have a start node, an end node, and exactly one type



node 0: (`n0`:`biolink:SmallMolecule`) [type constrained]
    - label: `biolink:SmallMolecule`
    - property: None
node 1: (`n1`:`biolink:ChemicalEntity` {`id`: "CHEBI:33706"}) [constant]
    - label: `biolink:ChemicalEntity`
    - property: {`id`: "CHEBI:33706"}





Case 2.
```SQL
MATCH
    (`n0`:`biolink:SmallMolecule`)
    -[`e01`:`biolink:chemically_similar_to`]->
    (`n1`:`biolink:ChemicalEntity` {`id`: "CHEBI:33706"})
RETURN *;
```

###### kuzudb


Case 2.
```SQL
MATCH
    (`n0`:Node {`category`: "biolink:SmallMolecule"})
    -[`e01`:Edge {`predicate`: "biolink:chemically_similar_to"}]->
    (`n1`:Node {`id`: "CHEBI:33706", `category`: "biolink:ChemicalEntity"})
RETURN *;
```


[X] Batch test for elasticsearch (Case 1)
[X] Batch test for neo4j (Case 1)
[X] Batch test for kuzudb (Case 1)

[] Batch test for elasticsearch (Case 2)
[X] Batch test for neo4j (Case 2)
[X] Batch test for kuzudb (Case 2)

<!-- [] Batch test for elasticsearch (Case 3) -->
<!-- [] Batch test for neo4j (Case 3) -->
<!-- [] Batch test for kuzudb (Case 3) -->
