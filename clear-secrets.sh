#!/bin/bash -ex

aws secretsmanager list-secrets --profile $1 --region $2 | node delete-secrets.js | xargs -I{} aws secretsmanager delete-secret --secret-id {} --force
