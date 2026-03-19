## shipyard services


Various services used for running the benchmarking test suite


* gharvest
Used for generating various sqlite3 databases used for generating our data within the k6 framework

* kudzuroot
Used for various kuzu related operations. Can setup a kuzu database and then extract various data
sources from it including multi-hop datasets

* kuzu-server
Incredibly bare flask server for enabling HTTP queries against the kuzu database even though it's a
local file based graph database
