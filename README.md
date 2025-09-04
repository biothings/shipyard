### Shipyard

Repository for load testing various resources targetting infrastructure within
the NCATS Translator ecosystem

Currently we're wanting to stress different datastores with a large graph datasource
and evaluate performance for 0-hop and 1-hop graph queries. 

Tested datastores

* elasticsearch
* dgraph
* janusgraph
* ploverdb
* kuzudb
* neo4j


We're also wishing to evaluate performance for various services to identify bottlenecks and optimize
NCATS Translator services

Tested API's

* nodenorm [renci](https://nodenormalization-sri.renci.org/docs)
* nodenorm [scripps](https://pending.biothings.io/nodenorm)
* ploverdb [RTX](https://kg2cploverdb.ci.transltr.io/query)


## How to run load tests

Our load testing framework of choice is [k6](https://k6.io/). A brief overview of k6 should explain
how to read / write tests in the framework's specified structure. At the moment we have the
following structure in the repository

```shell
├── README.md
├── docker-compose.yml
├── docker
│   ├── Dockerfile
│   └── Dockerfile.dev
├── src
│   ├── configuration
│   ├── data
│   ├── eslint.config.mjs
│   ├── lib
│   ├── node_modules
│   ├── package.json
│   ├── package-lock.json
│   ├── services
│   ├── tests
│   └── typings
└── tsconfig.json
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
│   ├── api.equality.ts
│   ├── stress.elasticsearch.biothings-ci.ts
│   ├── stress.redis.renci.ci.ts
│   ├── stress.redis.renci.ts
│   ├── traffic.elasticsearch.biothings-ci.ts
│   └── traffic.redis.renci.ts
└── rtx-kg2
    ├── 2hop.dgraph.su08.ts
    ├── 2hop.janusgraph.su08.ts
    ├── 2hop.kuzudb.su08.ts
    ├── 3hop.dgraph.su08.ts
    ├── 3hop.janusgraph.su08.ts
    ├── 3hop.kuzudb.su08.ts
    ├── 4hop.dgraph.su08.ts
    ├── 4hop.janusgraph.su08.ts
    ├── 4hop.kuzudb.su08.ts
    ├── 5hop.dgraph.su08.ts
    ├── 5hop.janusgraph.su08.ts
    ├── 5hop.kuzudb.su08.ts
    ├── fixed.dgraph.su08.ts
    ├── fixed.elasticsearch.adjacency-list.biothings-es8.ts
    ├── fixed.elasticsearch.biothings-es8.ts
    ├── fixed.janusgraph.su08.ts
    ├── fixed.kuzudb.su08.ts
    ├── fixed.neo4j.su08.ts
    ├── fixed.ploverdb.transltr.ts
    ├── floating-es-meta
    │   └── esFloatingMetaQuery.ts
    ├── floating-object.dgraph.su08.ts
    ├── floating-object.elasticsearch.adjacency-list.biothings-es8.ts
    ├── floating-object.elasticsearch.biothings-es8.ts
    ├── floating-object.janusgraph.su08.ts
    ├── floating-object.kuzudb.su08.ts
    ├── floating-object.neo4j.su08.ts
    ├── floating-object.ploverdb.transltr.ts
    ├── floating-predicate.dgraph.su08.ts
    ├── floating-predicate.elasticsearch.adjacency-list.biothings-es8.ts
    ├── floating-predicate.elasticsearch.biothings-es8.ts
    ├── floating-predicate.janusgraph.su08.ts
    ├── floating-predicate.kuzudb.su08.ts
    ├── floating-predicate.neo4j.su08.ts
    ├── floating-predicate.ploverdb.transltr.ts
    ├── floating-subject.dgraph.su08.ts
    ├── floating-subject.elasticsearch.adjacency-list.biothings-es8.ts
    ├── floating-subject.elasticsearch.biothings-es8.ts
    ├── floating-subject.janusgraph.su08.ts
    ├── floating-subject.kuzudb.su08.ts
    ├── floating-subject.neo4j.su08.ts
    └── floating-subject.ploverdb.transltr.ts
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
