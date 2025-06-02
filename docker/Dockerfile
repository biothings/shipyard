FROM golang:1.24.3-alpine3.21 AS builder

WORKDIR /app

RUN apk update 
RUN apk add --no-cache --update git libc6-compat libgcc libstdc++ build-base

ENV CGO_ENABLED=1
RUN go install go.k6.io/xk6/cmd/xk6@latest

# xk6 url list for building
RUN xk6 build  \
    --with github.com/grafana/xk6-sql@latest \
    --with github.com/grafana/xk6-sql-driver-sqlite3 \
    --with github.com/grafana/xk6-dashboard

FROM alpine:3.21

COPY --from=builder /app/k6 /bin/
COPY ./src .

ENTRYPOINT ["k6", "run"]
