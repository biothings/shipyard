"""
Basic webserver for simulating HTTP requests to the kuzudb server
"""

import kuzu
from flask import Flask, request


db = kuzu.Database("/opt/bt-port/kuzu-server/rtxkg2.kuzu", read_only=True)
app = Flask("kuzu-server")


@app.route("/query", methods=["POST"])
def query_kuzu():
    query = request.get_json()
    conn = kuzu.Connection(db)
    query = "\n".join(query)
    response = conn.execute(query)
    return {"response": [r.get_all() for r in response]}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8979, debug=None)
