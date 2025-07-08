### Shipyard

Repository for load testing various resources targetting infrastructure within
the NCATS Translator ecosystem

Currently we're wanting to stress different datastores with a large graph datasource
and evaluate performance for 0-hop and 1-hop graph queries. 

Implemented datastores

* elasticsearch
* neo4j

Targetted datastores

* kuzudb (testing currently separate python package)


We're also wishing to evaluate performance for various services to identify bottlenecks and optimize
NCATS Translator services


Implemented API's

* nodenorm [renci](https://nodenormalization-sri.renci.org/docs)
* nodenorm [scripps](https://pending.biothings.io/nodenorm)
* ploverdb [RTX](https://kg2cploverdb.ci.transltr.io/query)

Targetted API's

* []



## How to run load tests

Our load testing framework of choice is [k6](https://k6.io/). A brief overview of k6 should explain
how to read / write tests in the framework's specified structure. At the moment we have the
following structure in the repository

```shell
.
├── docker
└── src
    ├── configuration
    ├── data
    ├── lib
    ├── tests
    └── typings
```

Specific to k6, the load tests (and any tests for that matter) exist in the `~/src/tests`
directory. k6 expects the test definitions to be written in either javascript or typescript. The
best overview (in my opinion) for the test structure can be found
[here](https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/) on the k6 documentation. 

So we define all our tests and test configuration within the `~/src/tests` and then we build
k6 as a docker image

Now to run the tests. Simply build and then run docker container to automatically run the k6 tests

#### All Test Definitions

We divide the tests by the entity we wish to test against. I want to stop re-inventing the wheel
when evaulating various databases, API's, webservers, et cetera. So the tests are grouped by the
entity we want to evaluate against. For example, the database benchmarking using the RTX-KG2
knowledge graph dataset are all grouped under the `rtx-kg2` directory. The test names themselves
specify the type of query, the database, and a server location.

```shell
src/tests/
├── nodenorm
│   ├── stress.elasticsearch.biothings-ci.ts
│   ├── stress.elasticsearch.biothings-es8.ts
│   ├── stress.elasticsearch.transltr-es8.ts
│   └── stress.redis.renci.ts
└── rtx-kg2
    ├── batch.ploverdb.transltr.ts
    ├── fixed.elasticsearch.biothings-es8.ts
    ├── fixed.elasticsearch.transltr-es8.ts
    ├── fixed.neo4j.su08.ts
    ├── fixed.ploverdb.transltr.ts
    ├── floating-object.neo4j.su08.ts
    ├── floating-predicate.neo4j.su08.ts
    └── floating-subject.neo4j.su08.ts
```


###### Build and Run

```shell
# generic build & run command
docker compose run --build --rm --entrypoint="k6 run /src/tests/<testcase>.ts" shipyard 

# build & run command with HTTP debugging enabled
docker compose run --build --rm --entrypoint="k6 run --http-debug='full' /src/tests/<testcase>.ts" shipyard

# build & run command with full test summary
docker compose run --build --rm --entrypoint="k6 run --summary-mode='full' /src/tests/<testcase>.ts" shipyard

# build & run command providing neo4j credentials via environment variables
docker compose run --build --rm --entrypoint="k6 run -e NEO4J_USERNAME=<> -e NEO4J_PASSWORD=<> /src/tests/<neo4j_testcase>.ts" shipyard
```


###### Run

```shell
# generic run command
docker compose run --rm --entrypoint="k6 run /src/tests/<testcase>.ts" shipyard

# run command with HTTP debugging enabled
docker compose run --rm --entrypoint="k6 run --http-debug='full' /src/tests/<testcase>.ts" shipyard

# build & run command with full test summary
docker compose run --rm --entrypoint="k6 run --summary-mode='full' /src/tests/<testcase>.ts" shipyard

# run command providing neo4j credentials via environment variables
docker compose run --rm --entrypoint="k6 run -e NEO4J_USERNAME=<> -e NEO4J_PASSWORD=<> /src/tests/<testcase>.ts" shipyard
```


###### Docker Notes 
Several notes about the docker container for interested parties.

A lot of the associated data we use is assumed to exist in the `~/src/data` directory which is
copied to the image filesystem at `/src` (we currently copy the entire `src` directory at the
moment, this may change if we adopt data generation as image build time). A lot of the data I've
generated in sqlite3 as a convienent datastore. Since k6 is a golang project, if we want
to enable sqlite3 we have to set `CGO_ENABLED=1` to enable `CGO`. 

For any k6 extensions you wish to install, add them to the following build line the dockerfile

```DOCKERFILE
# xk6 url list for building
RUN xk6 build  \
    --with github.com/grafana/xk6-sql@latest \
    --with github.com/grafana/xk6-sql-driver-sqlite3 \
    --with github.com/grafana/xk6-dashboard \
    ...
    --with <your dependency here>
```




#### Automated Load Testing

First we have to setup the docker container running the predator testing framework.
We have this defined in the `docker-compose.yml`. Simply run `docker compose up` to bring the
testing framework up


### Test Cases

#### Dataset: RTX-KG2

The data is sampled from the rtx-kg2-edges and rtx-kg2-nodes. For testing full load we attempt to target sizes at maximum of
around 1000 entries.

These sampled values consist of the following at the moment:

* `subject`
* `subject_type` 
* `object`
* `object_type` 
* `predicate` 


##### Test Types

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


## Internal notes

We have an internal elasticsearch index for the RTX-KG2 datasource located at the following servers:

* `http://su12:9200/`
    * `green open rtx_kg2_nodes pH7Zf03uRy2uHUbfZdxj-w  5 0    6698073        0   2.4gb   2.4gb   2.4gb`
    * `green open rtx_kg2_edges R0DUqL_lQH6oszTFnjN7zA  5 0   26948303        0   9.3gb   9.3gb   9.3gb`
* `http://transltr.biothings.io:9200`
    * `green open rtx_kg2_edges                  5_P4GmcKTbmn3oBaSzON8w  5 1  26948303       0  18.6gb   9.3gb   9.3gb`
    * `green open rtx_kg2_nodes                  IVQx_NmZR4m95z2VkSG_HA  5 1   6698073       0   4.8gb   2.4gb   2.4gb`

* 
