## gharvest

Data harvesting tool that accompanies how I use the shipyard repository. Fairly primative given I
was needing to hack together so many databases in the testing that I didn't have the time to really
explore a better tooling. I wanted to write something natively in golang originally, but you
can see that didn't happen

Effectively all the work is done in the `~/scripts` directory, where there are individual scripts
for executing and pulling the data from the appropriate location and storing that data within a
corresponding sqlite3 database. This database is then moved into the data directory
(`~/shipyard/src/data/`) and loaded when you build the docker image. 

Not the most elegant solution as it creates a massive docker image with k6 as the databases get
larger, but this tool was thrown together quickly
