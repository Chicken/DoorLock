#!/usr/bin/sh

export $(cat server/.env | xargs)

curl -s -X POST -H "Authorization: $MOCK_CONTROL_PASSWORD" "http://localhost:$MOCK_CONTROL_PORT/" --data-raw "$@"
echo
