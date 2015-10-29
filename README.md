Hapi auth plugin for Firefox Accounts
=====================================

This is a simple authentication plugin for Hapi applications to become
[Firefox Accounts OAuth](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Firefox_Accounts/Introduction#Firefox_Accounts_OAuth_2.0_API)
service providers.  It accepts FxA bearer tokens in the Authorization header,
verifies them against the hosted FxA verifier, and sets the returned user
data as the request credentials.

Enable it in your Hapi server configuration like so:

    server.register({
      register: require('hapi-fxa-oauth')
    })

Or customize things like so:

    server.register({
      register: require('hapi-fxa-oauth'),
      options: {
        host: 'oauth-stable.dev.lcip.org', // FxA dev server
        port: 443,                         // explicitly specify port
        insecure: false,                   // use https (the default!)
        keepAlive: false,                  // don't hold connections open
      }
    })

