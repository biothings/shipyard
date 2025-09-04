## Querying


#### *Dataset: RTX-KG2*

The data is sampled from the rtx-kg2-edges and rtx-kg2-nodes. For testing full load we attempt to target sizes at maximum of
around 1000 entries.

These sampled values consist of the following at the moment:

* `subject`
* `subject_type` 
* `object`
* `object_type` 
* `predicate` 


##### *Test Definitions*

For the RTX-KG2 dataset we have 4 "flavors" of tests that we want to test.

1. Constant identifiers for `subject`, `object`, and `predicate`.

| subject          | object           | predicate  |
| ---------------- | ---------------- | ---------- |
| constant         | constant         | constant   |


2. Constant identifiers for 2 of the 3 identifiers in the triplet.

| subject          | object           | predicate        |
| ---------------- | ---------------- | ---------------- |
| constant         | constant         | type constrained*|
| constant         | type constrained | constant         |
| type constrained | constant         | constant         |

*In the case of the predicate, we allow for any value so it is
any predicate relationship between the fixed subject and fixed object


3. Constant identifiers for 1 of the 3 identifiers in the triplet.

| subject          | object           | predicate        |
| ---------------- | ---------------- | ---------------- |
| type constrained | type constrained | constant         |
| type constrained | constant         | type constrained*|
| constant         | type constrained | type constrained*|

*In the case of the predicate, we allow for any value so it is
any predicate relationship between the fixed subject and type constrained object
or type constrained subject and fixed object

4. Constant identifiers for none of the values in within
`subject`, `object`, and `predicate`. Highly floating query that would heavily
stress the system

| subject          | object           | predicate        |
| ---------------- | ---------------- | ---------------- |
| type constrained | type constrained | type constrained |


##### Query Building

###### Elasticsearch

At the moment we're not yet able to handle type constrained queries
due to the structure of the indices we've created.


##### Case 1.

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
```

###### Neo4j


Some briefs notes on the cypher query language specific to neo4j
* `Nodes` are referred to in cypher via `()`
* `Properties` are referred to in cypher via `{}`
* `Relationships` are indicated via { `<--`, `--`, `-->`}
    * must have a start node, an end node, and exactly one type


##### Case 1.

```Cypher
MATCH 
    (`n0`:`${subject_type}` {`id`: $subject})
    -[`e01`:`${predicate}`]->
    (`n1`:`${object_type}` {`id`: $object})
RETURN *;
```


##### Case 2.


* Floating Subject

```Cypher
MATCH 
    (`n0`:`${subject_type}`)
    -[`e01`:`${predicate}`]->
    (`n1`:`${object_type}` {`id`: $object})
RETURN *;
```

* Floating Predicate

```Cypher
MATCH 
    (`n0`:`${subject_type}` {`id`: $subject})
    --
    (`n1`:`${object_type}` {`id`: $object})
RETURN *;
```

* Floating Object

```Cypher
MATCH 
    (`n0`:`${subject_type}` {`id`: $subject})
    -[`e01`:`${predicate}`]->
    (`n1`:`${object_type}`)
RETURN *;
```



###### KuzuDB

Kuzudb has a slightly modified version of the cypher query language. It's slightly more
specific in labelling nodes with `Node` keyword and edges with the `Edge` keyword. The nodes
and predicates are slightly more defined as well with a JSON like object specification


##### Case 1.

```Cypher
MATCH 
    (`n0`:Node {`id`: "${subject}", `category`: "{$subject_type}"})
    -[`e01`:Edge {`predicate`: {$predicate}"}]->
    (`n1`:Node {`id`: "${object}", `category`: "{$object_type}"})
RETURN *;
```


##### Case 2.


* Floating Object

```Cypher
MATCH 
    (`n0`:Node {`category`: "{$subject_type}"})
    -[`e01`:Edge {`predicate`: {$predicate}"}]->
    (`n1`:Node {`id`: "${object}", `category`: "{$object_type}"})
RETURN *;
```

* Floating Predicate
```Cypher
MATCH 
    (`n0`:Node {`id`: "${subject}", `category`: "{$subject_type}"})
    --
    (`n1`:Node {`id`: "${object}", `category`: "{$object_type}"})
RETURN *;
```

* Floating Subject

```Cypher
MATCH 
    (`n0`:Node {`id`: "${subject}", `category`: "{$subject_type}"})
    -[`e01`:Edge {`predicate`: {$predicate}"}]->
    (`n1`:Node {`category`: "{$object_type}"})
RETURN *;
```
