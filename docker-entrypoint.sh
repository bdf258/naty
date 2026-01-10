#!/bin/sh

# Replace environment variables in env-config.js
envsubst < /usr/share/nginx/html/env-config.js.template > /usr/share/nginx/html/env-config.js

# Start nginx
exec nginx -g 'daemon off;'
