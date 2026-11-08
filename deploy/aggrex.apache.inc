# Include INSIDE the existing HTTPS VirtualHost, not at server scope.
# Preserve certificate directives and the existing HTTP-to-HTTPS redirect.
ProxyRequests Off
ProxyPassInherit Off
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
# Location-scoped mapping takes precedence over this host's global /api proxy.
<Location "/">
    ProxyPass "http://127.0.0.1:3000/" connectiontimeout=5 timeout=60
    ProxyPassReverse "http://127.0.0.1:3000/"
</Location>
